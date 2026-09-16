# Mi Pueblo Digital — especificación de desarrollo

Fecha: 6 de septiembre de 2026. El usuario autorizó comenzar el proyecto y pidió iniciar con un plan completo. Este documento fija una línea base de trabajo; las decisiones operativas marcadas como propuestas requieren validación con el Consejo antes de producción, sin impedir desarrollo local.

## Fuentes y alcance

Fuente funcional: `C:/Users/josed/Downloads/Trabajo-de-Grado-Monografía_b.docx`. Se comprobó que el texto extraído coincide con la lectura anterior y se conservaron las 21 historias con sus criterios en `docs/specs/criterios-originales.md`. Las afirmaciones de desarrollo y pruebas del Word no son resultados de este nuevo proyecto. La carpeta contiene diseños y documentación, sin aplicación ejecutable al inicio de esta planificación.

Fuente visual: `design/v03/01-direccion-combinada.png`, combinación solicitada por el usuario. Mantener logo del río, identidad verde, bienvenida ilustrada, resumen compacto, reportes con fotografías y seguimiento cronológico. Conservar diseños v02 como referencia de módulos adicionales. Las imágenes no controlan límites de datos, fechas, permisos ni catálogo territorial; en caso de discrepancia prevalece el requisito explícito documentado.

Objetivo: registrar, gestionar y seguir incidencias urbanas y rurales del Gran Consejo Comunitario Río Satinga en Olaya Herrera, Nariño, desde una PWA y aplicaciones Android/iOS. Dos roles iniciales: ciudadano y administrador. No introducir pagos, red social, múltiples consejos o roles institucionales nuevos sin necesidad validada.

## Reglas globales

- Interfaz en español; fechas visibles en America/Bogota y almacenamiento de instantes en UTC.
- Categoría, vereda, descripción y fotografía obligatorias al enviar. Borradores incompletos permitidos.
- Descripción: máximo 500 palabras. Celular opcional: hasta 10 dígitos. Notas administrativas: máximo 30 palabras.
- Registro y cambio de contraseña: 8–20 caracteres, al menos una mayúscula, un número y un carácter especial, conforme a la monografía. No almacenar contraseñas ni hashes en perfiles.
- Ciudadanos no pueden cambiar estados, prioridad, asignación, rol ni publicaciones oficiales.
- Lectura pública usa una proyección autorizada del caso. Identidad, teléfono, ubicación exacta y notas internas permanecen separados.
- Guardado local no equivale a recepción del Consejo. La confirmación de envío requiere acuse del servidor.
- La IA ofrece sugerencias editables; nunca publica, cambia estados ni asigna responsables automáticamente.
- Mantener ruta de captura manual cuando IA, mapas, cámara o geolocalización no estén disponibles.
- No trasladar los porcentajes de pruebas del Word a la nueva app: existen inconsistencias entre conclusiones y tabla 25.

## Mapa de pantallas

| Área | Rutas estáticas propuestas | Comportamiento |
| --- | --- | --- |
| Acceso | /ingresar/, /registro/, /recuperar/, /verificar/ | Correo/Google, errores, verificación, recuperación, sesión expirada |
| Inicio | /inicio/ | Saludo, hero, reportar, ver mapa, conteos propios por estado, noticias, actividad pública |
| Reporte | /reportar/ | Cuatro pasos: tipo, ubicación, detalles, revisión; guardado recuperable |
| Mis casos | /mis-reportes/, /envios/ | Listas propias y cola de sincronización con reintento |
| Detalle | /incidencia/?id=... | Información, evidencia autorizada, notas públicas y eventos; cerrar vuelve al origen |
| Territorio | /mapa/ | Marcadores públicos, agrupación, filtros y alternativa de lista |
| Comunidad | /noticias/, /historial/, /estadisticas/ | Noticias, filtros completos, calendario y gráficos originales |
| Cuenta | /cuenta/, /seguridad/ | Nombre/foto, correo no editable, tema, contraseña, eliminación y cierre de sesión |
| Consejo | /admin/, /admin/publicaciones/ | Bandeja, detalle lateral, prioridad, asignación, estados, notas y comunicados |

Móvil: Inicio, Mapa, Reportar, Comunidad, Cuenta. Comunidad ofrece las tres rutas como pestañas; no se eliminan funciones. Escritorio: menú lateral con los destinos completos del Word. El administrador conserva su inicio personal HU-12 y dispone además de una bandeja operativa; no reemplazar una por otra. Formularios de acceso no muestran navegación autenticada.

## Sistema visual

Tokens iniciales: fondo #F8FAF7, superficie #FFFFFF, texto #142C24, marca #0C4435, acción #15803D, superficie suave #EAF3EC, borde #DEE7E0. Comprobar contraste antes de fijarlos como definitivos. Estado siempre tiene texto e icono además de color.

