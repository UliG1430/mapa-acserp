// ============================================================================
//  tema.js — colores claros, oscuros o los del sistema.
//
//  Son tres modos y no dos. "Automático" es el que viene de fábrica: sigue al
//  teléfono, y si alguien cambia el suyo a la noche la app cambia con él, sin
//  recargar. Los otros dos son una decisión explícita y quedan guardados.
//
//  Quien pinta es el CSS: este módulo solo deja escrito en <html> cuál de las
//  dos paletas aplica (data-tema="claro" | "oscuro"). Ese mismo atributo lo
//  escribe también js/tema-inicial.js antes de que se pinte nada, para que no
//  haya un destello del color equivocado al abrir.
// ============================================================================

const CLAVE = 'minulp2026.tema';
const MODOS = ['auto', 'claro', 'oscuro'];

const oscuroDelSistema = matchMedia('(prefers-color-scheme: dark)');
const oyentes = new Set();

let modo = 'auto';
try {
  const guardado = localStorage.getItem(CLAVE);
  if (MODOS.includes(guardado)) modo = guardado;
} catch (e) {
  // navegador en modo privado o storage bloqueado: seguimos en automatico
}

/** 'auto' | 'claro' | 'oscuro' — lo que la persona eligió. */
export function temaActual() {
  return modo;
}

/** 'claro' | 'oscuro' — el que se está viendo de verdad. */
export function temaEfectivo() {
  if (modo === 'auto') return oscuroDelSistema.matches ? 'oscuro' : 'claro';
  return modo;
}

function aplicar() {
  document.documentElement.dataset.tema = temaEfectivo();
  oyentes.forEach((f) => f(modo));
}

export function setTema(nuevo) {
  modo = MODOS.includes(nuevo) ? nuevo : 'auto';
  try {
    localStorage.setItem(CLAVE, modo);
  } catch (e) { /* sin persistencia, pero la sesion funciona igual */ }
  aplicar();
}

/** Automático → claro → oscuro → automático. */
export function ciclarTema() {
  setTema(MODOS[(MODOS.indexOf(modo) + 1) % MODOS.length]);
}

export function alCambiarTema(f) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

// En automatico seguimos al sistema en vivo. addListener es la forma vieja:
// Safari recien acepto addEventListener aca en la 14, y el modelo se ve desde
// telefonos de todas las epocas.
function siCambiaElSistema() {
  if (modo === 'auto') aplicar();
}
if (oscuroDelSistema.addEventListener) oscuroDelSistema.addEventListener('change', siCambiaElSistema);
else if (oscuroDelSistema.addListener) oscuroDelSistema.addListener(siCambiaElSistema);

// red de seguridad: si tema-inicial.js no llego a correr, el css se
// quedaria sin paleta y la pagina saldria siempre clara
document.documentElement.dataset.tema = temaEfectivo();
