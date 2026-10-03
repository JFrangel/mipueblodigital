# Cabecera municipal y edición de la memoria del Consejo

Estado: diseño aprobado por el usuario el 3 de octubre de 2026; implementado y verificado. Evidencia en `docs/editor-historia-cabecera-2026-10-03.md`.

## Cabecera municipal

Agregar Bocas de Satinga al catálogo operativo sin modificar la lista histórica
de las 18 veredas del Consejo. Mostrar «Bocas de Satinga · cabecera municipal»
manteniendo «Bocas de Satinga» como nombre almacenado para no romper expedientes.
Permitir encontrarla también buscando Olaya Herrera. El mapa mostrará una
referencia identificable incluso si todavía no hay incidencias allí; esa
referencia no debe contabilizarse como un reporte ni mezclarse con los grupos.

La investigación existente registra DANE 52490000, latitud 2.347457 y longitud
−78.325814. Se verificará el registro original antes de incorporar el punto.
Es un punto representativo urbano; quien reporta puede ajustar el lugar exacto.
No supone que todo el casco urbano pertenezca al título colectivo.

Fuentes para contrastar:
- DANE: https://geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_CentrosPoblados.xlsx
- Identificación de la cabecera: https://old.cas.gov.co/sitio/images/convocatoria/2020/audiencia-publica-ambiental-anla/capitulo-3.3-caracterizacion-medio-socioeconomico-tomo-ii.pdf
- Referencia urbana complementaria, sede administrativa: https://portalhistorico.unidadvictimas.gov.co/es/direccion-territorial-narino/76847

## Historia desde el panel del Consejo

Nueva pestaña «Historia», con listado y formulario coherentes con Comunicados.
Cada entrada tendrá título, descripción, período (Origen, Territorio o Memoria),
fecha del hecho y fuentes. Cada fuente permite nombre, institución y enlace.
La hora será opcional; no se exigirán fechas artificiales cuando solo se conoce
el año o el mes. La persona elige precisión de año, mes o día. Se permite una
aclaración breve sobre la certeza o el contexto documental.

Se podrá guardar borrador, previsualizar, publicar, editar y archivar. La pantalla
explicará que la línea de tiempo se ordena por la fecha del hecho, no por cuándo
se carga. Por ejemplo, un hecho de 1994 agregado hoy queda entre 1993 y 1995.
Los empates tendrán un orden estable. La presentación actual en Comunidad se
mantendrá, incorporando únicamente las entradas publicadas.

## Persistencia y protección

Colección separada en Firestore, gestionada por endpoints autenticados del
servidor. No dar acceso directo de escritura desde el cliente. Validar fechas,
longitudes, estado y enlaces HTTPS; renderizar texto sin HTML arbitrario.
Registrar autor, fechas de creación/modificación y versión; utilizar transacción
para evitar sobrescribir cambios simultáneos. Archivar conserva trazabilidad.
Lectura pública proyectada: solo contenido publicado, sin metadatos privados.

Mantener los 13 hitos investigados como base identificada por IDs estables.
Permitir al Consejo administrarlos sin duplicarlos, mediante registros que
sobrescriban su versión editorial. Una retirada administrativa debe respetarse
también al combinar los datos remotos con la base estática. Conservar una copia
local de la última lectura pública para consulta sin conexión, indicando su
antigüedad; no anunciar éxito editorial si el servidor no confirmó el guardado.

## Verificación y documentación

Probar cabecera seleccionable, ajuste manual, búsqueda por ambos nombres y
marcador sin incidencias. Verificar que las 18 veredas históricas permanecen.
Probar validación de fechas/fuentes, orden de hechos insertados a destiempo,
precisión de fecha, publicación/archivo, permisos y conflictos de versión.
Probar editor y línea de tiempo en móvil, escritorio, claro y oscuro.
Actualizar el manual administrativo, banco de consulta y documentación de
seguridad, indicando nueva colección, endpoints y alcance de cada prueba.
Ejecutar comprobaciones del proyecto antes de anunciar finalización.

La monografía queda fuera de Git. Antes de un push se anunciará al usuario;
esta propuesta no afirma que los cambios ya estén implementados o desplegados.
