# Despliegue del mapa

Estado: listo para conectar la rama `main` a Netlify. No se realizó el deploy online.

## Cuenta y almacenamiento

Auth utiliza la cuenta existente de `web-acserp`, autorizada por correo en el servidor. En Netlify, el mapa guarda publicaciones, borradores y sesiones en su store aislado de Netlify Blobs; no crea tablas ni políticas en las bases de `web-acserp` o `inscripciones-acserp`.

## Netlify

1. Crear un proyecto desde este repositorio y seleccionar la rama `main`. `netlify.toml` ya define `npm run build`, `dist/client`, Functions y Node 22.
2. Configurar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` con los mismos valores de `web-acserp`; agregar `EDITOR_EMAILS`, una `SESSION_ENCRYPTION_KEY` hexadecimal de 64 caracteres, `NODE_ENV=production` y `APP_ORIGIN=https://mapa.acserp.org.ar`.
3. Asignar `mapa.acserp.org.ar` como dominio de producción. Netlify aprovisiona automáticamente Blobs para el proyecto cuando la Function lo usa.
4. Tras el primer deploy, probar login, guardado de borrador, publicación y persistencia después de un redeploy.

Se intentó crear el proyecto Supabase separado `mapa-acserp` en ACSERP, después de confirmar organización y consultar costo. Supabase rechazó la creación por el límite de dos proyectos gratuitos activos. No se creó un proyecto nuevo, no se pausaron proyectos y no se contrató un plan. Compartir Auth permite usar las credenciales actuales, pero no equivale a tener un proyecto Supabase separado.

## Opción Node con volumen persistente

Adecuada si el plan de Hostinger permite procesos Node duraderos o es un VPS. Un alojamiento exclusivamente estático/PHP no alcanza para este servidor.

1. Instalar Node >=22.13, copiar el repositorio, ejecutar `npm ci` y `npm run build`.
2. Crear un directorio privado persistente fuera del directorio web. Configurar `MAPA_DB` con la ruta absoluta a su archivo SQLite. El servidor aplica las migraciones de `drizzle` al arrancar.
3. Configurar secretos en el entorno del proceso, usando `.env.example` como guía: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `EDITOR_EMAILS`, `SESSION_ENCRYPTION_KEY`, `NODE_ENV=production`, `APP_ORIGIN` con el origen HTTPS exacto y `PORT`.
4. Generar la clave de sesiones con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` y guardarla exclusivamente en el gestor de secretos. No subir `.env`, DB ni backups.
5. Iniciar `npm start` bajo un supervisor que reinicie el proceso. Exponerlo solo mediante un proxy HTTPS que conserve el encabezado Host del dominio público; impedir acceso directo al puerto Node desde Internet.
6. Servir mapa y API bajo el mismo origen y en la raíz del dominio/subdominio. Para varios procesos/servidores, usar D1; no compartir un archivo SQLite por un filesystem de red.
7. Configurar CDN: `/api/*` nunca se cachea; `/public/version.json` tiene caché compartida de 5 segundos; snapshots de `/public/revisions/*` son inmutables; `sw.js` se revalida siempre. No aplicar una regla global de “cachear todo”.

Las lecturas públicas no consultan Supabase Auth. El volumen de 3000 asistentes depende principalmente del CDN, las imágenes iniciales y cuántas pestañas permanezcan abiertas, no del número de cuentas. El sondeo ocurre solo con la página visible, aproximadamente cada 15–20 segundos. Verificar límites y tráfico del plan elegido antes del evento; las mediciones locales no certifican capacidad de Hostinger.

## Opción Cloudflare Worker + D1

El build produce `dist/client` y `dist/server/index.js`, con el Worker ESM. Necesita un binding `DB` a una D1 exclusiva del mapa, binding `ASSETS` para `dist/client`, migraciones SQL de `drizzle` y los mismos secretos de Auth. El Worker debe ejecutarse antes de assets en todas las rutas, para aplicar las cabeceras y garantizar que `/api/*` y `/public/*` lleguen al código. No configurar fallback SPA que devuelva HTML en esas rutas.

El Worker implementa la caché pública mediante Cache API; las respuestas privadas no se guardan allí. El bundle no aprovisiona por sí solo Worker, dominio ni D1. Los archivos generados bajo `dist/.openai` son artefactos del build, no evidencia de despliegue o recursos ya creados.

## Respaldo y actualización

Antes de migrar una base existente, hacer backup consistente con la herramienta de backup de SQLite (o detener el servidor y copiar la base junto con sus archivos WAL/SHM, si existen). No copiar solo el archivo principal mientras está en uso. Proteger también los backups: contienen borradores, identificadores y sesiones cifradas. Guardar la clave de cifrado separadamente y probar una restauración en un entorno aislado.

Las migraciones son incrementales; mantenerlas en Git. Nunca reemplazar la base de producción por `.local/mapa.sqlite`. Conservar el mismo `data/inicial.json` de arranque si existen publicaciones basadas en `inicial`; actualizar contenido mediante el editor.

Tras desplegar, verificar en el dominio real: login autorizado, rechazo de otra cuenta y acceso anónimo a borradores, cookie Secure, logout, publicación en dos dispositivos, conflicto entre editores, versión pública por CDN, recuperación offline y persistencia tras reiniciar. Confirmar que `.env`, `.git`, DB, migraciones y fuentes del servidor devuelven 404. Revisar logs sin guardar contraseñas, códigos, cookies o tokens.

La alternativa Node/Cloudflare se conserva como opción fuera de Netlify; para el deploy pedido usar la sección Netlify.
