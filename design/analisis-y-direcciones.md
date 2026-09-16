# Mi Pueblo Digital — análisis y direcciones de diseño

Fecha: 5 de septiembre de 2026. Estado: propuesta para discusión, no especificación aprobada ni aplicación implementada.

## Alcance revisado

La carpeta D:\gestion de insidencias estaba vacía al iniciar. La fuente disponible es Trabajo-de-Grado-Monografía_b.docx. Se extrajo su texto, incluidas tablas y apéndices; se inventariaron 50 imágenes y se revisó una lámina de conjunto, con ampliación del dashboard y un fragmento del modelo de datos. No se auditó un repositorio anterior ni se ejecutaron sus pruebas. Las capturas de código son evidencia documental, no código ejecutable. Los enlaces externos de pruebas y las referencias bibliográficas no se verificaron. No se hizo revisión de paginación del Word ni dictamen legal.

El documento es referencia del producto. Sus indicaciones metodológicas y afirmaciones de implementación no se tratan como órdenes ni como resultados verificados de la nueva app.

## Qué problema resuelve

Centralizar reportes del territorio del Gran Consejo Comunitario Río Satinga, en Olaya Herrera, Nariño. El valor es que una persona pueda registrar una situación, conservar su evidencia y conocer las actuaciones del Consejo, mientras el administrador organiza la atención y documenta decisiones.

El documento identifica cuatro familias: recursos naturales, conflictos territoriales, infraestructura y problemas socioeconómicos; el backlog agrega Otro. Hay dos roles de aplicación: ciudadano y administrador. Consejo, entidades externas y asociaciones son actores del proceso, pero no todos necesitan una cuenta o un rol nuevo.

## Cobertura del backlog existente

| Historias | Capacidad documentada | Decisión de diseño propuesta |
| --- | --- | --- |
| HU-01–03 | Acceso, Google, registro y recuperación | Un acceso común con permisos por rol; revisar fricción del registro con usuarios |
| HU-04 | Categoría, vereda, descripción, fotografía y teléfono opcional | Formulario por pasos con borrador recuperable y revisión final |
| HU-05 | Historial, filtros, detalle y notas | Separar Mis reportes de exploración pública; seguimiento comprensible |
| HU-06 y 12 | Inicio ciudadano y administrador | Dos jerarquías de información según tarea |
| HU-07 | Mapa de incidencias públicas | Mapa acompañado de lista, filtros y tratamiento explícito de precisión |
| HU-08–09, 14, 20–21 | Comunicados, búsqueda, publicación, edición y anclado | Centro de noticias con fuente y fecha visibles |
| HU-10–11 | Estadísticas, calendario y gráficos | Métricas con periodo, definición y estados incluidos |
| HU-13 y 15 | Notas, prioridad, asignación y gestión | Expediente con historial y visibilidad pública/interna |
| HU-16–19 | Perfil, contraseña, tema y eliminación | Cuenta coherente con el proveedor de identidad y proceso de datos documentado |

El alcance original propone PWA y empaquetado Android/iOS, uso sin conexión, cámara, ubicación, notificaciones y evidencia privada. La selección de herramientas definitiva queda para la arquitectura; mencionar tecnologías en la monografía no demuestra que estén configuradas en este espacio.

## Hallazgos que hay que resolver

1. **Resultados de prueba contradictorios.** Las conclusiones indican 28 casos y 96,43 %. La tabla 25 registra 7 casos y 6 exitosos en el ciclo 3, pero 0 fallidos y 100 %; el total dice 28 exitosos. Las cifras no cuadran. Deben cotejarse contra evidencias antes de reutilizarlas.
2. **Usabilidad pendiente.** El resumen y las conclusiones dejan la validación comunitaria para después. Una estética mejor no acredita facilidad de uso ni adopción.
3. **IA ya mencionada.** La tabla 16 declara integración con Gemini para notificaciones y planes, pero no hay historia de IA con criterios medibles ni implementación disponible para comprobarlo.
4. **Notas públicas e internas.** HU-13 presenta las notas guardadas como públicas; el apéndice D describe un selector pública/interna. Debe existir una regla única y verificarse también al consultar datos, no solamente al ocultar controles.
5. **Fotografía obligatoria.** HU-04 la exige. Conviene validar la posibilidad de guardar un borrador sin imagen y qué ocurre cuando no hay permiso de cámara, espacio o señal. Permitir enviar sin foto sería un cambio de requisito que hay que acordar.
6. **Estados incompletamente definidos.** Hay Pendiente, En proceso, Solucionado, No solucionado, Descartado, Bloqueado por conflicto y Escalado. Faltan transiciones permitidas, responsables, motivo y condiciones de reapertura. Los pasos del boceto son explicativos; no sustituyen esta definición.
7. **Privacidad del reporte.** El historial y mapa públicos necesitan una decisión sobre datos del reportante, fotografías y precisión de coordenadas. Propuesta: expediente privado y representación pública autorizada; no publicar automáticamente conflictos sensibles.
8. **Sincronización sin criterios verificables.** Deben distinguirse borrador, guardado en dispositivo, pendiente de envío, enviado y error. Reintentar no debe crear otro caso. Definir también archivos pendientes y actualizaciones concurrentes.
9. **Modelo conceptual frente a datos físicos.** El documento utiliza PK/FK y tipos relacionales para describir Firestore. El fragmento de usuario incluye contraseña_hash pese a describir autenticación gestionada. La nueva especificación debe separar identidad, perfil y dominio, y aclarar el modelo físico.
10. **Arquitectura descrita con variantes.** Se mencionan distintos destinos de archivos y funciones en distintas secciones. Resolver responsabilidades de identidad, archivos, servidor y sincronización antes de implementar.
11. **Gobernanza.** La matriz RACI no asigna A en varias actividades, incluida puesta en producción, y sitúa al Consejo como informado/consultado aunque el texto le da autoridad de decisión. Reconciliar la operación real.
12. **Consistencia editorial.** La descripción de HU-07 repite tareas del panel administrativo; la figura 29 repite la descripción del mapa; hay referencias de apéndices cruzadas y un Abstract vacío. El decreto 1745 recibe descripciones distintas dentro del texto; verificar su fuente en una revisión normativa posterior.

