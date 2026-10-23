# Guía de pruebas por archivo

## Incorporaciones del 21 de octubre de 2026

- `tests/e2e/informe-impresion.spec.ts`: imprime Estadísticas **a PDF de verdad**
  y lo lee hoja por hoja. Existe porque la primera hoja salía en blanco con la
  cuenta del Consejo y las pruebas anteriores solo miraban si los elementos eran
  visibles, no cómo se reparten en el papel.
- `tests/unit/informe-html.test.ts` y `tests/unit/statistics-export-route.test.ts`:
  el informe que abre el navegador del teléfono no deja pasar HTML ajeno, y la
  respuesta que lo entrega va aislada (sin origen propio, sin red).
- `tests/unit/manuales.test.ts`, `tests/unit/export-archivo.test.ts` y
  `tests/e2e/manuales.spec.ts`: la sección de manuales (ver
  [Manuales de uso](manuales.md)). La prueba clave es que **cada rótulo entre
  «guillemets» sigue escrito en la aplicación** y que los PDF y el Markdown son
  los de este mismo texto.

## Incorporaciones del 3 de octubre de 2026

- `tests/unit/council-guide.test.ts` y el tercer caso de
  `tests/e2e/council-memory.spec.ts`: la guía del Consejo (organización,
  derechos, territorio, glosario y pendientes) y su recorrido en móvil.

- `tests/unit/council-history.test.ts`: cronología, precisión de fecha, fuentes,
  reemplazo de semillas, borradores y archivo sin reaparición pública.
- `tests/unit/council-history-api.test.ts`: validación del guardado, permiso,
  autor de sesión, transacción/versionado y conflicto sin sobrescritura.
- `tests/e2e/cabecera-history.spec.ts`: búsqueda de Olaya Herrera, selección
  canónica urbana, API editorial sin sesión, orden de una publicación antigua y
  recuperación de la copia pública con fallo de red.
- `territory.test.ts`, `production-boundaries.spec.ts` y `rules.mjs` amplían
  verificaciones de catálogo/mapa y rechazo de acceso cliente a historia/auditoría.

Detalle del alcance y aserciones en
[la entrega del editor histórico](editor-historia-cabecera-2026-10-03.md).

Fecha de revisión: 23 de octubre de 2026 (America/Bogota). Esta guía explica **para qué sirve cada suite**. El [catálogo individual](catalogo-pruebas.md) contiene los 554 títulos Vitest y 91 títulos Playwright, con enlace al código que muestra entrada, dobles y aserciones exactas. La [bitácora de ejecución](pruebas-y-rendimiento.md) separa casos registrados, pruebas ejecutadas y pendientes de campo. Las tablas de abajo cubren los 58 archivos unitarios y los 18 de navegador; la suma de sus casos da 492 y 88. Un archivo puede cubrir varios resultados; esta descripción no sustituye leer sus aserciones cuando se audita un control.

## Unidad, dominio y API simulada

