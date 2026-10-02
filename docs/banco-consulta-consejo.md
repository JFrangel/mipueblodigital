# Banco de consulta del Gran Consejo Comunitario del Río Satinga

Fecha de esta documentación: 2 de octubre de 2026.

## Qué se busca

Reunir una memoria institucional consultable para la comunidad y el Consejo: explicar el reconocimiento del territorio, el marco normativo, el trámite del título colectivo y actuaciones documentadas. La línea de tiempo permite ubicar cada hecho, buscarlo y abrir la fuente que lo respalda. Ayuda a preparar reuniones, orientar a nuevos integrantes, responder consultas y conservar referencias para la sustentación del proyecto.

El objetivo es facilitar la consulta y la trazabilidad. La sección no certifica representación actual, linderos, reglamento vigente ni una fecha exacta de constitución aún no validada. El Gran Consejo Comunitario y el Concejo Municipal son instituciones diferentes. Un presupuesto propuesto, un acto aprobado y una ejecución comprobada deben describirse como hechos distintos.

## Cómo está construido hoy

| Componente | Responsabilidad |
| --- | --- |
| `/memoria/`, accesible desde Comunidad | Presentación del archivo público |
| `src/content/council-history.ts` | Catálogo tipado y versionado de fuentes y resúmenes; cada hito referencia fuentes por identificador |
| `src/features/council-memory.tsx` | Línea de tiempo, filtros Origen/Territorio/Memoria, búsqueda y enlaces a fuentes |
| `src/features/council-memory.module.css` | Diseño adaptable a móvil y ordenador, integrado con los temas de la app |
| `docs/investigacion-consejo-rio-satinga.md` | Investigación, jerarquía de fuentes, segunda revisión y datos por confirmar |
| `tests/e2e/council-memory.spec.ts` | Recorrido de consulta, filtros, fuentes y contenido previamente cacheado en navegador |

**El banco actual es contenido público en el repositorio, no una nueva colección Firestore ni una base de actas privadas.** Los cambios se revisan en Git y llegan con el despliegue web. El panel administrativo no edita estos hitos directamente. Las fuentes enlazadas permanecen en sus sitios custodios; no se copian documentos sensibles a Git ni a la colección de noticias. La PWA puede abrir la consulta previamente cacheada sin red; abrir una fuente externa sí requiere conexión.

## Entradas, proceso y salidas

**Entradas:** documentos públicos con autor/custodio identificable, fechas, enlaces y hechos verificables; correcciones y autorizaciones aportadas por el Consejo.

**Proceso:** comprobar qué afirma la fuente y a qué época corresponde; contrastar cuando sea posible; redactar un resumen propio; omitir datos personales innecesarios; distinguir dato confirmado, referencia histórica y pendiente de validación; enlazar cada afirmación; revisar tipos, pruebas y vista móvil antes de publicar.

**Salidas:** hitos con fecha, contexto y fuentes; resultados de búsqueda y filtros; explicación del origen jurídico y territorial; referencias que pueden verificarse y corregirse. La sección no produce certificados oficiales ni respuestas jurídicas automáticas.

## Quién debe mantenerlo

Se propone que la Junta designe un custodio editorial, con autorización del Consejo para validar resúmenes y permisos de publicación. La persona encargada del mantenimiento técnico incorpora cambios, ejecuta las pruebas, revisa accesibilidad y publica. **Esta asignación debe acordarse en la entrega; no se asume que ya existe un nombramiento.** La Asamblea y la Junta validan la historia propia, conforme a sus competencias y reglamento.

Para cada nueva ficha registrar: título, autor/custodio, fecha del hecho y del documento, URL estable, páginas pertinentes, resumen, alcance, permiso de publicación y fecha de revisión. Conservar el cambio y su motivo en Git. Revisar enlaces periódicamente y ante avisos de la comunidad. Un enlace caído no justifica reemplazar el hecho por una inferencia; buscar copia autorizada o indicar que la fuente no está disponible.

## Qué falta para un archivo institucional completo

Solicitar el expediente auténtico de titulación, Acta 002/1998, planos, reglamento vigente y actas autorizadas. Validar con el Consejo la cronología y las denominaciones territoriales. No afirmar que una fuente antigua identifica a la representante actual.

Si se desea cargar documentos desde administración, hace falta una segunda fase: API y almacenamiento privado, metadatos de custodia, permisos por documento, versiones, registro de consultas/cambios, revisión antes de publicación, retención y eliminación. Separar público, miembros y Junta; los documentos de víctimas, menores, censos y conflictos necesitan evaluación particular. Las reglas de noticias no bastan para este archivo. Tampoco se deben enviar actas reservadas a un proveedor de IA sin un alcance y autorización expresamente acordados.

## Preguntas para la sustentación

- **¿Para qué sirve además de reportar?** Conserva referencias documentales del Consejo y facilita consultas con fuentes verificables.
- **¿Es una base oficial del Consejo?** Es un banco público de consulta; la validación comunitaria y el archivo auténtico siguen siendo necesarios.
- **¿De dónde salen los datos?** De las fuentes enlazadas y descritas en la investigación; cada hito identifica su soporte y sus límites.
- **¿Quién corrige un error después de entregar?** El custodio editorial valida; el responsable técnico modifica el catálogo con historial Git y pruebas.
- **¿Por qué no se publican todas las actas?** Contienen datos que pueden requerir reserva. La consulta pública usa resúmenes y enlaces públicos.
- **¿Funciona sin conexión?** La interfaz y contenido previamente cacheados pueden consultarse; los documentos externos necesitan red.
- **¿Se puede ampliar?** Sí, agregando fuentes/hitos revisados al catálogo; un archivo privado editable requiere la segunda fase descrita arriba.
