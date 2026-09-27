// ============================================================================
//  tema-inicial.js — decide claro u oscuro ANTES de que se pinte la pagina.
//
//  Es un script comun (no un modulo) y va en el <head>, antes del CSS: si se
//  esperara a los modulos, se veria un destello del color equivocado en cada
//  apertura. No puede ir en linea en el HTML porque la politica de seguridad
//  del servidor (script-src 'self') bloquea los scripts en linea.
//
//  Solo resuelve cual de las dos paletas aplica. Guardar la eleccion y seguir
//  al sistema en vivo es cosa de js/tema.js.
// ============================================================================
(function () {
  var t = null;
  try { t = localStorage.getItem('minulp2026.tema'); } catch (e) { /* sin storage */ }
  if (t !== 'claro' && t !== 'oscuro') {
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'oscuro' : 'claro';
  }
  document.documentElement.setAttribute('data-tema', t);
})();
