# Auditoría y entrega 2.2: borradores y envío Android sin abrir la app

Fecha: 2 de octubre de 2026. Esta entrega responde a dos problemas observados: perder el avance al salir de un reporte y depender de abrir la APK para transmitir una cola al recuperar señal.

## Cambios y recorrido del dato

1. **Borrador:** el formulario espera la recuperación del borrador de la cuenta; guarda cambios en IndexedDB con una espera de 500 ms y escrituras ordenadas. Conserva categoría, vereda, relato, contacto, foto, clasificación sensible y punto. Al ocultarse o desmontarse intenta guardar el último avance. Al volver abre el primer paso incompleto; no envía nada hasta la acción del ciudadano. Si la escritura falla, muestra el error. Borrar datos del sitio o desinstalar elimina este almacenamiento; una muerte abrupta del proceso antes de completar la escritura puede perder el último cambio.
2. **Enviar:** la bandeja web persiste primero el reporte. Sin sesión conserva el envío anónimo; con sesión, intenta preparar también la copia Android antes de transmitir. El formulario distingue confirmación real, cola y ausencia de sesión nativa. La cola admite 10 reportes/50 MiB; un borrador no es un envío en cola.
3. **Segundo plano Android:** `EnviosPlugin` guarda un archivo cifrado por `requestId` en `noBackupFilesDir`. El endpoint proviene del servidor HTTPS fijado en Capacitor. WorkManager programa un trabajo único con red disponible y espera exponencial de al menos 10 s. Solo un envío nativo descifra/transmite a la vez para limitar memoria. La sesión Firebase nativa debe pertenecer al dueño; el token se renueva al ejecutar, no se guarda en la cola. No se siguen redirecciones de la petición autenticada.
4. **Confirmar:** web y Android utilizan el mismo identificador idempotente; el servidor verifica identidad y contenido. Android conserva un recibo sin foto cuando se confirma y la app lo reconcilia al volver. La transacción local invalida el arrendamiento del envío web para que un fallo tardío no pise una confirmación nativa. Un rechazo 400/403/409/413 requiere atención; no se repite automáticamente. Los demás fallos reintentan. El reintento manual reconcilia primero y vuelve a preparar la cola.
5. **Avisar:** canal Android `mpd-envios`, avisos de envío, espera, entrega y revisión, sin relato, foto, nombre ni vereda. Se consulta y pide el permiso nativo, incluso si WebView no implementa `Notification`. Denegar avisos no impide enviar. En navegador el aviso depende de una pestaña viva; no se promete envío con el navegador cerrado.
6. **Salir de la cuenta:** se cancelan trabajos y se intenta borrar la copia nativa antes de cerrar ambas sesiones. El trabajador comprueba de nuevo identidad y existencia del archivo antes de registrar el recibo. Una petición que ya llegó al servidor puede completarse aunque el usuario salga; la cancelación no deshace un expediente recibido. IndexedDB conserva sus reglas de aislamiento por titular.

Las personas que ya habían iniciado sesión **solo en la capa web** de una APK anterior pueden necesitar salir y entrar una vez para establecer la sesión nativa. La app conserva la cola web y explica si no pudo prepararse el envío con la app cerrada. El código no guarda contraseñas para resolver esto en secreto.

## Seguridad de la copia nativa

AES-256-GCM, IV nuevo de 12 bytes por escritura y autenticación de 128 bits; clave no exportable generada en Android Keystore. SHA-256 del identificador forma el nombre del archivo. Los archivos no entran en la copia automática de Android. No contiene tokens/contraseñas. La escritura usa archivo temporal, `fsync` y reemplazo. La lectura usa streams compatibles con API 24 y límites de tamaño. Esto **no cifra IndexedDB** ni convierte Base64 en cifrado; la copia web sigue dependiendo del aislamiento/cifrado del dispositivo. Véase [seguridad y privacidad](seguridad-y-privacidad.md).

## Pruebas ejecutadas

