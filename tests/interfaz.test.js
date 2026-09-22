// Integración DOM simulada: no reemplaza QA visual ni GPS en dispositivos reales.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {api} from '../server/api.js';
import {abrirDB} from '../server/sqlite.js';
const origin='http://127.0.0.1:5173';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(20);}throw new Error('No se alcanzó el estado esperado.');}
async function render(page,env){
 const win=new Window({url:origin+'/'+page,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableComputedStyleRendering:true}});
 win.document.write((await readFile(page,'utf8')).replace(/<script[\s\S]*?<\/script>/g,''));
 let cookie='';
 const login=await api(new Request(origin+'/api/auth/local',{method:'POST',headers:{Origin:origin}}),env,{local:true});cookie=login.headers.get('set-cookie')?.split(';')[0]||'';
 win.structuredClone=structuredClone;
 win.fetch=async(url,init={})=>{const u=new URL(url,origin+'/');if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/public/'))return api(new Request(u,{...init,signal:undefined,headers:{Origin:origin,Cookie:cookie,...init.headers}}),env,{local:true});return new Response(await readFile('.'+u.pathname));};
 win.HTMLElement.prototype.scrollIntoView=function(){};
 win.HTMLElement.prototype.getBoundingClientRect=function(){return{x:0,y:0,left:0,top:0,right:800,bottom:600,width:800,height:600};};
 win.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
 win.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 const entry=page==='index.html'?'app':page==='editor.html'?'editor':page==='login.html'?'login':'imprimir';
 const bundle=await build({entryPoints:['js/'+entry+'.js'],bundle:true,write:false,format:'esm',platform:'browser',external:['node:*'],define:{'import.meta.url':JSON.stringify(origin+'/js/datos.js')},target:'es2022'});
 try{await win.eval('(async()=>{'+bundle.outputFiles[0].text+'})()');}catch(e){await win.happyDOM.abort();win.close();throw e;}
 return{win,doc:win.document,async close(){await win.happyDOM.abort();win.close();}};
}
function closeDialog(w,value='ok'){const d=w.document.querySelector('#ed-dialog');d.returnValue=value;d.open=false;d.dispatchEvent(new w.Event('close'));}
// Sin scripts (render los quita), portada.js no corre: la app tiene que sacar la
// portada por su cuenta y abrir el cartel igual. Es el mismo caso que en un
// navegador donde ese archivo no llegara a bajar.
test('vista pública carga, pregunta el órgano, marca solo esa sede, limpia perfil y revela destino filtrado',async()=>{const DB=abrirDB(':memory:');let app;try{
 app=await render('index.html',{DB,LOCAL_USER:'test'});const{win,doc}=app;assert.equal(doc.querySelectorAll('.marca').length,78);
 await until(()=>doc.querySelector('#modal-perfil').open);assert.equal(doc.querySelector('#portada').hidden,true);
 assert.equal(doc.querySelector('#buscar-en-mapa'),null,'la búsqueda vive en su pestaña, no arriba del mapa');
 assert.equal(doc.querySelector('#btn-gps-apagar'),null,'un solo botón prende y apaga la ubicación');
 assert.match(doc.querySelector('.estado-publicacion').textContent,/Datos disponibles|Sin conexión|No se pudo comprobar/);
 assert.equal(doc.querySelectorAll('.op-organo small').length,15,'cada órgano con su nombre completo, chico');
 doc.querySelector('[data-vista="buscar"]').click();assert.equal(doc.querySelector('#vista-buscar').hidden,false);
 doc.querySelector('#btn-perfil').click();doc.querySelector('[data-sigla="AG"]').click();const form=doc.querySelector('#form-perfil');form.dispatchEvent(new win.SubmitEvent('submit',{cancelable:true,submitter:doc.querySelector('button[value="guardar"]')}));assert.match(doc.querySelector('#btn-perfil').textContent,/AG/);
 assert.equal(doc.querySelectorAll('.marca-sede:not([hidden])').length,1);assert.equal(doc.querySelector('.filtro[data-g="sede"]').textContent,'Mi órgano');
 doc.querySelector('#btn-perfil').click();form.dispatchEvent(new win.SubmitEvent('submit',{cancelable:true,submitter:doc.querySelector('button[value="omitir"]')}));assert.match(doc.querySelector('#btn-perfil').textContent,/Tu órgano/);
 assert.equal(doc.querySelectorAll('.marca-sede:not([hidden])').length,15);assert.equal(doc.querySelector('.filtro[data-g="sede"]').textContent,'Órganos');
 doc.querySelector('[data-vista="mapa"]').click();doc.querySelector('.filtro[data-g="sanitario"]').click();doc.querySelector('[data-vista="buscar"]').click();const q=doc.querySelector('#q');q.value='baño';q.dispatchEvent(new win.Event('input'));doc.querySelector('#resultados button').click();await wait(100);assert.equal(doc.querySelector('.marca-activa').hidden,false);
 win.location.hash='info';win.dispatchEvent(new win.HashChangeEvent('hashchange'));assert.equal(doc.querySelector('#vista-info').hidden,false);
 doc.querySelector('.segmentos [data-tema="oscuro"]').click();assert.equal(doc.documentElement.dataset.tema,'oscuro');assert.equal(doc.querySelector('.segmentos [aria-pressed="true"]').dataset.tema,'oscuro');
 }finally{await app?.close();DB.close();}});
