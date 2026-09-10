// ============================================================================
//  app.js — arma la interfaz y conecta mapa, cronograma, buscador y perfil.
// ============================================================================

import { ORGANOS, CRONOGRAMA, CONTACTOS, INFO, HERRAMIENTAS, CREDITOS } from './datos.js';
import { crearMapa, TIPOS, GRUPOS, icono, todosLosPuntos } from './mapa.js';
import * as geo from './geo.js';
import * as cron from './cronograma.js';
import { buscar, sugerencias } from './buscador.js';
import { obtenerPerfil, guardarPerfil, alCambiarPerfil, miOrgano, miTrack }
  from './perfil.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let mapa = null;
let pararGps = null;
let estadoGps = 'apagado';        // apagado | buscando | activo | error
let jornadaVisible = cron.jornadaPorDefecto();
let jornadaElegidaAMano = false;

// ===========================================================================
//  VISTAS
// ===========================================================================
function irA(vista, foco = true) {
  $$('.vista').forEach((v) => { v.hidden = v.id !== 'vista-' + vista; });
  $$('.tabbar button').forEach((b) => {
    const act = b.dataset.vista === vista;
    b.classList.toggle('activo', act);
    if (act) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (vista === 'cronograma') pintarCronograma();
  if (vista === 'info') pintarInfo();
  if (vista === 'buscar' && foco) setTimeout(() => $('#q').focus(), 60);
  location.hash = vista;
}

$$('.tabbar button').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));

// el logo del encabezado es el camino de vuelta al mapa desde cualquier lado
$('#btn-inicio').addEventListener('click', () => { irA('mapa'); verComo('mapa'); });

// ===========================================================================
//  MAPA
// ===========================================================================
function iniciarMapa() {
  mapa = crearMapa($('#mapa'), {
    alSeleccionar: pintarFicha,
    // cuando tu punto se sale de la pantalla, el boton de ubicacion late para
    // que se entienda que tocandolo volves a encontrarte
    alQuedarFuera(fuera, metros) {
      const b = $('#btn-ubicar');
      b.classList.toggle('ctrl-late', fuera);
      b.setAttribute('aria-label', fuera
        ? `Estás fuera de la vista, a ${geo.formatearDistancia(metros)}. Tocá para verte en el mapa.`
        : 'Mostrar dónde estoy');
    },
  });

  const cont = $('#filtros');
  cont.innerHTML = GRUPOS.map((g) =>
    `<button type="button" class="filtro" data-g="${g.id}" aria-pressed="true">${esc(g.etiqueta)}</button>`
  ).join('');
  cont.addEventListener('click', (e) => {
    const b = e.target.closest('.filtro');
    if (!b) return;
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    const activos = $$('.filtro[aria-pressed="true"]').map((x) => x.dataset.g);
    mapa.setFiltros(activos);
    if (!$('#lista-lugares').hidden) pintarLista();
  });

  $('#btn-acercar').addEventListener('click', () => mapa.acercar());
  $('#btn-alejar').addEventListener('click', () => mapa.alejar());
  $('#btn-encuadrar').addEventListener('click', () => mapa.encuadrar());
  $('#btn-ubicar').addEventListener('click', alternarGps);
  $('#btn-fondo').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    mapa.setFondo(on ? 'oficial' : 'limpio');
  });

  $('#btn-ver-mapa').addEventListener('click', () => verComo('mapa'));
  $('#btn-ver-lista').addEventListener('click', () => verComo('lista'));

  // si ya hay perfil, arrancamos mirando la sede propia
  const sede = miOrgano();
  if (sede) setTimeout(() => mapa.centrarEn('org-' + sede.sigla.toLowerCase()), 350);
}

/**
 * Lleva un punto al centro del mapa desde donde sea que estes. Fuerza tambien
 * la vista de mapa: si quedo abierta la lista, el mapa esta oculto y "ver en el
 * mapa" no mostraria nada.
 */
function verEnElMapa(id, demora = 60) {
  irA('mapa');
  verComo('mapa');
  setTimeout(() => mapa.centrarEn(id), demora);
}

function verComo(cual) {
  const esLista = cual === 'lista';
  $('#mapa-caja').hidden = esLista;
  $('#lista-lugares').hidden = !esLista;
  $('#btn-ver-mapa').classList.toggle('activo', !esLista);
  $('#btn-ver-lista').classList.toggle('activo', esLista);
  $('#btn-ver-mapa').setAttribute('aria-pressed', String(!esLista));
  $('#btn-ver-lista').setAttribute('aria-pressed', String(esLista));
  if (esLista) pintarLista();
}

