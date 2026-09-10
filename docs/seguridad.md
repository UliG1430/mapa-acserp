# Revisión de seguridad

Alcance: código del mapa, editor, API Node/Worker, autenticación y migraciones locales. No es una auditoría del hosting ni de los otros sistemas de ACSERP, y no garantiza ausencia absoluta de vulnerabilidades.

## Controles implementados

- Autenticación contra Supabase Auth usando únicamente clave publishable; ninguna clave service_role. Autorización por correo confirmado y lista permitida del servidor, nunca por `user_metadata` o encabezados enviados por el cliente.
- Misma cuenta de ACSERP, sesión independiente del mapa: cookie aleatoria de 256 bits, HttpOnly, SameSite=Strict y Secure con prefijo `__Host-` en producción. Duración máxima 30 minutos, sin refresh token. Solo se almacena el hash de la cookie; access token cifrado con AES-GCM y nonce aleatorio.
- Cada solicitud privada vuelve a consultar el usuario al proveedor. Logout elimina la sesión local inmediatamente. Cambiar la lista de correos autorizados bloquea el siguiente acceso. La revocación global de Supabase puede dejar JWT vigentes hasta expirar: no se promete revocación global instantánea por este mecanismo. Rotar la clave del mapa o borrar sus sesiones invalida el acceso del mapa.
- Segundo factor TOTP: una cuenta con factor verificado necesita AAL2. Desafío pendiente cifrado, cookie opaca de 5 minutos sin permisos de editor y consumo único del desafío. Activar MFA en una cuenta que tenía sesión AAL1 bloquea esa sesión. Factores verificados no compatibles se rechazan, nunca se omiten. No se inscriben ni alteran factores en la cuenta compartida.
- Límite de intentos por cuenta e IP en login, por cuenta en MFA y por usuario en escrituras. El proxy debe conservar correctamente el origen; Node usa la IP de la conexión, lo cual puede agrupar clientes detrás del proxy. Para producción configurar además límites en el perímetro, sin confiar en IP arbitraria enviada por clientes.
- CSRF: Origin exacto en mutaciones, SameSite, sin CORS permisivo. JSON con límite de tamaño y tipos explícitos.
- SQL parametrizado, validación compartida de coordenadas, identificadores, referencias, enlaces, fechas y contenidos. Publicación atómica, conflicto por revisión, claves de idempotencia y control de versión de borradores.
- Borradores y previews privados por usuario; expiración de previews. Snapshots públicos sin autor ni datos de sesión. Un borrador se comparte entre pestañas que usan la misma cuenta; usar cuentas individuales cuando se requiera atribución personal.
- Escape de texto/atributos y bloqueo de URL ejecutables. CSP sin scripts inline/eval, protección contra framing y sniffing; HSTS sobre HTTPS. Se permiten estilos inline para posicionamiento del mapa y de impresión.
- API privada con `no-store`, sin cache en service worker/CDN. Archivos privados excluidos de assets. Desarrollo limitado a loopback; el acceso demo nunca se habilita desde una variable o header en producción.
- Versiones exactas de dependencias y lockfile. `npm audit` sin vulnerabilidades conocidas al verificar esta entrega; reevaluar al actualizar dependencias.

## Evidencia

28 pruebas automatizadas: autorización, CSRF, cookies manipuladas, cifrado, logout, vencimiento, segundo factor, límites de intentos, payload inválido, aislamiento entre editores, conflictos, publicación repetida, rollback, escape DOM, órganos nuevos y corrección de movimiento. Interfaz probada con DOM simulado; proveedor Auth simulado para no manejar la contraseña real. Debe completarse un login real por el titular.

Prueba local de carga: 3000 solicitudes GET, hasta 100 concurrentes, sin errores; p95 aproximado 22 ms en esta computadora. No modela descargas de imágenes, red móvil, disponibilidad del proveedor ni la infraestructura de producción.

## Límites y verificaciones antes del evento

- La base de datos y sus copias contienen borradores, cuentas y tokens cifrados: permisos privados, acceso mínimo y respaldo fuera del directorio público. No guardar contraseñas ni tokens en logs.
- El navegador conserva datos públicos y una copia local de recuperación del borrador. No incluir información confidencial en contenidos destinados al mapa; en una computadora compartida cerrar sesión y eliminar datos del sitio. El mapa no almacena tokens Auth en localStorage.
- Los snapshots publicados son públicos y sus versiones anteriores permanecen accesibles por historial/URL inmutable. No publicar datos personales que luego deban retirarse como si nunca hubieran existido; una eliminación urgente requiere purga del CDN y revisión del historial.
- HTTPS, firewall, protección DDoS, actualizaciones del servidor, backups y límites del plan dependen del despliegue. Aún no se revisaron sobre el hosting real.
- Falta prueba visual en navegadores reales, accesibilidad con lector de pantalla, GPS y recorridos en el predio, QR escaneado e impresión física. No presentar estimaciones de distancia como rutas accesibles verificadas.

Referencias: [MFA en Supabase](https://supabase.com/docs/guides/auth/auth-mfa), [desafíos MFA](https://supabase.com/docs/reference/javascript/auth-mfa-challenge), [verificación MFA](https://supabase.com/docs/reference/javascript/auth-mfa-verify), [cierre de sesión y vigencia de tokens](https://supabase.com/docs/guides/auth/signout).
