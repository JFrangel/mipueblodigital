# Banco de consulta del Gran Consejo Comunitario del Río Satinga

Fecha de esta documentación: 3 de octubre de 2026.

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

**El banco combina 13 hitos investigados del repositorio con la colección editorial `councilHistory` de Firestore.** La nueva pestaña Historia del panel del Consejo permite agregar, corregir, publicar y archivar resúmenes. No es un archivo de actas privadas. Las fuentes enlazadas permanecen en sus sitios custodios; no se copian documentos sensibles a Git ni a la colección de noticias. La PWA puede abrir la consulta previamente cacheada sin red; abrir una fuente externa sí requiere conexión.

## Entradas, proceso y salidas

**Entradas:** documentos públicos con autor/custodio identificable, fechas, enlaces y hechos verificables; correcciones y autorizaciones aportadas por el Consejo.

**Proceso:** comprobar qué afirma la fuente y a qué época corresponde; contrastar cuando sea posible; redactar un resumen propio; omitir datos personales innecesarios; distinguir dato confirmado, referencia histórica y pendiente de validación; enlazar cada afirmación; revisar tipos, pruebas y vista móvil antes de publicar.

**Salidas:** hitos con fecha, contexto y fuentes; resultados de búsqueda y filtros; explicación del origen jurídico y territorial; referencias que pueden verificarse y corregirse. La sección no produce certificados oficiales ni respuestas jurídicas automáticas.

## Quién debe mantenerlo

Se propone que la Junta designe un custodio editorial, con autorización del Consejo para validar resúmenes y permisos de publicación. Un administrador autorizado incorpora los hitos desde Historia; el mantenimiento técnico conserva los endpoints, reglas, pruebas y despliegues. **Esta asignación debe acordarse en la entrega; no se asume que ya existe un nombramiento.** La Asamblea y la Junta validan la historia propia, conforme a sus competencias y reglamento.

Para cada nueva ficha registrar: título, autor/custodio, fecha del hecho y del documento, URL estable, páginas pertinentes, resumen, alcance, permiso de publicación y fecha de revisión. El formulario guarda título, fecha del hecho, hora opcional, descripción, período, aclaración y fuentes; los detalles documentales adicionales pueden consignarse en la descripción y aclaración. Las modificaciones editoriales conservan versiones y autor en `councilHistory/{id}/audit`; el código conserva su historia en Git. Revisar enlaces periódicamente y ante avisos de la comunidad. Un enlace caído no justifica reemplazar el hecho por una inferencia; buscar copia autorizada o indicar que la fuente no está disponible.

## Qué falta para un archivo institucional completo

Solicitar el expediente auténtico de titulación, Acta 002/1998, planos, reglamento vigente y actas autorizadas. Validar con el Consejo la cronología y las denominaciones territoriales. No afirmar que una fuente antigua identifica a la representante actual.

Si se desea cargar documentos desde administración, hace falta una segunda fase: API y almacenamiento privado, metadatos de custodia, permisos por documento, versiones, registro de consultas/cambios, revisión antes de publicación, retención y eliminación. Separar público, miembros y Junta; los documentos de víctimas, menores, censos y conflictos necesitan evaluación particular. Las reglas de noticias no bastan para este archivo. Tampoco se deben enviar actas reservadas a un proveedor de IA sin un alcance y autorización expresamente acordados.

## Preguntas para la sustentación

- **¿Para qué sirve además de reportar?** Conserva referencias documentales del Consejo y facilita consultas con fuentes verificables.
- **¿Es una base oficial del Consejo?** Es un banco público de consulta; la validación comunitaria y el archivo auténtico siguen siendo necesarios.
- **¿De dónde salen los datos?** De las fuentes enlazadas y descritas en la investigación; cada hito identifica su soporte y sus límites.
- **¿Quién corrige un error después de entregar?** El custodio editorial valida; un administrador corrige el hito desde Historia, con versión y autor auditados.
- **¿Por qué no se publican todas las actas?** Contienen datos que pueden requerir reserva. La consulta pública usa resúmenes y enlaces públicos.
- **¿Funciona sin conexión?** La interfaz y contenido previamente cacheados pueden consultarse; los documentos externos necesitan red.
- **¿Se puede ampliar?** Sí, agregando fuentes/hitos revisados desde Historia; un archivo privado de documentos requiere la segunda fase descrita arriba.

## Edición, fechas y almacenamiento (3 de octubre de 2026)

1. Entrar con una cuenta administrativa activa y abrir Panel del Consejo → Historia.
2. Elegir Añadir hito o un hito existente. Indicar título, fecha del hecho y descripción.
3. Elegir precisión: año, año y mes, o fecha completa. La hora local es opcional y solo se admite con fecha completa. Un año conocido no debe transformarse en un día inventado.
4. Añadir de una a ocho fuentes con nombre, institución/autor y enlace HTTPS.
5. Elegir Borrador, Publicado en comunidad o Archivado y pulsar el botón correspondiente. Esperar la confirmación del servidor.
6. Consultar Comunidad → El Consejo. Por ejemplo, un hecho de 1994 cargado hoy queda después de 1993 y antes de 1995. Los empates conservan un orden estable por identificador.

`GET /api/admin/history/` devuelve el archivo editable; `PUT /api/admin/history/{id}/` requiere administrador, cuerpo limitado a 40 KB, validación y transacción de versión. Un conflicto devuelve 409: copiar los cambios necesarios, recargar y revisar la versión vigente antes de guardar otra vez. `GET /api/history/` devuelve únicamente los resúmenes publicados, sin autor, auditoría ni versión administrativa. No hay escritura directa permitida por el SDK cliente.

Los hitos base tienen identificadores estables. Una corrección remota reemplaza la base; archivar o pasar a borrador también la reemplaza para que el original no reaparezca. La lectura consulta hasta 1000 registros editoriales; si se supera ese volumen falla explícitamente para solicitar paginación, en lugar de publicar una lista truncada. No se suben ni se descargan las fuentes en el servidor: solo se guardan sus enlaces y metadatos públicos.

La consulta guarda la última lectura pública válida en el dispositivo, clave `mpd-history-public-v1`, e informa su fecha si no puede actualizarse. Una primera visita sin servidor dispone de la investigación inicial y muestra que no puede confirmar cambios editoriales. Una copia sin red puede contener contenido retirado después de su última actualización: no sirve para distribuir documentos sensibles. El editor necesita conexión y avisa de cambios sin guardar al cambiar de ficha o cerrar la página; no es una cola offline editorial.