// ---------------------------------------------------------------- ubicacion
function alternarGps() {
  if (pararGps) {
    pararGps(); pararGps = null; estadoGps = 'apagado';
    mapa.setUbicacion(null);
    $('#btn-ubicar').dataset.estado = '';
    avisar(null);
    return;
  }
  let apagado = false;
  estadoGps = 'buscando';
  $('#btn-ubicar').dataset.estado = 'buscando';
  avisar('Buscando tu ubicación…');
  const parar = geo.seguirUbicacion(
    (u) => {
      const primera = estadoGps !== 'activo';
      estadoGps = 'activo';
      $('#btn-ubicar').dataset.estado = 'activo';
      mapa.setUbicacion(u);
      if (primera) mapa.enfocarPrimeraLectura();
      if (!geo.dentroDelPredio(u.lat, u.lon)) {
        const acc = puntoMasCercano(u, (p) => p.tipo === 'acceso');
        avisar(acc
          ? `Estás fuera del predio, a ${geo.formatearDistancia(acc.metros)} de ${acc.punto.nombre}.`
          : 'Estás fuera del predio.');
      } else if (u.precision > 50) {
        avisar(`Ubicación aproximada (± ${Math.round(u.precision)} m). Salí a un lugar abierto para mejorarla.`);
      } else {
        avisar(null);
      }
      if (!$('#lista-lugares').hidden) pintarLista();
    },
    (err) => {
      avisar({
        permiso: 'No nos diste permiso para usar tu ubicación. Podés activarla desde los ajustes del navegador.',
        demora: 'El GPS está tardando. Probá al aire libre, lejos de los edificios.',
        'sin-soporte': 'Este navegador no permite usar la ubicación.',
        'no-disponible': 'No pudimos obtener tu ubicación en este momento.',
      }[err] || 'No pudimos obtener tu ubicación.');
      // Una demora es pasajera: el seguimiento sigue vivo y la proxima lectura
      // puede llegar sola. Con el resto de los errores no hay nada que esperar,
      // asi que lo apagamos: si no, cada toque al boton dejaba otro GPS prendido.
      if (err === 'demora') return;
      estadoGps = 'error';
      $('#btn-ubicar').dataset.estado = '';
      if (pararGps) pararGps();
      pararGps = null;
      apagado = true;
    },
  );
  // si el error salto de entrada (sincronico), no dejamos el seguimiento colgado
  if (apagado) parar(); else pararGps = parar;
}

function avisar(txt) {
  const el = $('#aviso-gps');
  el.hidden = !txt;
  if (txt) el.textContent = txt;
}

/** Punto mas cercano a una ubicacion, con su distancia en metros. */
function puntoMasCercano(u, filtro = () => true) {
  let mejor = null;
  for (const p of todosLosPuntos()) {
    if (!filtro(p)) continue;
    const c = geo.aLatLon(p.x * geo.MAPA_PX, p.y * geo.MAPA_PX);
    const m = geo.distancia(u.lat, u.lon, c.lat, c.lon);
    if (!mejor || m < mejor.metros) mejor = { punto: p, metros: m };
  }
  return mejor;
}

function distanciaA(punto, u) {
  if (!u) return null;
  const c = geo.aLatLon(punto.x * geo.MAPA_PX, punto.y * geo.MAPA_PX);
  // La flecha se calcula desde el LUGAR hacia vos y se invierte, en vez de
  // proyectar tu posicion: si estás lejos, esa proyeccion puede venir espejada.
  const d = geo.direccionHacia(punto.x * geo.MAPA_PX, punto.y * geo.MAPA_PX, u.lat, u.lon);
  return {
    metros: geo.distancia(u.lat, u.lon, c.lat, c.lon),
    rumbo: geo.rumbo(u.lat, u.lon, c.lat, c.lon),
    // el svg de la flecha apunta hacia arriba, de ahi el +90
    anguloMapa: Math.atan2(-d.dy, -d.dx) * 180 / Math.PI + 90,
  };
}

