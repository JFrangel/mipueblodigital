# Plan de mejoras del Panel del Consejo

Fecha: 2026-10-21. Estado: revisión y propuesta; sin cambios de código ni de datos.

**Objetivo:** permitir al Consejo mantener y validar el catálogo de veredas, gestionar evidencias y visitas técnicas, consultar todos los reportes por fecha y exportar la bandeja completa.

**Arquitectura:** conservar Next.js 16.3.4, React 19, Firebase Auth/Firestore, el archivo de imágenes existente y Leaflet. Extender las rutas autorizadas y separar los archivos de imagen de los documentos de expedientes. Mantener compatibilidad con reportes, borradores y envíos pendientes anteriores.

**Ejecución:** implementar por etapas verificables después de revisar este plan. No modificar manuales hasta comprobar el comportamiento terminado y comunicarlo al usuario.

## Hallazgos comprobados

- `src/features/council-territory.tsx` y `src/app/api/admin/territorio/route.ts` gestionan propuestas de puntos: aceptar, descartar y fundir; no son un editor completo del catálogo.
- `src/domain/territory.ts` contiene el catálogo compilado. `src/data/territorio-vivo.ts` añade puntos remotos y caché local, pero todavía consulta directamente Firestore: revisar su permiso real y sustituir esa lectura por una proyección autorizada del catálogo.
- `src/features/report.tsx` conserva un arreglo de fotografías en el borrador, pero envía `photos[0]`. `src/data/remote-reports.ts` define un único `photo`; la API valida y archiva una sola imagen.
- `src/platform/evidence.ts` ya prepara/comprime imágenes. Reutilizarlo ajustando el presupuesto total; permitir varias exige revisar servidor, archivo, cola web y transporte Android.
- `src/app/api/admin/incidents/route.ts` pagina 25 documentos ordenados por ID. La bandeja tiene navegación, pero no orden cronológico ni exportación integral propia.
- `src/data/account-reports.ts` y `src/data/community-map.ts` detienen la carga en ocho páginas: 200 documentos consultados. En comunidad el filtrado de privacidad puede reducir el número visible.
- `src/app/api/community/reports/route.ts` usa solamente la fecha como cursor: los empates pueden dejar reportes fuera.
- `src/content/manual-consejo.ts` reconoce estas limitaciones. `docs/manuales.md` explica la generación sincronizada del contenido, Markdown, PDF y manifiesto.
- El árbol de trabajo estaba limpio al comenzar. La revisión fue estática: no se ha probado el despliegue ni se han ejecutado pruebas funcionales.

## 1. Catálogo editable y validación institucional

**Archivos afectados:** `src/domain/territory.ts`, `src/domain/veredas.ts`, `src/data/territorio-vivo.ts`, `src/features/council-territory.tsx`, `src/app/api/admin/territorio/route.ts`, `src/server/veredas.ts`, `firebase/firestore.rules`; nueva ruta de lectura del catálogo y módulo compartido de tipos/validación. Localizar además todos los consumidores de `veredaNames`, `veredaCatalogue` y `veredas` antes de cambiar sus contratos.

- [ ] Crear catálogo persistente con ID estable, nombre, alias históricos, estado activo y coordenadas opcionales. El catálogo compilado sirve como semilla inicial; no reinsertar elementos retirados al refrescar.
- [ ] Añadir en la sección Veredas búsqueda, listado, añadir, editar nombre, quitar y ubicación opcional. Quitar significa desactivar para nuevos reportes; conservar referencias históricas. Explicarlo en la confirmación.
- [ ] Abrir mapa al elegir «Señalar ubicación»; tocar coloca/mueve el marcador. Ofrecer confirmar, cancelar y quitar ubicación. No exigir permiso GPS ni coordenadas para guardar el nombre.
- [ ] Separar dos estados: catálogo validado y vereda con ubicación. Un catálogo puede estar validado aunque tenga veredas sin punto.
- [ ] Registrar validación explícita de la versión del catálogo con fecha y autor. Un cambio posterior de nombre/altas/bajas deja la nueva versión pendiente de revalidación, conservando el historial.
- [ ] Mostrar estado real en el panel y consumidores; sustituir los avisos fijos donde corresponda. Mantener las fuentes históricas como antecedentes, sin afirmar límites legales por validar nombres o puntos.
- [ ] Unificar lectura del catálogo en formularios, filtros, estadísticas y mapas. Conservar copia local de la última versión para captura ciudadana sin conexión.

