import {moverEntidad} from './editar-datos.js';
import {logoOrgano} from './organos.js';
import {obtenerDatos,publicacion,alCambiarDatos,actualizarDatos} from './datos.js';
import {crearMapa,TIPOS,GRUPOS,icono,puntosDeDatos} from './mapa.js';
import {validarDatos,resumenCambios,TIPOS_VALIDOS} from './validacion.js';
import {mezclar} from './mezclar.js';
import {esc} from './seguridad.js';
import {normalizar} from './buscador.js';
import * as geo from './geo.js';
const $=s=>document.querySelector(s),clone=x=>structuredClone(x);
let datos=obtenerDatos(),base=clone(datos),baseRevision=publicacion.revision,version=0,selected=null,mode=null,mapa;
let undo=[],redo=[],saving=Promise.resolve(),saveTimer,publishing=false,draftConflict=false,serverUnavailable=false,dirty=false,stoppedGPS;
let changeSerial=0,lastSavedSerial=0,checkpointKey=null,checkpointTime=0,pendingKey=null,recoveryKey='';
let busyMap=false;
async function request(path,method='GET',body){const endpoint=path.startsWith('/')?path:'/'+path;const r=await fetch(endpoint,{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});const b=await r.json();if(!r.ok){const e=new Error(b.error||'No se pudo completar la operación.');e.status=r.status;if(r.status===401&&recoveryKey){backup();aviso('La sesión venció. Tus cambios se conservaron; volvé a ingresar.',true);const link=document.createElement('a');link.href='/admin';link.textContent=' Volver a ingresar';$('#ed-aviso').append(link);}throw e;}return b;}
function aviso(text,error=false){$('#ed-aviso').hidden=!text;$('#ed-aviso').textContent=text;$('#ed-aviso').dataset.error=String(error);}
function changes(){return resumenCambios(base,datos);}
function backup(){try{localStorage.setItem(recoveryKey,JSON.stringify({datos,base,baseRevision,version,pendingKey,at:Date.now()}));}catch{aviso('No se pudo guardar la copia en este dispositivo. Descargá un respaldo si perdés conexión.',true);}}
function estado(text){if(text)$('#ed-estado').textContent=text;else $('#ed-estado').textContent=publishing?'Publicando…':draftConflict?'Conflicto de borrador':serverUnavailable?'Borrador pendiente de guardar':dirty?'Guardando borrador…':changes().length?`Borrador guardado · ${changes().length} cambios`:'Sin cambios pendientes';
  $('#ed-meta').textContent=baseRevision==='inicial'?'Basado en los datos iniciales':`Versión ${baseRevision.slice(0,8)} · ${session.local?'prueba local':'editor autorizado'}`;
  $('#ed-undo').disabled=!undo.length||publishing;$('#ed-redo').disabled=!redo.length||publishing;
  $('#ed-publicar').disabled=!changes().length||publishing||draftConflict;
  $('#ed-preview').disabled=publishing;$('#ed-descartar').disabled=!changes().length||publishing;
  $('#ed-total').textContent=changes().length?`${changes().length} cambios pendientes`:'Sin cambios pendientes';$('#ed-cambios').innerHTML=changes().map(s=>`<li>${esc(s)}</li>`).join('');
}
function checkpoint(key){const now=Date.now();if(!key||key!==checkpointKey||now-checkpointTime>1000){undo.push(clone(datos));if(undo.length>50)undo.shift();redo=[];}checkpointKey=key;checkpointTime=now;}
function changed({render=true}={}){dirty=true;changeSerial++;pendingKey=null;backup();if(render)renderAll();else estado();clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveDraft().catch(()=>{}),600);}
function edit(fn,key){if(publishing)return;checkpoint(key);fn();changed();}
function saveDraft(){
  clearTimeout(saveTimer);
  saving=saving.catch(()=>{}).then(async()=>{
    if(draftConflict)throw new Error('Recuperá el borrador del servidor antes de volver a guardar.');
    const serial=changeSerial,payload=clone(datos),rev=baseRevision;
    try{validarDatos(payload);}catch(e){serverUnavailable=true;estado('Revisá los campos antes de guardar');aviso(e.message,true);throw e;}
    try{const result=await request('api/draft','PUT',{datos:payload,baseRevision:rev,version});version=result.version;lastSavedSerial=serial;dirty=serial!==changeSerial;serverUnavailable=false;backup();estado();return result;}
    catch(e){serverUnavailable=true;if(e.status===409)draftConflict=true;aviso(e.message+' Tus cambios siguen en este dispositivo.',true);estado();throw e;}
  });return saving;
}
async function confirmar(title,body,ok='Continuar'){
  $('#ed-dialog-title').textContent=title;$('#ed-dialog-body').innerHTML=body;$('#ed-dialog-ok').textContent=ok;$('#ed-dialog').returnValue='cancel';$('#ed-dialog').showModal();
  return new Promise(resolve=>$('#ed-dialog').addEventListener('close',()=>resolve($('#ed-dialog').returnValue==='ok'),{once:true}));
}
function lugarSeleccionado(){return selected?.startsWith('org-')?datos.ORGANOS.find(o=>'org-'+o.sigla.toLowerCase()===selected):datos.LUGARES.find(p=>p.id===selected);}
function syncMap(){if(!mapa)return;busyMap=true;mapa.setDatos(datos);busyMap=false;}
function choose(id,center=false){selected=id;mode=null;renderPlace();busyMap=true;if(id&&center)mapa.centrarEn(id);else mapa.seleccionar(id,false);busyMap=false;renderList();guide();}
function guide(){const p=lugarSeleccionado();$('#ed-guia').textContent=mode==='add'?'Tocá el mapa donde querés agregar el lugar.':mode==='move'?`Tocá la nueva posición de ${p?.sigla||p?.nombre}.`:'Seleccioná un lugar para editarlo.';$('#ed-cancelar').hidden=!mode;$('#mapa').style.cursor=mode?'crosshair':'';}
function opcionesLugares(value='',edificios=false){return `<option value="">${edificios?'Sede sin edificio vinculado':'Sin destino en el mapa'}</option>`+datos.LUGARES.filter(p=>!edificios||p.tipo==='edificio').map(p=>`<option value="${esc(p.id)}" ${value===p.id?'selected':''}>${esc(p.nombre)}${p.det?' · '+esc(p.det):''}</option>`).join('');}
function setField(id,value){if(document.activeElement!==$(id))$(id).value=value??'';}
function renderPlace(){const p=lugarSeleccionado();$('#ed-ficha').hidden=!p;if(!p)return;
  const organo=!!p.sigla;$('#ed-titulo').textContent=organo?p.sigla:p.nombre||'Nuevo lugar';$('#ed-nombre-label').textContent=organo?'Nombre de la sede':'Nombre';$('#ed-det-label').textContent=organo?'Nota del órgano':'Detalle para orientarse';
  setField('#ed-nombre',organo?p.sede:p.nombre);setField('#ed-det',organo?p.nota:p.det);$('#ed-tipo-field').hidden=organo;$('#ed-sede-field').hidden=!organo;
  $('#ed-organo-fields').hidden=!organo;if(organo){setField('#ed-sigla',p.sigla);setField('#ed-organo-nombre',p.nombre);$('#ed-track').value=p.track;}
  $('#ed-tipo').value=p.tipo||'edificio';$('#ed-sede').innerHTML=opcionesLugares(p.sedeId,true);$('#ed-quitar').hidden=false;$('#ed-quitar').textContent=organo?'Quitar órgano':'Quitar lugar';
  const c=geo.aLatLon(p.x*geo.MAPA_PX,p.y*geo.MAPA_PX);$('#ed-coords').textContent=`x ${p.x.toFixed(4)} · y ${p.y.toFixed(4)} · ${c.lat.toFixed(6)}, ${c.lon.toFixed(6)}`;
}
const gruposAbiertos=new Set(['sede']);
function renderList(){const q=normalizar($('#ed-buscar').value);const puntos=puntosDeDatos(datos).filter(p=>normalizar([p.nombre,p.det,p.organo?.sigla,p.organo?.nombre].join(' ')).includes(q));$('#ed-cantidad').textContent=`${puntos.length} resultados por categoría`;
  $('#ed-lista').innerHTML=Object.entries(TIPOS).map(([tipo,config])=>{const items=puntos.filter(p=>p.tipo===tipo);if(!items.length)return '';return `<details class="ed-place-group" data-group="${tipo}" ${q||gruposAbiertos.has(tipo)||items.some(p=>p.id===selected)?'open':''}><summary>${esc(config.etiqueta)} <span>${items.length}</span></summary>${items.map(p=>`<button type="button" data-id="${esc(p.id)}" aria-pressed="${selected===p.id}"><span class="ed-place-icon" style="background:${TIPOS[p.tipo].color}">${p.organo?logoOrgano(p.organo.sigla):icono(p.tipo)}</span><span><strong>${esc(p.organo?.sigla||p.nombre)}</strong><small>${esc(p.organo?p.organo.nombre+' · '+p.nombre:p.det||TIPOS[p.tipo].etiqueta)}</small></span></button>`).join('')}</details>`;}).join('')||'<p class="ed-muted">No se encontraron lugares.</p>';
  $('#ed-lista').querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)gruposAbiertos.add(d.dataset.group);else gruposAbiertos.delete(d.dataset.group);}));
}
function renderAll(){syncMap();renderPlace();renderList();guide();estado();}
function field(label,path,value,type='text'){return `<label class="ed-field">${esc(label)}<input data-path="${path}" type="${type}" value="${esc(value??'')}"></label>`;}
function textarea(label,path,value){return `<label class="ed-field">${esc(label)}<textarea data-path="${path}" rows="3">${esc(value??'')}</textarea></label>`;}
function destino(path,value){return `<label class="ed-field">Destino en el mapa<select data-path="${path}">${opcionesLugares(value)}</select></label>`;}
function renderAgenda(){
 $('#ed-agenda').innerHTML=datos.CRONOGRAMA.map((j,i)=>`<details class="ed-card"><summary>${esc(j.titulo)} · ${j.bloques.length} actividades</summary>${field('Fecha',`CRONOGRAMA.${i}.fecha`,j.fecha,'date')}${field('Título',`CRONOGRAMA.${i}.titulo`,j.titulo)}${field('Descripción',`CRONOGRAMA.${i}.subtitulo`,j.subtitulo)}${j.bloques.map((b,k)=>{const path=`CRONOGRAMA.${i}.bloques.${k}`;return `<details class="ed-card"><summary>${esc(b.desde)} · ${esc(b.todos||b.asamblearios)}</summary><div class="ed-times">${field('Desde',`${path}.desde`,b.desde,'time')}${field('Hasta',`${path}.hasta`,b.hasta,'time')}</div><label class="ed-field">Actividad para<select data-mode="${i}.${k}"><option value="todos" ${b.todos?'selected':''}>Todo el modelo</option><option value="tracks" ${!b.todos?'selected':''}>Cada grupo de órganos</option></select></label>${b.todos?textarea('Actividad',`${path}.todos`,b.todos):['sti','asamblearios','cs'].map(t=>textarea({sti:'Sala de Tratados',asamblearios:'Asamblearios',cs:'Consejo de Seguridad'}[t],`${path}.${t}`,b[t])).join('')}<label class="ed-field">Tipo<select data-path="${path}.tipo">${['sesion','pausa','acto','social','cierre'].map(t=>`<option value="${t}" ${(b.tipo||'sesion')===t?'selected':''}>${{sesion:'Sesión',pausa:'Pausa',acto:'Acto',social:'Social',cierre:'Cierre'}[t]}</option>`).join('')}</select></label>${destino(`${path}.lugar`,b.lugar)}<button class="btn-danger" data-remove-block="${i}.${k}">Quitar actividad</button></details>`;}).join('')}<button class="btn-sec" data-add-block="${i}">Agregar actividad</button><button class="btn-danger" data-remove-day="${i}">Quitar jornada</button></details>`).join('')+'<button class="btn-sec" id="ed-add-day">Agregar jornada</button>';
}
function renderInfo(){
 $('#ed-info').innerHTML='<h3>Contactos</h3>'+datos.CONTACTOS.map((c,i)=>`<details class="ed-card"><summary>${esc(c.nombre)}</summary>${field('Nombre',`CONTACTOS.${i}.nombre`,c.nombre)}${textarea('Detalle',`CONTACTOS.${i}.detalle`,c.detalle)}${field('Teléfono',`CONTACTOS.${i}.tel`,c.tel,'tel')}${destino(`CONTACTOS.${i}.lugar`,c.lugar)}<button class="btn-danger" data-remove-info="CONTACTOS.${i}">Quitar contacto</button></details>`).join('')+'<button class="btn-sec" data-add-info="CONTACTOS">Agregar contacto</button><h3>Información práctica</h3>'+datos.INFO.map((v,i)=>`<details class="ed-card"><summary>${esc(v.titulo)}</summary>${field('Título',`INFO.${i}.titulo`,v.titulo)}${textarea('Texto',`INFO.${i}.texto`,v.texto)}${destino(`INFO.${i}.lugar`,v.lugar)}${(v.enlaces||[]).map((l,k)=>`${field('Texto del enlace',`INFO.${i}.enlaces.${k}.texto`,l.texto)}${field('Dirección',`INFO.${i}.enlaces.${k}.url`,l.url,'url')}<button class="btn-danger" data-remove-link="${i}.${k}">Quitar enlace</button>`).join('')}<button class="btn-sec" data-add-link="${i}">Agregar enlace</button><button class="btn-danger" data-remove-info="INFO.${i}">Quitar información</button></details>`).join('')+'<button class="btn-sec" data-add-info="INFO">Agregar información</button><h3>Herramientas</h3>'+datos.HERRAMIENTAS.map((h,i)=>`<details class="ed-card"><summary>${esc(h.nombre)}</summary>${field('Nombre',`HERRAMIENTAS.${i}.nombre`,h.nombre)}${textarea('Descripción',`HERRAMIENTAS.${i}.texto`,h.texto)}${field('Texto del botón',`HERRAMIENTAS.${i}.boton`,h.boton)}${field('Enlace',`HERRAMIENTAS.${i}.url`,h.url,'url')}<button class="btn-danger" data-remove-info="HERRAMIENTAS.${i}">Quitar herramienta</button></details>`).join('')+'<button class="btn-sec" data-add-info="HERRAMIENTAS">Agregar herramienta</button>';
}
function setPath(path,value){const parts=path.split('.');let at=datos;for(const p of parts.slice(0,-1))at=at[p];at[parts.at(-1)]=value;}
function openSections(fn){const open=[...document.querySelectorAll('.ed-panel details')].map((d,i)=>d.open?i:-1).filter(i=>i>=0);fn();document.querySelectorAll('.ed-panel details').forEach((d,i)=>d.open=open.includes(i));}
let session;
try{session=await request('api/session');}catch{$('#ed-acceso').textContent='No se pudo conectar con el servicio del editor. Revisá la conexión e intentá de nuevo.';throw new Error('Servicio no disponible');}
if(!session.editor){location.replace('/admin');$('#ed-acceso').innerHTML='<p>El mapa es público. Para editar necesitás una cuenta autorizada por la organización.</p><a class="btn-pri" href="/admin">Ingresar al editor</a>';}
else{
  let current;try{current=await request('api/current');}catch(e){$('#ed-acceso').textContent='No se pudo cargar la publicación actual. Recargá para volver a intentar.';throw e;}datos=validarDatos(current.datos);base=clone(datos);baseRevision=current.revision;
  recoveryKey='minulp.borrador.v2.'+session.editorId;
  $('#ed-logout').onclick=async()=>{if(dirty||serverUnavailable){if(!await confirmar('Cerrar sesión','<p>Hay cambios sin guardar en el servidor. Descargá un respaldo antes de salir.</p>','Salir de todas formas'))return;}clearTimeout(saveTimer);await saving.catch(()=>{});await request('/api/auth/logout','POST',{});try{localStorage.removeItem(recoveryKey);}catch{}location.replace('/admin');};
  $('#ed-acceso').hidden=true;$('#ed-app').hidden=false;
  let draft;try{draft=await request('api/draft');}catch(e){$('#ed-app').hidden=true;$('#ed-acceso').hidden=false;$('#ed-acceso').textContent='No se pudo recuperar tu borrador. Recargá para volver a intentar.';throw e;}
  if(draft){datos=validarDatos(draft.datos);baseRevision=draft.baseRevision;version=draft.version;const s=await request(`public/revisions/${encodeURIComponent(baseRevision)}.json`);base=s.datos;}
  let local;try{local=JSON.parse(localStorage.getItem(recoveryKey));}catch{}
  if(local&&JSON.stringify(local.datos)!==JSON.stringify(datos)){
    if(await confirmar('Recuperar cambios de este dispositivo','<p>Hay una copia local distinta del borrador guardado. Podés recuperarla o continuar con la del servidor.</p>','Recuperar copia local')){
      datos=clone(local.datos);base=clone(local.base);baseRevision=local.baseRevision;pendingKey=local.pendingKey;dirty=true;changeSerial++;
      if(local.version!==version){draftConflict=true;aviso('El servidor tiene otro borrador. Descargá tu copia antes de recuperar el del servidor.',true);}
    }
  }
  mapa=crearMapa($('#mapa'),{datos,alSeleccionar(p){if(busyMap||mode)return;selected=p?.id||null;renderPlace();renderList();},alTocarMapa(x,y){if(!mode||publishing)return;if(x<0||x>1||y<0||y>1){aviso('Elegí un punto dentro de la ilustración del predio.',true);return;}
    if(mode==='add'){edit(()=>{const id='lugar-'+crypto.randomUUID().slice(0,8);datos.LUGARES.push({id,nombre:'Nuevo lugar',tipo:'edificio',x,y,det:''});selected=id;mode=null;});choose(selected);$('#ed-nombre').focus();$('#ed-nombre').select();}
    else if(mode==='move'){edit(()=>{const p=lugarSeleccionado();if(p){moverEntidad(datos,p,x,y);}mode=null;});}
  }});
  $('#ed-tipo').innerHTML=TIPOS_VALIDOS.map(t=>`<option value="${t}">${esc(TIPOS[t].etiqueta)}</option>`).join('');
  $('#ed-filtros').innerHTML=GRUPOS.map(g=>`<button class="filtro" data-grupo="${g.id}" aria-pressed="true">${esc(g.etiqueta)}</button>`).join('');
  $('#ed-filtros').onclick=e=>{const b=e.target.closest('[data-grupo]');if(!b)return;b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));mapa.setFiltros([...$('#ed-filtros').querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.grupo));};
  $('#ed-zoom-in').onclick=()=>mapa.acercar();$('#ed-zoom-out').onclick=()=>mapa.alejar();$('#ed-fit').onclick=()=>mapa.encuadrar();
  $('#ed-buscar').oninput=renderList;$('#ed-lista').onclick=e=>{const b=e.target.closest('[data-id]');if(b)choose(b.dataset.id,true);};
  $('#ed-cerrar').onclick=()=>choose(null);$('#ed-cancelar').onclick=()=>{mode=null;guide();};
  $('#ed-agregar').onclick=()=>{selected=null;mode='add';renderPlace();guide();};$('#ed-mover').onclick=()=>{mode='move';guide();};
  $('#ed-agregar-organo').onclick=()=>{edit(()=>{let sigla='NUEVO';for(let n=2;datos.ORGANOS.some(o=>o.sigla===sigla);n++)sigla='NUEVO'+n;datos.ORGANOS.push({sigla,nombre:'Nuevo órgano',track:'asamblearios',sede:'Sede a confirmar',x:.5,y:.5,nota:''});selected='org-'+sigla.toLowerCase();mode=null;});choose(selected,true);$('#ed-organo-nombre').focus();$('#ed-organo-nombre').select();};
  $('#ed-sigla').onchange=e=>{const sigla=e.target.value.trim().toUpperCase();if(!/^[A-Z][A-Z0-9-]{0,14}$/.test(sigla)||datos.ORGANOS.some(o=>o!==lugarSeleccionado()&&o.sigla===sigla)){aviso('La sigla debe ser única y contener hasta 15 letras, números o guiones.',true);renderPlace();return;}edit(()=>{lugarSeleccionado().sigla=sigla;selected='org-'+sigla.toLowerCase();});};
  $('#ed-organo-nombre').oninput=e=>edit(()=>lugarSeleccionado().nombre=e.target.value,'organo-nombre-'+selected);
  $('#ed-track').onchange=e=>edit(()=>lugarSeleccionado().track=e.target.value);
  $('#ed-nombre').oninput=e=>edit(()=>{const p=lugarSeleccionado();if(p.sigla){p.sede=e.target.value;delete p.sedeId;}else{p.nombre=e.target.value;for(const o of datos.ORGANOS)if(o.sedeId===p.id)o.sede=p.nombre;}},'nombre-'+selected);
  $('#ed-det').oninput=e=>edit(()=>{const p=lugarSeleccionado();p[p.sigla?'nota':'det']=e.target.value;},'detalle-'+selected);
  $('#ed-tipo').onchange=e=>edit(()=>lugarSeleccionado().tipo=e.target.value);
  $('#ed-sede').onchange=e=>edit(()=>{const o=lugarSeleccionado(),sede=datos.LUGARES.find(p=>p.id===e.target.value);if(sede){o.sedeId=sede.id;o.sede=sede.nombre;o.x=sede.x;o.y=Math.max(0,sede.y-.013);}else delete o.sedeId;});
  $('#ed-quitar').onclick=async()=>{const p=lugarSeleccionado();if(!p)return;if(p.sigla){if(await confirmar('Quitar órgano',`<p>Se quitará ${esc(p.sigla)} del borrador. Su edificio se conserva.</p>`,'Quitar'))edit(()=>{datos.ORGANOS=datos.ORGANOS.filter(o=>o!==p);selected=null;});return;}const referenced=datos.ORGANOS.some(o=>o.sedeId===p.id)||datos.CONTACTOS.some(c=>c.lugar===p.id)||datos.INFO.some(c=>c.lugar===p.id)||datos.CRONOGRAMA.some(j=>j.bloques.some(b=>b.lugar===p.id));if(referenced){aviso('Este lugar es destino de una sede, actividad o contacto. Cambiá esas referencias antes de quitarlo.',true);return;}if(await confirmar('Quitar lugar',`<p>Se quitará ${esc(p.nombre)} del borrador. Podés deshacerlo antes de publicar.</p>`,'Quitar'))edit(()=>{datos.LUGARES=datos.LUGARES.filter(x=>x.id!==p.id);selected=null;});};
  $('#ed-undo').onclick=()=>{if(!undo.length)return;redo.push(clone(datos));datos=undo.pop();checkpointKey=null;changed();renderAgenda();renderInfo();};
  $('#ed-redo').onclick=()=>{if(!redo.length)return;undo.push(clone(datos));datos=redo.pop();checkpointKey=null;changed();renderAgenda();renderInfo();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){mode=null;guide();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$(e.shiftKey?'#ed-redo':'#ed-undo').click();}});
  document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-panel]').forEach(x=>{if(x===b)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});document.querySelectorAll('.ed-panel').forEach(p=>p.hidden=p.id!=='panel-'+b.dataset.panel);if(b.dataset.panel==='agenda')renderAgenda();if(b.dataset.panel==='info')renderInfo();if(b.dataset.panel==='historial')history();});
  $('#ed-plegar').onclick=e=>{const folded=$('.ed-sidebar').classList.toggle('plegada');e.target.textContent=folded?'Ampliar panel':'Reducir panel';e.target.setAttribute('aria-expanded',String(!folded));};
  for(const panel of ['#ed-agenda','#ed-info']){
    $(panel).addEventListener('input',e=>{const path=e.target.dataset.path;if(!path)return;checkpoint(path);setPath(path,e.target.value);changed({render:false});});
    $(panel).addEventListener('change',e=>{if(e.target.dataset.path)saveDraft().catch(()=>{});});
  }
  $('#ed-agenda').addEventListener('change',e=>{if(!e.target.dataset.mode)return;const [i,k]=e.target.dataset.mode.split('.').map(Number);edit(()=>{const b=datos.CRONOGRAMA[i].bloques[k];if(e.target.value==='todos'){b.todos=b.asamblearios||'Actividad';delete b.sti;delete b.asamblearios;delete b.cs;}else{b.sti=b.asamblearios=b.cs=b.todos;delete b.todos;}});openSections(renderAgenda);});
  $('#ed-agenda').onclick=async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.removeBlock){if(datos.CRONOGRAMA[Number(b.dataset.removeBlock.split('.')[0])].bloques.length===1){aviso('Conservá al menos una actividad por jornada.',true);return;}if(!await confirmar('Quitar actividad','<p>La actividad se quitará del borrador.</p>','Quitar'))return;edit(()=>{const[i,k]=b.dataset.removeBlock.split('.').map(Number);datos.CRONOGRAMA[i].bloques.splice(k,1);});}
    if(b.dataset.addBlock){edit(()=>{const j=datos.CRONOGRAMA[Number(b.dataset.addBlock)],desde=j.bloques.at(-1)?.hasta||'08:00';const [h,m]=desde.split(':').map(Number);const fin=Math.min(h*60+m+30,1439);j.bloques.push({desde,hasta:String(Math.floor(fin/60)).padStart(2,'0')+':'+String(fin%60).padStart(2,'0'),todos:'Nueva actividad',tipo:'sesion'});});}
    if(b.dataset.removeDay){if(datos.CRONOGRAMA.length===1){aviso('Conservá al menos una jornada.',true);return;}if(!await confirmar('Quitar jornada','<p>Se quitarán la jornada y sus actividades del borrador.</p>','Quitar'))return;edit(()=>datos.CRONOGRAMA.splice(Number(b.dataset.removeDay),1));}
    if(b.id==='ed-add-day')edit(()=>{const next=new Date(datos.CRONOGRAMA.at(-1).fecha+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);datos.CRONOGRAMA.push({fecha:next.toISOString().slice(0,10),titulo:'Nueva jornada',subtitulo:'',bloques:[{desde:'08:00',hasta:'09:00',todos:'Nueva actividad'}]});});
    openSections(renderAgenda);
  };
  $('#ed-info').onclick=async e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.removeInfo){if(!await confirmar('Quitar contenido','<p>Se quitará este contenido del borrador.</p>','Quitar'))return;edit(()=>{const[key,i]=b.dataset.removeInfo.split('.');datos[key].splice(Number(i),1);});}
    if(b.dataset.addInfo)edit(()=>{const key=b.dataset.addInfo;datos[key].push(key==='CONTACTOS'?{nombre:'Nuevo contacto',detalle:'',tel:''}:key==='INFO'?{titulo:'Nueva información',texto:'Completá la información.'}:{nombre:'Nueva herramienta',texto:'Descripción',boton:'Abrir',url:'https://acserp.org.ar'});});
    if(b.dataset.addLink)edit(()=>{const i=Number(b.dataset.addLink);(datos.INFO[i].enlaces||=[]).push({texto:'Nuevo enlace',url:'https://acserp.org.ar'});});
    if(b.dataset.removeLink)edit(()=>{const[i,k]=b.dataset.removeLink.split('.').map(Number);datos.INFO[i].enlaces.splice(k,1);});
    openSections(renderInfo);
  };
  $('#ed-exportar').onclick=()=>{const blob=new Blob([JSON.stringify({format:'minulp-borrador-v1',baseRevision,datos},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mapa-borrador.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);};
  $('#ed-importar').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>512000)throw new Error('El archivo es demasiado grande.');const parsed=JSON.parse(await file.text());const d=validarDatos(parsed.datos||parsed);if(await confirmar('Restaurar respaldo','<p>El contenido del archivo reemplazará tu borrador. No se publicará hasta aplicar los cambios.</p>','Restaurar')){edit(()=>datos=d);renderAgenda();renderInfo();}}catch(err){aviso(err.message,true);}finally{e.target.value='';}};
  $('#ed-descartar').onclick=async()=>{if(await confirmar('Descartar borrador','<p>Volverás a la publicación sobre la que empezaste. Podés deshacer esta acción.</p>','Descartar')){edit(()=>datos=clone(base));renderAgenda();renderInfo();}};
  $('#ed-recuperar').onclick=async()=>{if(!await confirmar('Recuperar borrador del servidor','<p>Esto reemplaza la copia de esta pestaña. Descargá un respaldo primero si querés conservarla.</p>','Recuperar'))return;clearTimeout(saveTimer);try{await saving.catch(()=>{});const d=await request('api/draft');if(!d){aviso('No hay un borrador guardado.');return;}checkpoint();datos=validarDatos(d.datos);baseRevision=d.baseRevision;version=d.version;base=(await request(`public/revisions/${encodeURIComponent(baseRevision)}.json`)).datos;draftConflict=false;serverUnavailable=false;dirty=false;pendingKey=null;backup();renderAll();renderAgenda();renderInfo();aviso('Borrador recuperado.');}catch(e){aviso(e.message,true);}};
  $('#ed-preview').onclick=async()=>{try{const d=validarDatos(datos);const {id}=await request('api/preview','POST',{datos:d});aviso('Vista previa lista.');$('#ed-aviso').innerHTML=`Vista previa privada lista. <a href="index.html?preview=${encodeURIComponent(id)}" target="_blank" rel="noopener">Abrir vista previa ↗</a>`;}catch(e){aviso(e.message,true);}};
  $('#ed-publicar').onclick=async()=>{
    if(publishing)return;let clean;try{clean=validarDatos(datos);}catch(e){aviso(e.message,true);return;}
    if(!await confirmar('Aplicar cambios al mapa público',`<p>Se publicarán estos cambios para quienes consultan el mapa${session.local?' en este servidor local':''}:</p><ul>${resumenCambios(base,clean).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`,'Aplicar cambios'))return;
    publishing=true;$('#ed-app').querySelectorAll('input,textarea,select,.ed-sidebar button').forEach(el=>el.disabled=true);estado();
    try{await saveDraft();pendingKey||=crypto.randomUUID();backup();const result=await request('api/publish','POST',{datos:clean,baseRevision,key:pendingKey});base=clone(clean);datos=clone(clean);baseRevision=result.revision;undo=[];redo=[];pendingKey=null;changeSerial++;dirty=true;backup();let draftSaved=true;try{await saveDraft();}catch{draftSaved=false;}await actualizarDatos();$('#ed-conflicto').hidden=true;aviso(draftSaved?`Cambios publicados${session.local?' en local':''}. El mapa público los detectará automáticamente.`:'Publicado. No se pudo actualizar el borrador guardado; descargá un respaldo.',!draftSaved);renderAll();}
    catch(e){aviso(e.message,true);if(e.status===409)$('#ed-conflicto').hidden=false;}
    finally{publishing=false;$('#ed-app').querySelectorAll('input,textarea,select,.ed-sidebar button').forEach(el=>el.disabled=false);estado();}
  };
  async function history(){try{const rows=await request('api/history');$('#ed-historial').innerHTML=rows.map(r=>`<article class="ed-card"><h3>${esc(new Date(r.publishedAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'}))}</h3><small>Versión ${r.revision.slice(0,8)}</small><ul>${r.resumen.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><button class="btn-sec" data-restore="${r.revision}">Traer al borrador</button></article>`).join('')+'<article class="ed-card"><h3>Versión inicial</h3><button class="btn-sec" data-restore="inicial">Traer al borrador</button></article>';}catch(e){$('#ed-historial').textContent=e.message;}}
  $('#ed-refresh-history').onclick=history;$('#ed-historial').onclick=async e=>{const b=e.target.closest('[data-restore]');if(!b)return;try{if(!await confirmar('Recuperar versión','<p>La versión elegida reemplazará el borrador. Para hacerla pública, aplicá los cambios.</p>','Recuperar'))return;const s=await request(`public/revisions/${b.dataset.restore}.json`);edit(()=>datos=validarDatos(s.datos));aviso('Versión recuperada en el borrador.');}catch(err){aviso(err.message,true);}};
  $('#ed-revisar').onclick=async()=>{try{clearTimeout(saveTimer);await saving.catch(()=>{});const s=await request('api/current');const merge=mezclar(base,datos,s.datos);const choices={};
    if(merge.conflictos.length){const content='<p>Elegí qué conservar en cada conflicto. Los cambios independientes se combinan automáticamente.</p>'+merge.conflictos.map((c,i)=>`<fieldset class="ed-conflict-item"><legend>${esc(c.path)}</legend><label><input type="radio" name="conflict-${i}" value="publico" checked> Versión publicada</label><pre>${esc(JSON.stringify(c.publico??'(quitado)',null,2))}</pre><label><input type="radio" name="conflict-${i}" value="mio"> Mi borrador</label><pre>${esc(JSON.stringify(c.mio??'(quitado)',null,2))}</pre></fieldset>`).join('');if(!await confirmar('Resolver diferencias',content,'Combinar'))return;merge.conflictos.forEach((c,i)=>choices[c.path]=document.querySelector(`[name="conflict-${i}"]:checked`).value);}
    const merged=validarDatos(mezclar(base,datos,s.datos,choices).datos);checkpoint();datos=merged;base=clone(s.datos);baseRevision=s.revision;changed();$('#ed-conflicto').hidden=true;renderAgenda();renderInfo();aviso('Diferencias combinadas en el borrador. Revisá y aplicá los cambios.');
  }catch(e){aviso(e.message,true);}};
  $('#ed-gps').onclick=()=>{if(stoppedGPS){stoppedGPS();stoppedGPS=null;mapa.setUbicacion(null);$('#ed-gps').textContent='Mostrar mi ubicación';return;}$('#ed-gps').textContent='Desactivar GPS';let syncError=false;const stop=geo.seguirUbicacion(u=>{mapa.setUbicacion(u);$('#ed-gps-estado').textContent=`Precisión aproximada: ±${Math.round(u.precision)} m`;},e=>{syncError=true;$('#ed-gps-estado').textContent=`No se pudo obtener la ubicación (${e}).`;stoppedGPS?.();stoppedGPS=null;$('#ed-gps').textContent='Mostrar mi ubicación';});if(syncError)stop();else stoppedGPS=stop;};
  alCambiarDatos(()=>{if(publicacion.revision!==baseRevision)$('#ed-conflicto').hidden=false;});
  window.addEventListener('beforeunload',e=>{if(dirty||serverUnavailable){backup();e.preventDefault();e.returnValue='';}});
  window.addEventListener('online',()=>{if(dirty&&!draftConflict)saveDraft().catch(()=>{});});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty)backup();});
  renderAll();renderAgenda();renderInfo();$('#ed-conflicto').hidden=current.revision===baseRevision;
  if(dirty&&!draftConflict)saveDraft().catch(()=>{});
  if(session.local)aviso('Prueba local: los cambios se guardan en esta computadora. No modifican el sitio publicado.');
}
