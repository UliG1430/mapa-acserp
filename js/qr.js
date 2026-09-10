import {esc} from './seguridad.js';
// ============================================================================
//  qr.js — generador de codigos QR (modo byte, correccion M, versiones 1 a 10).
//
//  Se escribio a mano en vez de sumar una libreria porque la app no tiene
//  dependencias y tiene que andar sin senal.
//
//  VALIDACION: tools/verificar-qr.py dibuja los codigos que genera este modulo
//  y los lee con el detector de OpenCV, a dos escalas, cubriendo las versiones
//  1 a 10. Esa es la prueba que vale. Comparar la matriz contra otra libreria
//  NO sirve como criterio: dos QR correctos pueden elegir mascaras distintas y
//  dar matrices distintas, y los dos escanean bien.
//
//  Un QR mal generado es peor que no tenerlo, asi que si se toca algo de este
//  archivo hay que volver a correr esa verificacion.
//
//  Hasta version 10 con correccion M entran 213 bytes: de sobra para una URL.
// ============================================================================

// --- tablas por version (nivel M) -----------------------------------------
// [codewords de correccion por bloque, bloques grupo 1, datos grupo 1,
//  bloques grupo 2, datos grupo 2]
const BLOQUES_M = [
  null,
  [10, 1, 16, 0, 0],   // v1
  [16, 1, 28, 0, 0],   // v2
  [26, 1, 44, 0, 0],   // v3
  [18, 2, 32, 0, 0],   // v4
  [24, 2, 43, 0, 0],   // v5
  [16, 4, 27, 0, 0],   // v6
  [18, 4, 31, 0, 0],   // v7
  [22, 2, 38, 2, 39],  // v8
  [22, 3, 36, 2, 37],  // v9
  [26, 4, 43, 1, 44],  // v10
];

const ALINEACION = [
  null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

// info de version (BCH 18 bits), solo hace falta desde la 7
const INFO_VERSION = { 7: 0x07C94, 8: 0x085BC, 9: 0x09A99, 10: 0x0A4D3 };

const BITS_NIVEL_M = 0b00;     // los 2 bits que identifican el nivel M

// --- aritmetica en GF(256), polinomio 0x11D -------------------------------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** Polinomio generador de Reed-Solomon para n codewords de correccion. */
function generador(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const nuevo = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      nuevo[j] ^= g[j];
      nuevo[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = nuevo;
  }
  return g;
}

function correccion(datos, n) {
  const g = generador(n);
  const resto = new Array(n).fill(0);
  for (const byte of datos) {
    const factor = byte ^ resto[0];
    resto.shift();
    resto.push(0);
    if (factor !== 0) {
      for (let i = 0; i < n; i++) resto[i] ^= mul(g[i + 1], factor);
    }
  }
  return resto;
}

// --- codificacion de los datos --------------------------------------------
function aBytes(texto) {
  return Array.from(new TextEncoder().encode(texto));
}

function capacidadDatos(version) {
  const [ec, b1, d1, b2, d2] = BLOQUES_M[version];
  return b1 * d1 + b2 * d2;
}

function versionNecesaria(bytes) {
  for (let v = 1; v <= 10; v++) {
    const bitsCuenta = v < 10 ? 8 : 16;
    const necesarios = 4 + bitsCuenta + bytes.length * 8;
    if (necesarios <= capacidadDatos(v) * 8) return v;
  }
  throw new Error('El texto es demasiado largo para un QR versión 10 nivel M');
}

function bitsDeDatos(bytes, version) {
  const bits = [];
  const push = (valor, largo) => {
    for (let i = largo - 1; i >= 0; i--) bits.push((valor >> i) & 1);
  };
  push(0b0100, 4);                                   // modo byte
  push(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));

  const capacidad = capacidadDatos(version) * 8;
  push(0, Math.min(4, capacidad - bits.length));     // terminador
  while (bits.length % 8) bits.push(0);              // completar el byte

  const relleno = [0xEC, 0x11];
  let i = 0;
  while (bits.length < capacidad) push(relleno[i++ % 2], 8);

  const salida = [];
  for (let k = 0; k < bits.length; k += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[k + j];
    salida.push(byte);
  }
  return salida;
}