| Archivo en `tests/unit/` | Casos | Qué debe demostrar al pasar |
| --- | ---: | --- |
| `account-reports.test.ts` | 8 | El historial remoto y local se combinan sin duplicar casos; el estado del servidor prevalece y los pendientes locales se conservan. |
| `activation.test.ts` | 3 | La activación ignora roles enviados por el cliente y no reactiva cuentas deshabilitadas. |
| `admin.test.ts` | 2 | El cambio de estado registra historia, es idempotente, comprueba versión y limita la nota pública. |
| `anonymize.test.ts` | 8 | La eliminación retira datos personales, fotos, ubicación y notas sin alterar expedientes ajenos; recorre el historial por páginas, retoma los pendientes de intentos anteriores y señala fallos parciales para reintento. |
| `auth.test.ts` | 3 | Registro y errores de autenticación validan campos sin revelar existencia de cuentas. |
| `calendar.test.ts` | 8 | El día local de Bogotá, año bisiesto, distribución semanal y frase hablada de una fecha respetan casos límite. |
| `catalogue-api.test.ts` | 2 | La API del catálogo de veredas valida una versión, oculta a la comunidad quién la validó y no pierde la edición de otro administrador ni deja escribir a ciudadanos. |
| `community-projection.test.ts` | 9 | La vista para otros miembros contiene solo datos permitidos y respeta clasificación y demora posterior a revisión. |
| `council-action.test.ts` | 2 | Las notas anteriores siguen siendo actuaciones ordinarias y una visita técnica exige fecha válida y responsable. |
| `council-alerts.test.ts` | 5 | Los eventos administrativos generan avisos dirigidos y evitan duplicaciones o destinatarios indebidos. |
| `council-guide.test.ts` | 6 | La guía del Consejo no deja tarjetas ni términos sin fuente, no repite títulos, trae resolución, fecha y extensión de los tres títulos y da la misma extensión al título del Río Satinga en la línea de tiempo y en las tarjetas. |
| `council-history-api.test.ts` | 4 | Guardar un hito exige administrador, valida el cuerpo, toma el autor de la sesión (no del cliente), usa transacción con versión y responde 409 sin sobrescribir si otra persona lo cambió. |
| `council-history.test.ts` | 20 | La cronología respeta la precisión de la fecha (año, mes, día, hora), las fuentes y el reemplazo de hitos base; borradores y archivados no reaparecen en la consulta pública; la ficha pública sale campo a campo (sin versión, estado ni autor) y la biblioteca de fuentes solo enlaza por HTTPS. |
| `council-image-api.test.ts` | 1 | Registrar una visita con imagen no cambia el estado y permite un reintento idéntico. |
| `csv.test.ts` | 4 | La exportación tabular conserva columnas y escapa contenido que podría interpretarse como fórmula. |
| `delivery-alert.test.ts` | 3 | El aviso de entrega en Android cubre permiso concedido, denegado y fallo del complemento; no promete avisos cuando no se concedieron. |
| `delivery-receipt.test.ts` | 2 | El recibo del servidor sustituye la identidad local sin perder fotos ni duplicar el historial, y se recupera desde una copia antigua. |
| `delivery.test.ts` | 3 | Las etiquetas diferencian enviado, en cola y sin enviar, incluso para registros locales antiguos. |
| `domain.test.ts` | 8 | Categorías, estado y contenido de incidencias cumplen invariantes del dominio. |
| `evidence.test.ts` | 10 | Validación de tipo, tamaño e integridad de imágenes; archivo privado y copia de respaldo se manejan sin presentar Base64 como protección. |
| `export-archivo.test.ts` | 4 | Un PDF publicado se entrega al navegador del teléfono con su dirección completa; sin el complemento o sin señal, el error dice qué hacer y no es el crudo del navegador. |
| `export-multipart.test.ts` | 1 | La descarga grande de un informe conserva Unicode, cabe por documento y se consume una sola vez. |
| `inbox-pagination-api.test.ts` | 4 | La bandeja del Consejo pagina 501 expedientes con hora idéntica sin perder ni duplicar, un filtro encuentra uno más allá de las primeras páginas, el CSV trae la bandeja entera y un nombre corregido encuentra lo guardado con su alias. |
| `incident-api.test.ts` | 22 | Alta y lectura de expedientes comprueban identidad, cuota, idempotencia, evidencia, recibo, paginación de la lista personal más allá de 200 y respuestas ante fallos con repositorios dobles. |
| `incidente-parcial.test.ts` | 9 | La API detecta casos a medio crear y permite resolverlos sin inventar un acuse completo. |
| `informe-html.test.ts` | 6 | El informe del APK escapa el texto libre, no lleva guiones ni recursos externos salvo el botón de guardar como PDF, se imprime en A4 sin la barra y no produce `NaN` sin reportes. |
| `management-metrics.test.ts` | 9 | Agregados del Consejo aplican filtros y cálculos de gestión sin confundir conteos con casos resueltos. |
| `manuales.test.ts` | 14 | Los dos manuales tienen capítulos completos; **cada «rótulo» existe en `src/`**; no llevan datos personales ni identificadores internos; el Markdown de `docs/` y los PDF de `public/manuales/` son los de este contenido, con portada, índice con todos los capítulos y sin hojas en blanco. |
| `map-catalogue.test.ts` | 1 | El mapa usa el punto actual del catálogo y conserva los puntos propios. |
| `membership.test.ts` | 6 | La autorización distingue cuenta activa, ajena y administrativa, sin aceptar privilegios del cuerpo de petición. |
| `module-audit.test.ts` | 4 | La auditoría de módulos sin uso detecta un helper olvidado, incluye JavaScript, conserva los usados por generadores e imports dinámicos y no omite un import local roto. |
| `native-auth.test.ts` | 10 | El puente de autenticación móvil y sus fallos producen estados de sesión previsibles; no sustituye Android real. |
| `native-receipt.test.ts` | 1 | En Android el recibo vincula el expediente y actualiza la pantalla solo de la cuenta correspondiente. |
| `news-format.test.ts` | 7 | Noticias y comunicados cumplen límites y estructura de texto antes de persistirlos. |
| `news-media-read.test.ts` | 5 | La API entrega la lista y los bytes de las imágenes de un comunicado publicado, no expone texto ni imágenes de borradores o archivados, rechaza identificadores inválidos y distingue una caída del archivo. |
| `news-publish.test.ts` | 5 | Publicar, anclar o retirar contenido editorial respeta reglas y estado. |
| `notifications.test.ts` | 4 | La bandeja transforma novedades para el destinatario correcto y evita avisos ambiguos. |
| `openrouter.test.ts` | 2 | Se limita la entrada y se valida la forma de la salida de IA con respuestas simuladas; no se prueba el proveedor real. |
| `outbox-migration.test.ts` | 1 | Los registros antiguos de cola se pueden leer después de un cambio de esquema. |
| `outbox-traspaso.test.ts` | 5 | Un borrador o envío sin cuenta pasa al titular autenticado sin duplicar ni perder datos. |
| `outbox.test.ts` | 11 | Límite local, estados, reintentos e idempotencia de la bandeja fuera de línea; un recibo nativo ya confirmado se conserva aunque la subida web falle después. |
| `publicacion-resumen.test.ts` | 5 | El resumen público no puede ser el principio del relato copiado, guardar sin tocar el relato no lo publica, y guardar un caso ya publicado con el mismo texto no reinicia las 24 horas. |
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
| `report-cursor.test.ts` | 1 | El cursor de la lista conserva fecha e identidad para no saltar empates. |
| `report-lookup.test.ts` | 13 | Consulta y detalle de casos filtran por titular o rol; evidencia e historia ajenas permanecen privadas. |
| `report-pagination.test.ts` | 3 | La lista personal consulta más de 200 reportes, continúa tras páginas comunitarias vacías y una página repetida falla sin declarar completa una lista parcial. |
| `report-updates.test.ts` | 1 | Las vistas del expediente se actualizan con los cambios del servidor y la suscripción se puede desmontar. |
| `restablecer.test.ts` | 19 | Restablecimiento de cuentas y recuperación administrativa exigen privilegios y registran estados coherentes. |
| `resume-deletion.test.ts` | 6 | Retomar una eliminación de cuenta exige el rol del Consejo, no corre dos limpiezas a la vez, conserva la solicitud parcial y su seudónimo, y rechaza una cuenta reabierta. |
| `retract.test.ts` | 14 | Retirada de incidencias y proyecciones revoca visibilidad, controla reintentos, no repite el aviso si la retirada ya se hizo y dice si la limpieza quedó incompleta. |
| `roles.test.ts` | 10 | La asignación de rol no se eleva desde el cliente y controla autoridades autorizadas. |
| `service-worker.test.ts` | 12 | Estrategias de caché excluyen datos privados y mantienen rutas públicas disponibles sin red. |
| `signature.test.ts` | 5 | La frase editorial del Consejo es estable por comunicado, diversa entre ellos, editable y limitada en longitud; no es una firma criptográfica. |
| `sin-cuenta.test.ts` | 5 | El reporte sin iniciar sesión conserva el borrador y comunica qué exige autenticación. |
| `statistics-export-route.test.ts` | 3 | El informe se entrega aislado (`sandbox` sin origen propio, `default-src 'none'`, sin formularios): un guion dentro del HTML que escribió otra cuenta no corre con la sesión de quien abre el enlace; el CSV baja como archivo; un billete usado contesta 410. |
| `statistics-export.test.ts` | 6 | La exportación de estadísticas aplica filtros, genera un ticket y protege datos de detalle. |
| `storage.test.ts` | 2 | El almacén local evita que dos escritores con la misma versión se pisen y no duplica un caso confirmado. |
| `territory.test.ts` | 11 | Catálogo territorial y referencias del mapa evitan coordenadas inventadas o selección ambigua. |
| `ubicacion.test.ts` | 19 | Selección, precisión, permisos y fallos de geolocalización se resuelven de modo explícito. |
| `vereda-catalogue.test.ts` | 3 | El catálogo valida una versión y pide validar de nuevo tras editar, retira sin borrar y conserva el ID al renombrar, y rechaza duplicados y coordenadas incompletas. |
| `vereda-load.test.ts` | 5 | Lectura del catálogo de veredas tolera fuentes incompletas y valida su estructura. |
| `veredas-acumulador.test.ts` | 10 | Se agregan reportes por zona sin perder los casos individuales ni contar de más. |
| `veredas.test.ts` | 19 | Nombres, búsqueda, selección y coordenadas representativas de veredas siguen las reglas de catálogo. |
| `voice-transcript.test.ts` | 9 | La transcripción llega al campo de descripción y controla sustitución, permisos y longitud. |
| `voz.test.ts` | 19 | Estados de dictado y errores de micrófono, navegador o servicio no borran texto escrito. |
| `workspace-reports.test.ts` | 7 | El inicio consulta la cuenta sin depender de copias locales, el resumen y la lista usan los mismos casos, y una consulta fallida o en curso no se presenta como una lista vacía. |
| `writing-api.test.ts` | 4 | La ayuda de escritura valida identidad, contenido y respuesta; el proveedor se simula. |

