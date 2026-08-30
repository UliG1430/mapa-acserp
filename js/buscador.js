// ============================================================================
//  buscador.js — indice plano de organos, edificios y servicios.
//  Ignora tildes y mayusculas: "orga" encuentra "Órganos", "banos" "Sanitarios".
// ============================================================================

import { ORGANOS } from './datos.js';
import { todosLosPuntos, TIPOS } from './mapa.js';

const SINONIMOS = {
  sanitarios: 'baño baños bano banos toilette wc sanitario',
  accesible: 'baño accesible discapacidad silla de ruedas rampa',
  comida: 'comer almuerzo restaurante confiteria bar buffet merienda refrigerio',
  kiosco: 'kiosco golosinas snack bebida agua',
  heladeria: 'helado heladeria postre',
  salud: 'enfermeria emergencia ambulancia primeros auxilios medico botiquin',
  info: 'informes informacion consultas ayuda perdido',
  acceso: 'entrada salida ingreso puerta porton acceso',
  estacion: 'estacionamiento auto colectivo micro combi',
  edificio: '',
  sede: 'sede sala comision organo',
};

export function normalizar(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

let indice = null;

function construir() {
  const puntos = todosLosPuntos();
  return puntos.map((p) => {
    const o = p.organo;
    const partes = [p.nombre, p.det || '', SINONIMOS[p.tipo] || ''];
    if (o) partes.push(o.sigla, o.nombre, o.nota, 'sede de ' + o.sigla);
    return {
      punto: p,
      titulo: o ? `${o.sigla} — ${o.nombre}` : p.nombre,
      subtitulo: o ? `Sesiona en ${p.nombre}` : (p.det || TIPOS[p.tipo].etiqueta),
      sigla: o ? o.sigla : null,
      tipo: p.tipo,
      clave: normalizar(partes.join(' ')),
      corta: normalizar(o ? o.sigla : p.nombre),
    };
  });
}

export function buscar(consulta, limite = 12) {
  if (!indice) indice = construir();
  const q = normalizar(consulta);
  if (!q) return [];
  const palabras = q.split(/\s+/).filter(Boolean);
  const res = [];
  for (const it of indice) {
    if (!palabras.every((p) => it.clave.includes(p))) continue;
    // puntaje: coincidencia exacta de sigla > empieza con > contiene
    let punt = 0;
    if (it.corta === q) punt = 100;
    else if (it.corta.startsWith(q)) punt = 70;
    else if (normalizar(it.titulo).includes(q)) punt = 40;
    else punt = 10;
    if (it.tipo === 'sede') punt += 8;
    res.push({ ...it, punt });
  }
  return res.sort((a, b) => b.punt - a.punt || a.titulo.localeCompare(b.titulo, 'es'))
            .slice(0, limite);
}

/** Sugerencias para la pantalla vacia del buscador. */
export function sugerencias() {
  return [
    { texto: 'Baños', consulta: 'baño' },
    { texto: 'Comida', consulta: 'comer' },
    { texto: 'Enfermería', consulta: 'salud' },
    { texto: 'Accesos', consulta: 'entrada' },
    ...ORGANOS.slice(0, 4).map((o) => ({ texto: o.sigla, consulta: o.sigla })),
  ];
}
