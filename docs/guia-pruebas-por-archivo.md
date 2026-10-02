# Guía de pruebas por archivo

Fecha de revisión: 2 de octubre de 2026 (UTC). Esta guía explica **para qué sirve cada suite**. El [catálogo individual](catalogo-pruebas.md) contiene los 435 títulos Vitest y 73 títulos Playwright, con enlace al código que muestra entrada, dobles y aserciones exactas. La [bitácora de ejecución](pruebas-y-rendimiento.md) separa casos registrados, pruebas ejecutadas y pendientes de campo. Un archivo puede cubrir varios resultados; esta descripción no sustituye leer sus aserciones cuando se audita un control.

## Unidad, dominio y API simulada

| Archivo en `tests/unit/` | Casos | Qué debe demostrar al pasar |
| --- | ---: | --- |
| `account-reports.test.ts` | 8 | El historial remoto y local se combinan sin duplicar casos; el estado del servidor prevalece y los pendientes locales se conservan. |
| `activation.test.ts` | 3 | La activación ignora roles enviados por el cliente y no reactiva cuentas deshabilitadas. |
| `admin.test.ts` | 2 | El cambio de estado registra historia, es idempotente, comprueba versión y limita la nota pública. |
| `anonymize.test.ts` | 4 | La eliminación retira datos personales sin alterar expedientes ajenos y señala fallos parciales para reintento. |
| `auth.test.ts` | 3 | Registro y errores de autenticación validan campos sin revelar existencia de cuentas. |
| `calendar.test.ts` | 8 | El día local de Bogotá, año bisiesto, distribución semanal y frase hablada de una fecha respetan casos límite. |
| `community-projection.test.ts` | 9 | La vista para otros miembros contiene solo datos permitidos y respeta clasificación y demora posterior a revisión. |
| `council-alerts.test.ts` | 5 | Los eventos administrativos generan avisos dirigidos y evitan duplicaciones o destinatarios indebidos. |
| `csv.test.ts` | 4 | La exportación tabular conserva columnas y escapa contenido que podría interpretarse como fórmula. |
| `delivery.test.ts` | 3 | Las etiquetas diferencian enviado, en cola y sin enviar, incluso para registros locales antiguos. |
| `domain.test.ts` | 8 | Categorías, estado y contenido de incidencias cumplen invariantes del dominio. |
| `evidence.test.ts` | 10 | Validación de tipo, tamaño e integridad de imágenes; archivo privado y copia de respaldo se manejan sin presentar Base64 como protección. |
| `incident-api.test.ts` | 18 | Alta de expedientes comprueba identidad, cuota, idempotencia, evidencia, recibo y respuestas ante fallos con repositorios dobles. |
| `incidente-parcial.test.ts` | 9 | La API detecta casos a medio crear y permite resolverlos sin inventar un acuse completo. |
| `management-metrics.test.ts` | 9 | Agregados del Consejo aplican filtros y cálculos de gestión sin confundir conteos con casos resueltos. |
| `membership.test.ts` | 6 | La autorización distingue cuenta activa, ajena y administrativa, sin aceptar privilegios del cuerpo de petición. |
| `native-auth.test.ts` | 10 | El puente de autenticación móvil y sus fallos producen estados de sesión previsibles; no sustituye Android real. |
| `news-format.test.ts` | 7 | Noticias y comunicados cumplen límites y estructura de texto antes de persistirlos. |
| `news-publish.test.ts` | 5 | Publicar, anclar o retirar contenido editorial respeta reglas y estado. |
| `notifications.test.ts` | 4 | La bandeja transforma novedades para el destinatario correcto y evita avisos ambiguos. |
| `openrouter.test.ts` | 2 | Se limita la entrada y se valida la forma de la salida de IA con respuestas simuladas; no se prueba el proveedor real. |
| `outbox-migration.test.ts` | 1 | Los registros antiguos de cola se pueden leer después de un cambio de esquema. |
| `outbox-traspaso.test.ts` | 5 | Un borrador o envío sin cuenta pasa al titular autenticado sin duplicar ni perder datos. |
| `outbox.test.ts` | 9 | Límite local, estados, reintentos e idempotencia de la bandeja fuera de línea. |
| `publication.test.ts` | 4 | Un resumen revisado solo aparece 24 horas después de `publishedAt`; sensibilidad y fecha inválida bloquean acceso. |
| `push-api.test.ts` | 12 | Las rutas de alta y baja de suscripciones requieren identidad y validan parámetros. |
| `push-cliente.test.ts` | 26 | El cliente maneja permiso, suscripción, reconexión, revocación y estados de navegador sin asumir soporte universal. |
| `push-enganche.test.ts` | 11 | La interfaz conecta los avisos push con los eventos de sesión y evita operaciones repetidas. |
| `push-envio.test.ts` | 7 | El servidor prepara envíos y responde a destinos caducados o fallos del proveedor. |
| `push-todos.test.ts` | 3 | Los comunicados dirigidos a toda la comunidad respetan destinatarios y duplicados. |
| `push-tokens.test.ts` | 15 | El registro de tokens conserva propiedad, formato y ciclo de vida. |
| `reading-api.test.ts` | 8 | La API de interpretación de estadísticas exige rol administrativo, valida hallazgos y maneja respuestas IA simuladas. |
| `reading.test.ts` | 10 | La lectura estadística basada en reglas expresa hallazgos aplicables, omite tendencias sin datos y añade salvedades. |
| `relative-time.test.ts` | 5 | Marcas temporales se presentan sin confundir momentos próximos o antiguos. |
| `report-lookup.test.ts` | 13 | Consulta y detalle de casos filtran por titular o rol; evidencia e historia ajenas permanecen privadas. |
| `restablecer.test.ts` | 18 | Restablecimiento de cuentas y recuperación administrativa exigen privilegios y registran estados coherentes. |
| `retract.test.ts` | 12 | Retirada de incidencias y proyecciones revoca visibilidad y controla reintentos. |
| `roles.test.ts` | 8 | La asignación de rol no se eleva desde el cliente y controla autoridades autorizadas. |
| `service-worker.test.ts` | 12 | Estrategias de caché excluyen datos privados y mantienen rutas públicas disponibles sin red. |
| `signature.test.ts` | 5 | La frase editorial del Consejo es estable por comunicado, diversa entre ellos, editable y limitada en longitud; no es una firma criptográfica. |
| `sin-cuenta.test.ts` | 5 | El reporte sin iniciar sesión conserva el borrador y comunica qué exige autenticación. |
| `statistics-export.test.ts` | 6 | La exportación de estadísticas aplica filtros, genera un ticket y protege datos de detalle. |
| `storage.test.ts` | 2 | El almacén local evita que dos escritores con la misma versión se pisen y no duplica un caso confirmado. |
| `territory.test.ts` | 11 | Catálogo territorial y referencias del mapa evitan coordenadas inventadas o selección ambigua. |
| `ubicacion.test.ts` | 19 | Selección, precisión, permisos y fallos de geolocalización se resuelven de modo explícito. |
| `vereda-load.test.ts` | 5 | Lectura del catálogo de veredas tolera fuentes incompletas y valida su estructura. |
| `veredas-acumulador.test.ts` | 10 | Se agregan reportes por zona sin perder los casos individuales ni contar de más. |
| `veredas.test.ts` | 19 | Nombres, búsqueda, selección y coordenadas representativas de veredas siguen las reglas de catálogo. |
| `voice-transcript.test.ts` | 9 | La transcripción llega al campo de descripción y controla sustitución, permisos y longitud. |
| `voz.test.ts` | 19 | Estados de dictado y errores de micrófono, navegador o servicio no borran texto escrito. |
| `writing-api.test.ts` | 4 | La ayuda de escritura valida identidad, contenido y respuesta; el proveedor se simula. |