/** Parte en bloques, calcula la correccion e intercala como manda la norma. */
function codewordsFinales(datos, version) {
  const [ec, b1, d1, b2, d2] = BLOQUES_M[version];
  const bloques = [];
  let p = 0;
  for (let i = 0; i < b1; i++) { bloques.push(datos.slice(p, p + d1)); p += d1; }
  for (let i = 0; i < b2; i++) { bloques.push(datos.slice(p, p + d2)); p += d2; }
  const ecs = bloques.map((b) => correccion(b, ec));

  const salida = [];
  const maxDatos = Math.max(d1, d2);
  for (let i = 0; i < maxDatos; i++) {
    for (const b of bloques) if (i < b.length) salida.push(b[i]);
  }
  for (let i = 0; i < ec; i++) {
    for (const e of ecs) salida.push(e[i]);
  }
  return salida;
}

// --- construccion de la matriz --------------------------------------------
function nuevaMatriz(n) {
  return { m: Array.from({ length: n }, () => new Array(n).fill(null)), n };
}

function ponerPatronBusqueda(M, fila, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const y = fila + r, x = col + c;
      if (y < 0 || y >= M.n || x < 0 || x >= M.n) continue;
      const borde = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                    (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const centro = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      M.m[y][x] = borde || centro;
    }
  }
}

function ponerAlineacion(M, version) {
  const centros = ALINEACION[version];
  for (const fila of centros) {
    for (const col of centros) {
      // no van encima de los patrones de busqueda
      if ((fila === 6 && col === 6) ||
          (fila === 6 && col === M.n - 7) ||
          (fila === M.n - 7 && col === 6)) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          M.m[fila + r][col + c] =
            Math.max(Math.abs(r), Math.abs(c)) !== 1;
        }
      }
    }
  }
}

function esReservado(M, fila, col, version) {
  const n = M.n;
  if (fila === 6 || col === 6) return true;                        // temporizador
  if (fila < 9 && col < 9) return true;                            // busqueda + formato
  if (fila < 9 && col >= n - 8) return true;
  if (fila >= n - 8 && col < 9) return true;
  if (version >= 7 && ((fila < 6 && col >= n - 11) || (col < 6 && fila >= n - 11))) return true;
  const centros = ALINEACION[version];
  for (const f of centros) {
    for (const c of centros) {
      if ((f === 6 && c === 6) || (f === 6 && c === n - 7) || (f === n - 7 && c === 6)) continue;
      if (Math.abs(fila - f) <= 2 && Math.abs(col - c) <= 2) return true;
    }
  }
  return false;
}

function bch15(datos) {
  let v = datos << 10;
  for (let i = 4; i >= 0; i--) {
    if (v & (1 << (i + 10))) v ^= 0x537 << i;
  }
  return ((datos << 10) | v) ^ 0x5412;
}

function bch18(version) {
  let v = version << 12;
  for (let i = 5; i >= 0; i--) {
    if (v & (1 << (i + 12))) v ^= 0x1F25 << i;
  }
  return (version << 12) | v;
}

const MASCARAS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function penalidad(m, n) {
  let total = 0;
  // regla 1: rachas de 5 o mas del mismo color
  const racha = (obtener) => {
    for (let a = 0; a < n; a++) {
      let cuenta = 1;
      for (let b = 1; b < n; b++) {
        if (obtener(a, b) === obtener(a, b - 1)) {
          cuenta++;
        } else {
          if (cuenta >= 5) total += 3 + (cuenta - 5);
          cuenta = 1;
        }
      }
      if (cuenta >= 5) total += 3 + (cuenta - 5);
    }
  };
  racha((a, b) => m[a][b]);
  racha((a, b) => m[b][a]);

  // regla 2: bloques de 2x2 del mismo color
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) total += 3;
    }
  }

  // regla 3: patrones tipo 1:1:3:1:1 con 4 modulos claros al lado
  const patronA = [true, false, true, true, true, false, true, false, false, false, false];
  const patronB = [false, false, false, false, true, false, true, true, true, false, true];
  const coincide = (obtener, a, b, patron) => {
    for (let i = 0; i < 11; i++) if (obtener(a, b + i) !== patron[i]) return false;
    return true;
  };
  for (let a = 0; a < n; a++) {
    for (let b = 0; b + 11 <= n; b++) {
      if (coincide((x, y) => m[x][y], a, b, patronA)) total += 40;
      if (coincide((x, y) => m[x][y], a, b, patronB)) total += 40;
      if (coincide((x, y) => m[y][x], a, b, patronA)) total += 40;
      if (coincide((x, y) => m[y][x], a, b, patronB)) total += 40;
    }
  }

  // regla 4: desbalance entre modulos oscuros y claros
  let oscuros = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) oscuros++;
  const porcentaje = (oscuros * 100) / (n * n);
  total += Math.floor(Math.abs(porcentaje - 50) / 5) * 10;
  return total;
}

