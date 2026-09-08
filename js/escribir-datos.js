// ============================================================================
//  escribir-datos.js — reescribe datos.js con los cambios hechos en el editor.
//
//  NO genera el archivo de cero. Le hace cirugia al original: cambia solo los
//  valores que hay que cambiar y agrega o quita lineas de LUGARES. Todo lo
//  demas —los comentarios, el orden, el cronograma, los contactos— queda tal
//  cual estaba. Un generador que reescribiera todo seria una segunda fuente de
//  verdad del formato del archivo, y la primera vez que alguien agregara un
//  campo a mano lo perderia sin enterarse.
//
//  El archivo tiene una entrada por linea, que es lo que hace posible este
//  enfoque. Si alguna vez deja de ser asi, buscarEntrada() avisa en vez de
//  escribir cualquier cosa.
// ============================================================================

/** Comillas simples: es el estilo del archivo. */
function lit(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

const num = (v) => Number(v).toFixed(4);

/** Primera y ultima linea de un `export const NOMBRE = [ ... ];` */
function limites(lineas, nombre) {
  const ini = lineas.findIndex((l) => l.startsWith(`export const ${nombre} = [`));
  if (ini < 0) throw new Error(`No encontré ${nombre} en datos.js.`);
  const fin = lineas.findIndex((l, i) => i > ini && l.trimEnd() === '];');
  if (fin < 0) throw new Error(`No encontré el final de ${nombre} en datos.js.`);
  return [ini, fin];
}

/** La unica linea del bloque que contiene el texto buscado. */
function buscarEntrada(lineas, ini, fin, aguja, que) {
  const halladas = [];
  for (let i = ini + 1; i < fin; i++) if (lineas[i].includes(aguja)) halladas.push(i);
  if (!halladas.length) throw new Error(`No encontré ${que} en datos.js.`);
  if (halladas.length > 1) throw new Error(`Hay más de una entrada de ${que} en datos.js.`);
  return halladas[0];
}

/**
 * Cambia `clave: valor` dentro de una linea, dejando el resto intacto. Si al
 * valor le seguian espacios de alineacion, los ajusta para que la columna
 * siguiente no se corra.
 */
export function reemplazarCampo(linea, clave, literal) {
  const i = linea.indexOf(clave + ':');
  if (i < 0) return null;
  let j = i + clave.length + 1;
  while (linea[j] === ' ') j++;

  let fin = j;
  if (linea[j] === "'") {                       // valor de texto
    fin = j + 1;
    while (fin < linea.length && !(linea[fin] === "'" && linea[fin - 1] !== '\\')) fin++;
    fin++;
  } else {                                      // numero o palabra suelta
    while (fin < linea.length && linea[fin] !== ',' && linea[fin] !== '}') fin++;
    while (fin > j && linea[fin - 1] === ' ') fin--;
  }

  const anterior = linea.slice(j, fin);
  if (anterior === literal) return linea;

  // los espacios que siguen a la coma son la alineacion de la columna
  let k = fin;
  if (linea[k] === ',') k++;
  let espacios = 0;
  while (linea[k + espacios] === ' ') espacios++;
  if (espacios < 2) return linea.slice(0, j) + literal + linea.slice(fin);

  const ajustados = Math.max(1, espacios + anterior.length - literal.length);
  return linea.slice(0, j) + literal + linea.slice(fin, k) +
         ' '.repeat(ajustados) + linea.slice(k + espacios);
}

/** En que columna arranca cada campo de LUGARES, para escribir alineado. */
function columnas(lineas, ini, fin) {
  for (let i = ini + 1; i < fin; i++) {
    const l = lineas[i];
    if (l.includes("{ id: '") && l.includes('nombre:') && l.includes('tipo:')) {
      return { nombre: l.indexOf('nombre:'), tipo: l.indexOf('tipo:'), x: l.indexOf('x:') };
    }
  }
  return { nombre: 35, tipo: 78, x: 98 };
}

function hasta(s, columna) {
  return s.length >= columna ? s + ' ' : s.padEnd(columna, ' ');
}

export function lineaLugar(p, cols) {
  let s = hasta(`  { id: ${lit(p.id)},`, cols.nombre) + `nombre: ${lit(p.nombre)},`;
  s = hasta(s, cols.tipo) + `tipo: ${lit(p.tipo)},`;
  s = hasta(s, cols.x) + `x: ${num(p.x)}, y: ${num(p.y)}`;
  if (p.det) s += `, det: ${lit(p.det)}`;
  return s + ' },';
}

/**
 * Mete la linea al final del grupo que le corresponde por tipo (los grupos son
 * los comentarios `// --- tipo ---`). Si no hay grupo para ese tipo, abre uno.
 */
function insertarEnGrupo(lineas, ini, fin, tipo, linea) {
  const marca = `// --- ${tipo} ---`;
  let g = -1;
  for (let i = ini + 1; i < fin; i++) if (lineas[i].includes(marca)) { g = i; break; }

  if (g < 0) {                                   // grupo nuevo, al final
    lineas.splice(fin, 0, '', `  ${marca}`, linea);
    return fin + 2;
  }
  let ult = g;
  for (let i = g + 1; i < fin && lineas[i].trim().startsWith('{ '); i++) ult = i;
  lineas.splice(ult + 1, 0, linea);
  return ult + 1;
}

/**
 * Devuelve el texto completo de datos.js con los cambios aplicados, y un
 * resumen en castellano de lo que se toco.
 *
 * cambios = {
 *   organos:  [{ sigla, x, y, sede }],       solo los que cambiaron
 *   lugares:  [{ id, x, y, nombre, tipo }],  idem
 *   nuevos:   [{ id, nombre, tipo, x, y }],
 *   quitados: [id, ...],
 * }
 */
export function escribirDatos(texto, cambios) {
  const lineas = texto.split('\n');
  const resumen = [];

  // ---------------------------------------------------------------- ORGANOS
  if (cambios.organos && cambios.organos.length) {
    const [ini, fin] = limites(lineas, 'ORGANOS');
    for (const o of cambios.organos) {
      const i = buscarEntrada(lineas, ini, fin, `sigla: '${o.sigla}'`, `el órgano ${o.sigla}`);
      let l = lineas[i];
      const partes = [];
      if (o.sede != null) { l = reemplazarCampo(l, 'sede', lit(o.sede)); partes.push(`sede ${o.sede}`); }
      if (o.x != null) {
        l = reemplazarCampo(l, 'x', num(o.x));
        l = reemplazarCampo(l, 'y', num(o.y));
        partes.push('posición');
      }
      lineas[i] = l;
      resumen.push(`${o.sigla}: ${partes.join(' y ')}`);
    }
  }

  // ---------------------------------------------------------------- LUGARES
  const tocaLugares = (cambios.lugares && cambios.lugares.length) ||
                      (cambios.nuevos && cambios.nuevos.length) ||
                      (cambios.quitados && cambios.quitados.length);
  if (tocaLugares) {
    let [ini, fin] = limites(lineas, 'LUGARES');

    for (const p of cambios.lugares || []) {
      const i = buscarEntrada(lineas, ini, fin, `id: '${p.id}'`, `el lugar ${p.id}`);
      let l = lineas[i];
      const partes = [];
      if (p.nombre != null) { l = reemplazarCampo(l, 'nombre', lit(p.nombre)); partes.push('nombre'); }
      if (p.tipo != null) { l = reemplazarCampo(l, 'tipo', lit(p.tipo)); partes.push('tipo'); }
      if (p.x != null) {
        l = reemplazarCampo(l, 'x', num(p.x));
        l = reemplazarCampo(l, 'y', num(p.y));
        partes.push('posición');
      }
      lineas[i] = l;
      resumen.push(`${p.id}: ${partes.join(', ')}`);
    }

    // Se quitan de atras para adelante: borrar una linea corre las de abajo.
    const aBorrar = (cambios.quitados || []).map((id) => ({
      id, i: buscarEntrada(lineas, ini, fin, `id: '${id}'`, `el lugar ${id}`),
    })).sort((a, b) => b.i - a.i);
    for (const { id, i } of aBorrar) {
      lineas.splice(i, 1);
      fin--;
      resumen.push(`${id}: quitado`);
    }

    const cols = columnas(lineas, ini, fin);
    for (const p of cambios.nuevos || []) {
      insertarEnGrupo(lineas, ini, fin, p.tipo, lineaLugar(p, cols));
      fin++;
      resumen.push(`${p.id}: agregado`);
    }
  }

  return { texto: lineas.join('\n'), resumen };
}