// -------------------------------------------------------------------- ficha
function pintarFicha(p, u) {
  const f = $('#ficha');
  if (!p) { f.hidden = true; f.innerHTML = ''; return; }
  const o = p.organo;
  const d = distanciaA(p, u);

  const cabecera = o
    ? `<img class="ficha-logo" src="img/logos/${o.sigla}.webp" alt="" width="192" height="192">
       <div><h2>${esc(o.sigla)} · ${esc(o.nombre)}</h2>
       <p class="ficha-sub">Sesiona en ${esc(p.nombre)}${o.nota ? ' · ' + esc(o.nota) : ''}</p></div>`
    : `<span class="ficha-icono" style="background:${TIPOS[p.tipo].color}">${icono(p.tipo)}</span>
       <div><h2>${esc(p.nombre)}</h2>
       <p class="ficha-sub">${esc(p.det || TIPOS[p.tipo].etiqueta)}</p></div>`;

  const datos = [];
  if (d) {
    datos.push(`<div class="dato"><dt>Distancia</dt><dd>
      <svg class="rumbo-flecha" viewBox="0 0 24 24" aria-hidden="true"
           style="transform:rotate(${d.anguloMapa.toFixed(0)}deg)"><path d="M12 2 21 21l-9-5-9 5Z"/></svg>
      ${geo.formatearDistancia(d.metros)}</dd></div>`);
    datos.push(`<div class="dato"><dt>Caminando</dt><dd>${geo.minutosCaminando(d.metros)} min · al ${geo.nombreRumbo(d.rumbo)}</dd></div>`);
  }
  if (o) {
    const est = cron.estadoEn();
    const ahora = est.actual ? cron.textoBloque(est.actual, o.track) : null;
    datos.push(`<div class="dato"><dt>Ahora acá</dt><dd>${esc(ahora || 'Sin actividad')}</dd></div>`);
  }

  f.innerHTML = `
    <button type="button" class="ficha-cerrar" aria-label="Cerrar">&times;</button>
    <div class="ficha-cab">${cabecera}</div>
    ${datos.length ? `<dl class="ficha-datos">${datos.join('')}</dl>` : ''}
    <div class="ficha-acciones">
      ${o ? '<button type="button" class="btn-pri" data-ir="cronograma">Ver su cronograma</button>' : ''}
      ${!d ? '<button type="button" class="btn-sec" data-ir="ubicar">¿A qué distancia estoy?</button>' : ''}
    </div>`;
  f.hidden = false;
  // la ficha tapa parte del mapa: corremos la vista si el punto quedo abajo
  requestAnimationFrame(() => {
    const fr = f.getBoundingClientRect();
    const mr = $('#mapa').getBoundingClientRect();
    mapa.asegurarVisible(p.id, {
      x0: fr.left - mr.left, y0: fr.top - mr.top,
      x1: fr.right - mr.left, y1: fr.bottom - mr.top,
    });
  });
  f.querySelector('.ficha-cerrar').addEventListener('click', () => mapa.seleccionar(null));
  const ir = f.querySelector('[data-ir="cronograma"]');
  if (ir) ir.addEventListener('click', () => { if (o) guardarPerfil({ organo: o.sigla }); irA('cronograma'); });
  const ub = f.querySelector('[data-ir="ubicar"]');
  if (ub) ub.addEventListener('click', alternarGps);
}

// -------------------------------------------------------------------- lista
function pintarLista() {
  const u = mapa ? mapa.ubicacion() : null;
  const activos = new Set();
  $$('.filtro[aria-pressed="true"]').forEach((b) => {
    GRUPOS.find((g) => g.id === b.dataset.g).tipos.forEach((t) => activos.add(t));
  });

  let items = todosLosPuntos().filter((p) => activos.has(p.tipo)).map((p) => ({
    p, d: distanciaA(p, u),
  }));
  if (u) items.sort((a, b) => a.d.metros - b.d.metros);

  const cont = $('#lista-lugares');
  if (!items.length) {
    cont.innerHTML = '<p class="vacio">No hay nada seleccionado. Activá algún filtro de arriba.</p>';
    return;
  }
  const encabezado = u
    ? '<p class="lista-grupo">Ordenado por cercanía a donde estás</p>'
    : '<p class="lista-grupo">Tocá el botón de ubicación para ordenarlos por cercanía</p>';

  cont.innerHTML = encabezado + items.map(({ p, d }) => {
    const o = p.organo;
    const ico = o
      ? `<img src="img/logos/${o.sigla}.webp" alt="" width="192" height="192">`
      : icono(p.tipo);
    return `<button type="button" class="fila" data-id="${esc(p.id)}">
      <span class="fila-icono" style="background:${o ? `var(--c-${o.sigla.toLowerCase()})` : TIPOS[p.tipo].color}">${ico}</span>
      <span class="fila-txt">
        <span class="fila-titulo">${esc(o ? o.sigla + ' · ' + o.nombre : p.nombre)}</span>
        <span class="fila-sub">${esc(o ? 'Sesiona en ' + p.nombre : (p.det || TIPOS[p.tipo].etiqueta))}</span>
      </span>
      ${d ? `<span class="fila-dist">${geo.formatearDistancia(d.metros)}</span>` : ''}
    </button>`;
  }).join('');

  cont.onclick = (e) => {
    const b = e.target.closest('.fila');
    if (!b) return;
    verEnElMapa(b.dataset.id);
  };
}

