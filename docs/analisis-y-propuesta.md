# Revisión del mapa ACSERP

Fecha: 9 de septiembre de 2026. Rama: pruebas-pedro.

## Alcance y verificación

Revisión estática de las tres páginas, módulos de aplicación, mapa, datos, búsqueda, cronograma, perfil, geolocalización, exportación y QR; estilos, manifiesto y service worker. No hay dependencias, backend, configuración de despliegue ni suite de pruebas en este checkout. Las herramientas tools/calibrar.py, tools/build-assets.py y tools/verificar-qr.py mencionadas en comentarios no están incluidas.

Servidor local: `python3 -m http.server 5173 --bind 127.0.0.1`. Pública: http://127.0.0.1:5173/ ; editor: http://127.0.0.1:5173/editor.html ; impresión: http://127.0.0.1:5173/imprimir.html . Las tres responden HTTP 200. Hay 15 órganos, 63 lugares y cuatro jornadas. JavaScript: 117.130 bytes; imágenes aproximadamente 1,4 MB en disco.

No hubo navegador disponible en la herramienta de control: no se verificaron visualmente los layouts, gestos, GPS ni impresión. Las propuestas visuales son hipótesis basadas en HTML/CSS y requieren prueba en escritorio y celular. Se comprobó con Node que la exportación normal renombra correctamente un lugar y que un nombre con salto de línea genera SyntaxError; este último es un caso del serializador, no una afirmación de que el input de una línea permita ingresarlo normalmente.

## Lo que conviene conservar

JavaScript nativo y módulos pequeños, imágenes WebP, fuente local, soporte offline, búsqueda sin tildes con sinónimos, perfil opcional, vista de lista, botones de mapa navegables por teclado, tratamiento de movimiento reducido y mapa imprimible. El tamaño y escala actuales no justifican migrar todo a un framework ni introducir un motor de mapas externo.

## Hallazgos prioritarios

| Prioridad | Evidencia | Efecto y propuesta |
| --- | --- | --- |
| Alta | editor.html: generar, verificar y botones de exportación | El editor solo descarga/copia datos.js y guarda localStorage. No publica. Separar borrador de versión pública y agregar publicación persistente. |
| Alta | sw.js: fetch | Devuelve caché mientras actualiza recursos individualmente: pese al comentario, no garantiza una versión coherente. Además no extiende la vida del trabajo de fondo con waitUntil. Versionar recursos de aplicación y gestionar contenido con una política separada. |
| Alta | editor.html: verificar | Un error de importación se convierte en aviso y return; el llamador termina anunciando “verificado”. Debe bloquear la exportación/publicación si no se pudo validar y conservar el borrador. |
| Alta | js/mapa.js: pintarMarca; js/qr.js: svgQR | Nombre del lugar y texto del QR se interpolan sin escapar en HTML/atributos. Usar textContent y atributos DOM o escape adecuado. Esto cobra mayor importancia al aceptar contenido publicado desde un editor compartido. |
| Alta | js/datos.js | Las sedes están señaladas como heredadas de 2025 y los teléfonos de organización vacíos. Validar con organización antes del evento; faltan destinos de mapa para acreditación, apertura y clausura. |
| Media | js/app.js: cierre de modal-perfil | “Ver todo” solo marca listo:true y conserva el órgano previo. Debe limpiar organo. Ver cronograma desde una ficha también cambia el perfil persistente: separar consulta temporal de “mi órgano”. |
| Media | js/app.js: alternarGps | El botón que promete volver a ubicar al usuario apaga GPS si ya estaba activo. Separar “centrar en mí” de “desactivar ubicación”. |
| Media | js/app.js: pintarCronograma y temporizador; js/cronograma.js: aFecha | “Hoy” usa UTC, los bloques hora del dispositivo. El temporizador solo refresca el encabezado, dejando resaltado de bloques y jornada desactualizados. Usar zona America/Argentina/Buenos_Aires y actualizar al cruzar límites de bloques/días. |
| Media | js/app.js: irA | Modifica hash pero no escucha hashchange: Atrás/Adelante puede no cambiar la sección visible. Implementar navegación sincronizada y foco hacia el contenido. |
| Media | js/mapa.js: centrarEn/aplicarFiltros | Buscar un lugar con su categoría desactivada centra y selecciona, pero deja su pin oculto. Revelar el destino y comunicar el cambio de filtro. |
| Media | editor.html: recuperar/guardar | Borrador sin revisión de origen: puede reaplicar datos viejos sobre una publicación nueva. Agregar baseRevision, validación al recuperar y resolución de conflictos. El guardado de nombre ocurre en change: conviene autosave con demora breve y estado visible. |
| Media | js/escribir-datos.js | Reescritura dependiente de formato textual y escape incompleto. Campo ausente puede propagar null; insertar grupo nuevo agrega tres líneas pero el límite se incrementa una. Sustituir por datos JSON con esquema y pruebas de altas/bajas/casos límite. |
| Baja | editor.html | Las instrucciones apuntan a app/js/datos.js, pero aquí es js/datos.js. Corregir documentación y agregar instrucciones locales. |

