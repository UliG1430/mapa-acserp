// ============================================================================
//  mapa.js — mapa ilustrado con desplazamiento, zoom, marcadores y ubicacion.
//  Sin librerias: los marcadores son <button> reales para que funcionen con
//  teclado y con lector de pantalla.
// ============================================================================

import { LUGARES, ORGANOS } from './datos.js';
import { MAPA_PX, ENTORNO_PX, aPixel, pxPorMetro, dentroDelPredio } from './geo.js';

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
  accesible: '<path d="M13 3.4a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0ZM9.4 6.4h2.3v3.4h4v2h-4v2.1c1.6.3 2.8 1.6 2.8 3.2h-2a1.9 1.9 0 0 0-3.8 0c0 .3 0 .5.1.7l-1.8.9a3.9 3.9 0 0 1 2.4-5.6Z"/>',
  comida: '<path d="M5 2.5h1.7v6h.9v-6h1.7v6h.9v-6H12V10c0 1-.7 1.8-1.6 2v6h-2v-6C7.5 11.8 5 11 5 10ZM15.6 2.5h1.6v15.5h-2V12h-1.4V7.2c0-2.2.7-4 1.8-4.7Z"/>',
  kiosco: '<path d="M4 8.5h13l-.9 8.6a1.2 1.2 0 0 1-1.2 1H6.1a1.2 1.2 0 0 1-1.2-1Zm2.6-1.7a4 4 0 0 1 7.8 0Z"/>',
  heladeria: '<path d="M10.5 2.4a4.1 4.1 0 0 1 4 3.4 2.4 2.4 0 0 1-.5 4.7H7a2.4 2.4 0 0 1-.5-4.7 4.1 4.1 0 0 1 4-3.4ZM7.4 12h6.2l-2.5 6a.8.8 0 0 1-1.3 0Z"/>',
  salud: '<path d="M8.4 2.6h4.2v5.5h5.5v4.2h-5.5v5.5H8.4v-5.5H2.9V8.1h5.5Z"/>',
  info: '<path d="M11.8 3.4a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0ZM8.4 7.5h3.3v10.1H8.4Z"/>',
  acceso: '<path d="M10.5 1.8 18 8.2v9.4h-5.1v-5.2H8.1v5.2H3V8.2Z"/>',
  estacion: '<path d="M4.6 2.6h5.3c3.1 0 5 1.8 5 4.7s-1.9 4.8-5 4.8H7.9v5.3H4.6Zm3.3 2.9v3.7h1.7c1.2 0 1.9-.7 1.9-1.9s-.7-1.8-1.9-1.8Z"/>',
  edificio: '<circle cx="10.5" cy="10.5" r="4.5"/>',
};

export function icono(tipo) {
  return `<svg viewBox="0 0 21 21" aria-hidden="true" focusable="false">${
    SVG[tipo] || SVG.edificio}</svg>`;
}

/** Todos los puntos del mapa: organos primero, despues lugares. */
export function todosLosPuntos() {
  const sedes = ORGANOS.map((o) => ({
    id: 'org-' + o.sigla.toLowerCase(),
    nombre: o.sede,
    tipo: 'sede',
    x: o.x, y: o.y,
    organo: o,
  }));
  return [...sedes, ...LUGARES.map((l) => ({ ...l, organo: null }))];
}

