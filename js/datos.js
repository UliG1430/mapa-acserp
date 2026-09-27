import {validarDatos} from './validacion.js';
const CACHE='minulp.publicacion.v1';
const listeners=new Set();
export let ORGANOS=[],LUGARES=[],CRONOGRAMA=[],CONTACTOS=[],INFO=[],HERRAMIENTAS=[],CREDITOS={};
export let publicacion={revision:null,publishedAt:null};
export let estadoConexion='conectando';
export const esPreview=typeof location!=='undefined'&&new URLSearchParams(location.search).get('preview');
let datosActuales=null,busy=false;
export function alCambiarDatos(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export function obtenerDatos(){return structuredClone(datosActuales);}
function anunciar(cambio=false){if(cambio)for(const fn of listeners)fn(publicacion);if(typeof window!=='undefined')window.dispatchEvent(new Event('estado-datos'));}
export function aplicarSnapshot(s,persistir=true){
  if(!s||typeof s.revision!=='string')throw new Error('Publicación inválida.');
  const d=validarDatos(s.datos);
  ({ORGANOS,LUGARES,CRONOGRAMA,CONTACTOS,INFO,HERRAMIENTAS,CREDITOS}=d);datosActuales=d;
  publicacion={revision:s.revision,publishedAt:s.publishedAt};
  if(persistir&&!esPreview)try{localStorage.setItem(CACHE,JSON.stringify({...publicacion,datos:d}));}catch{}
  anunciar(true);
}
// Las cabeceras del servidor deciden la frescura: version.json siempre se
// revalida y cada revisión, por ser inmutable, sí puede reutilizar el CDN.
// AbortSignal.timeout no existe en iOS 15 y anteriores: sin este chequeo, la
// primera visita desde esos iPhone moria con "No se pudo cargar el mapa".
const conTope=ms=>typeof AbortSignal!=='undefined'&&AbortSignal.timeout?AbortSignal.timeout(ms):undefined;
async function leer(url){const r=await fetch(url,{signal:conTope(8000)});if(!r.ok)throw new Error('No se pudo cargar la publicación.');return r.json();}
export async function actualizarDatos(){
  if(busy||esPreview)return;busy=true;
  try{const v=await leer('public/version.json');if(v.revision!==publicacion.revision){const s=await leer(`public/revisions/${encodeURIComponent(v.revision)}.json`);if(s.revision!==v.revision)throw new Error('Revisión inconsistente.');aplicarSnapshot(s);}estadoConexion='actualizado';}
  catch{estadoConexion=navigator.onLine?'sin-actualizar':'offline';}finally{busy=false;anunciar();}
}
if(typeof window!=='undefined'){
  if(esPreview){
    try{aplicarSnapshot(await leer(`api/preview/${encodeURIComponent(esPreview)}`),false);estadoConexion='preview';}
    catch(e){document.body.textContent='No se pudo abrir esta vista previa. Volvé al editor y generá una nueva.';throw e;}
  }else{
    try{const s=JSON.parse(localStorage.getItem(CACHE));if(s)aplicarSnapshot(s,false);}catch{}
    if(!datosActuales){try{aplicarSnapshot({revision:'inicial',publishedAt:null,datos:await leer('data/inicial.json')});}catch(e){document.body.textContent='No se pudo cargar el mapa. Revisá tu conexión y volvé a intentar.';throw e;}}
    setTimeout(()=>actualizarDatos(),0);
  }
  let timer;
  function programar(){clearTimeout(timer);if(document.hidden||esPreview)return;timer=setTimeout(async()=>{await actualizarDatos();programar();},15000+Math.random()*5000);}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)actualizarDatos();programar();});
  window.addEventListener('online',()=>actualizarDatos());window.addEventListener('offline',()=>{estadoConexion='offline';anunciar();});
  programar();
}else{
  // Pruebas y herramientas de generación: no hay red ni localStorage.
  const {readFile}=await import('node:fs/promises');aplicarSnapshot({revision:'inicial',publishedAt:null,datos:JSON.parse(await readFile(new URL('../data/inicial.json',import.meta.url),'utf8'))},false);
}