**Riesgos y controles:** nombres duplicados por mayúsculas, espacios o tildes; ID que cambia al renombrar; copias locales antiguas; puntos fuera del territorio; conflictos entre dos administradores. Normalizar nombres, mantener alias, comprobar versión en transacción y validar coordenadas finitas en servidor. No reutilizar el barrido de fusión actual como migración masiva: tiene tope de 1.000 y no actualiza todas las proyecciones. Un borrador con nombre antiguo se resuelve por alias; una vereda desactivada conserva el borrador y solicita elección antes de un envío nuevo.

**Aceptación:** crear sin ubicación; editar y seguir viendo casos históricos; retirar sin borrar casos; elegir/quitar punto; validar y revalidar; acceso ciudadano de escritura rechazado; dos ediciones simultáneas generan conflicto explícito.

## 2. Varias fotografías por reporte

**Archivos afectados:** `src/features/report.tsx`, `src/data/remote-reports.ts`, `src/data/local-store.ts`, `src/data/outbox.ts`, `src/data/sync-outbox.ts`, `src/platform/native-outbox.ts`, `src/platform/evidence.ts`, `src/data/catalog.ts`, `src/app/api/incidents/route.ts`, `src/server/evidence.ts`, ruta de evidencia, `src/features/private-evidence.tsx`, detalle de reporte y transporte nativo bajo `android/`. Revisar también firma/hash, retirada y eliminación de cuenta.

- [ ] Propuesta inicial: entre una y cinco fotos por reporte; miniaturas, añadir y quitar individualmente, contador y mensajes por archivo. Este máximo es una decisión propuesta, no una capacidad ya existente.
- [ ] Preparar imágenes secuencialmente y comprimir cuando haga falta con la utilidad existente. Definir presupuesto de bytes conjunto compatible con el alojamiento real antes de fijar cifras finales; Base64 aumenta el tamaño y no basta con limitar cada foto.
- [ ] Evolucionar a manifiesto de adjuntos privados e identificadores por imagen. Mantener lectura de `photo`/evidencia única para expedientes y colas antiguos.
- [ ] Validar cantidad, formato real, peso e integridad en servidor. Confirmar recepción solo cuando todas las imágenes del manifiesto estén verificadas y el expediente quede registrado.
- [ ] Incorporar todos los adjuntos al hash idempotente y conservar reintentos seguros después de fallos parciales. No duplicar imágenes ni expedientes.
- [ ] Mostrar galería privada con carga bajo demanda. Extender retirada, anonimización y limpieza de huérfanos a todas las imágenes.

**Riesgos y controles:** no meter Base64 múltiple en un documento Firestore; evitar exceder memoria del teléfono, cupo de cola o cuerpo HTTP; no perder texto por una foto fallida; comprobar compatibilidad con APK instalado y si necesita nueva compilación. Mantener separación por cuenta y privacidad de originales.

**Aceptación:** reporte antiguo; cinco imágenes; archivo inválido; peso excesivo recuperable; envío offline y reintento; fallo tras subir parte; APK; retirada y eliminación sin adjuntos olvidados.

## 3. Notas con imagen opcional y visitas técnicas

**Archivos afectados:** `src/features/council-inbox.tsx`, `src/app/api/admin/incidents/[id]/route.ts`, `src/data/remote-history.ts`, `src/app/api/incidents/[id]/history/route.ts`, `src/server/evidence.ts`; nuevas rutas privadas para adjuntos de actuaciones y componente de formulario si resulta necesario.

- [ ] Añadir tipo de actuación «Nota» / «Visita técnica». Para visita: fecha de visita, responsable y descripción; conservar autor y fecha de registro del servidor por separado.
- [ ] Permitir opcionalmente una imagen por nota o visita, con vista previa y quitar antes de guardar. Una visita no requiere cambiar de estado el reporte.
- [ ] Mantener visibilidad pública/interna de notas. Propuesta conservadora: imágenes solo para el Consejo inicialmente; una nota pública no convierte su imagen automáticamente en pública. Mostrarlo expresamente en el formulario.
- [ ] Guardar evento y referencia privada del adjunto con versión esperada e ID de mutación. Conservar texto e imagen ante conflicto/error para reintentar.
- [ ] Representar visitas e imágenes autorizadas en historial y contemplar su eliminación/anonimización.

