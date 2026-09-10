// ============================================================================
//  cronograma.js — logica de jornadas, bloques y "que esta pasando ahora".
//  Todas las horas se interpretan en la hora local del dispositivo.
// ============================================================================

import { CRONOGRAMA, alCambiarDatos } from './datos.js';

const NOMBRE_TRACK = {
  sti: 'Sala de Tratados Internacionales',
  asamblearios: 'Órganos Asamblearios',
  cs: 'Consejo de Seguridad',
};

export const TRACKS = ['sti', 'asamblearios', 'cs'];
export const nombreTrack = (t) => NOMBRE_TRACK[t] || '';

export const ZONA = 'America/Argentina/Buenos_Aires';
export function fechaLocal(fecha = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:ZONA,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(fecha).map(p=>[p.type,p.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function aFecha(iso, hhmm) {
  // Convertir hora de pared a instante con la zona IANA, sin depender del dispositivo.
  const wall=Date.parse(`${iso}T${hhmm}:00Z`);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:ZONA,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(wall)).map(p=>[p.type,p.value]));
  const asUTC=Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
  return new Date(wall+(wall-asUTC));
}

/** Devuelve la lista de bloques de todo el modelo, ya con Date de inicio y fin. */
function construirBloques() {
  const out = [];
  CRONOGRAMA.forEach((jornada, ij) => {
    jornada.bloques.forEach((b, ib) => {
      out.push({
        ...b,
        id: `${jornada.fecha}-${ib}`,
        jornada,
        indiceJornada: ij,
        inicio: aFecha(jornada.fecha, b.desde),
        fin: aFecha(jornada.fecha, b.hasta),
      });
    });
  });
  return out.sort((x, y) => x.inicio - y.inicio);
}

let BLOQUES = construirBloques();
alCambiarDatos(()=>{BLOQUES=construirBloques();});
export function todosLosBloques(){return BLOQUES;}

export const primerBloque = () => BLOQUES[0];
export const ultimoBloque = () => BLOQUES[BLOQUES.length - 1];

/**
 * Estado del modelo en un instante dado.
 *   { estado: 'antes'|'durante'|'entre'|'despues', actual, siguiente }
 */
export function estadoEn(ahora = new Date()) {
  if (ahora < BLOQUES[0].inicio) {
    return { estado: 'antes', actual: null, siguiente: BLOQUES[0] };
  }
  const ultimo = BLOQUES[BLOQUES.length - 1];
  if (ahora >= ultimo.fin) {
    return { estado: 'despues', actual: null, siguiente: null };
  }
  const actual = BLOQUES.find((b) => ahora >= b.inicio && ahora < b.fin) || null;
  const siguiente = BLOQUES.find((b) => b.inicio > ahora) || null;
  return { estado: actual ? 'durante' : 'entre', actual, siguiente };
}

/** Que dice un bloque para una columna determinada. */
export function textoBloque(bloque, track) {
  if (bloque.todos) return bloque.todos;
  if (track && bloque[track]) return bloque[track];
  return null;
}

/** Resumen de un bloque cuando no hay perfil: las tres columnas. */
export function columnasBloque(bloque) {
  if (bloque.todos) return [{ track: null, texto: bloque.todos }];
  return TRACKS.filter((t) => bloque[t]).map((t) => ({ track: t, texto: bloque[t] }));
}

/** La jornada que corresponde mostrar por defecto. */
export function jornadaPorDefecto(ahora = new Date()) {
  const hoy = CRONOGRAMA.findIndex(j => j.fecha === fechaLocal(ahora));
  if (hoy >= 0) return hoy;
  const { estado, siguiente } = estadoEn(ahora);
  if (estado === 'despues') return CRONOGRAMA.length - 1;
  return siguiente ? siguiente.indiceJornada : 0;
}

export function hhmm(fecha) {return new Intl.DateTimeFormat('es-AR',{timeZone:ZONA,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(fecha);}

/** "2 h 15 min", "18 min", "menos de 1 min" */
export function faltan(ms) {
  if (ms <= 0) return 'menos de 1 min';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return 'menos de 1 min';
  const dias = Math.floor(totalMin / 1440);
  if (dias >= 1) {
    const hs = Math.floor((totalMin % 1440) / 60);
    return `${dias} ${dias === 1 ? 'día' : 'días'}` + (hs ? ` y ${hs} h` : '');
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Progreso 0..1 dentro de un bloque. */
export function progreso(bloque, ahora = new Date()) {
  const total = bloque.fin - bloque.inicio;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (ahora - bloque.inicio) / total));
}
