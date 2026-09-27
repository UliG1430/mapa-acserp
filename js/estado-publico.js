// ============================================================================
//  estado-publico.js — la franja de estado y la descarga para usar sin conexion.
//
//  La franja dice de cuando son los datos que se estan viendo y si se pudo
//  comprobar si hay novedades. Se deja siempre visible a proposito: es la forma
//  mas rapida de saber, desde cualquier telefono, que publicacion tiene cargada
//  la app sin abrir las herramientas del navegador.
// ============================================================================
import {publicacion,estadoConexion,esPreview,actualizarDatos} from './datos.js';
const bar=document.createElement('div');bar.className='estado-publicacion';bar.setAttribute('role','status');
if(!document.body.classList.contains('editor'))document.querySelector('header')?.after(bar);
function pintar(){const fecha=publicacion.publishedAt?new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(publicacion.publishedAt)):'versión inicial';bar.textContent=esPreview?'Vista previa privada · estos cambios todavía no están publicados':`${estadoConexion==='offline'?'Sin conexión':estadoConexion==='sin-actualizar'?'No se pudo comprobar si hay novedades':'Datos disponibles'} · ${fecha}`;bar.dataset.estado=esPreview?'preview':estadoConexion;}
window.addEventListener('estado-datos',pintar);pintar();

export async function prepararOffline(){
  if(!('serviceWorker'in navigator))throw new Error('Este navegador no admite el modo sin conexión.');
  // `ready` no resuelve nunca si no hay service worker registrado (en desarrollo
  // no se registra): sin este tope el boton quedaba "Descargando…" para siempre.
  const r=await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_,rechazar)=>setTimeout(()=>rechazar(new Error('El modo sin conexión se activa en el sitio publicado, no en la prueba local.')),6000)),
  ]);
  const worker=r.active;if(!worker)throw new Error('Volvé a intentar en unos segundos.');
  await new Promise((resolve,reject)=>{const ch=new MessageChannel();const timer=setTimeout(()=>reject(new Error('No se completó la descarga. Volvé a intentar.')),30000);ch.port1.onmessage=e=>{clearTimeout(timer);ch.port1.close();e.data.ok?resolve():reject(new Error('No se pudo descargar todo. Revisá tu conexión.'));};worker.postMessage({type:'PREPARAR_OFFLINE'},[ch.port2]);});
  await actualizarDatos();
}
