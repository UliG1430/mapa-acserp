import {logoOrgano,colorOrgano} from './organos.js';
import {esc} from './seguridad.js';
// ============================================================================
//  mapa.js — mapa ilustrado con desplazamiento, zoom, marcadores y ubicacion.
//  Sin librerias: los marcadores son <button> reales para que funcionen con
//  teclado y con lector de pantalla.
// ============================================================================

import { LUGARES, ORGANOS } from './datos.js';
import { MAPA_PX, ENTORNO_PX, aPixel, aLatLon, pxPorMetro, distancia, direccionHacia,
         dentroDelPredio, formatearDistancia } from './geo.js';

export const TIPOS = {
  sede:       { etiqueta: 'Órganos',        color: 'var(--c-minulp)' },
  sanitarios: { etiqueta: 'Sanitarios',     color: '#0f8fa0' },
  accesible:  { etiqueta: 'Accesibles',     color: '#0f8fa0' },
  comida:     { etiqueta: 'Comida',         color: '#c9701f' },
  kiosco:     { etiqueta: 'Kioscos',        color: '#7b2360' },
  heladeria:  { etiqueta: 'Heladería',      color: '#c2137c' },
  salud:      { etiqueta: 'Salud',          color: '#b0113a' },
  info:       { etiqueta: 'Informes',       color: '#b08415' },
  acceso:     { etiqueta: 'Accesos',        color: '#2a5fa8' },
  estacion:   { etiqueta: 'Estacionamiento', color: '#2a5fa8' },
  edificio:   { etiqueta: 'Edificios',      color: '#5b5f6b' },
};

// Grupos que se ofrecen como filtro en la barra superior.
export const GRUPOS = [
  { id: 'sede',      etiqueta: 'Órganos',    tipos: ['sede'] },
  { id: 'sanitario', etiqueta: 'Baños',      tipos: ['sanitarios', 'accesible'] },
  { id: 'comida',    etiqueta: 'Comida',     tipos: ['comida', 'kiosco', 'heladeria'] },
  { id: 'ayuda',     etiqueta: 'Salud',      tipos: ['salud', 'info'] },
  { id: 'acceso',    etiqueta: 'Accesos',    tipos: ['acceso', 'estacion'] },
  { id: 'edificio',  etiqueta: 'Edificios',  tipos: ['edificio'] },
];

const SVG = {
  sanitarios: '<path d="M7 3.6a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0ZM3 7h3l1.4 5H6.3l-.1 5h-2l-.1-5H3ZM16.5 3.6a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0ZM13 7h4l1.6 5.4h-1.5L17 17h-4l-.1-4.6h-1.5Z"/>',
  accesible: '<circle cx="13.2" cy="3.9" r="2.3"/><path d="M11.3 7.3h1.6c.85 0 1.5.55 1.7 1.35l.6 2.55h2.6a1.15 1.15 0 0 1 0 2.3h-3.5c-.8 0-1.45-.5-1.65-1.3l-.25-1v2.35h2.6c.7 0 1.3.4 1.5 1.05l1.5 4.1-2.1.75-1.3-3.6h-4.5a1.75 1.75 0 0 1-1.75-1.75V9.05c0-.95.8-1.75 1.75-1.75Z"/><path d="M9 11.6v2.3a3.9 3.9 0 1 0 4.2 4.9h2.35A6.2 6.2 0 1 1 9 11.6Z"/>',
  comida: '<path d="M5 2.5h1.7v6h.9v-6h1.7v6h.9v-6H12V10c0 1-.7 1.8-1.6 2v6h-2v-6C7.5 11.8 5 11 5 10ZM15.6 2.5h1.6v15.5h-2V12h-1.4V7.2c0-2.2.7-4 1.8-4.7Z"/>',
  kiosco: '<circle cx="10.5" cy="7.8" r="5.2"/><path d="M9.55 12.8h1.9v5.6a.95.95 0 0 1-1.9 0Z"/>',
  heladeria: '<path d="M10.5 2.4a4.1 4.1 0 0 1 4 3.4 2.4 2.4 0 0 1-.5 4.7H7a2.4 2.4 0 0 1-.5-4.7 4.1 4.1 0 0 1 4-3.4ZM7.4 12h6.2l-2.5 6a.8.8 0 0 1-1.3 0Z"/>',
  salud: '<path d="M8.4 2.6h4.2v5.5h5.5v4.2h-5.5v5.5H8.4v-5.5H2.9V8.1h5.5Z"/>',
  info: '<path d="M11.8 3.4a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0ZM8.4 7.5h3.3v10.1H8.4Z"/>',
  acceso: '<path d="M11.4 2.2h6.2v16.6h-6.2v-2.1h4.1V4.3h-4.1Z"/><path d="m7.6 6.1 5.2 4.4-5.2 4.4v-3.2H2.8V9.3h4.8Z"/>',
  estacion: '<path d="M4.6 2.6h5.3c3.1 0 5 1.8 5 4.7s-1.9 4.8-5 4.8H7.9v5.3H4.6Zm3.3 2.9v3.7h1.7c1.2 0 1.9-.7 1.9-1.9s-.7-1.8-1.9-1.8Z"/>',
  edificio: '<circle cx="10.5" cy="10.5" r="4.5"/>',
};