| Prueba/comando | Resultado de esta entrega | Qué acredita |
| --- | --- | --- |
| `npx vitest run --reporter=json --outputFile=.runtime/audit-vitest.json` | 435 pasan en 52 archivos; 0 fallan | Suites aisladas de datos/API y nueva confirmación nativa frente a fallo web tardío; 3 casos de permisos nativos |
| `npm run typecheck` | Pasa | Contratos TypeScript |
| `npm run lint -- --quiet` | Pasa sin errores | Reglas estáticas; no certifica ausencia de advertencias |
| `npm run build` | Pasa, Next 16.3.4 | Compilación web de producción |
| `npx playwright test --reporter=json` | 73 pasan; 0 fallan, omitidas o inestables | 15 archivos de Chromium local; nuevo recorrido salir/reabrir/editar/recargar borrador |
| `npm run test:rules` | Pasa, proyecto emulado `demo-mi-pueblo` | Aislamiento de autor, admin activo, cuenta desactivada, denegación de lectura/escritura directa y aparatos push |
| `npm run cap:apk` | `BUILD SUCCESSFUL` | Compilación Android, versión interna 14/2.2 |
| `gradlew.bat :app:connectedDebugAndroidTest --console=plain` | 4 pasan, emulador `mpd35`, API 35 | Paquete correcto; recuperación de foto cifrada; IV diferente y rechazo de alteración; no envío con dueño ajeno o estado de atención |
| `aapt dump badging` | Paquete correcto; versionCode 14, versionName 2.2, minSdk 24 | Metadatos dentro del APK, no solo Gradle |
| `apksigner verify --print-certs` sobre anterior y nuevo | Verifican, mismo certificado SHA-256 | Firma compatible con la distribución 2.1 |
| `npm run test:perf` | 15 navegaciones HTTP 200 | Cinco contextos nuevos por ruta; resultados de producción local, sin service worker |

Rendimiento local (Node 24.18.0, Chromium 153.0.8010.12): p50/p95 `load` de bienvenida 139/186 ms, comunidad 136/144 ms y memoria 140/194 ms. Datos completos en [resultado-rendimiento-local.json](resultado-rendimiento-local.json). No mide concurrencia, señal del río, servicios autenticados ni Core Web Vitals reales. El [catálogo individual](catalogo-pruebas.md) registra nombres y archivos; los JSON y logs temporales no se publican.

Una repetición de Chromium quedó interrumpida por suspensión del equipo: nueve casos registraron esperas cercanas a una hora y `ERR_NETWORK_IO_SUSPENDED`; el registro Kernel-Power de Windows confirmó suspensión/reanudación. No se descartó silenciosamente ese resultado: se conservó el reporte temporal, se volvió a ejecutar toda la suite y se registró el resultado final. La repetición mantuvo despierto el equipo solo mientras duró el comando, sin cambiar su política de energía.

La repetición detectó además una carrera de apertura: una selección muy rápida podía coincidir con la recuperación tardía de sesión/borrador y borrarse. Se corrigió esperando la recuperación antes de habilitar el formulario, sin ampliar los tiempos de los tests ni ocultar el fallo. Se repitió la suite sobre una compilación nueva.

## Cómo funciona y se publica la actualización

La APK carga la web por HTTPS; una modificación web llega sin reinstalar. Los cambios de permisos/complementos nativos sí necesitan otra APK. `hayActualizacion()` consulta `/descargas/version.json` sin caché y compara su `versionCode` con `App.getInfo().build`. Si es mayor, ofrece actualización con notas, fecha y tamaño. El complemento `Actualizacion` usa DownloadManager, admite datos móviles, informa avance y pide permiso de instalación antes de descargar. Al terminar abre el instalador; **Android pide al usuario confirmar la instalación**. Las versiones antiguas tienen una salida por navegador. La descarga privada se limpia en un arranque posterior cuando el servidor confirma que no hay actualización pendiente.

Proceso reproducible en PowerShell:

```powershell
# Comprobar el servidor generado en assets; si cambia configuración/complementos:
$env:MPD_APP_URL = 'https://mipueblodigital.vercel.app'
npm run cap:sync
# Aumentar versionCode/versionName en android/app/build.gradle antes de compilar.
npm run cap:apk
D:/Android/Sdk/build-tools/35.0.0/aapt.exe dump badging android/app/build/outputs/apk/debug/app-debug.apk
D:/Android/Sdk/build-tools/35.0.0/apksigner.bat verify --print-certs android/app/build/outputs/apk/debug/app-debug.apk
$env:MPD_NOTAS_VERSION = 'Descripción concreta de lo que gana la comunidad.'
npm run apk:publicar
```

`publicar-apk.mjs` exige versión mayor, notas y metadatos del APK compilado coincidentes; copia el archivo y publica tamaño/SHA-256. El hash permite cotejar el artefacto descargado, **no sustituye la firma ni se comprueba todavía desde el instalador propio**: Android verifica la firma de la actualización. Mantener la clave fuera de Git, respaldada bajo custodia acordada. La distribución 2.2 conserva la firma **de depuración** existente; no es una entrega Play Store con clave de lanzamiento. Cambiarla impediría reemplazar las instalaciones actuales sin una migración.

## Artefacto de esta entrega

