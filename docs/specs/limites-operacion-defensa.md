# Límites, operación y defensa

Estado: requisitos y decisiones de diseño. La ayuda navegable está en `src/content/knowledge.ts`.

## Entradas, procesos y salidas

| Módulo | Entradas | Proceso | Salidas |
| --- | --- | --- | --- |
| Captura | Categoría, vereda, relato, foto, celular opcional | Validar; guardar borrador; confirmar | En demo: registro local. En producción: acuse remoto con identificador |
| Mapa | Área visible, zoom, filtros | Agrupar sin eliminar identidades; consultar página | Contador, lista navegable y ficha |
| Consejo | Caso, versión, estado, nota y responsable | Autorizar en servidor; comprobar transición y versión; auditar | Estado actualizado o conflicto explícito |
| Estadísticas | Intervalo, territorio, categorías | Agregar el universo filtrado; mostrar denominadores | Indicadores, desglose, exportación |
| IA administrativa | Agregados autorizados y periodo | Generar explicación; validar referencias; revisión humana | Borrador identificable como IA, nunca una decisión automática |

## Escenarios y aceptación

- 300 casos en el mismo punto: un grupo conserva los 300 identificadores; lista de 25, doce páginas. El zoom no debe ocultar ni declarar duplicados. Implementado y probado localmente.
- Millones de casos: consulta por límites geográficos, agregados del servidor, índices, límites y cursores; no descargar la colección completa. Pendiente. El agrupador actual es local.
- Mismo hecho reportado por varias personas: posible relación revisada por el Consejo, conservando autores privados, pruebas e historial. La proximidad por sí sola no prueba duplicidad.
- Sin conectividad: conservar borrador; mostrar transporte pendiente. No mostrar recepción hasta obtener acuse. La demo solo guarda localmente; PWA y cola remota pendientes.
- Caída entre foto y caso: reintento idempotente, adjunto provisional con vencimiento y limpieza de huérfanos. No volver público un archivo por tener URL.
- Dos administradores: versión esperada en transacción; al perder la carrera, mostrar diferencias y exigir revisión. Prohibir sobrescritura silenciosa.
- Cuota, foto dañada, permiso denegado o GPS impreciso: error recuperable sin perder relato; captura manual; validación de archivos en servidor. El catálogo y coordenadas actuales son ilustrativos.
- Borrado de datos locales: avisar que no hay respaldo. El almacenamiento del navegador puede desaparecer; no es prueba de entrega institucional.
- Estadística sin registros: denominador cero explícito. Escalado, descartado y no solucionado no cuentan como solucionado.
- IA caída o respuesta inválida: indicadores siguen disponibles; descartar narrativa sin respaldo. No enviar identidad, teléfono, fotografía ni texto libre a la IA por defecto.

## Mantenimiento después de la entrega

Propuesta pendiente de acuerdo institucional: el Consejo es dueño de cuentas, dominio y datos; designa responsable funcional y un mantenedor técnico con suplente. Los estudiantes entregan repositorio, inventario, capacitación y procedimiento de recuperación. No se presupone mantenimiento gratuito indefinido.

Antes de producción se debe firmar el responsable, alcance, presupuesto, tiempos de atención y canal de soporte. Presupuestar dominio, cómputo, almacenamiento, transferencia, mensajería, IA y horas de mantenimiento según consumo real; no se fija un costo ficticio.

Propuesta de rutina: revisar fallos y cuotas, parches mensuales y urgentes cuando corresponda; copias diarias con retención acordada y restauración trimestral documentada. Objetivos iniciales a aprobar: pérdida máxima de 24 horas y recuperación en 8 horas. No están demostrados todavía.

## Evidencias que solicitará el jurado

1. ¿Cumple las 21 historias? Presentar trazabilidad por criterio y prueba; no atribuir a esta implementación los porcentajes inconsistentes del documento original.
2. ¿Quién puede modificar estados? Demostrar rechazo desde API con token ciudadano, no solo esconder botones.
3. ¿Qué pasa con 300 reportes? Ejecutar escenario y demostrar conservación de identificadores, filtros y paginación.
4. ¿Cómo se evalúa la IA? Conjunto de casos autorizado, exactitud de cifras y referencias, omisiones, sesgos y revisión humana; sin métricas inventadas.
5. ¿Quién paga y mantiene? Mostrar acuerdo y responsable real; actualmente es una propuesta por formalizar.
6. ¿Está lista para producción? Aún no. La interfaz y pruebas locales no sustituyen backend, piloto, restauración, seguridad y operación institucional.
