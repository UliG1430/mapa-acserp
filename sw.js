// El build reemplaza BUILD_ID con el hash del código. El shell de cada versión
// es inmutable: una página abierta nunca mezcla archivos de distintas versiones.
const VERSION='minulp-shell-BUILD_ID';
const OPTIONAL_CACHE=VERSION+'-opcional';
const SHELL=['./','index.html','manifest.webmanifest','css/app.css','css/marcas.css','css/fuente.css','fonts/montserrat-latin.woff2','js/tema-inicial.js','js/portada.js','js/tema.js','js/app.js','js/datos.js','js/validacion.js','js/seguridad.js','js/organos.js','js/estado-publico.js','js/mapa.js','js/geo.js','js/cronograma.js','js/buscador.js','js/perfil.js','data/inicial.json','img/splash.webp','img/splash-fijo.webp','img/mapa.webp','img/entorno.svg','img/icons/icon-192.png','img/logos/MINULP-BLANCO.webp',...['AG','STI','CS','ECOSOC','CDH','ONUM','PNUMA','UNESCO','ACNUR','UNICEF','OMS','CAJ','OIT','ONUDD','UNODA'].map(s=>'img/logos/'+s+'.webp')];
const OPTIONAL=['img/mapa@2x.webp','img/oficial.webp','imprimir.html','css/imprimir.css','js/imprimir.js','js/qr.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)));});
// Sin skipWaiting/claim: activar cuando ya no haya páginas de la versión previa.
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('minulp-')&&k!==VERSION&&k!==OPTIONAL_CACHE).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);if(url.origin!==self.location.origin||e.request.method!=='GET')return;
 if(url.pathname.includes('/api/')||url.pathname.includes('/public/')||url.searchParams.has('preview'))return;
 const resource=url.pathname.replace(new URL(self.registration.scope).pathname,'');
 if(resource==='editor.html'||resource==='admin/editor'||resource==='admin/editor.html'||resource==='js/editor.js'||resource==='css/editor.css')return;
 const name=resource||'./';
 if(SHELL.includes(name))e.respondWith(caches.open(VERSION).then(async cache=>(await cache.match(new URL(name,self.registration.scope).href))||fetch(e.request)));
 else if(OPTIONAL.includes(name))e.respondWith(caches.open(OPTIONAL_CACHE).then(async cache=>{const hit=await cache.match(e.request);if(hit)return hit;const r=await fetch(e.request);if(r.ok)await cache.put(e.request,r.clone());return r;}));
});
self.addEventListener('message',e=>{if(e.data?.type!=='PREPARAR_OFFLINE')return;e.waitUntil(Promise.all([caches.open(VERSION).then(c=>c.addAll(SHELL)),caches.open(OPTIONAL_CACHE).then(c=>c.addAll(OPTIONAL))]).then(()=>e.ports[0]?.postMessage({ok:true}),()=>e.ports[0]?.postMessage({ok:false})));});