## Navegador Chromium

| Archivo en `tests/e2e/` | Casos | Recorrido observable |
| --- | ---: | --- |
| `app.spec.ts` | 6 | Rutas esenciales, navegación y acciones principales renderizan sin romper la app. |
| `community-nav.spec.ts` | 1 | Las cuatro secciones de Comunidad conservan su navegación y estado seleccionado. |
| `comunicado.spec.ts` | 5 | Feed y detalle de comunicado, lectura y controles editoriales visibles. |
| `council-memory.spec.ts` | 2 | Línea de tiempo, filtros, búsqueda, fuentes, ancho móvil y reapertura offline de la ruta cacheada. |
| `first-run.spec.ts` | 4 | Primer acceso y presentación inicial muestran las rutas y decisiones apropiadas. |
| `management.spec.ts` | 7 | Panel del Consejo, filtros, seguimiento y acciones administrativas en el entorno de prueba. |
| `polish.spec.ts` | 13 | Microinteracciones, presentación visual y distintas anchuras de secciones clave. |
| `production-boundaries.spec.ts` | 11 | La interfaz no promete datos reales cuando falta backend, y deja claros los límites de funciones. |
| `push-ajuste.spec.ts` | 1 | La configuración de avisos responde al permiso del navegador. |
| `pwa.spec.ts` | 5 | Manifest, service worker, caché y estado sin conexión en navegador. |
| `registration.spec.ts` | 2 | Formulario de registro y su validación de datos visibles. |
| `reporte-sin-cuenta.spec.ts` | 2 | Preparación de reporte anónimo y transición hacia acceso. |
| `session-shell.spec.ts` | 7 | Barra de sesión, menú, cuenta y cambios de estado en móvil/escritorio. |
| `voice-access.spec.ts` | 4 | Dictado y acceso a reporte responden a capacidades simuladas del navegador. |
| `welcome-theme.spec.ts` | 3 | Bienvenida y apariencia clara/oscura conservan estructura e interacción. |