## Navegador Chromium

| Archivo en `tests/e2e/` | Casos | Recorrido observable |
| --- | ---: | --- |
| `app.spec.ts` | 6 | Rutas esenciales, navegación y acciones principales renderizan sin romper la app. |
| `cabecera-history.spec.ts` | 3 | Búsqueda de Olaya Herrera, selección canónica de la cabecera urbana, API editorial rechazada sin sesión, orden de una publicación antigua y recuperación de la copia pública con fallo de red. |
| `community-nav.spec.ts` | 1 | Las cuatro secciones de Comunidad conservan su navegación y estado seleccionado. |
| `comunicado.spec.ts` | 5 | Feed y detalle de comunicado, lectura y controles editoriales visibles. |
| `council-memory.spec.ts` | 3 | Línea de tiempo, filtros, búsqueda, fuentes, ancho móvil y reapertura offline de la ruta cacheada; la página explica la ley, los derechos y los tres consejos del municipio (índice, secciones y cifras de los títulos) sin desbordar en móvil. |
| `first-run.spec.ts` | 4 | Primer acceso y presentación inicial muestran las rutas y decisiones apropiadas. |
| `management.spec.ts` | 7 | Panel del Consejo, filtros, seguimiento y acciones administrativas en el entorno de prueba. |
| `mejoras-consejo.spec.ts` | 3 | Varias fotografías conservan el borrador y se quitan una a una, la captura usa los nombres y la validación del catálogo guardado, y las rutas nuevas niegan gestión y descarga sin sesión. |
| `informe-impresion.spec.ts` | 2 | Imprimir Estadísticas a PDF abre con la portada en la primera hoja, también con un panel del Consejo más alto que una hoja, sin hojas en blanco y con el orden portada → lectura → cifras del territorio. |
| `manuales.spec.ts` | 9 | La página de manuales, el índice de cada capítulo, el teléfono sin desbordes, la puerta del manual del Consejo, la ruta de impresión cerrada, `robots.txt`, los PDF servidos como `application/pdf`, imprimir la página en cuadernillo y el enlace de la columna. |
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
