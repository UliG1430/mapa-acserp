import {getStore} from '@netlify/blobs';
import {api} from '../../server/api.js';
import {crearBlobDB} from '../../server/blob-db.js';
import {headersSeguridad} from '../../server/http.js';

export default async function handler(request,context){
  const DB=crearBlobDB(getStore({name:'mapa-acserp',consistency:'strong'}));
  let response=await api(request,{...process.env,DB},{clientIP:context.ip||request.headers.get('x-nf-client-connection-ip')||'unknown'});
  const path=new URL(request.url).pathname;
  if(response.ok&&request.method==='GET'&&path.startsWith('/public/')){
    const headers=new Headers(response.headers);
    headers.set('Netlify-CDN-Cache-Control',path.endsWith('/version.json')?'public, durable, s-maxage=5, must-revalidate':'public, durable, s-maxage=31536000, immutable');
    response=new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
  return headersSeguridad(response,request);
}
