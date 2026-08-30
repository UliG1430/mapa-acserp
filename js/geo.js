// ============================================================================
//  geo.js — de coordenadas reales a puntos sobre el dibujo de la Repu
//
//  La ilustracion es una vista oblicua de un terreno plano, asi que la
//  transformacion correcta de lat/lon a pixel es una HOMOGRAFIA (matriz 3x3),
//  no una escala lineal. La matriz de abajo se ajusto por minimos cuadrados
//  con 18 puntos de control tomados de OpenStreetMap y de los pines del mapa
//  oficial 2025. Error mediano: ~13 px, es decir unos 10 metros, comparable
//  al error del GPS de un celular.
//
//  Para recalcularla:  python tools/calibrar.py
// ============================================================================

export const MAPA_PX = 1254;          // lado de la ilustracion, en pixeles
export const ENTORNO_PX = 700;        // cuanto se extiende el mapa real alrededor

// origen del sistema local en metros (centro aproximado del predio)
const LAT0 = -34.8846;
const LON0 = -58.0195;
const K = 111320;
const KX = K * Math.cos((LAT0 * Math.PI) / 180);

// homografia: [metros este, metros norte, 1] -> [px, py, w]
const H = [
  [1.392697597, 0.3209850496, 430.0655358],
  [0.1421846333, -1.241296933, 562.2451464],
  [-0.0001210385854, 0.0002706082566, 1],
];

function invertir3(m) {
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [C / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
}
const HINV = invertir3(H);

function aplicar(m, x, y) {
  const w = m[2][0] * x + m[2][1] * y + m[2][2];
  return [(m[0][0] * x + m[0][1] * y + m[0][2]) / w,
          (m[1][0] * x + m[1][1] * y + m[1][2]) / w];
}

/**
 * lat/lon -> pixel del mapa (0..1254). Puede caer fuera si estas lejos.
 *
 * `valido` avisa si la proyeccion tiene sentido. Una homografia es una vista en
 * perspectiva y tiene su propia linea de horizonte: en este mapa, a unos 3,7 km
 * hacia el sur el denominador cambia de signo y el punto aparece ESPEJADO del
 * otro lado. Para cualquier cosa lejana hay que usar direccionHacia(), no esto.
 */
export function aPixel(lat, lon) {
  const X = (lon - LON0) * KX;
  const Y = (lat - LAT0) * K;
  const w = H[2][0] * X + H[2][1] * Y + 1;
  return {
    x: (H[0][0] * X + H[0][1] * Y + H[0][2]) / w,
    y: (H[1][0] * X + H[1][1] * Y + H[1][2]) / w,
    valido: w > 0.05,
  };
}

/**
 * Hacia donde queda una coordenada real, vista desde un punto del dibujo, en
 * direccion de pixeles del mapa. Sirve para lugares lejanos: en vez de proyectar
 * el punto (que puede caer del otro lado del horizonte) proyectamos un paso
 * corto en esa direccion, donde la homografia todavia se porta bien.
 */
export function direccionHacia(pxDesde, pyDesde, lat, lon) {
  const o = aLatLon(pxDesde, pyDesde);
  const este = (lon - o.lon) * KX;
  const norte = (lat - o.lat) * K;
  const d = Math.hypot(este, norte);
  if (d < 1) return { dx: 0, dy: 0, metros: 0 };
  const PASO = 150;                       // metros: corto, siempre dentro del mapa
  const cerca = aPixel(o.lat + (norte / d) * PASO / K,
                       o.lon + (este / d) * PASO / KX);
  return { dx: cerca.x - pxDesde, dy: cerca.y - pyDesde, metros: d };
}

/** pixel del mapa -> lat/lon. Se usa en el editor. */
export function aLatLon(px, py) {
  const [E, N] = aplicar(HINV, px, py);
  return { lat: LAT0 + N / K, lon: LON0 + E / KX };
}

/** Cuantos pixeles del mapa mide un metro en esa zona del predio. */
export function pxPorMetro(lat, lon) {
  const a = aPixel(lat, lon);
  const b = aPixel(lat + 10 / K, lon);
  return Math.hypot(b.x - a.x, b.y - a.y) / 10;
}

/** Distancia en metros entre dos coordenadas (plano local, exacto a esta escala). */
export function distancia(lat1, lon1, lat2, lon2) {
  return Math.hypot((lon2 - lon1) * KX, (lat2 - lat1) * K);
}

/** Rumbo en grados desde el norte (0 = norte, 90 = este). */
export function rumbo(lat1, lon1, lat2, lon2) {
  const ang = Math.atan2((lon2 - lon1) * KX, (lat2 - lat1) * K) * 180 / Math.PI;
  return (ang + 360) % 360;
}

/**
 * Contorno del predio en pixeles del dibujo: sigue el camino perimetral y baja
 * por el acceso sur hasta el estacionamiento. Un rectangulo no sirve porque el
 * parque esta en diagonal y dejaria adentro media avenida.
 */
const CONTORNO = [
  [430, 4], [700, 4], [1010, 145], [1175, 430], [1125, 595], [910, 800],
  [700, 945], [525, 1035], [430, 1115], [440, 1252], [165, 1252], [255, 1020],
  [145, 805], [70, 618], [115, 435], [255, 235], [378, 105],
];

export function dentroDelPredio(lat, lon) {
  // guarda barata: si estas a mas de ~2 km, la homografia ya no significa nada
  if (Math.abs(lat + 34.8846) > 0.02 || Math.abs(lon + 58.0195) > 0.024) return false;
  const { x, y } = aPixel(lat, lon);
  if (x < 0 || y < 0 || x > MAPA_PX || y > MAPA_PX) return false;
  let dentro = false;
  for (let i = 0, j = CONTORNO.length - 1; i < CONTORNO.length; j = i++) {
    const [xi, yi] = CONTORNO[i];
    const [xj, yj] = CONTORNO[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function formatearDistancia(m) {
  if (m < 1000) return Math.round(m / 5) * 5 + ' m';
  return (m / 1000).toFixed(1).replace('.', ',') + ' km';
}

/** Minutos caminando, a 80 m/min (paso tranquilo, con gente). */
export function minutosCaminando(m) {
  return Math.max(1, Math.round(m / 80));
}

const PUNTOS_CARDINALES = ['norte', 'noreste', 'este', 'sureste',
                           'sur', 'suroeste', 'oeste', 'noroeste'];

export function nombreRumbo(grados) {
  return PUNTOS_CARDINALES[Math.round(grados / 45) % 8];
}

// ---------------------------------------------------------------- GPS -----

/**
 * Sigue la ubicacion del dispositivo.
 * Llama a onCambio({lat, lon, precision}) o a onError(codigo) con
 * 'permiso' | 'no-disponible' | 'sin-soporte' | 'demora'.
 * Devuelve una funcion para dejar de seguir.
 */
export function seguirUbicacion(onCambio, onError) {
  if (!('geolocation' in navigator)) {
    onError('sin-soporte');
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) => onCambio({
      lat: p.coords.latitude,
      lon: p.coords.longitude,
      precision: p.coords.accuracy || 999,
      rumbo: typeof p.coords.heading === 'number' && !isNaN(p.coords.heading)
        ? p.coords.heading : null,
    }),
    (e) => onError(e.code === 1 ? 'permiso' : e.code === 3 ? 'demora' : 'no-disponible'),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