Tipografía sans local con pesos 400/500/600/700, cuerpo 16 px, etiquetas mínimo 14 px, títulos 24–32 px. Espaciado 4/8/12/16/24/32/48 px. Botones táctiles mínimo 44×44 px, campos de 48 px, radio de tarjetas 16–20 px. Móvil 360–430 px, tableta 768 px, escritorio 1280–1440 px; verificar también 320 px y texto ampliado. Movimiento breve de 120–180 ms respetando preferencia de reducción.

Logo vectorial propio basado en el río negativo, probado a 16, 24, 48 y 192 px; variantes monocromática, invertida e icono de aplicación. Hero ilustrado independiente del logo, optimizado y con imagen local. Fotos de casos de demostración claramente ficticias; no reutilizar imágenes de incidentes reales sin autorización.

Diseñar cada pantalla en carga, vacía, éxito, error y sin conexión; también estados de foco, validación, permisos denegados y actualización concurrente donde proceda. La marca no debe depender de sombras, gradientes o fotos grandes para comunicar jerarquía.

## Arquitectura

Mantener Next.js + React + TypeScript + Tailwind para presentación, Capacitor para Android/iOS, Firebase Auth/Firestore/Cloud Functions/FCM y Supabase Storage privado para evidencias. Leaflet y Recharts conservan las funciones cartográficas y estadísticas del documento. Versiones compatibles se verifican y fijan con lockfile al arrancar, sin instalar versiones preliminares.

Exportar cliente estático para web y Capacitor (`output: 'export'`, `webDir: 'out'`). Las páginas de detalle usan identificador en query para no exigir generar rutas de cada incidencia durante build. No usar Server Actions, API Routes o renderizado de servidor para operaciones de usuario del paquete exportado. Backend único en Cloud Functions, evitando duplicar lógica en Netlify Functions. Netlify sirve el cliente estático según la monografía; cualquier cambio de hosting debe registrarse.

Organización por funciones del producto. Interfaces de repositorio permiten primero una demo local y después adaptadores reales. La demo usa datos y etiqueta de demostración, sin simular que un caso fue recibido por una entidad. No construir un contexto global que cargue todos los casos o mezcle credenciales, datos, UI y reglas.

Lecturas autenticadas desde Firestore sujetas a reglas. Mutaciones sensibles mediante funciones que verifican token, cuenta activa, rol y versión de la entidad. Para archivos, la función autoriza cada objeto y emite acceso temporal; la clave privilegiada de Storage nunca llega al cliente. Firebase Auth y Supabase no se consideran automáticamente un mismo sistema de identidad.

## Datos y permisos

| Colección | Datos y acceso |
| --- | --- |
| users | uid, nombre, referencia de avatar, estado; propio usuario y administración autorizada |
| veredas | id, nombre oficial, activa, coordenadas validadas; lectura de catálogo |
| incidents | id, autorUid, categoría, veredaId, relato, estado, prioridad, responsable, versión, createdAt, updatedAt; autor y admin |
| incidentContacts | Teléfono y otros datos privados, vinculados al caso; autor/admin |
| incidentLocations | Coordenadas exactas y precisión, separadas de ubicación pública |
| publicIncidents | Campos expresamente publicables, coordenada generalizada y evidencia autorizada; lectura comunitaria |
| incidents/{id}/publicNotes | Notas publicadas con autor institucional y fecha |
| incidents/{id}/internalNotes | Notas exclusivamente administrativas |
| incidents/{id}/events | Registro inmutable de estado/asignación, versión y actor; proyección filtrada para ciudadano |
| attachments | objectKey, mime, bytes, propietario, caseId y estado; nunca URL firmada persistida |
| publications | Título, tipo, severidad, resumen, contenido, fuente, programación, anclado y borrado lógico |
| notifications | uid, texto apto para destinatario, leído, referencia y fecha |
| devices | Tokens push por usuario/dispositivo; sin lectura pública |
| mutations | Clave idempotente por usuario y operación para reintentos |
| aiRuns | Operación, referencias autorizadas, proveedor/modelo, duración, coste si disponible; evitar texto sensible en logs |
| audit | Actor, operación, objetivo, versión y fecha; escritura solo servidor |

Categorías persistidas: recursos_naturales, conflictos_territoriales, infraestructura, socioeconomicos, otro. Etiquetas cortas pueden acompañarse de explicación. Alumbrado, muelle, vías, agua y drenaje son ejemplos de infraestructura, no categorías nuevas obligatorias. No inventar el catálogo completo de veredas: usar datos de demo y bloquear la entrega real hasta validar el listado.

Estados de negocio: pendiente, en_proceso, solucionado, no_solucionado, descartado, bloqueado_conflicto, escalado. Reglas propuestas: desde pendiente pasar a en_proceso/descartado/bloqueado_conflicto/escalado; desde en_proceso a solucionado/no_solucionado/bloqueado_conflicto/escalado; desde bloqueado_conflicto o escalado a en_proceso/no_solucionado/solucionado. Reabrir solucionado/no_solucionado/descartado a en_proceso exige motivo administrativo. Toda transición exige nota, versión esperada y auditoría. En revisión y visita programada son eventos descriptivos, no estados adicionales que alteren métricas.

