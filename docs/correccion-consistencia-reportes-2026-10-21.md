# Corrección de consistencia de reportes — 2026-10-21

Registro consolidado con las correcciones posteriores y su verificación: [registro-correcciones-reportes-2026-10-22.md](./registro-correcciones-reportes-2026-10-22.md).

## Problema confirmado

El historial personal combinaba el servidor con el dispositivo, pero el resumen superior y las tarjetas del inicio contaban únicamente las copias locales. Además, el inicio no consultaba necesariamente la cuenta y «Reportes recientes» leía casos locales pese a enlazar al historial comunitario. Los fallos comunitarios se convertían en listas vacías sin aviso.

## Corrección

- El resumen superior, las tarjetas personales y el historial usan la misma lista de la cuenta más las copias locales de esa persona, sin duplicar identificadores.
- Se consulta la cuenta aunque no haya reportes guardados en el dispositivo, por lo que los reportes enviados desde otro teléfono también alimentan el inicio y el mapa.
- «Reportes recientes» presenta la lista comunitaria autorizada por el servidor. Los reportes privados siguen en el historial de su autor y en su mapa.
- Un estado común de consulta distingue carga, respuesta completa y error. Un fallo conserva la última lista de la misma cuenta y permite reintentar; una lista vacía solo se presenta como tal después de una consulta confirmada.
- Los contadores desconocidos se muestran con raya en lugar de cero; las estadísticas avisan cuando el conjunto no está completo.
- Volver a la ventana, recuperar conexión o guardar un reporte actualiza los datos. Reconectar invalida la lista completa anterior antes de ejecutar la limpieza de copias locales.
- El cambio de cuenta oculta inmediatamente los reportes anteriores y cancela consultas pendientes; las lecturas locales tardías también se descartan.

No se modificaron expedientes de producción, rutas de escritura, reglas de publicación ni manuales.

## Verificación

- Reproducción antes de corregir: cuatro regresiones de interfaz fallaron con cuatro reportes remotos y ninguna copia local.
- Regresiones de interfaz: cuatro registrados, uno en proceso y uno solucionado, consistencia del resumen, resúmenes comunitarios, carga sin cero ficticio y errores sin falsa lista vacía.
- `node scripts/probar-listas-reportes.mjs`: aprobado en Chromium con el hook real. Comprueba carga inicial, conservación de cuatro reportes al fallar, aislamiento de cuentas y reconexión con respuesta bloqueada antes de confirmar la lista completa.
- `npm test`: 527 pruebas aprobadas en 69 archivos.
- `npm run typecheck`, `npm run lint` y `npm run build`: aprobados.
- Playwright: 39 recorridos aprobados de inicio, reportes, aislamiento de cuentas, mapa, modo oscuro, móvil, sesiones y funcionamiento sin conexión.
- Revisión independiente: hallazgo de reconexión reproducido, corregido y revisado sin defectos importantes pendientes.

Los datos de regresión son de prueba, no los expedientes reales de las capturas. Los cambios están en el proyecto local; esta sesión no realiza despliegue.

## Correcciones de la revisión adicional

- La confirmación de un envío sustituye `LOCAL-…` por el identificador del recibo en una sola transacción, conserva fotos y notas y usa la fecha del servidor. Repetir la confirmación no duplica el expediente.
- Al leer el historial se recupera esa relación para copias antiguas cuyo recibo sigue conservado en la bandeja. No se pueden reconstruir copias locales ya eliminadas ni recibos borrados.
- La entrega notifica a la pantalla abierta para releer el almacén y actualizar la consulta de la cuenta antes de limpiar copias.
- Los marcadores comunitarios se recalculan al cambiar el catálogo: nuevas ubicaciones, movimientos y retirada de coordenadas. Los puntos propios permanecen como fueron registrados.
- Verificación adicional: 530 pruebas unitarias en 71 archivos, 39 recorridos Playwright y comprobación del hook real en Chromium aprobados; tipos, lint y compilación aprobados.

Los manuales siguen pendientes de la revisión solicitada por el usuario. No se desplegaron estos cambios.
