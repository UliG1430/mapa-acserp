import {build} from 'esbuild';
import {cp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await rm('dist',{recursive:true,force:true});await mkdir('dist/client',{recursive:true});await mkdir('dist/server',{recursive:true});
for(const f of ['index.html','editor.html','imprimir.html','login.html','manifest.webmanifest','js','css','img','fonts','data'])await cp(f,'dist/client/'+f,{recursive:true});
const hash=createHash('sha256');
async function hashTree(dir){for(const name of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const file=dir+'/'+name.name;if(name.isDirectory())await hashTree(file);else hash.update(file).update(await readFile(file));}}
await hashTree('dist/client');hash.update(await readFile('sw.js'));const version=hash.digest('hex').slice(0,16);
await writeFile('dist/client/sw.js',(await readFile('sw.js','utf8')).replaceAll('BUILD_ID',version));
await build({entryPoints:['server/worker.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js',minify:true});
await mkdir('dist/.openai',{recursive:true});await cp('drizzle','dist/.openai/drizzle',{recursive:true});
try{await cp('.openai/hosting.json','dist/.openai/hosting.json');}catch{await writeFile('dist/.openai/hosting.json',JSON.stringify({d1:{binding:'DB'},r2:null},null,2));}
await writeFile('dist/client/_headers','/api/*\n  Cache-Control: no-store\n/public/version.json\n  Cache-Control: public, max-age=0, s-maxage=5, must-revalidate\n/sw.js\n  Cache-Control: no-cache\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
console.log('Build listo: dist/client + Worker ESM + migraciones. Shell '+version);