## Conectividad y archivos

IndexedDB guarda borradores y cola con blobs locales, versión de esquema y usuario propietario. Almacenamiento no disponible/cuota excedida: informar y permitir continuar conectado; nunca decir guardado si falló. No almacenar tokens en la cola. En dispositivos compartidos la persistencia de datos sensibles será una decisión explícita de sesión; limpiar datos privados al salir y advertir de borradores no enviados antes de descartarlos.

Proceso: generar clientRequestId → guardar borrador → validar → preparar subida autorizada → transferir foto → verificar archivo en servidor → confirmar creación idempotente → devolver id y fecha servidor → marcar enviado. Un fallo entre pasos conserva estado recuperable. El servidor no vuelve a crear el caso si se repite confirmación. Limpiar archivos huérfanos vencidos con un job y registro.

Estados de transporte independientes: draft, queued, uploading, confirming, sent, failed. Reintentar al reconectar, al volver a primer plano y manualmente; no depender exclusivamente de sincronización de fondo del navegador. Caché de Firestore no sustituye el protocolo de archivos ni la resolución de cambios concurrentes.

Propuesta de límites de operación: hasta 3 fotos, JPG/PNG/WebP, máximo 10 MB por original y compresión objetivo de 1,5 MB por imagen. Validar formato real en servidor y retirar metadatos de ubicación no requeridos. Videos mencionados en el apéndice D: extensión planificada con límites y validación propios, fuera de la primera entrega fotográfica; no declarar cumplimiento de video sin implementarlo.

## IA

AI-01: mejorar redacción sin cambiar hechos, conservar original y mostrar comparación aceptable/rechazable. AI-02: sugerir categoría canónica y campos faltantes. AI-03: resumen de expediente con ids de notas accesibles y borrador de respuesta pública. El resumen interno y la respuesta pública usan conjuntos de datos diferentes. AI-04: dictado conectado, con transcripción editable, permiso explícito de micrófono y escritura manual alternativa.

Proveedor encapsulado por servidor; Gemini es candidato inicial por la mención del documento, sin fijar modelo no verificado. Definir cupos, timeout y presupuesto antes de activar proveedor real. No prometer IA offline ni detección de culpables, ilegalidad o urgencia como hecho. Contenido de reportes/notas es dato no confiable, nunca instrucciones que permitan acceso a otros casos. Los planes de actuación mencionados en el Word se limitan a borradores para revisión, basados en protocolos aprobados; no inventar procedimientos del Consejo.

## Métricas y pruebas

Tasa de solución = solucionados / total del conjunto consultado × 100; conjunto vacío muestra 0 % con indicación sin datos. Periodo por createdAt en zona local, aclarando que refleja estado actual de esa cohorte. Conteos completos de siete estados aunque se destaquen tres. Métricas comunitarias sobre proyección pública; admin puede consultar total privado con etiqueta explícita. Calendario mensual seleccionable, circular por categoría y barras por estado, además de tablas accesibles.

Pruebas críticas: permisos cruzados, publicación accidental de notas, estados concurrentes, doble envío, caída durante foto, cierre/reapertura offline, borrado de cuenta, división por cero y salida inventada de IA. Validar visualmente tamaños móvil/tableta/escritorio y ambos temas. Metas propuestas: navegación sin desbordamiento a 320 px, controles accesibles por teclado, cero fallos graves de accesibilidad automatizada, envío sin duplicados en 10 reintentos y recuperación de borrador tras reinicio. Rendimiento se medirá en producción simulada, no se afirmará por el diseño.

## Contradicciones y decisiones pendientes operativas

Notas HU-13: conservar nota pública ≤30 palabras y agregar modo interno explícito del apéndice D. No cambiarlo silenciosamente. Cambiar contraseña usa actual/nueva/confirmación para cuentas de contraseña; cuentas Google usan reautenticación del proveedor sin exigir una contraseña inexistente. Errores de acceso serán claros sin revelar innecesariamente si otra cuenta existe.

Se requiere del Consejo, antes de piloto real: catálogo de veredas, administradores nominados, política de publicación, criterios de escalamiento, textos de privacidad y responsable de atención. Se requiere para servicios reales: proyectos, acceso autorizado, dominio, presupuesto y proveedor IA. Para iOS se requiere macOS/Xcode y firma. Ninguna de estas dependencias impide crear y verificar el prototipo local.

## Fuentes técnicas consultadas

- [Next.js exportación estática](https://nextjs.org/docs/app/guides/static-exports): límites del cliente exportado.
- [Capacitor entorno](https://capacitorjs.com/docs/getting-started/environment-setup): herramientas nativas por plataforma.
- [Firestore sin conexión](https://firebase.google.com/docs/firestore/manage-data/enable-offline): alcance de persistencia del SDK.
- [Supabase buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals): archivos privados y acceso temporal.

Consulta: 6 de septiembre de 2026. La consulta al índice changelog.md de Supabase falló; repetir la comprobación de cambios relevantes antes de implementar Storage. No se hicieron cambios en servicios remotos.
