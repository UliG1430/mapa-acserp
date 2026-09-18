# Mapa ACSERP / MINULP

Mapa público y editor con borradores, vista previa, historial y publicación. No requiere modificar archivos de código para actualizar lugares o actividades.

## Probar en local

Requiere Node.js 22.13 o posterior.

```sh
npm ci
npm run dev
```

- Mapa: http://127.0.0.1:5173/
- Acceso al editor: http://127.0.0.1:5173/admin
- Impresión: http://127.0.0.1:5173/imprimir.html

El botón **Entrar a la prueba local** permite probar sin credenciales y solo existe en el servidor de desarrollo, limitado a esta computadora. La base `.local/mapa.sqlite` conserva cambios entre reinicios; no se sube a Git. No borrar esa carpeta para actualizar código.

Para el acceso real, copiar `.env.example` a `.env` y completar sus valores. En la computadora de trabajo ya se configuró la conexión con Auth de `web-acserp`. Se usa el mismo correo y contraseña de ACSERP; la sesión del mapa es independiente y no se importa automáticamente la sesión del otro sitio. Solo los correos de `EDITOR_EMAILS` pueden editar. No hay registro público desde el mapa. Si la cuenta tiene un autenticador TOTP verificado, también se pide su código.

## Edición y publicación

1. Ingresar al editor. Los lugares aparecen agrupados por categoría, con órganos separados.
2. Editar puntos, crear órganos, cambiar sus nombres/siglas, asociar edificios, modificar actividades y contenidos. Deshacer/rehacer actúa sobre el borrador.
3. Revisar **Vista previa**. Guardar el borrador no cambia el mapa público.
4. **Aplicar cambios** muestra el resumen y crea una publicación completa. Otras pestañas conectadas la reciben normalmente dentro de unos 25 segundos, sin recargar manualmente.
5. El historial permite recuperar una publicación al borrador y publicarla de nuevo. Si dos personas editan a la vez, el editor pide resolver diferencias.

Mover un órgano modifica solo ese órgano. Mover un edificio puede modificar también los órganos vinculados explícitamente a él. La corrección no modifica publicaciones anteriores: si una prueba antigua movió puntos indebidamente, recuperar una versión anterior desde el historial y revisar antes de publicar.

El acceso público no necesita cuenta. Sin conexión conserva la última publicación válida descargada; muestra su estado y no puede recibir novedades hasta reconectarse.

## Verificación

```sh
npm test
npm run check
npm run build
npm audit
npm run test:load
```

La prueba de carga se ejecuta únicamente contra localhost con el servidor iniciado. Las pruebas de interfaz usan DOM simulado; no sustituyen revisión visual en teléfonos, lector de pantalla, GPS en el predio ni impresión física.

## Despliegue

El repositorio está preparado para Netlify: `npm run build` publica `dist/client`, las rutas `/api/*` y `/public/*` se sirven con una Function y el estado persistente vive en Netlify Blobs. Configurá en Netlify las variables de `.env.example`; `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` deben ser los mismos valores que usa `web-acserp`.

En producción, el acceso editorial es `https://mapa.acserp.org.ar/admin`; las rutas anteriores `/editor` y `/login` redirigen a esa entrada.

- [Opciones y pasos de despliegue](docs/despliegue.md)
- [Revisión de seguridad y límites](docs/seguridad.md)
- [Análisis inicial de UX y rendimiento](docs/analisis-y-propuesta.md)

La información del evento en `data/inicial.json` proviene del repositorio original. La organización debe confirmar fechas, sedes, contactos y recorridos accesibles antes del uso público.