/**
 * Devuelve la matriz de modulos (true = oscuro).
 * `mascaraForzada` es solo para las pruebas: permite comparar contra otra
 * implementacion sin que la eleccion automatica de mascara meta ruido.
 */
export function matrizQR(texto, mascaraForzada = null) {
  const bytes = aBytes(texto);
  const version = versionNecesaria(bytes);
  const n = version * 4 + 17;
  const M = nuevaMatriz(n);

  ponerPatronBusqueda(M, 0, 0);
  ponerPatronBusqueda(M, 0, n - 7);
  ponerPatronBusqueda(M, n - 7, 0);
  ponerAlineacion(M, version);
  for (let i = 8; i < n - 8; i++) {
    M.m[6][i] = i % 2 === 0;
    M.m[i][6] = i % 2 === 0;
  }
  M.m[n - 8][8] = true;                       // modulo siempre oscuro

  if (version >= 7) {
    const info = bch18(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((info >> i) & 1) === 1;
      M.m[Math.floor(i / 3)][n - 11 + (i % 3)] = bit;
      M.m[n - 11 + (i % 3)][Math.floor(i / 3)] = bit;
    }
  }

  // recorrido en zigzag de abajo a arriba, saltando la columna 6
  const datos = codewordsFinales(bitsDeDatos(bytes, version), version);
  let bit = 0;
  const total = datos.length * 8;
  let col = n - 1;
  let arriba = true;
  const libres = [];
  while (col > 0) {
    if (col === 6) col--;
    for (let i = 0; i < n; i++) {
      const fila = arriba ? n - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (esReservado(M, fila, c, version)) continue;
        let valor = false;
        if (bit < total) {
          valor = ((datos[bit >> 3] >> (7 - (bit & 7))) & 1) === 1;
          bit++;
        }
        M.m[fila][c] = valor;
        libres.push([fila, c]);
      }
    }
    arriba = !arriba;
    col -= 2;
  }

  // probamos las 8 mascaras y nos quedamos con la de menor penalidad
  let mejor = null;
  const candidatas = mascaraForzada === null ? [0, 1, 2, 3, 4, 5, 6, 7] : [mascaraForzada];
  for (const k of candidatas) {
    const copia = M.m.map((f) => f.slice());
    for (const [f, c] of libres) if (MASCARAS[k](f, c)) copia[f][c] = !copia[f][c];
    const formato = bch15((BITS_NIVEL_M << 3) | k);
    ponerFormato(copia, n, formato);
    const p = penalidad(copia, n);
    if (!mejor || p < mejor.p) mejor = { p, m: copia };
  }
  return mejor.m;
}

function ponerFormato(m, n, formato) {
  for (let i = 0; i < 15; i++) {
    const bit = ((formato >> i) & 1) === 1;
    // copia junto al patron de arriba a la izquierda
    if (i < 6) m[i][8] = bit;
    else if (i === 6) m[7][8] = bit;
    else if (i === 7) m[8][8] = bit;
    else if (i === 8) m[8][7] = bit;
    else m[8][14 - i] = bit;
    // copia repartida en los otros dos patrones
    if (i < 8) m[8][n - 1 - i] = bit;
    else m[n - 15 + i][8] = bit;
  }
}

/** SVG listo para insertar. `borde` va en modulos (la norma pide 4). */
export function svgQR(texto, { borde = 4, color = '#0e153e', fondo = '#fff' } = {}) {
  const m = matrizQR(texto);
  const n = m.length;
  const lado = n + borde * 2;
  const partes = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (m[r][c]) {
        const inicio = c;
        while (c < n && m[r][c]) c++;
        partes.push(`M${inicio + borde} ${r + borde}h${c - inicio}v1h-${c - inicio}z`);
      } else c++;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" ` +
         `shape-rendering="crispEdges" role="img" aria-label="Código QR de ${esc(texto)}">` +
         `<rect width="${lado}" height="${lado}" fill="${esc(fondo)}"/>` +
         `<path d="${partes.join('')}" fill="${esc(color)}"/></svg>`;
}
