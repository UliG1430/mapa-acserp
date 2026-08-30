// ============================================================================
//  perfil.js — que organo eligio quien esta usando la app.
//  Se guarda en el navegador; no viaja a ningun servidor.
// ============================================================================

import { ORGANOS, LUGARES } from './datos.js';

const CLAVE = 'minulp2026.perfil';

let perfil = { organo: null, listo: false };

try {
  const crudo = localStorage.getItem(CLAVE);
  if (crudo) perfil = { ...perfil, ...JSON.parse(crudo) };
} catch (e) {
  // navegador en modo privado o storage bloqueado: seguimos sin perfil guardado
}

const oyentes = new Set();

export function obtenerPerfil() {
  return { ...perfil };
}

export function guardarPerfil(cambios) {
  perfil = { ...perfil, ...cambios };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(perfil));
  } catch (e) { /* sin persistencia, pero la sesion funciona igual */ }
  oyentes.forEach((f) => f(obtenerPerfil()));
}

export function alCambiarPerfil(f) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/** El organo elegido, o null. */
export function miOrgano() {
  return ORGANOS.find((o) => o.sigla === perfil.organo) || null;
}

/** El lugar donde sesiona mi organo, o null. */
export function miSede() {
  const o = miOrgano();
  return o ? LUGARES.find((l) => l.id === o.sede) || null : null;
}

/** Que columna del cronograma me toca: 'sti' | 'cs' | 'asamblearios' | null */
export function miTrack() {
  const o = miOrgano();
  return o ? o.track : null;
}