// ===========================================================================
//  CRONOGRAMA
// ===========================================================================
function pintarCronograma() {
  // mientras nadie toque las pestanas, la vista sigue al dia que corre
  if (!jornadaElegidaAMano) jornadaVisible = cron.jornadaPorDefecto();
  const track = miTrack();
  const o = miOrgano();
  pintarAhora();

  $('#tabs-jornada').innerHTML = CRONOGRAMA.map((j, i) => {
    const hoy = new Date().toISOString().slice(0, 10) === j.fecha;
    return `<button type="button" role="tab" class="tab-jornada" data-i="${i}"
      aria-selected="${i === jornadaVisible}" data-hoy="${hoy ? 1 : 0}">
      ${esc(j.titulo)}<small>${esc(j.subtitulo)}</small></button>`;
  }).join('');
  $('#tabs-jornada').onclick = (e) => {
    const b = e.target.closest('.tab-jornada');
    if (!b) return;
    jornadaVisible = Number(b.dataset.i);
    jornadaElegidaAMano = true;
    pintarCronograma();
  };

  const ahora = new Date();
  const j = CRONOGRAMA[jornadaVisible];
  const bloques = cron.todosLosBloques().filter((b) => b.jornada.fecha === j.fecha);

  const intro = o
    ? `<p class="lista-grupo">Cronograma de ${esc(o.sigla)} · ${esc(cron.nombreTrack(o.track))}</p>`
    : '<p class="lista-grupo">Elegí tu órgano arriba para ver solo lo tuyo</p>';

  $('#bloques').innerHTML = intro + bloques.map((b) => {
    const esAhora = ahora >= b.inicio && ahora < b.fin;
    const pasado = ahora >= b.fin;
    let cuerpo;
    if (b.todos) {
      cuerpo = `<div class="bloque-titulo">${esc(b.todos)}</div>`;
    } else if (track) {
      cuerpo = `<div class="bloque-titulo">${esc(cron.textoBloque(b, track))}</div>
                <div class="bloque-col">${esc(cron.nombreTrack(track))}</div>`;
    } else {
      cuerpo = cron.columnasBloque(b).map((c) =>
        `<div class="bloque-col"><b>${esc(cron.nombreTrack(c.track))}:</b> ${esc(c.texto)}</div>`).join('');
    }
    const irSede = (!b.todos && o)
      ? `<button type="button" class="bloque-ir" data-sede="org-${o.sigla.toLowerCase()}">Ver dónde es</button>`
      : '';
    return `<div class="bloque bloque-${b.tipo || 'sesion'}${esAhora ? ' bloque-ahora' : ''}${pasado ? ' bloque-pasado' : ''}">
      <div class="bloque-hora">${esc(b.desde)}<small>${esc(b.hasta)}</small></div>
      <div class="bloque-cuerpo">${cuerpo}${irSede}</div>
    </div>`;
  }).join('');

  $('#bloques').onclick = (e) => {
    const b = e.target.closest('[data-sede]');
    if (!b) return;
    verEnElMapa(b.dataset.sede);
  };
}

function pintarAhora() {
  const ahora = new Date();
  const { estado, actual, siguiente } = cron.estadoEn(ahora);
  const track = miTrack();
  const el = $('#ahora');

  if (estado === 'antes') {
    el.innerHTML = `<p class="ahora-tag">Falta poco</p>
      <h2>El modelo arranca el ${esc(CRONOGRAMA[0].titulo.toLowerCase())} a las ${esc(siguiente.desde)}</h2>
      <p class="ahora-meta">${esc(siguiente.todos || 'Primera actividad')}</p>
      <p class="ahora-sig">Faltan <b>${cron.faltan(siguiente.inicio - ahora)}</b>.</p>`;
    return;
  }
  if (estado === 'despues') {
    el.innerHTML = `<p class="ahora-tag">Terminó</p>
      <h2>El MINULP 2026 ya terminó</h2>
      <p class="ahora-meta">Gracias por ser parte. Nos vemos en la próxima edición.</p>`;
    return;
  }
  if (estado === 'entre' || !actual) {
    el.innerHTML = `<p class="ahora-tag">Ahora</p>
      <h2>No hay actividad en curso</h2>
      ${siguiente ? `<p class="ahora-sig">Lo próximo: <b>${esc(siguiente.todos || cron.textoBloque(siguiente, track) || 'sesión')}</b>
        a las ${esc(siguiente.desde)}, en ${cron.faltan(siguiente.inicio - ahora)}.</p>` : ''}`;
    return;
  }

  const texto = actual.todos || cron.textoBloque(actual, track) ||
    cron.columnasBloque(actual).map((c) => c.texto).join(' · ');
  const pct = Math.round(cron.progreso(actual, ahora) * 100);
  el.innerHTML = `<p class="ahora-tag">Ahora</p>
    <h2>${esc(texto)}</h2>
    <p class="ahora-meta">${esc(actual.desde)} a ${esc(actual.hasta)}${track && !actual.todos ? ' · ' + esc(cron.nombreTrack(track)) : ''}</p>
    <div class="barra"><span style="width:${pct}%"></span></div>
    <p class="ahora-sig">Termina en <b>${cron.faltan(actual.fin - ahora)}</b>${siguiente ? `. Después: ${esc(siguiente.todos || cron.textoBloque(siguiente, track) || 'sesión')}` : ''}.</p>`;
}

