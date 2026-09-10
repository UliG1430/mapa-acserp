import {headersSeguridad} from './http.js';
import {api} from './api.js';
// La identidad se valida con Supabase y una sesión opaca; no se confía en headers del cliente.
export default {async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/public/')){
    const key=new Request(url.toString(),{method:'GET'});
    if(request.method!=='GET')return new Response('Método no permitido',{status:405});
    const hit=await caches.default.match(key);if(hit)return headersSeguridad(hit,request);
    const response=await api(request,env);
    if(response.ok){const cached=new Response(response.clone().body,response);cached.headers.set('Cache-Control',url.pathname.endsWith('/version.json')?'public, max-age=5':'public, max-age=31536000, immutable');ctx.waitUntil(caches.default.put(key,cached));}
    return headersSeguridad(response,request);
  }
  if(url.pathname.startsWith('/api/'))return headersSeguridad(await api(request,env),request);
  return headersSeguridad(await env.ASSETS.fetch(request),request);
}};
