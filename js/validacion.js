// Esquema compartido por editor, lector público y servidor. Nunca ejecuta contenido.
export const CLAVES = ['ORGANOS','LUGARES','CRONOGRAMA','CONTACTOS','INFO','HERRAMIENTAS','CREDITOS'];
export const TIPOS_VALIDOS = ['edificio','sanitarios','accesible','comida','kiosco','heladeria','salud','info','acceso','estacion'];

const tracks=['sti','asamblearios','cs'];
function exigir(ok,mensaje){if(!ok)throw new Error(mensaje);}
function texto(v,n,max=300,opcional=false){exigir(typeof v==='string'&&v.length<=max&&(opcional||v.trim().length>0),`${n}: completá un texto de hasta ${max} caracteres.`);}
function lista(v,n,max){exigir(Array.isArray(v)&&v.length<=max,`${n}: lista inválida.`);}
function posicion(p){exigir(['x','y'].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=1),`${p.nombre||p.sigla}: posición fuera del mapa.`);}
function enlace(v){let u;try{u=new URL(v);}catch{}exigir(u&&['https:','http:'].includes(u.protocol),'El enlace debe comenzar con https:// o http://.');}
export function validarDatos(input){
  exigir(input&&typeof input==='object'&&!Array.isArray(input),'Contenido inválido.');
  const d=structuredClone(input); exigir(Object.keys(d).every(k=>CLAVES.includes(k)),'Sección desconocida.');
  lista(d.ORGANOS,'Órganos',100); exigir(d.ORGANOS.length>0,'Agregá al menos un órgano.');
  lista(d.LUGARES,'Lugares',1000); const ids=new Set();
  for(const p of d.LUGARES){texto(p.id,'ID',100);exigir(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)&&!p.id.startsWith('org-')&&!ids.has(p.id),'ID de lugar inválido o repetido.');ids.add(p.id);texto(p.nombre,'Nombre',150);exigir(TIPOS_VALIDOS.includes(p.tipo),'Tipo de lugar inválido.');posicion(p);if(p.det!==undefined)texto(p.det,'Detalle',500,true);}
  const siglas=new Set();
  for(const o of d.ORGANOS){exigir(typeof o.sigla==='string'&&/^[A-Z][A-Z0-9-]{0,14}$/.test(o.sigla)&&!siglas.has(o.sigla),'Órgano inválido o repetido.');siglas.add(o.sigla);texto(o.nombre,'Órgano',200);texto(o.sede,'Sede',150);exigir(tracks.includes(o.track),'Cronograma de órgano inválido.');posicion(o);if(o.nota!==undefined)texto(o.nota,'Nota',500,true);if(o.sedeId){const sede=d.LUGARES.find(p=>p.id===o.sedeId&&p.tipo==='edificio');exigir(sede,'La sede debe referenciar un edificio existente.');o.sede=sede.nombre;}}
  const referencia=(id)=>exigir(!id||ids.has(id),'El destino debe ser un lugar existente.');
  lista(d.CRONOGRAMA,'Cronograma',30);exigir(d.CRONOGRAMA.length>0,'Agregá al menos una jornada.');let fechaAnterior='';
  for(const j of d.CRONOGRAMA){exigir(/^\d{4}-\d{2}-\d{2}$/.test(j.fecha)&&!Number.isNaN(Date.parse(j.fecha))&&new Date(j.fecha).toISOString().slice(0,10)===j.fecha&&j.fecha>fechaAnterior,'Las fechas deben ser válidas y estar ordenadas, sin repetir.');fechaAnterior=j.fecha;texto(j.titulo,'Jornada',100);texto(j.subtitulo,'Descripción',150,true);lista(j.bloques,'Bloques',100);exigir(j.bloques.length>0,'Cada jornada necesita actividades.');let fin='00:00';for(const b of j.bloques){exigir([b.desde,b.hasta].every(h=>/^([01]\d|2[0-3]):[0-5]\d$/.test(h))&&b.desde<b.hasta&&b.desde>=fin,'Revisá horarios: deben estar ordenados y no superponerse.');fin=b.hasta;if(b.todos)texto(b.todos,'Actividad',500);else for(const t of tracks)texto(b[t],'Actividad de '+t,500);exigir(!b.tipo||['sesion','pausa','acto','social','cierre'].includes(b.tipo),'Tipo de actividad inválido.');referencia(b.lugar);}}
  lista(d.CONTACTOS,'Contactos',100);for(const c of d.CONTACTOS){texto(c.nombre,'Contacto',150);texto(c.detalle,'Detalle',500,true);texto(c.tel,'Teléfono',40,true);exigir(!c.tel||/^[+\d ()-]+$/.test(c.tel),'Teléfono inválido.');referencia(c.lugar);}
  lista(d.INFO,'Información',100);for(const i of d.INFO){texto(i.titulo,'Título',200);texto(i.texto,'Información',5000);referencia(i.lugar);if(i.enlaces){lista(i.enlaces,'Enlaces',20);for(const l of i.enlaces){texto(l.texto,'Enlace',150);enlace(l.url);}}}
  lista(d.HERRAMIENTAS,'Herramientas',50);for(const h of d.HERRAMIENTAS){texto(h.nombre,'Herramienta',150);texto(h.texto,'Descripción',5000);texto(h.boton,'Botón',150);enlace(h.url);}
  exigir(d.CREDITOS&&typeof d.CREDITOS==='object','Créditos inválidos.');for(const k of ['autor','usuario','para','organizacion'])texto(d.CREDITOS[k],'Créditos',300);enlace(d.CREDITOS.instagram);enlace(d.CREDITOS.sitio);
  return d;
}
export function resumenCambios(a,b){
  const cambios=[];
  for(const key of CLAVES){if(JSON.stringify(a[key])===JSON.stringify(b[key]))continue;
    if(['LUGARES','ORGANOS'].includes(key)){const id=key==='LUGARES'?'id':'sigla';const old=new Map(a[key].map(p=>[p[id],p]));for(const p of b[key]){const o=old.get(p[id]);if(!o)cambios.push(`Agregar: ${p.nombre}`);else if(JSON.stringify(o)!==JSON.stringify(p))cambios.push(`Actualizar: ${p.sigla||p.nombre}`);old.delete(p[id]);}for(const p of old.values())cambios.push(`Quitar: ${p.nombre}`);
    }else cambios.push(`Actualizar ${key.toLowerCase()}`);
  }return cambios;
}