setInterval(() => {
  if (!$('#vista-cronograma').hidden) pintarAhora();
}, 30000);

// ===========================================================================
//  BUSCADOR
// ===========================================================================
function pintarAtajos() {
  $('#atajos').innerHTML = sugerencias()
    .map((s) => `<button type="button" class="atajo" data-q="${esc(s.consulta)}">${esc(s.texto)}</button>`)
    .join('');
}

function pintarResultados(q) {
  const ul = $('#resultados');
  if (!q.trim()) { ul.innerHTML = ''; return; }
  const u = mapa ? mapa.ubicacion() : null;
  const res = buscar(q);
  if (!res.length) {
    ul.innerHTML = `<li class="vacio">No encontramos “${esc(q)}”. Probá con la sigla del órgano o con “baño”, “comer”, “salida”.</li>`;
    return;
  }
  ul.innerHTML = res.map((r) => {
    const p = r.punto;
    const d = distanciaA(p, u);
    const ico = r.sigla
      ? `<img src="img/logos/${r.sigla}.webp" alt="" width="192" height="192">`
      : icono(p.tipo);
    return `<li><button type="button" class="fila" data-id="${esc(p.id)}">
      <span class="fila-icono" style="background:${r.sigla ? `var(--c-${r.sigla.toLowerCase()})` : TIPOS[p.tipo].color}">${ico}</span>
      <span class="fila-txt">
        <span class="fila-titulo">${esc(r.titulo)}</span>
        <span class="fila-sub">${esc(r.subtitulo)}</span>
      </span>
      ${d ? `<span class="fila-dist">${geo.formatearDistancia(d.metros)}</span>` : ''}
    </button></li>`;
  }).join('');
}

$('#q').addEventListener('input', (e) => pintarResultados(e.target.value));
$('#atajos').addEventListener('click', (e) => {
  const b = e.target.closest('.atajo');
  if (!b) return;
  $('#q').value = b.dataset.q;
  pintarResultados(b.dataset.q);
});
$('#resultados').addEventListener('click', (e) => {
  const b = e.target.closest('.fila');
  if (!b) return;
  verEnElMapa(b.dataset.id);
});