## UX/UI propuesta

1. Entrada directa al mapa. La portada obliga aproximadamente 1,45 s de animación más 450 ms de salida en cada visita, incluso con recursos listos. Mostrar la identidad en el encabezado y reservar carga visual para cuando realmente se está descargando el mapa. Elección de órgano como invitación no bloqueante, mostrando también nombres completos.
2. Búsqueda accesible desde el mapa, con atajos “Mi sede”, “Baños”, “Comida” y “Ayuda”. Conservar navegación inferior y lista como alternativa. Al activar una categoría, asegurar que los niveles de zoom no oculten todos sus resultados.
3. Ficha móvil plegable con destino, sede, próxima actividad y acción principal. En escritorio, panel lateral con lista y ficha junto al mapa. Evitar que seleccionar un destino cambie las preferencias del usuario sin una acción explícita.
4. Distinguir distancia directa de recorrido caminable. Hoy los minutos se calculan desde distancia en línea recta / 80; no hay red de senderos. Rotular como estimación y no prometer rutas accesibles hasta contar con caminos y obstáculos verificados.
5. Editor de escritorio con mapa amplio y panel lateral; en móvil, ficha inferior ajustable. Agregar buscador/listado de puntos, edición del detalle, selector de edificio para sede, deshacer/rehacer e historial. Ocultar coordenadas y calibración dentro de opciones avanzadas.
6. Barra persistente de edición: “Borrador guardado · 3 cambios”, “Vista previa” y “Aplicar cambios”. Estados separados: sin cambios, guardando, listo para publicar, publicando, publicado y error. Exportación como respaldo secundario.
7. Mantener señales de foco y probar lector de pantalla. Completar tabs de jornadas (relación tab/panel y navegación de teclado), anunciar guardado/errores, ampliar áreas táctiles de pines sin aumentar excesivamente sus símbolos. Comprobar contraste bajo sol y tema oscuro.
8. Mostrar “Sin conexión · datos de [fecha]” y última publicación. Si desaparece el destino seleccionado por una actualización, explicar qué pasó y cerrar la ficha de manera controlada.

## Optimización técnica

- Priorizar menor espera percibida y actualización confiable sobre minificación. No hay mediciones de rendimiento de navegador todavía.
- El precache incluye editor, impresión, QR y ambas resoluciones del mapa para todos los usuarios. Separar shell público esencial de recursos de organización y descargar opcionales bajo demanda, manteniendo una acción explícita de preparación offline si hace falta.
- mapa@2x.webp se precachea, pero el mapa interactivo usa mapa.webp; seleccionar resolución por necesidad, zoom/densidad y conexión.
- Agrupar escrituras de transformaciones en requestAnimationFrame durante gestos y evitar repetidas lecturas de geometría en cada pointermove. Medir antes/después en teléfono de gama media.
- Cachear coordenadas derivadas y datos del cronograma por revisión. Con 78 puntos no hace falta un índice espacial complejo.
- Dividir editor e impresión en módulos separados del HTML, centralizar escape y validación. Recuperar herramientas de calibración y verificación de QR; agregar pruebas enfocadas en publicación, conflictos, búsqueda, fechas y exportación.
- Restringir limpieza de cachés a los nombres de esta aplicación; actualmente elimina otras cachés del mismo origen.