**Riesgos y controles:** subir archivo y fallar al guardar nota; publicar imagen interna por herencia; duplicar visita por doble clic; confundir día de visita con fecha de registro. Usar adjuntos provisionales, autorización en cada lectura, idempotencia y fechas diferenciadas.

**Aceptación:** nota sin foto/con foto; visita sin cambio de estado; ciudadano sin acceso a adjunto interno; fallo recuperable; conflicto entre administradores; historial anterior compatible.

## 4. Fecha, paginación completa y descarga

**Archivos afectados:** rutas de listado de administración, cuenta y comunidad; `src/features/council-inbox.tsx`, `src/data/account-reports.ts`, `src/data/community-map.ts`, listas y filtros consumidores, `src/features/statistics.tsx`, `src/server/export-tickets.ts`, `src/platform/export.ts`; nueva ruta de exportación de bandeja. Revisar índices de Firestore.

- [ ] Ordenar por fecha de recepción del reporte descendente y desempatar por ID estable. Si se ofrece orden inverso, aplicarlo en servidor. Un orden local de una sola página no resuelve el problema.
- [ ] Usar cursor validado compuesto por fecha e ID; revisar datos antiguos sin fecha antes del cambio, porque `orderBy` los excluye.
- [ ] Quitar el corte global de ocho páginas y exponer navegación/carga adicional hasta agotar cursor, sin descargarlo todo al abrir. Proteger contra cursor repetido, duplicados y peticiones concurrentes.
- [ ] Mantener filtros/búsqueda coherentes con el conjunto consultable: trasladarlos a la consulta autorizada o indicar con claridad el alcance mientras se implementa. No declarar resultados completos con páginas pendientes.
- [ ] Para mapas y cifras, separar consulta de listado de agregados; no recalcular totales generales solo sobre páginas visibles. Conservar marca de lista completa para no borrar copias locales por una respuesta parcial.
- [ ] Añadir «Descargar bandeja completa» en CSV con el orden y filtros seleccionados, generado por servidor recorriendo todas las páginas. Reutilizar descarga Android con billete temporal. No incluir imágenes pesadas ni notas internas por defecto.
- [ ] Mantener acceso restringido al Consejo, escape de fórmulas CSV, fechas claras en hora de Colombia y error explícito si falla una exportación. Una descarga parcial nunca se anuncia como completa.

**Riesgos y controles:** reportes con hora idéntica; página vacía tras filtro de privacidad pero con cursor siguiente; nuevos casos mientras se navega; índices ausentes; cambios de cuenta; exportación grande. Fijar corte temporal de exportación, deduplicar por ID, abortar consultas viejas y definir trabajo de exportación por lotes si el volumen excede una petición.

**Aceptación:** más de 200 reportes (incluidos 201 y 501); empates en límites de página; acceso a primera/última página; filtros; privacidad; error en página intermedia y reintento; CSV íntegro aunque la interfaz solo haya cargado 25; descarga desde APK.

## 5. Conectividad y verificación final

- [ ] Mantener gestión administrativa con conexión: no añadir edición offline del Consejo. Mostrar error recuperable sin anunciar guardado cuando no existe acuse.
- [ ] Conservar borradores y cola ciudadana sin conexión; estos flujos sí se afectan por múltiples fotos y catálogo actualizado.
- [ ] Añadir pruebas de contratos y regresión en `tests/unit/`, reglas en `tests/integration/rules.mjs` y recorridos en `tests/e2e/` para las aceptaciones anteriores.
- [ ] Por etapa ejecutar pruebas pertinentes; al integrar ejecutar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` y recorridos E2E afectados. Probar reglas con emulador y transporte Android cuando cambie su contrato.
- [ ] Verificar despliegue de reglas/índices y compatibilidad de versiones antes de activar nuevos formatos. No desplegar ni migrar datos reales como parte de esta revisión.

## Manuales: después de implementar

Avisar al usuario cuando funciones y comprobaciones estén terminadas para acordar los ajustes de manuales. Actualizar entonces las fuentes `src/content/manual-consejo.ts` y `src/content/manual-ciudadano.ts`, ayuda y arquitectura; generar Markdown y PDF con los scripts existentes y revisar el manifiesto. Explicar que la gestión del Consejo requiere conexión como condición de uso; no presentarla como fallo. Retirar avisos de limitaciones solo después de verificar cada corrección. Este plan no modifica todavía manuales ni promete funciones implementadas.
