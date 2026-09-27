// ============================================================================
//  portada.js — la animacion de entrada, y la garantia de que se va.
//
//  POR QUE VA SEPARADA DE LA APP. Antes la manejaba app.js, pero app.js no
//  arranca hasta que no estan los datos: datos.js los espera antes de dejar
//  seguir al resto de los modulos. En una primera visita con mala señal eso
//  eran varios segundos con el logo congelado, y la portada parecia colgada.
//  Ahora corre sola apenas se lee el HTML, sin depender de nada, y la app le
//  avisa cuando esta lista con el evento `minulp:lista`.
//
//  Se va cuando se cumplen las dos cosas: el logo termino de dibujarse Y la app
//  esta lista. Si el logo tarda en bajar no se lo espera; si la app tarda, se
//  dice ("Cargando el mapa…") en vez de quedarse muda. Pase lo que pase, a los
//  12 s se va igual: eso cubre de sobra el tope de 8 s que tiene la descarga de
//  datos, que si falla deja su propio mensaje de error.
//
//  Va en un archivo y no en linea en el HTML porque la politica de seguridad
//  del servidor (script-src 'self') bloquea cualquier script en linea: ahi la
//  portada nunca se iba.
// ============================================================================
(function () {
  var el = document.getElementById('portada');
  var img = document.getElementById('portada-anim');
  if (!el || !img) return;
  // app.js mira esta marca: si no esta, sabe que este archivo no corrio y
  // saca la portada por su cuenta
  window.__minulpPortada = true;

  var DURACION = 1450;       // lo que dura splash.webp
  var SALIDA = 450;          // el fundido de salida, igual que en el css
  var ESPERA_IMAGEN = 2500;  // si el logo no llego en este tiempo, no se lo espera
  var AVISO_LENTO = 5000;
  var TOPE = 12000;

  var estado = el.querySelector('.portada-estado');
  var menosMovimiento = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var inicio = Date.now();
  var dibujoTermina = null;  // ms desde el inicio en que el logo queda dibujado
  var appLista = false;
  var cerrada = false;
  var urlBlob = null;
  var reloj = null;

  function transcurrido() { return Date.now() - inicio; }

  function cerrar() {
    if (cerrada) return;
    cerrada = true;
    clearInterval(reloj);
    el.classList.add('saliendo');
    setTimeout(function () {
      el.hidden = true;
      if (urlBlob) URL.revokeObjectURL(urlBlob);
      window.__minulpPortadaFuera = true;
      window.dispatchEvent(new Event('minulp:portada-fuera'));
    }, menosMovimiento ? 0 : SALIDA);
  }

  function revisar() {
    if (cerrada) return;
    var t = transcurrido();
    if (t >= TOPE) { cerrar(); return; }
    if (dibujoTermina === null && t >= ESPERA_IMAGEN) dibujoTermina = t;
    var dibujado = dibujoTermina !== null && t >= dibujoTermina;
    if (dibujado && appLista) { cerrar(); return; }
    if (dibujado && estado) {
      estado.textContent = t >= AVISO_LENTO
        ? 'La conexión está lenta, un momento…'
        : 'Cargando el mapa…';
      estado.classList.add('visible');
    }
  }

  function mostrar(src) {
    img.onload = function () {
      // el dibujo se cuenta desde que la imagen se pudo ver, no desde el inicio
      if (dibujoTermina === null) {
        dibujoTermina = transcurrido() + (menosMovimiento ? 400 : DURACION);
      }
      revisar();
    };
    img.onerror = function () {
      if (dibujoTermina === null) dibujoTermina = transcurrido();
      revisar();
    };
    img.src = src;
  }

  if (menosMovimiento || !window.fetch || !window.URL || !URL.createObjectURL) {
    mostrar(menosMovimiento ? 'img/splash-fijo.webp' : 'img/splash.webp');
  } else {
    // Un webp animado de una sola vuelta no vuelve a empezar si el navegador
    // reusa la imagen que ya tiene decodificada: se ve el ultimo cuadro, quieto.
    // Con un blob nuevo en cada carga arranca siempre del primer cuadro. No se
    // baja dos veces: el <link rel=preload> del index ya la dejo en el cache.
    fetch('img/splash.webp')
      .then(function (r) {
        if (!r.ok) throw new Error('splash');
        return r.blob();
      })
      .then(function (b) {
        if (cerrada) return;
        urlBlob = URL.createObjectURL(b);
        mostrar(urlBlob);
      })
      .catch(function () {
        if (!cerrada) mostrar('img/splash.webp');
      });
  }

  window.addEventListener('minulp:lista', function () {
    appLista = true;
    revisar();
  });
  reloj = setInterval(revisar, 120);
})();