## Cómo funcionaría “Aplicar cambios”

Recomendación: mantener frontend liviano y sumar un servicio pequeño con almacenamiento persistente, autenticación de editores y publicaciones versionadas. Aún no se eligió proveedor: el repo no indica dónde está alojado.

Flujo propuesto:

1. El editor carga la revisión publicada y crea/recupera un borrador ligado a ella.
2. Guardar borrador no cambia lo que ve el público. Vista previa usa exactamente ese borrador.
3. “Aplicar cambios” muestra el resumen en el propio panel y envía datos estructurados más baseRevision a un endpoint autenticado.
4. El servidor valida IDs, referencias, coordenadas finitas/rangos, tipos, nombres y cronograma. Rechaza conflictos si ya se publicó otra revisión. No ejecuta JavaScript enviado por el cliente.
5. En una transacción guarda una revisión inmutable y cambia el puntero a la revisión pública. Registra autor y fecha; permite volver a una revisión anterior mediante una nueva publicación.
6. Solo después de la respuesta exitosa, el editor muestra “Publicado”, actualiza su base y limpia los cambios incluidos. Un fallo conserva el borrador; los reintentos usan una clave de idempotencia.
7. La vista pública consulta la versión al abrir, al volver a primer plano, al recuperar conexión y cada 15–30 segundos mientras esté visible. Si cambia, carga un snapshot completo y actualiza mapa, búsqueda, listas, ficha, perfil, cronograma e impresión. Mantiene zoom, filtros y selección cuando siguen siendo válidos. Si se exige latencia de segundos, usar eventos del servidor en lugar de sondeo.
8. Offline conserva la última revisión completa y muestra su fecha. Una publicación no puede llegar a dispositivos desconectados hasta que recuperen conexión.

Contrato orientativo: GET /api/publicacion devuelve revision, publishedAt y datos; POST /api/publicaciones recibe baseRevision, datos e idempotencyKey; GET/PUT /api/borrador para borradores privados. Lectura pública sin login, escritura solo para editores autorizados. Guardar referencias por IDs estables (por ejemplo sedeId) evita nombres y posiciones duplicados entre edificios y órganos.

Cambios de código necesarios: sustituir imports directos de datos.js por un repositorio de datos observable; invalidar el índice memoizado de buscador.js y BLOQUES de cronograma.js; aplicar el mismo snapshot a todos los consumidores. No basta con refrescar pines ni descargar un JSON nuevo: hoy varios módulos retienen su estado inicial.

Alternativas:

| Camino | Uso y límite |
| --- | --- |
| localStorage + BroadcastChannel | Demo rápida entre pestañas del mismo origen/navegador. No publica para otros dispositivos ni reemplaza almacenamiento compartido. |
| Endpoint local que persiste JSON | Permite probar el flujo real en esta máquina. Requiere reemplazar/extender el servidor estático actual; no convierte localhost en un sitio público. |
| Servicio autenticado y almacenamiento compartido | Recomendado para cambios durante el evento, historial y varios editores. Requiere despliegue/configuración. |
| Commit desde servicio y despliegue estático | Alternativa si el alojamiento debe seguir estático. La publicación depende del tiempo de build/despliegue y caché; las credenciales de GitHub deben permanecer en el servidor. |

La política de contenido debe quedar separada del cache de código. La respuesta de versión se revalida con red; cada snapshot se identifica por revisión y solo reemplaza la copia offline tras validación completa. No cachear borradores ni respuestas privadas dentro del shell público.

## Orden de implementación sugerido

1. Corregir validación/escape, perfil, GPS, navegación, fechas y destinos ocultos. Incorporar documentación y checks de datos.
2. Implementar borrador → vista previa → publicar y sincronización con una prueba en dos clientes, fallo de red, conflicto de dos editores, reconexión offline y rollback.
3. Mejorar editor y navegación pública; medir tiempos para encontrar sede/baño y publicar una corrección en celular y escritorio.

Fuentes de apoyo técnico: [caché de PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching), [ciclo de vida de service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [BroadcastChannel y alcance por origen](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API).
