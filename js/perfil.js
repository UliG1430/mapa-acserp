// ============================================================================
//  perfil.js — que organo eligio quien esta usando la app.
//  Se guarda en el navegador; no viaja a ningun servidor.
//
//  Lo unico que se guarda es el organo. No hay un "ya le preguntamos": mientras
//  no haya organo elegido, la app vuelve a preguntar en cada visita, porque es
//  lo que hace que el cronograma y el mapa muestren lo tuyo. "Ver todo" es
//  justamente eso: quedarse sin organo.
// ============================================================================

import { ORGANOS } from './datos.js';

const CLAVE = 'minulp2026.perfil';

let perfil = { organo: null };

try {
  const guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
  // Se valida contra ORGANOS: si en datos.js cambiaron las siglas, una guardada
  // de otro año dejaria el perfil apuntando a un organo que ya no existe.
  if (guardado && ORGANOS.some((o) => o.sigla === guardado.organo)) {
    perfil.organo = guardado.organo;
  }
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

/** Que columna del cronograma me toca: 'sti' | 'cs' | 'asamblearios' | null */
export function miTrack() {
  const o = miOrgano();
  return o ? o.track : null;
}