// ===========================================================================
//  INFO
// ===========================================================================
function pintarInfo() {
  const o = miOrgano();
  const partes = [];

  if (o) {
    partes.push(`<div class="tarjeta">
      <h2>Sos de ${esc(o.sigla)}</h2>
      <p>${esc(o.nombre)}. Sesiona en <b>${esc(o.sede)}</b>${cron.nombreTrack(o.track) === o.nombre ? '' : ', dentro de ' + esc(cron.nombreTrack(o.track))}.</p>
      <div class="ficha-acciones">
        <button type="button" class="btn-pri" id="info-ver-sede">Ver mi sede en el mapa</button>
        <button type="button" class="btn-sec" id="info-cambiar">Cambiar</button>
      </div></div>`);
  } else {
    partes.push(`<div class="tarjeta">
      <h2>Estás viendo todo el modelo</h2>
      <p>Si elegís tu órgano, el cronograma te muestra solo lo tuyo y el mapa te marca tu sede.
      No es obligatorio: así como está funciona igual.</p>
      <div class="ficha-acciones"><button type="button" class="btn-pri" id="info-cambiar">Elegir mi órgano</button></div>
    </div>`);
  }

  // Primero lo que alguien viene a buscar estando en el predio.
  partes.push('<h2 class="lista-grupo">Lo que conviene saber</h2>');
  partes.push(INFO.map((i) => `<div class="tarjeta">
      <h2>${esc(i.titulo)}</h2>
      <p>${esc(i.texto)}</p>
      ${i.enlaces && i.enlaces.length ? `<p class="enlaces">${i.enlaces.map((l) =>
    `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.texto)}</a>`).join('')}</p>` : ''}
      ${i.lugar ? `<div class="ficha-acciones">
        <button type="button" class="btn-sec" data-lugar="${esc(i.lugar)}">Ver en el mapa</button></div>` : ''}
    </div>`).join(''));

  // Solo los contactos que sirven para algo: con telefono para llamar o con un
  // punto en el mapa al que ir. Una tarjeta que dice "numero a completar" no le
  // resuelve nada a quien la esta leyendo en el predio.
  const contactos = CONTACTOS.filter((c) => c.tel || c.lugar);
  if (contactos.length) {
    partes.push(`<h2 class="lista-grupo">${contactos.some((c) => c.tel) ? 'Teléfonos y ayuda' : 'Dónde pedir ayuda'}</h2>`);
    const puntos = todosLosPuntos();
    partes.push(contactos.map((c) => {
      // el mismo simbolo que tiene en el mapa, para reconocerlo de un vistazo
      const p = c.lugar ? puntos.find((q) => q.id === c.lugar) : null;
      return `
      <div class="tarjeta ${c.urgente ? 'tarjeta-urgente' : ''}">
        <div class="contacto ${c.urgente ? 'contacto-urgente' : ''}">
          ${p ? `<span class="fila-icono" style="background:${TIPOS[p.tipo].color}">${icono(p.tipo)}</span>` : ''}
          <div class="contacto-txt">
            <h2>${esc(c.nombre)}</h2>
            <p>${esc(c.detalle)}</p>
          </div>
          ${c.tel ? `<a class="contacto-tel" href="tel:${esc(c.tel.replace(/\s/g, ''))}">Llamar</a>` : ''}
        </div>
        ${c.lugar ? `<div class="ficha-acciones">
          <button type="button" class="btn-sec" data-lugar="${esc(c.lugar)}">Ver en el mapa</button></div>` : ''}
      </div>`;
    }).join(''));
  }

  if (HERRAMIENTAS.length) {
    partes.push('<h2 class="lista-grupo">Para practicar</h2>');
    partes.push(HERRAMIENTAS.map((h) => `<div class="tarjeta">
        <h2>${esc(h.nombre)}</h2>
        <p>${esc(h.texto)}</p>
        <div class="ficha-acciones">
          <a class="btn-pri" href="${esc(h.url)}" target="_blank" rel="noopener noreferrer">${esc(h.boton || 'Abrir')}</a>
        </div>
      </div>`).join(''));
  }

  partes.push(`<h2 class="lista-grupo">Para imprimir</h2>
    <div class="tarjeta">
      <h2>Mapa en papel</h2>
      <p>Armá una hoja A4 con el mapa del predio y las referencias, eligiendo qué órganos y
      qué servicios aparecen. Sirve para acreditaciones, para los ujieres y para quien no
      quiera depender del celular.</p>
      <div class="ficha-acciones">
        <a class="btn-pri" href="imprimir.html">Armar el mapa para imprimir</a>
      </div>
    </div>`);

  partes.push(`<h2 class="lista-grupo">La app</h2>
    <div class="tarjeta">
      <h2>Guardala en tu celular</h2>
      <p>Desde el menú del navegador elegí <b>“Agregar a pantalla de inicio”</b> (en iPhone está dentro del botón de compartir).
      Así se abre como una app y sigue funcionando aunque te quedes sin señal en el predio.</p>
    </div>
    <div class="tarjeta">
      <h2>Sobre la ubicación</h2>
      <p>El punto azul es <b>aproximado</b>: se calcula proyectando el GPS de tu teléfono sobre el dibujo del predio.
      El error habitual ronda los 10 o 15 metros, parecido al del GPS de cualquier celular. Sirve para orientarte, no para medir.</p>
    </div>`);

  partes.push(`<p class="firma">
      Diseñado y desarrollado por
      <a href="${esc(CREDITOS.instagram)}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.43.42.7.83.92 1.4.17.42.37 1.05.42 2.24.06 1.28.07 1.66.07 4.88s0 3.6-.07 4.88c-.05 1.19-.25 1.82-.42 2.24-.22.57-.49.98-.91 1.4-.42.42-.83.69-1.4.91-.42.17-1.05.37-2.24.42-1.28.06-1.66.07-4.88.07s-3.6 0-4.88-.07c-1.19-.05-1.82-.25-2.24-.42a3.8 3.8 0 0 1-1.4-.91 3.8 3.8 0 0 1-.91-1.4c-.17-.42-.37-1.05-.42-2.24C2.2 15.6 2.2 15.22 2.2 12s0-3.6.07-4.88c.05-1.19.25-1.82.42-2.24.22-.57.49-.98.91-1.4.42-.42.83-.69 1.4-.91.42-.17 1.05-.37 2.24-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.16 0-3.5 0-4.74.07-.9.04-1.38.19-1.7.31-.43.17-.73.37-1.05.69-.32.32-.52.62-.69 1.05-.12.32-.27.8-.31 1.7C3.44 8.5 3.43 8.84 3.43 12s0 3.5.08 4.74c.4.9.19 1.38.31 1.7.17.43.37.73.69 1.05.32.32.62.52 1.05.69.32.12.8.27 1.7.31 1.24.06 1.58.07 4.74.07s3.5 0 4.74-.07c.9-.04 1.38-.19 1.7-.31.43-.17.73-.37 1.05-.69.32-.32.52-.62.69-1.05.12-.32.27-.8.31-1.7.06-1.24.07-1.58.07-4.74s0-3.5-.07-4.74c-.04-.9-.19-1.38-.31-1.7a2.8 2.8 0 0 0-.69-1.05 2.8 2.8 0 0 0-1.05-.69c-.32-.12-.8-.27-1.7-.31C15.5 4 15.16 4 12 4Zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm5.2-3.1a1.17 1.17 0 1 1 0 2.34 1.17 1.17 0 0 1 0-2.34Z"/></svg><span>${esc(CREDITOS.usuario)}</span></a>
      para <b>${esc(CREDITOS.para)}</b>
      <small>${esc(CREDITOS.organizacion)}.<br>
      Ilustración del predio: República de los Niños. Calles: © colaboradores de OpenStreetMap.</small>
    </p>`);

  $('#info-contenido').innerHTML = partes.join('');

  const verSede = $('#info-ver-sede');
  if (verSede) verSede.addEventListener('click', () => {
    verEnElMapa('org-' + o.sigla.toLowerCase());
  });
  const cambiar = $('#info-cambiar');
  if (cambiar) cambiar.addEventListener('click', abrirPerfil);
  // onclick y no addEventListener: pintarInfo() se llama cada vez que se entra
  // a la seccion, y con addEventListener se iban apilando copias del mismo oyente
  $('#info-contenido').onclick = (e) => {
    const b = e.target.closest('[data-lugar]');
    if (!b) return;
    verEnElMapa(b.dataset.lugar);
  };
}