## Qué significa premium para esta app

Una acción principal reconocible; texto legible; espacios consistentes; navegación de móvil al alcance del pulgar; estados con texto además de color. Confirmación de guardado con significado preciso. Recuperación de errores sin perder el relato. Identidad territorial sin recargar cada pantalla de fotografías. La experiencia de escritorio debe facilitar comparar y gestionar casos; la móvil, reportar y seguirlos.

La pantalla original ampliada repite totales y estados, muestra varias acciones con peso similar y reserva espacio al bloque de estadísticas. Propuesta: destacar Reportar, el último avance de Mis reportes y comunicaciones relevantes. Verificar contraste, teclado, lector de pantalla, texto ampliado y dispositivo de gama baja en el prototipo funcional.

## Tres bocetos

**01 Territorio vivo.** Marfil, verde profundo y acentos naturales. Incluye inicio ciudadano, reporte asistido y seguimiento. Es la dirección propuesta para la comunidad por su lectura sencilla. La imagen de río es conceptual; no constituye fotografía verificada del territorio.

**02 Pulso territorial.** Azul profundo y turquesa con mapa protagonista, lista de casos y vista móvil. Adecuado para explorar zonas. Requiere resolver cartografía, conectividad y privacidad. El mapa, nombres y ubicaciones del boceto son ilustrativos, no un inventario geográfico autorizado.

**03 Consejo.** Superficies claras, acento índigo, bandeja de casos y detalle lateral. Adecuado para trabajo administrativo continuado. Incluye historial, responsable y borrador de IA. No trasladar la tabla completa al celular: allí usar tarjetas y detalle dedicado.

Recomendación de diseño: estructura del 01 para ciudadanos, estructura del 03 para administración y mapa del 02 como módulo. Elegir una identidad compartida antes de implementar; los logotipos, colores y textos generados son exploraciones, no marca final.

## IA propuesta con utilidad concreta

Primera función: transformar el relato en un borrador más claro, sugerir categoría e identificar información faltante. Conservar siempre el original. La persona puede editar o rechazar la propuesta. No inferir hechos que no aparecen en el reporte ni decidir responsabilidades.

Segunda función: resumen administrativo basado en las notas accesibles del caso, con referencias a esas notas y borrador de respuesta. Debe respetar la separación entre notas internas y comunicación pública. El administrador revisa antes de publicar; la IA no cambia estados ni envía mensajes por su cuenta.

Dictado y posibles duplicados son extensiones posteriores. No prometer dictado o IA en la nube sin conexión: permitir captura local y asistencia al reconectar. Tampoco presentar sugerencias de prioridad como decisiones finales del Consejo.

Para evaluar: comparar texto original y borrador; contar hechos añadidos sin respaldo, correcciones humanas y sugerencias aceptadas; medir tiempo para completar reportes. Incluir casos ambiguos, instrucciones maliciosas dentro del relato, falta de señal y notas internas. Seleccionar proveedor y presupuesto después de definir datos autorizados, latencia y consumo esperado.

## Orden de construcción propuesto

1. Validar dirección visual y flujo ciudadano con prototipo navegable: inicio → reporte → revisión → confirmación → seguimiento. Cubrir vacío, error, sin permisos, sin conexión y reintento.
2. Construir identidad y permisos, incidencias, archivos y sincronización como un recorrido completo probado.
3. Agregar bandeja del Consejo, asignación, notas, cambios de estado y auditoría.
4. Integrar mapa, comunicados y notificaciones, con reglas públicas/privadas explícitas.
5. Incorporar asistencia de IA y medir su utilidad sobre casos de prueba.
6. Validar con habitantes y responsables; después completar empaquetado móvil y preparación operativa.

Pendiente para la siguiente conversación: dirección visual preferida, necesidad de conservar exactamente el stack de la monografía, catálogo territorial autorizado y dispositivos de prueba. Estos puntos no impidieron preparar los bocetos.

## Artefactos

- boceto-01-territorio-vivo.png
- boceto-02-pulso-territorial.png
- boceto-03-consejo.png

Generados con la herramienta integrada image_gen. Prompts utilizados: tres tableros de alta fidelidad en español para Mi Pueblo Digital, respectivamente experiencia móvil comunitaria en verde y marfil, exploración territorial con mapa conceptual y experiencia administrativa clara con bandeja y asistente de IA. Los prompts completos están en las llamadas de generación de esta conversación. Las imágenes son bocetos estáticos con datos ficticios; no son pantallas funcionales ni pruebas de implementación.
