# Seguridad y privacidad: estado verificable

Revisión del código local: 29 de septiembre de 2026. Este documento describe mecanismos implementados y límites; no certifica una auditoría externa ni la configuración vigente de las consolas de Firebase, Supabase o del alojamiento. Para controles legales y manejo de datos personales, el Consejo debe aprobar una política de tratamiento y designar responsables.

## 1. Qué datos existen y por dónde pasan

| Dato | Entrada | Almacenamiento y lectura | Exposición |
| --- | --- | --- | --- |
| Identidad, correo y sesión | Firebase Authentication | Firebase Auth; `accounts/{uid}` en Firestore | Cuenta propia y servidor; el rol lo comprueba la API |
| Reporte, contacto, vereda, punto exacto y notas | `POST /api/incidents` | `incidents/{id}` y eventos en Firestore | Dueño y Consejo; otros miembros reciben solo resumen público aprobado |
| Fotografía de evidencia | Imagen JPG/PNG/WebP en Base64 | Tabla privada `mpd_evidence_originals` de Supabase, como WebP recodificado; copia menor en `incidentEvidence/{id}` | Ruta `/api/incidents/{id}/evidence`, con identidad y propiedad/rol comprobados |
| Borradores y envíos sin señal | Formulario | IndexedDB del **dispositivo** (`local-store`, `mi-pueblo-outbox`) | Quien tenga acceso al perfil del navegador o al teléfono podría inspeccionarlos |
| Avisos y tokens push | Dispositivo | Firestore, colecciones de notificaciones y tokens | API autenticada; los avisos del sistema muestran títulos breves, no relatos |
| Texto para asistencia IA | Petición optativa | OpenRouter recibe solo lo que envía la función elegida | Estadísticas: agregados y hasta 20 notas **públicas** de cierres, sin relatos ni notas internas; revisar otros flujos por separado |
| Memoria histórica | Fuentes públicas citadas | Código versionado en `src/content/council-history.ts` y caché PWA | Pública; no contiene actas privadas ni padrón |

Los datos de ubicación exacta identifican potencialmente una vivienda en un territorio disperso. La proyección comunitaria toma campos permitidos, no copia el documento completo (`src/server/community-view.ts`). El mapa comunitario sitúa los casos por referencia de vereda, no por la coordenada precisa del reporte. No se debe trasladar un acta con censos, menores, víctimas, teléfonos o coordenadas privadas al repositorio ni al banco público.

## 2. Identidad, permisos y reglas

