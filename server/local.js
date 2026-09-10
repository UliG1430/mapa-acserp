import http from 'node:http';
import {readFile,mkdir,chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {headersSeguridad} from './http.js';
import {api} from './api.js';
import {abrirDB} from './sqlite.js';
try{process.loadEnvFile();}catch{}
process.umask(0o077);
const production=process.env.NODE_ENV==='production';
if(production&&(!process.env.APP_ORIGIN?.startsWith('https://')||!process.env.MAPA_DB||!process.env.SESSION_ENCRYPTION_KEY||!process.env.SUPABASE_URL))throw new Error('Producción requiere APP_ORIGIN HTTPS, MAPA_DB persistente, Supabase y una clave de sesiones.');
const appOrigin=production?new URL(process.env.APP_ORIGIN):null;
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(path.join(root,'.local'),{recursive:true,mode:0o700});
if(!production)await chmod(path.join(root,'.local'),0o700);
const DB=abrirDB(process.env.MAPA_DB||path.join(root,'.local','mapa.sqlite'));
const port=Number(process.env.PORT||5173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  const host=req.headers.host;if(!(production?[appOrigin.host]:[`127.0.0.1:${port}`,`localhost:${port}`]).includes(host)){res.writeHead(403).end();return;}
  try{
    const url=new URL(req.url,production?appOrigin.origin:`http://${host}`);let response;
    if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/public/')){
      const headers=new Headers(req.headers);headers.delete('oai-authenticated-user-id');headers.delete('oai-authenticated-user-email');
      response=await api(new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{})}),{...process.env,DB},{local:!production,clientIP:req.socket.remoteAddress});
    }else{
      const pathname=decodeURIComponent(url.pathname);const relative=pathname==='/'?'index.html':pathname.slice(1);
      if(!['index.html','editor.html','imprimir.html','login.html','sw.js','manifest.webmanifest'].includes(relative)&&!/^((js|css|img|fonts)\/|data\/inicial\.json$)/.test(relative))throw new Error('404');
      const staticRoot=production?path.join(root,'dist/client/'):root;const file=path.resolve(staticRoot,relative);if(!file.startsWith(staticRoot)||relative.split('/').includes('..'))throw new Error('404');
      response=new Response(await readFile(file),{headers:{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':production?(relative==='sw.js'?'no-cache':'public, max-age=0, must-revalidate'):'no-store','X-Content-Type-Options':'nosniff'}});
    }
    response=headersSeguridad(response,new Request(url));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('No encontrado');}
});
server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=60;
server.listen(port,production?'0.0.0.0':'127.0.0.1',()=>console.log(production?`Servidor de producción listo en puerto ${port}`:`Mapa y editor: http://127.0.0.1:${port}\nDatos locales persistentes en .local/ (sin publicar en Internet).`));
process.on('SIGINT',()=>server.close(()=>{DB.close();process.exit();}));
