# Plan: banco de consulta del Gran Consejo Comunitario del Río Satinga

Fecha: 29 de septiembre de 2026. Alcance autorizado: investigación, sección en Comunidad y documentación local para Git. No publicar ni hacer push.

## 1. Diagnóstico antes de modificar

- Revisar rutas, las tres pestañas de Comunidad, la guía interna, la monografía y la documentación existente. Mantener Noticias, Reportes y Estadísticas con sus rutas y controles actuales.
- Inventariar pruebas unitarias, de navegador y de integración por archivo, además de los límites conocidos. No trasladar resultados de la monografía ni de capturas antiguas como si fueran ejecuciones actuales.
- Separar hechos de la historia jurídica del Consejo, prácticas comunitarias y composición actual. La composición y el reglamento vigente necesitan ratificación de su Asamblea/Junta.

## 2. Investigación y trazabilidad

1. Priorizar textos oficiales: Constitución, Ley 70 de 1993, Decreto 1745 de 1995, actos del Incora/ANT, sentencias de la Corte y documentos públicos del propio Consejo.
2. Para cada hito registrar fecha, hecho, fuente, alcance y grado de certeza. Distinguir elección de Junta, solicitud de título y adjudicación: son acontecimientos distintos.
3. Evitar reproducir datos personales de actas históricas que no sean necesarios para entender el proceso. No presentar representantes de documentos antiguos como autoridades actuales.
4. Dejar una bibliografía con URL, organismo, fecha del documento, fecha de consulta y pendientes de validación local. El banco es una fuente de consulta, no el archivo legal original del Consejo.

## 3. Integración en Comunidad

- Añadir «El Consejo» como cuarta pestaña persistente, con ruta propia, conservando el diseño de Comunidad y la navegación móvil.
- Organizar la consulta en contexto, línea de tiempo accesible, funciones de Asamblea/Junta, territorio y fuentes primarias. Cada afirmación histórica enlaza a su evidencia.
- Datos editoriales estáticos y versionados en el repositorio en esta primera entrega: sirven sin conexión y no necesitan una nueva colección con permisos de escritura. Una futura carga de actas autorizadas exigirá gobierno documental, revisión del Consejo, metadatos de vigencia y control de acceso.
- Mantener noticias y expedientes separados de la memoria institucional: los primeros cambian con el tiempo y tienen reglas de privacidad propias.

## 4. Documentación para Git

- Crear una guía de pruebas con comandos, alcance de cada archivo, fixtures, condiciones de red, evidencias obtenidas y límites. Incluir rendimiento reproducible con métricas y umbrales propuestos; no inventar una medición ausente.
- Crear un modelo de seguridad y privacidad: flujos y almacenes, autenticación/autorización, cifrado en tránsito y reposo según proveedor, Base64 y hashes, manejo de secretos, caché y dispositivo sin conexión, retención, derechos del titular y riesgos residuales. No afirmar cifrado de extremo a extremo si no existe.
- Enlazar ambos documentos y la investigación desde README y la guía interna donde corresponda.

## 5. Verificación y revisión

- Ejecutar lint, tipos, unidades, compilación y pruebas de navegador enfocadas en la nueva pestaña, móvil y navegación. Investigar fallos; consignar qué se ejecutó y qué no.
- Revisar contrastes, lectura con teclado y preferencia de movimiento reducido; la línea de tiempo no depende de animación.
- Dejar cambios locales para revisión de la representante y del usuario. Las actas, el nombre de autoridades vigentes, el perímetro territorial y cualquier contenido sensible requieren aprobación comunitaria antes de convertirse en referencia institucional definitiva.

## 6. Estado de esta entrega local

La ruta `/memoria/` y su acceso desde Comunidad están implementados con 13 hitos, filtros, búsqueda, bibliografía enlazada y caché PWA. La [segunda revisión de fuentes](investigacion-consejo-rio-satinga.md) distingue actuaciones históricas, propuestas y asuntos pendientes de validación comunitaria. La documentación de [pruebas](pruebas-y-rendimiento.md), [catálogo individual](catalogo-pruebas.md), [propósito por archivo](guia-pruebas-por-archivo.md) y [seguridad y privacidad](seguridad-y-privacidad.md) queda enlazada desde README. Se registraron 430 pruebas unitarias, 72 de navegador, reglas en emulador, compilación y medición local. No se hizo push.

La siguiente fase institucional depende de copias auténticas, planos y aprobación del Consejo; la siguiente fase operativa depende de probar dispositivos y restauración de copias. Ninguna de esas actividades se marca como completada por esta entrega de código.