// ===========================================================================
//  PERFIL
// ===========================================================================
let elegido = { organo: null };

function abrirPerfil() {
  elegido = { ...obtenerPerfil() };
  const actual = miOrgano();
  $('#modal-perfil-ayuda').innerHTML = actual
    ? `Ahora estás viendo lo de <b>${esc(actual.sigla)}</b>. Tocá otro órgano para cambiarlo,
       o <b>Ver todo</b> para ver el modelo completo.`
    : `Sirve para mostrarte tu sede en el mapa y filtrar el cronograma.
       Se puede modificar cuando quieras.`;
  $('#grilla-organos').innerHTML = ORGANOS.map((o) => `
    <button type="button" class="op-organo" data-sigla="${esc(o.sigla)}"
      aria-pressed="${elegido.organo === o.sigla}">
      <img src="img/logos/${o.sigla}.webp" alt="" width="192" height="192">
      ${esc(o.sigla)}
    </button>`).join('');
  $('#modal-perfil').showModal();
}

$('#grilla-organos').addEventListener('click', (e) => {
  const b = e.target.closest('.op-organo');
  if (!b) return;
  elegido.organo = elegido.organo === b.dataset.sigla ? null : b.dataset.sigla;
  $$('#grilla-organos .op-organo').forEach((x) =>
    x.setAttribute('aria-pressed', String(x.dataset.sigla === elegido.organo)));
});
/**
 * Se escucha el `submit` del formulario y NO el `close` del <dialog>: hay
 * navegadores donde ese `close` no llega nunca, y ahi la eleccion se perdia sin
 * avisar. El submit siempre llega, y ademas dice cual de los dos botones fue.
 * Cerrar con Escape no dispara submit, y entonces no cambia nada: es lo
 * correcto, porque escaparse no es elegir.
 */
$('#form-perfil').addEventListener('submit', (e) => {
  const salida = e.submitter ? e.submitter.value : 'guardar';
  // "Ver todo" es elegir no tener organo. Si habia uno, se limpia: si no, el
  // boton no hacia nada para quien ya habia elegido, que es lo que confundia.
  const organo = salida === 'omitir' ? null : elegido.organo;
  guardarPerfil({ organo });
  if (organo && mapa) verEnElMapa('org-' + organo.toLowerCase(), 120);
});

$('#btn-perfil').addEventListener('click', abrirPerfil);

function pintarChip() {
  const o = miOrgano();
  const el = $('#btn-perfil');
  if (o) {
    el.innerHTML = `<img src="img/logos/${o.sigla}.webp" alt="" width="192" height="192">
                    <span>${esc(o.sigla)}</span>`;
    el.setAttribute('aria-label', `Tu órgano: ${o.sigla}. Tocá para cambiarlo.`);
  } else {
    el.innerHTML = '<span>Elegí tu órgano</span>';
    el.setAttribute('aria-label', 'Elegir tu órgano');
  }
}
alCambiarPerfil(() => {
  pintarChip();
  if (!$('#vista-cronograma').hidden) pintarCronograma();
  if (!$('#vista-info').hidden) pintarInfo();
});