/**
 * Cada icono se dibujo con su propia caja, asi que un viewBox comun los dejaba
 * descentrados y de tamanos distintos. Estos son los recuadros reales de cada
 * dibujo, cuadrados y centrados: se midieron con getBBox() y se anotaron aca.
 * Si se cambia un trazado hay que volver a medirlo.
 */
const CAJAS = {
  sede:       '5.73 5.73 9.54 9.54',
  sanitarios: '2.53 1.23 16.54 16.54',
  accesible:  '-0.77 0.93 23.72 23.72',
  comida:     '2.88 2.04 16.43 16.43',
  kiosco:     '1.62 2.10 17.75 17.75',
  heladeria:  '2.06 1.92 16.89 16.89',
  salud:      '2.44 2.14 16.11 16.11',
  info:       '1.52 1.12 16.96 16.96',
  acceso:     '1.40 1.70 17.60 17.60',
  estacion:   '1.91 2.16 15.69 15.69',
  edificio:   '5.73 5.73 9.54 9.54',
};

export function icono(tipo) {
  const caja = CAJAS[tipo] || CAJAS.edificio;
  return `<svg viewBox="${caja}" aria-hidden="true" focusable="false">${
    SVG[tipo] || SVG.edificio}</svg>`;
}

/** Todos los puntos del mapa: organos primero, despues lugares. */
export function todosLosPuntos() { return puntosDeDatos({ORGANOS,LUGARES}); }
export function puntosDeDatos({ORGANOS,LUGARES}) {
  const sedes = ORGANOS.map((o) => ({
    id: 'org-' + o.sigla.toLowerCase(),
    nombre: o.sede,
    tipo: 'sede',
    x: o.x, y: o.y,
    organo: o,
  }));
  return [...sedes, ...LUGARES.map((l) => ({ ...l, organo: null }))];
}

