import {logoOrgano,colorOrgano} from './organos.js';
import './estado-publico.js';
import {urlSegura} from './seguridad.js';

    import { ORGANOS, CREDITOS, alCambiarDatos } from './datos.js';
    import { svgQR } from './qr.js';
    import { TIPOS, GRUPOS, icono, todosLosPuntos } from './mapa.js';

    const $ = (s) => document.querySelector(s);
    const esc = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let puntos = todosLosPuntos();
    let organosPrevios=new Set(ORGANOS.map(o=>o.sigla));
    alCambiarDatos(()=>{puntos=todosLosPuntos();for(const o of ORGANOS)if(!organosPrevios.has(o.sigla))estado.organos.add(o.sigla);organosPrevios=new Set(ORGANOS.map(o=>o.sigla));estado.organos=new Set([...estado.organos].filter(s=>organosPrevios.has(s)));renderOrganos();pintar();});
    const estado = {
      grupos: new Set(['sede', 'sanitario']),      // arranca como el mapa impreso 2025
      organos: new Set(ORGANOS.map((o) => o.sigla)),
      rotulos: true,
      cols: 'auto',
      aqui: null,                                  // {x, y} del punto «estás acá»
    };

    const CLAVE_AQUI = 'minulp2026.puntoAqui';
    try {
      const g = localStorage.getItem(CLAVE_AQUI);
      if (g) estado.aqui = JSON.parse(g);
    } catch (e) { /* sin storage: se marca cada vez */ }

    // ------------------------------------------------------------------ panel
    $('#grupos').innerHTML = GRUPOS.map((g) => `
  <label class="pi-op">
    <input type="checkbox" data-g="${g.id}" ${estado.grupos.has(g.id) ? 'checked' : ''}>
    <span class="pi-punto" style="background:${TIPOS[g.tipos[0]].color}">${icono(g.tipos[0])}</span>
    ${esc(g.etiqueta)}
  </label>`).join('');

    function renderOrganos(){$('#organos').innerHTML = ORGANOS.map((o) => `
  <label class="pi-op">
    <input type="checkbox" data-o="${esc(o.sigla)}" ${estado.organos.has(o.sigla)?'checked':''}>
    ${logoOrgano(o.sigla)}
    ${esc(o.sigla)}
  </label>`).join('');

    }
    renderOrganos();
    $('#grupos').addEventListener('change', (e) => {
      const g = e.target.dataset.g;
      if (!g) return;
      if (e.target.checked) estado.grupos.add(g); else estado.grupos.delete(g);
      pintar();
    });
    $('#organos').addEventListener('change', (e) => {
      const o = e.target.dataset.o;
      if (!o) return;
      if (e.target.checked) estado.organos.add(o); else estado.organos.delete(o);
      pintar();
    });
    document.querySelectorAll('[data-todos]').forEach((b) => b.addEventListener('click', () => {
      const on = b.dataset.todos === '1';
      estado.organos = new Set(on ? ORGANOS.map((o) => o.sigla) : []);
      document.querySelectorAll('#organos input').forEach((i) => { i.checked = on; });
      pintar();
    }));
    document.querySelectorAll('input[name=orient]').forEach((r) => r.addEventListener('change', () => {
      $('#hoja').dataset.orient = r.value;
      document.documentElement.dataset.orient = r.value;
      ajustarPagina(r.value);
      encajar();
      pintar();
    }));
    $('#op-oficial').addEventListener('change', (e) => {
      $('#hoja-fondo').src = e.target.checked ? 'img/oficial.webp' : 'img/mapa.webp';
    });
    $('#op-rotulos').addEventListener('change', (e) => { estado.rotulos = e.target.checked; pintar(); });
    $('#op-cols').addEventListener('change', (e) => { estado.cols = e.target.value; pintar(); });

    // -------------------------------------------------------- punto «estás acá»
    $('#op-aqui').addEventListener('change', (e) => {
      $('.hoja-mapa').classList.toggle('mapa-clic', e.target.checked);
      if (!e.target.checked) {
        estado.aqui = null;
        try { localStorage.removeItem(CLAVE_AQUI); } catch (err) { /* nada */ }
      }
      pintar();
      avisarAqui();
    });

    $('.hoja-mapa').addEventListener('click', (e) => {
      if (!$('#op-aqui').checked) return;
      // getBoundingClientRect ya viene con el scale del preview aplicado, asi que
      // la fraccion sale bien sin tener que compensar nada
      const r = $('.hoja-mapa').getBoundingClientRect();
      estado.aqui = {
        x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      };
      try { localStorage.setItem(CLAVE_AQUI, JSON.stringify(estado.aqui)); } catch (err) { /* nada */ }
      pintar();
      avisarAqui();
    });

    function avisarAqui() {
      $('#aqui-aviso').textContent = !$('#op-aqui').checked
        ? 'Sirve para imprimir un cartel para cada lugar del predio.'
        : (estado.aqui ? 'Tocá el mapa otra vez para moverlo.'
          : 'Ahora tocá el mapa donde va a estar el cartel.');
    }
    if (estado.aqui) {
      $('#op-aqui').checked = true;
      $('.hoja-mapa').classList.add('mapa-clic');
    }
    avisarAqui();
    $('#btn-imprimir').addEventListener('click', () => window.print());

    // ------------------------------------------------------------------- QR
    const CLAVE_URL = 'minulp2026.urlPublica';
    try {
      const guardada = localStorage.getItem(CLAVE_URL);
      if (guardada) $('#qr-dir').value = guardada;
    } catch (e) { /* sin storage, se escribe cada vez */ }

    function pintarQR() {
      const caja = $('#hoja-qr');
      const dir = $('#qr-dir').value.trim();
      const quiere = $('#op-qr').checked;
      if (!quiere) { caja.hidden = true; $('#qr-aviso').textContent = 'Va abajo a la derecha del mapa, donde no hay nada.'; return; }
      if (!urlSegura(dir)) {
        caja.hidden = true;
        $('#qr-aviso').textContent = 'Escribí una dirección válida que empiece con https://.';
        return;
      }
      try {
        $('#qr-svg').innerHTML = svgQR(dir, { borde: 4 });
        $('#qr-url').textContent = dir.replace(/^https?:\/\//, '').replace(/\/$/, '');
        caja.hidden = false;
        $('#qr-aviso').textContent = '';
        try { localStorage.setItem(CLAVE_URL, dir); } catch (e) { /* nada */ }
      } catch (e) {
        caja.hidden = true;
        $('#qr-aviso').textContent = 'Esa dirección es demasiado larga para el código.';
      }
    }
    $('#op-qr').addEventListener('change', pintarQR);
    $('#qr-dir').addEventListener('input', pintarQR);

    /** El tamaño de página se cambia con una regla @page inyectada. */
    let reglaPagina = null;
    function ajustarPagina(orient) {
      if (!reglaPagina) {
        reglaPagina = document.createElement('style');
        document.head.appendChild(reglaPagina);
      }
      reglaPagina.textContent = `@media print { @page { size: A4 ${orient === 'vertical' ? 'portrait' : 'landscape'}; margin: 0; } }`;
    }
    ajustarPagina('apaisado');

    // ---------------------------------------------------------------- dibujo
    function visibles() {
      const tipos = new Set();
      GRUPOS.forEach((g) => { if (estado.grupos.has(g.id)) g.tipos.forEach((t) => tipos.add(t)); });
      return puntos.filter((p) => {
        if (!tipos.has(p.tipo)) return false;
        if (p.organo) return estado.organos.has(p.organo.sigla);
        return true;
      });
    }

    /**
     * Corre los rótulos que se pisan. En el Centro Cívico hay ocho sedes muy
     * juntas: sin esto las siglas se superponen y no se lee ninguna.
     */
    function acomodarRotulos(nodos) {
      const puestos = [];
      const choca = (c) => puestos.some((o) => !(c.der < o.izq || c.izq > o.der ||
        c.aba < o.arr || c.arr > o.aba));
      const base = $('#hoja-marcas').getBoundingClientRect();
      const caja = (el) => {
        const r = el.getBoundingClientRect();
        return {
          izq: r.left - base.left, der: r.right - base.left,
          arr: r.top - base.top, aba: r.bottom - base.top
        };
      };

      // El pin «estás acá» no se mueve: es el punto del cartel y tiene que quedar
      // donde se marcó. Se reserva su lugar para que las siglas lo esquiven.
      const pin = $('.hm-aqui');
      if (pin) puestos.push(caja(pin));

      for (const { nodo, rot } of nodos) {
        if (!rot || nodo.classList.contains('hm-aqui')) continue;
        const opciones = [0, 12, -20, 24, -32, 36];
        for (const dy of opciones) {
          rot.style.marginTop = (dy / 3.78) + 'mm';           // px -> mm aprox
          const c = caja(rot);
          if (!choca(c) || dy === opciones[opciones.length - 1]) { puestos.push(c); break; }
        }
      }
    }

    function pintar() {
      const lista = visibles();

      // marcas sobre el mapa: primero los servicios, los órganos arriba de todo
      const orden = [...lista].sort((a, b) => (a.organo ? 1 : 0) - (b.organo ? 1 : 0));
      $('#hoja-marcas').innerHTML = orden.map((p) => {
        const o = p.organo;
        const interior = o
          ? `${logoOrgano(o.sigla)}`
          : icono(p.tipo);
        const color = o ? colorOrgano(o.sigla) : TIPOS[p.tipo].color;
        const rot = (o && estado.rotulos)
          ? `<span class="hm-rot">${esc(o.sigla)}</span>` : '';
        return `<div class="hm ${o ? 'hm-org' : 'hm-serv'}"
                 style="left:${(p.x * 100).toFixed(2)}%; top:${(p.y * 100).toFixed(2)}%">
              <span class="hm-disco" style="background:${color}">${interior}</span>${rot}
            </div>`;
      }).join('');

      if (estado.aqui) {
        const pin = document.createElement('div');
        pin.className = 'hm hm-aqui';
        pin.style.left = (estado.aqui.x * 100).toFixed(2) + '%';
        pin.style.top = (estado.aqui.y * 100).toFixed(2) + '%';
        pin.innerHTML =
          '<svg viewBox="0 0 24 34" fill="#b0113a" aria-hidden="true">' +
          '<path d="M12 0a12 12 0 0 0-12 12c0 8.9 12 22 12 22s12-13.1 12-22A12 12 0 0 0 12 0Z"/>' +
          '<circle cx="12" cy="12" r="4.6" fill="#fff"/></svg>' +
          '<span class="hm-rot">ESTÁS ACÁ</span>';
        $('#hoja-marcas').appendChild(pin);
      }

      requestAnimationFrame(() => acomodarRotulos(
        [...$('#hoja-marcas').children].map((nodo) => ({ nodo, rot: nodo.querySelector('.hm-rot') }))));

      // referencias: solo lo que quedó visible
      const bloques = [];
      const orgs = lista.filter((p) => p.organo).map((p) => p.organo);
      if (orgs.length) {
        bloques.push(`<div class="refs-grupo"><p>Órganos</p>${orgs.map((o) => `<div class="ref">
        ${logoOrgano(o.sigla)}
        <span><b>${esc(o.sigla)}</b> · ${esc(o.sede)}</span></div>`).join('')}</div>`);
      }
      if (estado.aqui) {
        bloques.push('<div class="refs-grupo"><p>Referencia</p>' +
          '<div class="ref"><span class="pi-punto" style="background:#b0113a">' +
          '<svg viewBox="0 0 24 34"><path d="M12 0a12 12 0 0 0-12 12c0 8.9 12 22 12 22s12-13.1 12-22' +
          'A12 12 0 0 0 12 0Z"/><circle cx="12" cy="12" r="4.6" fill="#b0113a"/></svg></span>' +
          '<span><b>Estás acá</b></span></div></div>');
      }

      const porTipo = new Map();
      lista.filter((p) => !p.organo).forEach((p) => {
        porTipo.set(p.tipo, (porTipo.get(p.tipo) || 0) + 1);
      });
      if (porTipo.size) {
        bloques.push(`<div class="refs-grupo"><p>Servicios y lugares</p>${[...porTipo].map(([t, n]) => `<div class="ref">
        <span class="pi-punto" style="background:${TIPOS[t].color}">${icono(t)}</span>
        <span>${esc(TIPOS[t].etiqueta)}${n > 1 ? ` <b>(${n})</b>` : ''}</span></div>`).join('')}</div>`);
      }
      $('#refs').innerHTML = bloques.join('') ||
        '<p class="ref"><span>No hay nada seleccionado.</span></p>';

      acomodarColumnas();

      $('#pie').innerHTML =
        `<b>Diseñado y desarrollado por ${esc(CREDITOS.usuario)} para ${esc(CREDITOS.para)}.</b><br>` +
        'Ilustración del predio: República de los Niños, Municipalidad de La Plata. ' +
        'Calles del entorno: © colaboradores de OpenStreetMap.';

      $('#resumen').textContent =
        `${orgs.length} ${orgs.length === 1 ? 'órgano' : 'órganos'} y ` +
        `${lista.length - orgs.length} ${lista.length - orgs.length === 1 ? 'punto' : 'puntos'} más en la hoja.`;
    }

    /**
     * Reparte las referencias en columnas. En 'automatico' prueba con una y va
     * sumando solo si no entran a lo alto. El multicolumna del navegador nunca
     * superpone texto: parte el contenido, no lo encima.
     */
    function acomodarColumnas() {
      const refs = $('#refs');
      const lado = $('.hoja-lado');
      if (estado.cols !== 'auto') {
        refs.dataset.cols = estado.cols;
        avisarColumnas(Number(estado.cols), false);
        return;
      }
      // Todo en pixeles de maquetado: getBoundingClientRect() vendria afectado por
      // el scale() del preview y scrollHeight no, y mezclarlos daba de mas columnas.
      const MM = 3.7795;
      const tope = $('#hoja').clientHeight - (lado.offsetTop + refs.offsetTop) - 6 * MM;
      let n = 1;
      refs.dataset.cols = n;
      while (n < 3 && refs.scrollHeight > tope) {
        n += 1;
        refs.dataset.cols = n;
      }
      avisarColumnas(n, true);
    }

    /** Si algo quedo afuera de la hoja hay que decirlo: en papel se cortaria. */
    function avisarColumnas(n, automatico) {
      const hoja = $('#hoja');
      const seCorta = hoja.scrollHeight > hoja.clientHeight + 2;
      const el = $('#aviso-cols');
      if (seCorta) {
        el.style.color = 'var(--alerta)';
        el.textContent = n < 3
          ? `Con ${n} ${n === 1 ? 'columna' : 'columnas'} no entra todo en la hoja. Probá con más columnas o mostrá menos puntos.`
          : 'No entra todo en la hoja: sacá algún grupo o pasá a A4 apaisado.';
        return;
      }
      el.style.color = '';
      el.textContent = (automatico && n > 1)
        ? `Las referencias no entraban en una columna: van en ${n}.` : '';
    }

    // ------------------------------------------------- encajar la hoja en pantalla
    function encajar() {
      // offsetWidth es el ancho de maquetado, sin la transformacion: usarlo evita
      // el calculo circular de medir algo que ya esta escalado
      const disponible = $('.pi-lienzo').clientWidth - 8;
      const natural = $('#hoja').offsetWidth;
      if (!natural || !disponible) return;
      const k = Math.min(1, disponible / natural);
      $('#escala').style.transform = `scale(${k})`;
      $('#escala').style.height = ($('#hoja').offsetHeight * k) + 'px';
    }
    addEventListener('resize', encajar);

    pintar();
    pintarQR();
    encajar();
