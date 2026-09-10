import {publicacion,estadoConexion,esPreview,actualizarDatos} from './datos.js';
const bar=document.createElement('div');bar.className='estado-publicacion';bar.setAttribute('role','status');
if(!document.body.classList.contains('editor'))document.querySelector('header')?.after(bar);
function pintar(){const fecha=publicacion.publishedAt?new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(publicacion.publishedAt)):'versión inicial';bar.textContent=esPreview?'Vista previa privada · estos cambios todavía no están publicados':`${estadoConexion==='offline'?'Sin conexión':estadoConexion==='sin-actualizar'?'No se pudo comprobar si hay novedades':'Datos disponibles'} · ${fecha}`;bar.dataset.estado=estadoConexion;}
window.addEventListener('estado-datos',pintar);pintar();
export async function prepararOffline(){
  if(!('serviceWorker'in navigator))throw new Error('Este navegador no admite el modo sin conexión.');
  const r=await navigator.serviceWorker.ready;
  const worker=r.active;if(!worker)throw new Error('Volvé a intentar en unos segundos.');
  await new Promise((resolve,reject)=>{const ch=new MessageChannel();const timer=setTimeout(()=>reject(new Error('No se completó la descarga. Volvé a intentar.')),30000);ch.port1.onmessage=e=>{clearTimeout(timer);ch.port1.close();e.data.ok?resolve():reject(new Error('No se pudo descargar todo. Revisá tu conexión.'));};worker.postMessage({type:'PREPARAR_OFFLINE'},[ch.port2]);});
  await actualizarDatos();
}