export function crearMapa(raiz, { alSeleccionar, alTocarMapa, alQuedarFuera, datos } = {}) {
  const puntos = datos ? puntosDeDatos(datos) : todosLosPuntos();

  raiz.innerHTML = `
    <div class="mapa-lienzo" id="mapa-lienzo">
      <div class="mapa-entorno" id="mapa-entorno"></div>
      <img class="mapa-fondo" id="mapa-fondo" src="img/mapa.webp" alt=""
           width="${MAPA_PX}" height="${MAPA_PX}" draggable="false">
      <div class="mapa-marcas" id="mapa-marcas"></div>
      <div class="yo" id="yo" hidden>
        <div class="yo-halo" id="yo-halo"></div>
        <div class="yo-punto"></div>
      </div>
    </div>
    <button type="button" class="yo-borde" id="yo-borde" hidden>
      <span class="yo-borde-flecha">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20.5 20 12 15.6 3.5 20Z"/></svg>
      </span>
      <span class="yo-borde-txt" id="yo-borde-txt"></span>
    </button>`;

  const lienzo = raiz.querySelector('#mapa-lienzo');
  const fondo = raiz.querySelector('#mapa-fondo');
  const capa = raiz.querySelector('#mapa-marcas');
  const yo = raiz.querySelector('#yo');
  const halo = raiz.querySelector('#yo-halo');
  const borde = raiz.querySelector('#yo-borde');
  const bordeTxt = raiz.querySelector('#yo-borde-txt');
  borde.addEventListener('click', (e) => { e.stopPropagation(); api.irAMiUbicacion(); });

  // Calles reales de alrededor del predio (OpenStreetMap), dibujadas con la misma
  // homografia que el resto. Se inyecta en el DOM en vez de usarse como <img>
  // para que tome los colores del tema claro/oscuro desde el CSS.
  fetch('img/entorno.svg')
    .then((r) => (r.ok ? r.text() : Promise.reject()))
    .then((svg) => { raiz.querySelector('#mapa-entorno').innerHTML = svg; })
    .catch(() => { raiz.querySelector('#mapa-entorno').remove(); });

  // ------------------------------------------------------------- marcadores
  const nodos = new Map();

  /** Dibuja (o vuelve a dibujar) el marcador de un punto. */
  function pintarMarca(p) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `marca marca-${p.tipo}`;
    b.dataset.id = p.id;
    b.dataset.tipo = p.tipo;
    b.style.left = (p.x * 100) + '%';
    b.style.top = (p.y * 100) + '%';
    if (p.organo) {
      b.style.setProperty('--marca-color', colorOrgano(p.organo.sigla));
      b.innerHTML =
        `<span class="marca-disco">${logoOrgano(p.organo.sigla)}</span>` +
        `<span class="marca-sigla">${p.organo.sigla}</span>`;
      b.setAttribute('aria-label', `${p.organo.sigla} — ${p.organo.nombre}. Sede: ${p.sede || p.nombre}`);
    } else {
      b.style.setProperty('--marca-color', TIPOS[p.tipo].color);
      b.innerHTML = `<span class="marca-disco">${icono(p.tipo)}</span>` +
                    `<span class="marca-rotulo">${esc(p.nombre)}</span>`;
      b.setAttribute('aria-label', `${p.nombre}${p.det ? '. ' + p.det : ''}`);
    }
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      seleccionar(p.id, false);
    });
    const viejo = nodos.get(p.id);
    if (viejo) viejo.replaceWith(b); else capa.appendChild(b);
    nodos.set(p.id, b);
    if (p.id === seleccion) b.classList.add('marca-activa');
    return b;
  }

  // el dibujado inicial va mas abajo, cuando ya existe todo el estado

  // ----------------------------------------------------------------- estado
  let z = 1, tx = 0, ty = 0, zMin = 0.5, zMax = 4, zPiso = 0.2;
  let filtros = new Set(GRUPOS.map((g) => g.id));
  let seleccion = null;
  let ubic = null;
  let escalaPantalla = 1;
  let tocado = false;   // ya intervino la persona? entonces no reencuadramos solos
  let frame = null;
  let altaResolucion = false;
  let pendiente = null; // encuadre pedido mientras el mapa estaba oculto

  /**
   * Mide el visor y recalcula los limites de zoom. Devuelve null si el mapa no
   * esta a la vista.
   *
   * Con la lista abierta el mapa esta oculto y mide 0x0, y eso no es una medida
   * sino la ausencia de una: guardarla dejaba zMin y zMax en cero, y entonces el
   * primer centrado al volver recortaba el zoom a cero. El dibujo se encogia
   * hasta desaparecer y uno quedaba mirando la nada. Mejor conservar la ultima
   * medida buena y no hacer nada hasta que haya algo que medir.
   */
  function medir() {
    const r = raiz.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    zMin = Math.min(r.width, r.height) / MAPA_PX;
    zMax = zMin * 7;
    // se puede alejar hasta abarcar tambien las calles de alrededor
    zPiso = zMin * (MAPA_PX / (MAPA_PX + 2 * ENTORNO_PX)) * 0.98;
    return r;
  }

  function aplicar() {
    if(frame!==null)return;
    frame=requestAnimationFrame(()=>{frame=null;pintarTransformacion();});
  }
  function pintarTransformacion() {
    if(!altaResolucion && z/zMin>2 && !navigator.connection?.saveData && raiz.dataset.fondo!=='oficial'){ fondo.src='img/mapa@2x.webp';altaResolucion=true; }
    lienzo.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
    // Los marcadores viven dentro del lienzo, que ya esta escalado por z. Para que
    // midan siempre lo mismo en pantalla hay que dividir por z. Ademas los achicamos
    // un poco cuando se ve todo el predio, para que no se tapen entre ellos.
    const t = Math.min(1, Math.max(0, (z / zMin - 1) / 1.5));
    escalaPantalla = 0.76 + 0.24 * t;
    raiz.style.setProperty('--marca-escala', escalaPantalla / z);
    const detalle = z >= zMin * 2.9 ? 'alto' : z >= zMin * 1.45 ? 'medio' : 'bajo';
    if (raiz.dataset.detalle !== detalle) {
      raiz.dataset.detalle = detalle;
      actualizarRoving();
    }
    if (ubic) ubicarPunto();
  }

  function limitar() {
    // El lienzo va de -ENTORNO_PX a MAPA_PX + ENTORNO_PX: se puede salir del
    // dibujo y seguir viendo las calles de afuera, pero no perderse en el vacio.
    const r = raiz.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const min = -ENTORNO_PX * z;
    const max = (MAPA_PX + ENTORNO_PX) * z;
    const margen = Math.min(r.width, r.height) * 0.3;
    tx = Math.min(r.width - margen - min, Math.max(margen - max, tx));
    ty = Math.min(r.height - margen - min, Math.max(margen - max, ty));
  }

  function encuadrar() {
    const r = medir();
    if (!r) return;
    z = zMin;
    tx = (r.width - MAPA_PX * z) / 2;
    ty = (r.height - MAPA_PX * z) / 2;
    aplicar();
  }

  // Vista de arranque: el mapa es cuadrado y la pantalla del celular no, asi que
  // en vez de dejar dos franjas vacias llenamos el alto y centramos en el predio.
  const CENTRO_PREDIO = { x: 0.49, y: 0.47 };
  function vistaInicial() {
    const r = medir();
    if (!r) return;
    centrar(CENTRO_PREDIO.x, CENTRO_PREDIO.y,
            Math.max(zMin, Math.max(r.width, r.height) / MAPA_PX));
  }

  function zoomA(nuevoZ, cx, cy) {
    const r = medir();
    if (!r) return;
    if (cx === undefined) { cx = r.width / 2; cy = r.height / 2; }
    const nz = Math.min(zMax, Math.max(zPiso, nuevoZ));
    tx = cx - ((cx - tx) / z) * nz;
    ty = cy - ((cy - ty) / z) * nz;
    z = nz;
    limitar();
    aplicar();
  }

  /** Lleva un punto del mapa (fracciones 0..1) al centro de la pantalla. */
  function centrar(fx, fy, zObjetivo) {
    const r = medir();
    // Puede pedirse un destino con el mapa oculto: desde la lista, o desde Info
    // con la lista abierta. Nos guardamos el pedido y lo cumplimos apenas se vea.
    if (!r) { pendiente = { fx, fy, z: zObjetivo }; return; }
    if (zObjetivo) z = Math.min(zMax, Math.max(zPiso, zObjetivo));
    tx = r.width / 2 - fx * MAPA_PX * z;
    ty = r.height / 2 - fy * MAPA_PX * z;
    limitar();
    aplicar();
  }

  /**
   * Corre el mapa lo justo para que un punto no quede tapado por la ficha ni
   * fuera de pantalla. Si ya se ve bien, no toca nada.
   * `estorbo` viene en coordenadas del viewport del mapa.
   */
  function asegurarVisible(id, estorbo) {
    const p = puntos.find((q) => q.id === id);
    if (!p) return;
    const r = raiz.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const sx = tx + p.x * MAPA_PX * z;
    const sy = ty + p.y * MAPA_PX * z;
    const m = 56;
    const libre = { x0: m, y0: m, x1: r.width - m, y1: r.height - m };
    if (estorbo) {
      if (estorbo.x0 > r.width * 0.45) libre.x1 = Math.min(libre.x1, estorbo.x0 - m);
      else if (estorbo.y0 > r.height * 0.4) libre.y1 = Math.min(libre.y1, estorbo.y0 - m);
      else libre.y0 = Math.max(libre.y0, estorbo.y1 + m);
    }
    if (libre.x1 <= libre.x0 || libre.y1 <= libre.y0) return;
    if (sx >= libre.x0 && sx <= libre.x1 && sy >= libre.y0 && sy <= libre.y1) return;
    tx += (libre.x0 + libre.x1) / 2 - sx;
    ty += (libre.y0 + libre.y1) / 2 - sy;
    limitar();
    aplicar();
  }

  // -------------------------------------------------- gestos (pointer events)
  //
  // OJO CON LA CAPTURA DEL PUNTERO. Si el contenedor la toma al apoyar el dedo,
  // el navegador le redirige TODOS los eventos que siguen, incluido el click, y
  // los marcadores dejan de poder tocarse: el click nunca llega al boton. Por eso
  // la captura se pide recien cuando el dedo se movio de verdad, que es cuando
  // hace falta seguirlo aunque se salga del mapa.
  const activos = new Map();
  const capturados = new Set();
  let arrastre = null, pellizco = null, movio = false, ultimoTap = 0;

  function capturar(id) {
    if (capturados.has(id)) return;
    try { raiz.setPointerCapture(id); capturados.add(id); } catch (e) { /* ya se levanto */ }
  }
  function liberar(id) {
    if (!capturados.delete(id)) return;
    try { raiz.releasePointerCapture(id); } catch (e) { /* ya se libero solo */ }
  }

  raiz.addEventListener('pointerdown', (e) => {
    tocado = true;
    activos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movio = false;
    if (activos.size === 1) {
      arrastre = { x: e.clientX, y: e.clientY, tx, ty };
    } else if (activos.size === 2) {
      // en el pellizco no hay click que preservar: capturamos los dos dedos ya
      activos.forEach((_, id) => capturar(id));
      const [a, b] = [...activos.values()];
      pellizco = {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        z,
        cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2,
        tx, ty,
      };
      arrastre = null;
    }
  });

  raiz.addEventListener('pointermove', (e) => {
    if (!activos.has(e.pointerId)) return;
    activos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = raiz.getBoundingClientRect();
    if (pellizco && activos.size >= 2) {
      const [a, b] = [...activos.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2 - r.left;
      const cy = (a.y + b.y) / 2 - r.top;
      const nz = Math.min(zMax, Math.max(zPiso, pellizco.z * (d / pellizco.d)));
      const px = (pellizco.cx - r.left - pellizco.tx) / pellizco.z;
      const py = (pellizco.cy - r.top - pellizco.ty) / pellizco.z;
      z = nz;
      tx = cx - px * nz;
      ty = cy - py * nz;
      movio = true;
      limitar();
      aplicar();
    } else if (arrastre) {
      const dx = e.clientX - arrastre.x;
      const dy = e.clientY - arrastre.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) { movio = true; capturar(e.pointerId); }
      tx = arrastre.tx + dx;
      ty = arrastre.ty + dy;
      limitar();
      aplicar();
    }
  });

  function soltar(e) {
    activos.delete(e.pointerId);
    liberar(e.pointerId);
    if (activos.size < 2) pellizco = null;
    if (activos.size === 0) {
      arrastre = null;
      // Sin captura, el destino es el elemento real que se toco. Un toque sobre
      // un marcador lo resuelve el propio boton; aca solo nos ocupamos de los
      // toques en el mapa vacio.
      const sobreAlgo = e.target instanceof Element && e.target.closest('.marca, .yo-borde');
      if (e.type !== 'pointercancel' && !movio && !sobreAlgo) {
        const ahora = Date.now();
        if (ahora - ultimoTap < 320) {
          const r = raiz.getBoundingClientRect();
          zoomA(z * 1.9, e.clientX - r.left, e.clientY - r.top);
          ultimoTap = 0;
        } else {
          ultimoTap = ahora;
          seleccionar(null);
          if (alTocarMapa) {
            const r = raiz.getBoundingClientRect();
            alTocarMapa((e.clientX - r.left - tx) / z / MAPA_PX,
                        (e.clientY - r.top - ty) / z / MAPA_PX);
          }
        }
      }
    } else if (activos.size === 1) {
      const [p] = [...activos.entries()];
      arrastre = { x: p[1].x, y: p[1].y, tx, ty };
    }
  }
  raiz.addEventListener('pointerup', soltar);
  raiz.addEventListener('pointercancel', soltar);

  raiz.addEventListener('wheel', (e) => {
    e.preventDefault();
    tocado = true;
    const r = raiz.getBoundingClientRect();
    zoomA(z * Math.pow(0.9985, e.deltaY), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // teclado: flechas para desplazar, + y - para acercar
  raiz.addEventListener('keydown', (e) => {
    tocado = true;
    const paso = e.shiftKey ? 160 : 60;
    const mapa = { ArrowLeft: [paso, 0], ArrowRight: [-paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso] };
    if (mapa[e.key]) {
      e.preventDefault();
      tx += mapa[e.key][0]; ty += mapa[e.key][1];
      limitar(); aplicar();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault(); zoomA(z * 1.4);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault(); zoomA(z / 1.4);
    } else if (e.key === '0') {
      e.preventDefault(); encuadrar();
    }
  });

  // ------------------------------------------------------------- ubicacion
  const CENTRO_MAPA = aLatLon(MAPA_PX / 2, MAPA_PX / 2);

  function ubicarPunto() {
    if (!ubic) {
      yo.hidden = true;
      borde.hidden = true;
      if (alQuedarFuera) alQuedarFuera(false, 0);
      return;
    }
    const p = aPixel(ubic.lat, ubic.lon);
    // si la proyeccion cayo del otro lado del horizonte, el punto no significa
    // nada: lo escondemos y dejamos que hable la flecha del borde
    yo.hidden = !p.valido;
    if (p.valido) {
      yo.style.left = (p.x / MAPA_PX * 100) + '%';
      yo.style.top = (p.y / MAPA_PX * 100) + '%';
      const radio = Math.max(6, ubic.precision * pxPorMetro(ubic.lat, ubic.lon));
      halo.style.width = halo.style.height = (radio * 2) + 'px';
      yo.classList.toggle('yo-impreciso', ubic.precision > 50);
      yo.style.setProperty('--yo-escala', escalaPantalla / z);
    }
    marcarBorde(p);
  }

  /**
   * Si tu punto quedo fuera de la pantalla, en vez de perderlo mostramos una
   * flecha pegada al borde que apunta hacia donde estas, con la distancia.
   * Es la misma idea que el marcador del borde del mapa en Minecraft: el punto
   * sigue existiendo aunque no entre en el recuadro.
   */
  function marcarBorde(p) {
    const r = raiz.getBoundingClientRect();
    if (!r.width) return;
    const m = 40;
    const cx = r.width / 2;
    const cy = r.height / 2;

    if (p.valido) {
      const sx = tx + p.x * z;
      const sy = ty + p.y * z;
      if (sx > m && sx < r.width - m && sy > m && sy < r.height - m) {
        borde.hidden = true;
        if (alQuedarFuera) alQuedarFuera(false, 0);
        return;
      }
    }

    // La direccion NO se saca de la posicion proyectada: para puntos lejanos esa
    // posicion puede estar espejada. Se saca de un paso corto desde el centro de
    // la vista hacia la ubicacion real, que siempre cae de este lado del horizonte.
    const centro = { px: (cx - tx) / z, py: (cy - ty) / z };
    const dir = direccionHacia(centro.px, centro.py, ubic.lat, ubic.lon);
    const dx = dir.dx;
    const dy = dir.dy;
    // estas practicamente sobre el centro: no hay direccion que mostrar
    if (!dx && !dy) {
      borde.hidden = true;
      if (alQuedarFuera) alQuedarFuera(false, 0);
      return;
    }
    const hw = Math.max(12, cx - m);
    const hh = Math.max(12, cy - m);
    const k = Math.min(hw / Math.max(Math.abs(dx), 1e-6), hh / Math.max(Math.abs(dy), 1e-6));
    borde.style.left = (cx + dx * k) + 'px';
    borde.style.top = (cy + dy * k) + 'px';
    borde.style.setProperty('--ang', (Math.atan2(dy, dx) * 180 / Math.PI + 90) + 'deg');

    const metros = distancia(ubic.lat, ubic.lon, CENTRO_MAPA.lat, CENTRO_MAPA.lon);
    bordeTxt.textContent = formatearDistancia(metros);
    borde.setAttribute('aria-label',
      `Estás a ${formatearDistancia(metros)} del centro del predio. Tocá para verte en el mapa.`);
    borde.hidden = false;
    if (alQuedarFuera) alQuedarFuera(true, metros);
  }

  /** Encuadra una caja dada en pixeles del mapa, con aire alrededor. */
  function encuadrarCaja(x0, y0, x1, y1) {
    const r = medir();
    if (!r) return;
    x0 = Math.max(-ENTORNO_PX, x0); y0 = Math.max(-ENTORNO_PX, y0);
    x1 = Math.min(MAPA_PX + ENTORNO_PX, x1); y1 = Math.min(MAPA_PX + ENTORNO_PX, y1);
    const pad = 46;
    const nz = Math.min((r.width - 2 * pad) / Math.max(1, x1 - x0),
                        (r.height - 2 * pad) / Math.max(1, y1 - y0));
    z = Math.min(zMax, Math.max(zPiso, nz));
    tx = r.width / 2 - ((x0 + x1) / 2) * z;
    ty = r.height / 2 - ((y0 + y1) / 2) * z;
    limitar();
    aplicar();
  }

  /**
   * Tabindex movil. Con 78 marcadores, dejarlos todos tabulables obliga a
   * atravesarlos uno por uno para llegar a la barra de abajo. En cambio dejamos
   * uno solo en el orden de tabulacion y entre marcadores se navega con flechas.
   */
  function visibles() {
    return [...capa.children].filter((b) => !b.hidden && b.getClientRects().length);
  }

  function actualizarRoving() {
    const vis = visibles();
    if (!vis.length) return;
    const activo = vis.find((b) => b.dataset.id === seleccion) || vis[0];
    for (const b of capa.children) b.tabIndex = b === activo ? 0 : -1;
  }

  capa.addEventListener('keydown', (e) => {
    const b = e.target.closest('.marca');
    if (!b) return;
    const paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!paso && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    e.stopPropagation();
    const vis = visibles();
    const i = vis.indexOf(b);
    const destino = e.key === 'Home' ? vis[0]
      : e.key === 'End' ? vis[vis.length - 1]
      : vis[(i + paso + vis.length) % vis.length];
    if (!destino) return;
    b.tabIndex = -1;
    destino.tabIndex = 0;
    destino.focus({ preventScroll: true });
    asegurarVisible(destino.dataset.id, null);
  });

  // ---------------------------------------------------------------- filtros
  function aplicarFiltros() {
    const permitidos = new Set();
    GRUPOS.forEach((g) => { if (filtros.has(g.id)) g.tipos.forEach((t) => permitidos.add(t)); });
    nodos.forEach((nodo) => {
      nodo.hidden = !permitidos.has(nodo.dataset.tipo) && nodo.dataset.id !== seleccion;
      nodo.classList.toggle('marca-filtrada', filtros.size < GRUPOS.length && permitidos.has(nodo.dataset.tipo));
    });
    actualizarRoving();
  }

  for (const p of puntos) pintarMarca(p);
  aplicarFiltros();

  // -------------------------------------------------------------- seleccion
  function seleccionar(id, centrarTambien = true) {
    if (seleccion && nodos.has(seleccion)) nodos.get(seleccion).classList.remove('marca-activa');
    seleccion = id;
    const p = id ? puntos.find((q) => q.id === id) : null;
    if (p) {
      const nodo = nodos.get(id);
      nodo.classList.add('marca-activa');
      capa.appendChild(nodo);                    // al frente
      if (centrarTambien) centrar(p.x, p.y, Math.max(z, zMin * 2.6));
    }
    aplicarFiltros();
    if (alSeleccionar) alSeleccionar(p, ubic);
  }

  // El alto real del mapa no se conoce hasta que el navegador termina de armar
  // la pagina, asi que mientras nadie lo haya tocado rehacemos el encuadre.
  const ro = new ResizeObserver(() => {
    if (!medir()) return;                  // oculto: no hay nada que medir
    if (pendiente) {                       // habia un destino esperando
      const p = pendiente;
      pendiente = null;
      centrar(p.fx, p.fy, p.z);
    } else if (!tocado) vistaInicial();
    else { limitar(); aplicar(); }
  });
  ro.observe(raiz);
  vistaInicial();

  const api = {
    puntos,
    setDatos(datos) {
      const nuevos=puntosDeDatos(datos);const ids=new Set(nuevos.map(p=>p.id));
      for(const [id,nodo] of nodos)if(!ids.has(id)){nodo.remove();nodos.delete(id);}
      puntos.splice(0,puntos.length,...nuevos);
      for(const p of puntos)pintarMarca(p);
      if(seleccion&&!ids.has(seleccion))seleccion=null;
      aplicarFiltros();
      if(alSeleccionar)alSeleccionar(puntos.find(p=>p.id===seleccion)||null,ubic);
    },
    encuadrar: () => { tocado = true; encuadrar(); },
    vistaInicial,
    acercar: () => { tocado = true; zoomA(z * 1.5); },
    alejar: () => { tocado = true; zoomA(z / 1.5); },
    centrarEn(id) {
      const p = puntos.find((q) => q.id === id);
      if (!p) return;
      tocado = true;
      centrar(p.x, p.y, Math.max(zMin * 3, z));
      seleccionar(id, false);
    },
    seleccionar,
    asegurarVisible,
    /**
     * Alta, baja y modificacion de puntos EN PANTALLA. No tocan datos.js: son
     * para que editor.html muestre en vivo como va quedando el mapa antes de
     * escribir el archivo.
     */
    agregarPunto(p) {
      if (puntos.some((q) => q.id === p.id)) return null;
      puntos.push(p);
      pintarMarca(p);
      aplicarFiltros();
      return p;
    },
    quitarPunto(id) {
      const i = puntos.findIndex((q) => q.id === id);
      if (i < 0) return false;
      if (seleccion === id) seleccionar(null);
      nodos.get(id).remove();
      nodos.delete(id);
      puntos.splice(i, 1);
      actualizarRoving();
      return true;
    },
    actualizarPunto(id, cambios) {
      const p = puntos.find((q) => q.id === id);
      if (!p) return null;
      Object.assign(p, cambios);
      pintarMarca(p);
      aplicarFiltros();
      return p;
    },

    /**
     * Cambia de lugar un punto ya dibujado. Lo usa editor.html para acomodar
     * sedes sin tener que editar datos.js a ciegas y recargar cada vez.
     */
    moverPunto(id, fx, fy) {
      const p = puntos.find((q) => q.id === id);
      const nodo = nodos.get(id);
      if (!p || !nodo) return null;
      p.x = Math.max(0, Math.min(1, fx));
      p.y = Math.max(0, Math.min(1, fy));
      nodo.style.left = (p.x * 100) + '%';
      nodo.style.top = (p.y * 100) + '%';
      return { x: p.x, y: p.y };
    },
    seleccionActual: () => seleccion,
    setFiltros(nuevos) { filtros = new Set(nuevos); aplicarFiltros(); },
    setFondo(cual) {
      fondo.src = cual === 'oficial' ? 'img/oficial.webp' : (altaResolucion ? 'img/mapa@2x.webp' : 'img/mapa.webp');
      raiz.dataset.fondo = cual;
    },
    setUbicacion(u) {
      ubic = u;
      ubicarPunto();
      if (u && seleccion && alSeleccionar) {
        alSeleccionar(puntos.find((q) => q.id === seleccion), u);
      }
    },
    ubicacion: () => ubic,
    /**
     * Boton "dónde estoy". Si estás en el predio te centra y acerca. Si estás
     * afuera NO te lleva hasta ahí (verias campo vacio): encuadra el predio y
     * tu posicion a la vez, para que entiendas de que lado venis.
     */
    irAMiUbicacion() {
      if (!ubic) return false;
      tocado = true;
      const dentro = dentroDelPredio(ubic.lat, ubic.lon);
      const p = aPixel(ubic.lat, ubic.lon);
      if (dentro) {
        centrar(p.x / MAPA_PX, p.y / MAPA_PX, Math.max(z, zMin * 3));
      } else if (p.valido) {
        encuadrarCaja(Math.min(0, p.x), Math.min(0, p.y),
                      Math.max(MAPA_PX, p.x), Math.max(MAPA_PX, p.y));
      } else {
        // estas tan lejos que el punto no se puede dibujar: mostramos todo lo
        // que hay mapeado y que la flecha del borde indique para donde queda
        encuadrarCaja(-ENTORNO_PX, -ENTORNO_PX, MAPA_PX + ENTORNO_PX, MAPA_PX + ENTORNO_PX);
      }
      return dentro;
    },

    /**
     * Lo que se hace con la PRIMERA lectura del GPS. Si estás en el predio,
     * te lleva. Si estás lejos, deja el mapa donde estaba y solo aparece la
     * flecha del borde: mover la vista a un descampado no le sirve a nadie.
     */
    enfocarPrimeraLectura() {
      if (!ubic) return false;
      const dentro = dentroDelPredio(ubic.lat, ubic.lon);
      if (dentro) {
        tocado = true;
        const p = aPixel(ubic.lat, ubic.lon);
        centrar(p.x / MAPA_PX, p.y / MAPA_PX, Math.max(z, zMin * 3));
      }
      return dentro;
    },
  };
  return api;
}