test('editor guarda, deshace, publica y otro cliente recibe mapa/buscador actualizado',async()=>{const DB=abrirDB(':memory:');let ed,pub;try{
 const env={DB,LOCAL_USER:'test'};ed=await render('editor.html',env);pub=await render('index.html',env);const{win,doc}=ed;
 assert.equal(doc.querySelector('#ed-app').hidden,false);doc.querySelector('#ed-lista [data-id="domo"]').click();const input=doc.querySelector('#ed-nombre');input.value='Domo renovado';input.dispatchEvent(new win.Event('input'));await until(()=>doc.querySelector('#ed-estado').textContent.includes('Borrador guardado'));
 assert.equal(JSON.parse((await DB.prepare('SELECT datos FROM borradores').first()).datos).LUGARES[0].nombre,'Domo renovado');
 doc.querySelector('#ed-undo').click();assert.equal(doc.querySelector('#ed-nombre').value,'Domo');doc.querySelector('#ed-redo').click();assert.equal(doc.querySelector('#ed-nombre').value,'Domo renovado');
 doc.querySelector('#ed-publicar').click();await until(()=>doc.querySelector('#ed-dialog').open);closeDialog(win);await until(()=>doc.querySelector('#ed-aviso').textContent.includes('Cambios publicados'));
 assert.equal(JSON.parse((await DB.prepare('SELECT datos FROM publicaciones').first()).datos).LUGARES[0].nombre,'Domo renovado');
 pub.win.dispatchEvent(new pub.win.Event('online'));await until(()=>pub.doc.querySelector('.marca[data-id="domo"]').textContent.includes('Domo renovado'));
 const q=pub.doc.querySelector('#q');q.value='Domo renovado';q.dispatchEvent(new pub.win.Event('input'));assert.match(pub.doc.querySelector('#resultados').textContent,/Domo renovado/);
 assert.equal(doc.querySelector('#ed-publicar').disabled,true);
 }finally{await ed?.close();await pub?.close();DB.close();}});
test('impresión carga sin código inline y usa versión publicada',async()=>{const DB=abrirDB(':memory:');let app;try{app=await render('imprimir.html',{DB,LOCAL_USER:'test'});assert.ok(app.doc.querySelectorAll('#hoja-marcas > *').length>0);}finally{await app?.close();DB.close();}});

test('editor agrupa categorías y permite un órgano nuevo con nombre editable',async()=>{const DB=abrirDB(':memory:');let ed;try{ed=await render('editor.html',{DB});const{doc,win}=ed;assert.equal(doc.querySelector('[data-group="sede"] summary span').textContent,'15');assert.ok(doc.querySelector('[data-group="sanitarios"]'));doc.querySelector('#ed-agregar-organo').click();const name=doc.querySelector('#ed-organo-nombre');assert.equal(doc.querySelector('#ed-organo-fields').hidden,false);name.value='Consejo de Prueba';name.dispatchEvent(new win.Event('input'));await until(()=>doc.querySelector('#ed-estado').textContent.includes('Borrador guardado'));const d=JSON.parse((await DB.prepare('SELECT datos FROM borradores').first()).datos);assert.equal(d.ORGANOS.length,16);assert.equal(d.ORGANOS.at(-1).nombre,'Consejo de Prueba');assert.equal(doc.querySelectorAll('.marca').length,79);assert.equal(doc.querySelector('.marca[data-id="org-nuevo"] img'),null);assert.equal(doc.querySelector('.marca[data-id="org-nuevo"] .organo-iniciales').textContent,'NUEVO');}finally{await ed?.close();DB.close();}});
test('nombre malicioso se muestra como texto, sin inyectar elementos en el mapa',async()=>{const DB=abrirDB(':memory:');let ed;try{ed=await render('editor.html',{DB});const{doc,win}=ed;doc.querySelector('[data-id="domo"]').click();const input=doc.querySelector('#ed-nombre');input.value='<img src=x onerror=alert(1)>';input.dispatchEvent(new win.Event('input'));const marker=doc.querySelector('.marca[data-id="domo"]');assert.ok(marker.textContent.includes('<img'));assert.equal(marker.querySelector('img'),null);}finally{await ed?.close();DB.close();}});