- Versión 2.2. código 14; 8.081.089 bytes.
- SHA-256 APK: `918e6ca2654ae3b6ab907186b6f5bad0092eef0a045e58ab1cf0b2d4feadc91b`.
- Certificado SHA-256 compartido con 2.1: `cf50e534d79a1639b3154d13550a88fa7d6768e0896233229f772c7e79481989`.
- Dominio configurado: `https://mipueblodigital.vercel.app`.
- Código desplegado: commit `1bed8f9`, rama `develop`, publicado en GitHub.
- Vercel: `dpl_G54wPYwJTdypyiqhUue1K4EKwoDG`, destino production, estado READY; URL `https://mipueblodigital-463n7j46w-jfrangels-projects.vercel.app`, alias `https://mipueblodigital.vercel.app`.
- Comprobación remota: 2 de octubre de 2026, 20:41:47 UTC. Cinco rutas de interfaz respondieron 200; API ciudadana y administrativa sin sesión respondieron 401. El manifiesto publicó 14/2.2 y la descarga con User-Agent AndroidDownloadManager respondió 200 con tamaño y SHA-256 coincidentes.
- Evidencia sanitizada: [verificacion-produccion-2026-10-02.json](verificacion-produccion-2026-10-02.json). Repetir con `node scripts/verificar-publicacion.mjs`. Esta lectura no acredita envío autenticado, push ni funcionamiento en campo.

## Límites y aceptación pendiente

WorkManager reanuda automáticamente cuando Android permite ejecutar un trabajo con red; no garantiza un segundo exacto. Batería, Doze, cuotas y fabricante pueden aplazarlo. Una **detención forzada desde Ajustes** bloquea el trabajo hasta reabrir. El navegador cerrado tampoco transmite esta cola. El primer arranque de una instalación nueva necesita red para cargar la web.

Las pruebas nativas de esta entrega no transmiten expedientes al backend comunitario. Queda probar en dispositivo físico, con cuenta de pruebas y permiso de avisos, modo avión → enviar → retirar de recientes → recuperar datos móviles, sin abrir: comprobar aviso, recibo y un único expediente. Repetir tras más de una hora, con Google/correo, permiso denegado, varias fotos, señal intermitente, reinicio y cambio de titular. Los pasos están en [empaquetado Android](empaquetado-android.md). No llamar a esta comprobación «aprobada» por tener tests verdes.

El banco de consulta del Consejo, su finalidad y mantenimiento están en [su documentación](banco-consulta-consejo.md). No se publica la monografía ni claves del proyecto en Git/Vercel.

## Incidente del empaquetado comprimido y corrección

Durante la publicación, los primeros intentos ordinarios fallaron con `fetch failed`. Se probó `--archive=tgz` y se detuvo al observar 165,5 MB frente a unos 9,5 MB previstos. No se creó un despliegue con ese archivo. La versión finalmente publicada se subió por el método ordinario y se verificó arriba.

La inspección de Vercel CLI 59.19.0 mostró que las exclusiones con barra final podían dejar entradas de directorio vacías en `fileList`; `createTgzFiles` las pasa a `tar-fs.pack` sin filtro de recorrido. Por ello el archivo comprimido pudo incorporar contenido excluido de `credentials/` y otras carpetas locales. No se debe asumir que cancelar la creación del despliegue borra los fragmentos ya enviados al almacenamiento privado del proveedor. No hay evidencia aquí de exposición pública ni de uso indebido; tampoco se debe presentar la rotación como realizada.

Se corrigió `.vercelignore` para excluir los directorios mismos, sin barra final, y se excluyó `reports`. Se comprobó de nuevo con `vercel deploy --dry --json` y con la lista que construye el cliente: **cero directorios residuales y cero archivos de credenciales**. El despliegue publicado no contiene la monografía ni la carpeta de credenciales. Git tampoco las incluye.

Se comunicó al propietario la posible inclusión de la clave Firebase y se comprobó IAM: 403 `PERMISSION_DENIED` para consultar permisos de creación/borrado de claves. La credencial disponible no permite realizar su renovación. **Acción requerida al propietario:** crear una clave nueva de esa cuenta de servicio, actualizar `FIREBASE_SERVICE_ACCOUNT_KEY` en Vercel y la copia local, desplegar y comprobar el backend; después revocar la anterior y revisar registros de uso. No enviar la clave por el chat ni al repositorio. Véase [creación y eliminación de claves, documentación de Google Cloud](https://docs.cloud.google.com/iam/docs/keys-create-delete). La corrección de exclusiones previene repetir el problema, pero no sustituye esa renovación.