## Cómo interpretar un resultado verde

Vitest ejecuta código en aislamiento con datos y servicios simulados cuando el archivo así lo define. Playwright conduce Chromium contra una compilación local; varias rutas usan fixtures para no escribir datos ciudadanos. El emulador de reglas sí interpreta `firebase/firestore.rules`, pero no es el proyecto desplegado. Ninguna suite prueba que el proveedor de IA, Firebase Authentication, Supabase, push o el teléfono de una persona en el río respondan correctamente hoy. Para aceptar la operación se requiere un entorno aislado, cuentas de prueba, evidencias sin PII y [el piloto y ensayos de rendimiento pendientes](auditoria-entrega-2026-10-02.md#límites-y-aceptación-pendiente).

## Nuevas comprobaciones de borrador y Android — 2 de octubre de 2026

- `tests/e2e/app.spec.ts`: el sexto caso escribe un reporte, sale sin guardar manualmente, recupera el borrador, lo edita y recarga. Comprueba el autoguardado observable, no solo una llamada a una función.
- `tests/unit/outbox.test.ts`: el caso nuevo confirma un recibo nativo y luego simula el fallo tardío de la subida web; la confirmación y su recibo deben conservarse y el payload debe limpiarse.
- `tests/unit/delivery-alert.test.ts`: tres casos, permiso Android concedido, denegado y fallo del complemento. No requieren la API Notification de WebView ni prometen avisos cuando no se concedieron.
- `android/app/src/androidTest/java/co/riosatinga/mipueblodigital/EnviosStorageTest.java`: tres casos con Android Keystore real en API 35. Cifra/recupera la foto y relato; compara IV de dos escrituras y altera un byte para comprobar rechazo; ejecuta el trabajador con identidad ajena/atención y verifica que no transmita ni elimine el archivo.
- `ExampleInstrumentedTest.java`: identifica el paquete instalado correcto. Es una comprobación de instalación, no de envío.

Las cuatro pruebas instrumentadas pasaron. No simulan cobertura móvil ni entrega remota con actividad cerrada; esa aceptación queda explícita en la [auditoría de entrega](auditoria-entrega-2026-10-02.md).
