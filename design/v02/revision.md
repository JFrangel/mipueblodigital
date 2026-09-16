# Mi Pueblo Digital — revisión visual 02

Dirección solicitada: pulir el primer boceto verde/marfil, mejorar logo y contemplar las funciones restantes. Se conserva la versión anterior.

## Decisiones visuales

Logo propuesto: río en espacio negativo dentro de un cuadrado redondeado verde. Sustituye la ilustración de árbol y paisaje; busca legibilidad como icono pequeño. Es una propuesta raster, pendiente de construcción vectorial y comprobación a tamaños pequeños, no una identidad final registrada.

La navegación ciudadana propone Inicio, Mapa, Reportar, Comunidad y Cuenta. Comunidad agrupa Noticias, Historial y Estadísticas. Mis reportes se alcanza desde Inicio y el filtro del historial. Los nombres cortos Ambiente, Territorio y Comunidad son etiquetas propuestas para categorías; deben conservar su correspondencia con las categorías completas de la monografía.

## Cobertura revisada de las 21 historias

| Historias | Lámina | Representación |
| --- | --- | --- |
| 01, 02, 03 | 03 | Acceso común, Google, recuperación por enlace y creación de cuenta |
| 04 | 01 | Relato, categoría, evidencia, borrador y acceso al siguiente paso |
| 05 | 01 y 02 | Filtros, mis reportes, detalle e historial del caso |
| 06 | 01 | Inicio ciudadano con acción principal y último reporte |
| 07 | 02 | Mapa, filtros, alternativa de lista y detalle |
| 08, 09 | 02 | Noticias, búsqueda, tipo, severidad, fuente, anclado y compartir |
| 10, 11 | 02 | Resumen estadístico, tasa, calendario y categorías |
| 12, 15 | 04 | Navegación del Consejo y bandeja con estado, prioridad y responsable |
| 13 | 04 | Notas, visibilidad y motivo de cambio de estado |
| 14, 20, 21 | 04 | Formulario de comunicado y acciones de publicación, anclado, edición y eliminación |
| 16, 17, 18, 19 | 03 | Perfil, seguridad, tema, privacidad y entrada a eliminación de cuenta |

Cobertura significa que se contempló cada historia en la propuesta; no que todos sus diálogos, validaciones y estados estén dibujados o implementados. Las láminas son estáticas, generadas con image_gen a partir del primer boceto y de la revisión del documento. Los prompts completos quedan en las llamadas de esta conversación: refinamiento de identidad y tres pantallas principales; cuatro vistas de comunidad; cuatro vistas de acceso/cuenta/envíos; administración con panel de casos y dos formularios. Se efectuó una edición adicional para corregir evidencia obligatoria y límite de 500 palabras.

## IA y continuidad

Se proponen mejorar descripción, dictado, resumir expediente y preparar respuesta. Son propuestas visuales, sin proveedor conectado ni precisión medida. El usuario revisa cambios; el administrador revisa publicaciones. IA remota requiere conexión.

Mis envíos diferencia borradores, pendientes y enviados. La evidencia se exige al enviar; guardar un borrador incompleto sí se permite. En la implementación deberá distinguirse además si el caso llegó al servidor pero su archivo sigue pendiente, y disponer de reintento sin duplicados.

## Revisión visual y próximos ajustes del prototipo

Se inspeccionaron las imágenes generadas. La primera lámina se corrigió porque el generador había rotulado la evidencia como opcional. Quedan limitaciones propias del boceto que no deben trasladarse a código:

- Los gráficos de la lámina 02 son ilustrativos: las longitudes deben calcularse con los datos, y el calendario ser una cuadrícula mensual real seleccionable. También falta la vista detallada de distribución por estado.
- Las fechas y nombres entre láminas son ejemplos independientes; usar un conjunto coherente de datos en el prototipo.
- En acceso y registro no mostrar navegación de usuario autenticado. El generador la conservó en la lámina 03.
- En administración, sincronizar la pestaña activa con la visibilidad de la nota. Una nota interna nunca debe aparecer como pública por un estado visual ambiguo.
- El menú de editar/desanclar/eliminar corresponde a una publicación existente; no al formulario de creación. La lámina 04 reúne ambas operaciones como muestra de componentes.
- Unificar la tipografía de administración con la sans de móvil; la lámina 04 introduce títulos serif.
- Dibujar ubicación y revisión final del reporte, confirmación de recepción, permiso de cámara/ubicación denegado, recuperación de contraseña, confirmación de eliminación, formulario de nota y modo oscuro.
- Comprobar contraste, ampliación de texto, foco, teclado, lectores de pantalla y disposición en pantallas pequeñas en el prototipo funcional. No se han validado mediante estas imágenes.

Los cuatro archivos PNG de esta carpeta constituyen la entrega visual. No hay código de aplicación ni funciones conectadas todavía.