export function crearMapa(raiz, { alSeleccionar, alTocarMapa } = {}) {
  const puntos = todosLosPuntos();

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
    </div>`;

  const lienzo = raiz.querySelector('#mapa-lienzo');
  const fondo = raiz.querySelector('#mapa-fondo');
  const capa = raiz.querySelector('#mapa-marcas');
  const yo = raiz.querySelector('#yo');
  const halo = raiz.querySelector('#yo-halo');

  // Calles reales de alrededor del predio (OpenStreetMap), dibujadas con la misma
  // homografia que el resto. Se inyecta en el DOM en vez de usarse como <img>
  // para que tome los colores del tema claro/oscuro desde el CSS.
  fetch('img/entorno.svg')
    .then((r) => (r.ok ? r.text() : Promise.reject()))
    .then((svg) => { raiz.querySelector('#mapa-entorno').innerHTML = svg; })
    .catch(() => { raiz.querySelector('#mapa-entorno').remove(); });

  // ------------------------------------------------------------- marcadores
  const nodos = new Map();
  for (const p of puntos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `marca marca-${p.tipo}`;
    b.dataset.id = p.id;
    b.dataset.tipo = p.tipo;
    b.style.left = (p.x * 100) + '%';
    b.style.top = (p.y * 100) + '%';
    if (p.organo) {
      b.style.setProperty('--marca-color', `var(--c-${p.organo.sigla.toLowerCase()})`);
      b.innerHTML =
        `<span class="marca-disco"><img src="img/logos/${p.organo.sigla}.webp" alt=""
             width="192" height="192" loading="lazy"></span>` +
        `<span class="marca-sigla">${p.organo.sigla}</span>`;
      b.setAttribute('aria-label', `${p.organo.sigla} — ${p.organo.nombre}. Sede: ${p.sede || p.nombre}`);
    } else {
      b.style.setProperty('--marca-color', TIPOS[p.tipo].color);
      b.innerHTML = `<span class="marca-disco">${icono(p.tipo)}</span>` +
                    `<span class="marca-rotulo">${p.nombre}</span>`;
      b.setAttribute('aria-label', `${p.nombre}${p.det ? '. ' + p.det : ''}`);
    }
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      seleccionar(p.id, false);
    });
    capa.appendChild(b);
    nodos.set(p.id, b);
  }

  // ----------------------------------------------------------------- estado
  let z = 1, tx = 0, ty = 0, zMin = 0.5, zMax = 4;
  let filtros = new Set(GRUPOS.map((g) => g.id));
  let seleccion = null;
  let ubic = null;
  let escalaPantalla = 1;
  let tocado = false;   // ya intervino la persona? entonces no reencuadramos solos

  function medir() {
    const r = raiz.getBoundingClientRect();
    zMin = Math.min(r.width, r.height) / MAPA_PX;
    zMax = zMin * 7;
    return r;
  }

  function aplicar() {
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
    const min = -ENTORNO_PX * z;
    const max = (MAPA_PX + ENTORNO_PX) * z;
    const margen = Math.min(r.width, r.height) * 0.3;
    tx = Math.min(r.width - margen - min, Math.max(margen - max, tx));
    ty = Math.min(r.height - margen - min, Math.max(margen - max, ty));
  }

  function encuadrar() {
    const r = medir();
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
    centrar(CENTRO_PREDIO.x, CENTRO_PREDIO.y,
            Math.max(zMin, Math.max(r.width, r.height) / MAPA_PX));
  }

  function zoomA(nuevoZ, cx, cy) {
    const r = raiz.getBoundingClientRect();
    if (cx === undefined) { cx = r.width / 2; cy = r.height / 2; }
    const nz = Math.min(zMax, Math.max(zMin * 0.95, nuevoZ));
    tx = cx - ((cx - tx) / z) * nz;
    ty = cy - ((cy - ty) / z) * nz;
    z = nz;
    limitar();
    aplicar();
  }

  /** Lleva un punto del mapa (fracciones 0..1) al centro de la pantalla. */
  function centrar(fx, fy, zObjetivo) {
    const r = raiz.getBoundingClientRect();
    if (zObjetivo) z = Math.min(zMax, Math.max(zMin, zObjetivo));
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
  const activos = new Map();
  let arrastre = null, pellizco = null, movio = false, ultimoTap = 0;

  raiz.addEventListener('pointerdown', (e) => {
    tocado = true;
    raiz.setPointerCapture(e.pointerId);
    activos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movio = false;
    if (activos.size === 1) {
      arrastre = { x: e.clientX, y: e.clientY, tx, ty };
    } else if (activos.size === 2) {
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
      const nz = Math.min(zMax, Math.max(zMin * 0.95, pellizco.z * (d / pellizco.d)));
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
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movio = true;
      tx = arrastre.tx + dx;
      ty = arrastre.ty + dy;
      limitar();
      aplicar();
    }
  });

  function soltar(e) {
    activos.delete(e.pointerId);
    if (activos.size < 2) pellizco = null;
    if (activos.size === 0) {
      arrastre = null;
      if (!movio && e.target === raiz) {
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
  function ubicarPunto() {
    if (!ubic) { yo.hidden = true; return; }
    const p = aPixel(ubic.lat, ubic.lon);
    yo.hidden = false;
    yo.style.left = (p.x / MAPA_PX * 100) + '%';
    yo.style.top = (p.y / MAPA_PX * 100) + '%';
    const radio = Math.max(6, ubic.precision * pxPorMetro(ubic.lat, ubic.lon));
    halo.style.width = halo.style.height = (radio * 2) + 'px';
    yo.classList.toggle('yo-impreciso', ubic.precision > 50);
    yo.style.setProperty('--yo-escala', escalaPantalla / z);
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
      nodo.hidden = !permitidos.has(nodo.dataset.tipo);
    });
    actualizarRoving();
  }
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
    actualizarRoving();
    if (alSeleccionar) alSeleccionar(p, ubic);
  }

  // El alto real del mapa no se conoce hasta que el navegador termina de armar
  // la pagina, asi que mientras nadie lo haya tocado rehacemos el encuadre.
  const ro = new ResizeObserver(() => {
    medir();
    if (!tocado) vistaInicial(); else { limitar(); aplicar(); }
  });
  ro.observe(raiz);
  vistaInicial();

  return {
    puntos,
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
    seleccionActual: () => seleccion,
    setFiltros(nuevos) { filtros = new Set(nuevos); aplicarFiltros(); },
    setFondo(cual) {
      fondo.src = cual === 'oficial' ? 'img/oficial.webp' : 'img/mapa.webp';
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
    irAMiUbicacion() {
      if (!ubic) return false;
      tocado = true;
      const p = aPixel(ubic.lat, ubic.lon);
      centrar(p.x / MAPA_PX, p.y / MAPA_PX, Math.max(z, zMin * 3));
      return dentroDelPredio(ubic.lat, ubic.lon);
    },
  };
}