- El navegador recibe un token de Firebase Auth. `requireIdentity` lo verifica en el servidor con comprobación de revocación; `requireMember` exige que la cuenta exista y esté activa; `requireAdmin` acepta la reivindicación `admin` del token o `role: "admin"` en el documento de cuenta, que solo el servidor/consola puede escribir. La ruta de eliminación exige reautenticación reciente (300 segundos). Las contraseñas las gestiona Firebase Auth; la aplicación no las almacena.
- Las [reglas de Firestore](../firebase/firestore.rules) deniegan escritura directa a las colecciones de la app y deniegan lectura directa de expedientes, fotografías y resúmenes públicos. El resumen público pasa por la API, que comprueba clasificación sensible y **24 horas desde la aprobación**. El SDK Admin del servidor **omite** las reglas de Firestore; por eso cada ruta debe repetir autorización. [Documentación oficial de Firebase sobre reglas y SDK de servidor](https://firebase.google.com/docs/firestore/security/rules-conditions).
- `POST /api/incidents` genera el identificador del caso a partir de UID e identificador de solicitud; una transacción y un hash de contenido impiden duplicar o cambiar una solicitud reservada. Hay límite de 10 nuevos envíos por día UTC. Las actualizaciones administrativas llevan versión para detectar escrituras concurrentes.
- En los accesos a evidencia se valida dueño o rol antes de leer el Base64. La respuesta usa `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`. El archivo no se incrusta en listados.
- La CSP, `frame-ancestors`, HSTS, política de permisos y demás cabeceras se definen en [`next.config.ts`](../next.config.ts). La CSP aún requiere `unsafe-inline` para los scripts de hidratación y estilos de Leaflet; esto limita su fuerza frente a una política con nonce. HSTS solo actúa sobre HTTPS.

## 3. Cifrado: qué se puede afirmar

**Base64 no cifra.** Es una codificación reversible; cualquiera que lea la cadena obtiene la imagen. **SHA-256 no cifra.** Aquí identifica contenido y verifica integridad/idempotencia, no oculta información. El proyecto no implementa cifrado de extremo a extremo ni cifrado propio de IndexedDB.

Las llamadas de producción a Firebase, Supabase y OpenRouter usan URLs HTTPS. La protección en tránsito depende de TLS del navegador, del servidor y del proveedor, así como de que el despliegue del sitio también use HTTPS. Las claves de servicio de Firebase, Supabase y OpenRouter solo deben existir en variables del servidor; `NEXT_PUBLIC_*` es público. Revisar secretos en registros, despliegues previos y cuentas personales es un control operativo distinto del código.

Firebase/Google Cloud documentan cifrado en reposo administrado por el proveedor; [Cloud Google: cifrado predeterminado](https://docs.cloud.google.com/docs/security/encryption/default-encryption), [Firestore: opciones de claves](https://firebase.google.com/docs/firestore/cmek). Supabase documenta cifrado de discos en reposo en su [acuerdo de procesamiento](https://supabase.com/downloads/docs/Supabase%2BDPA%2B250314.pdf), pero eso no equivale a cifrar campos individualmente; el acceso a PostgreSQL por una conexión propia puede requerir [forzar SSL](https://supabase.com/docs/guides/platform/ssl-enforcement). No se ha inspeccionado en esta revisión la configuración efectiva de claves, copias de seguridad, región o SSL de las consolas. No afirmar AES por campo, claves propias ni cifrado de extremo a extremo.

## 4. Fotografías: fidelidad, tamaño y reserva

`validateOriginal` acepta JPG/PNG/WebP, máximo 10 MiB y 24 megapíxeles; decodifica todos los píxeles para detectar archivos dañados. `archivePhoto` rota, limita a 2200 px y recodifica a WebP con calidad adaptativa para el archivo privado de Supabase. `buildBackup` produce una copia máxima de 1600 px y la escribe de forma asíncrona en Firestore. **Los bytes originales del teléfono no se conservan** en el archivo remoto; el hash guardado corresponde al WebP archivado. El recibo remoto requiere verificación del hash archivado, pero puede llegar antes de que termine el respaldo asíncrono. La ruta de descarga sirve el archivado o, si falla, la copia reducida e indica `X-Evidencia`. Por ello no se debe llamar “original exacto” a la descarga; el nombre heredado de tabla y cabecera no cambia este hecho.

La recodificación suele descartar metadatos EXIF, pero no se ha auditado cada versión de Sharp ni hay una prueba contractual de eliminación de todos los metadatos. La fotografía puede revelar lugares, rostros o lesiones por sus píxeles. Quien reporta puede marcar sensibilidad; el Consejo puede hacerlo después. Ninguna fotografía entra a la proyección pública.

## 5. Publicación y retención

El caso nace privado. La API pública exige tres condiciones simultáneas: un resumen `publicIncidents/{id}` aprobado, clasificación `safe` en el expediente vivo y **24 horas transcurridas desde `publishedAt`** (configurable entre 1 y 720 horas; 24 por defecto). El relato sin revisar nunca se publica de forma automática. Marcarlo sensible después retira el acceso a cualquier resumen. Las reglas deniegan lectura directa del documento público para impedir saltar el plazo. Los resúmenes antiguos sin `publishedAt` permanecen privados hasta reaprobarse: decisión segura frente a una fecha desconocida.

La bandeja local admite 10 envíos o 50 MiB; no es una copia de seguridad. Borrar datos del sitio o del dispositivo puede perder pendientes. El service worker no conserva el token, así que con la app totalmente cerrada no puede enviar por sí solo. El cierre de cuenta anonimiza expedientes y desactiva acceso; conserva categoría, vereda, estado y fecha para trazabilidad. Antes de abrir al público faltan un calendario de retención aprobado, prueba de restauración de copias y un procedimiento documentado para solicitudes de titulares y actas sensibles.

## 6. Riesgos y verificaciones antes de producción

1. **Rotar la clave de servicio Firebase** referida en [límites de arquitectura](arquitectura.md#14-límites-conocidos); comprobar que ninguna copia permanezca en historial, despliegues o cuentas compartidas.
2. Ejecutar `npm run test:rules` con el emulador y probar usuario ajeno, cuenta desactivada y lectura directa de `publicIncidents`. Las pruebas unitarias con dobles no sustituyen esta validación.
3. Revisar en las consolas MFA y mínimo privilegio para operadores, logs/auditoría, backups/restauración y variables de entorno. Verificar TLS/SSL y cifrado administrado en el proyecto **real**.
4. Hacer una evaluación de impacto con el Consejo sobre contacto, ubicación, evidencia sensible, avisos en pantalla bloqueada y texto enviado a IA. El borrador IA requiere revisión humana y su proveedor puede procesar los datos remitidos conforme a sus términos.
5. Probar el flujo con habitantes y Consejo. Los tests automáticos no acreditan consentimiento, comprensión de privacidad, soporte ni continuidad operativa.

Véanse [pruebas y rendimiento](pruebas-y-rendimiento.md) y [catálogo individual](catalogo-pruebas.md) para cobertura y límites de lo ejecutado.