// ===========================================================================
//  PORTADA
//  El logo se dibuja de cero mientras carga el mapa, y se muestra SIEMPRE:
//  es la primera impresion de la app. Lo unico que la puede acortar es que
//  la red este muy mal (hay un tope) o que el sistema pida menos animacion.
// ===========================================================================
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const DURACION_PORTADA = 1450;   // lo que dura splash.webp, en ms
const TOPE_PORTADA = 7000;       // pase lo que pase, a los 7 s la portada se va

function portada() {
  const el = $('#portada');
  if (!el) return Promise.resolve();
  const img = $('#portada-anim');
  const menosMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let urlBlob = null;

  /** Pone una imagen y avisa cuando termino de cargar (o de fallar). */
  function mostrar(url) {
    return new Promise((res) => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
      img.src = url;
    });
  }

  // Un webp animado con una sola vuelta no vuelve a empezar si el navegador
  // reusa la imagen que ya tiene decodificada: se ve el ultimo cuadro, quieto,
  // como si la animacion nunca hubiera ocurrido. Con un blob distinto en cada
  // carga siempre arranca del primer cuadro. El archivo no se vuelve a bajar:
  // el <link rel=preload> del index ya lo dejo en el cache.
  const dibujada = menosMovimiento
    ? mostrar('img/splash-fijo.webp')
    // sin opciones a proposito: asi coincide con el <link rel=preload
    // crossorigin=anonymous> del index y se reusa esa descarga
    : fetch('img/splash.webp')
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('splash'))))
      .then((b) => { urlBlob = URL.createObjectURL(b); return mostrar(urlBlob); })
      .catch(() => mostrar('img/splash.webp'));

  const mapaListo = new Promise((res) => {
    const fondo = $('#mapa-fondo');
    if (!fondo || fondo.complete) { res(); return; }
    fondo.addEventListener('load', res, { once: true });
    fondo.addEventListener('error', res, { once: true });
  });

  const secuencia = dibujada
    .then(() => {
      if (menosMovimiento) return espera(500);
      // el webp dura 1,4 s; le damos ese tiempo desde que se lo pudo ver, y de
      // paso esperamos al mapa para no mostrar un recuadro vacio. Con tope: la
      // app se abre muchas veces por dia, no puede tardar mas que eso.
      return Promise.all([espera(DURACION_PORTADA),
      Promise.race([mapaListo, espera(1500)])]);
    })
    .then(() => {
      el.classList.add('saliendo');
      return espera(menosMovimiento ? 0 : 450);
    });

  // El tope no es decorativo: si algo de esto se cuelga, la app tiene que
  // aparecer igual. Una portada trabada equivale a una app rota.
  return Promise.race([secuencia, espera(TOPE_PORTADA)])
    .catch(() => { })
    .then(() => {
      el.hidden = true;
      if (urlBlob) URL.revokeObjectURL(urlBlob);
    });
}

// ===========================================================================
//  ARRANQUE
// ===========================================================================
iniciarMapa();
const portadaTerminada = portada();
pintarChip();
pintarAtajos();
verComo('mapa');

const vistaInicial = (location.hash || '').replace('#', '');
irA(['mapa', 'cronograma', 'buscar', 'info'].includes(vistaInicial) ? vistaInicial : 'mapa', false);

// Sin organo elegido, la app pregunta en cada visita: elegirlo es lo que hace
// que el cronograma y el mapa muestren lo tuyo. Una vez elegido queda guardado
// y no vuelve a molestar. El modal espera a que la portada termine: no puede
// taparle a nadie la animacion de entrada.
portadaTerminada.then(() => {
  if (!obtenerPerfil().organo) setTimeout(abrirPerfil, 260);
});

// ---------------------------------------------------------- service worker
//
// En desarrollo NO se registra. El cache del service worker no respeta las
// cabeceras del servidor, asi que en localhost termina sirviendo archivos
// viejos y uno persigue errores que ya estaban corregidos. Ahi tambien se
// borra el que hubiera quedado de antes. Para probar el modo sin senal, usar
// el sitio publicado.
const ES_DESARROLLO = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);

if ('serviceWorker' in navigator && ES_DESARROLLO) {
  navigator.serviceWorker.getRegistrations()
    .then((rs) => Promise.all(rs.map((r) => r.unregister())))
    .then(() => (self.caches ? caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))) : null))
    .catch(() => { });
} else if ('serviceWorker' in navigator) {
  // Si ya habia una version corriendo y entra a mandar una nueva, recargamos
  // una sola vez para quedar con todo de la misma version. Solo si la pagina
  // recien se abrio: recargarle la app a alguien que la esta usando, no.
  const yaHabia = !!navigator.serviceWorker.controller;
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!yaHabia || recargando || performance.now() > 12000) return;
    recargando = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  });
}
