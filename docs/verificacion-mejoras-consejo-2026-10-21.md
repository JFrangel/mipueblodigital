# Verificación de mejoras del Consejo — 21 de octubre de 2026

## Cambios implementados

- Catálogo administrable en la sección Veredas: altas, edición de nombres, alias históricos, retirada del catálogo activo, reactivación y ubicación opcional señalada en Leaflet. Conserva las referencias territoriales anteriores y las propuestas aceptadas antes del catálogo editable.
- Validación expresa de una versión, con autor y fecha en servidor. Una edición posterior requiere revalidar. El formulario ciudadano consulta el catálogo actualizado y conserva una copia local para captura sin conexión.
- Entre una y cinco fotografías por reporte. Preparación secuencial con reducción cuando hace falta, vista previa, eliminación individual y conservación en borradores/cola. Los reportes y envíos pendientes con una sola foto siguen admitidos. Cada adjunto se archiva y verifica antes del recibo; la evidencia permanece privada.
- Nota de seguimiento o visita técnica, con fecha y responsable de visita e imagen opcional. Las imágenes de actuaciones se reservan al Consejo. Es posible registrar una visita sin cambiar de estado el expediente. Reintentar una operación confirmada no duplica el evento.
- Bandeja ordenada por fecha de recepción e ID, con navegación hasta agotar resultados. Filtros/búsqueda se aplican en servidor; los alias del catálogo conservan el acceso a expedientes históricos.
- CSV completo independiente de las páginas cargadas en pantalla. Descarga en Android a través del navegador del sistema y billete temporal de un uso; exportaciones grandes se dividen en documentos menores al límite de Firestore. Límite explícito de 30 MB para el billete; nunca se ofrece una descarga parcial como completa.
- Historial personal y comunitario sin el corte de ocho páginas/200 registros. Los cursores incluyen fecha e ID para no saltar reportes simultáneos. Se conserva la carga automática por páginas de estas vistas para mantener coherentes mapa y cifras; la bandeja administrativa carga a demanda.
- Retirada/eliminación contempla las copias de todas las fotos. Si la limpieza de una cuenta agota un lote operativo, queda incompleta y puede reanudarse.

## Diseño

Se conservaron los colores, tipografías, paneles, botones, avisos y clases del proyecto. Revisión visual en navegador con los componentes reales del catálogo, en una vista temporal aislada con respuestas de prueba: escritorio de 1280 px y móvil de 390 px, sin desbordamiento horizontal. Se recorrió añadir vereda, señalar punto y validar. La vista temporal fue retirada y no forma parte de la compilación final.

## Comprobaciones

- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado sin errores ni advertencias en la comprobación final.
- `npm test`: 512 pruebas en 67 archivos, aprobadas.
- `npm run build`: compilación de producción aprobada.
- Playwright: 25 recorridos aprobados en `app.spec.ts`, `reporte-sin-cuenta.spec.ts`, `production-boundaries.spec.ts`, `cabecera-history.spec.ts` y `mejoras-consejo.spec.ts`.
- `npm run test:rules`: aprobado con emulador Firestore, incluyendo denegación de acceso directo al catálogo, auditoría y partes de exportación para ciudadanos y administradores.
- Regresiones específicas: 501 expedientes con fecha idéntica; búsqueda después de ocho páginas; páginas comunitarias vacías con cursor; alias de vereda renombrada; cinco fotografías; visita con imagen y reintento idéntico; limpieza de 1.005 copias; CSV grande con Unicode y consumo único.
- Revisión independiente de código: cuatro hallazgos corregidos y revisados nuevamente sin defectos importantes pendientes en esas correcciones.

## Alcance de la verificación y puesta en producción

Las pruebas de API administrativa usan dobles de autenticación/almacenamiento; los recorridos públicos y el rechazo anónimo se verificaron con la aplicación compilada. La revisión visual administrativa utilizó datos aislados. No se intervino una cuenta real, no se migraron datos de producción ni se desplegaron cambios. No se probó en un teléfono Android físico en esta sesión; el transporte nativo conserva el JSON completo y la descarga usa el complemento existente.

El archivo `firebase/firestore.indexes.json`, enlazado desde `firebase.json`, añade el índice de `incidents` por `owner ASC`, `date DESC`, `__name__ DESC`. Debe desplegarse y terminar de construirse antes de habilitar el listado personal nuevo en producción. No se requieren tablas nuevas para las imágenes: se utiliza el archivo privado existente.

El panel del Consejo continúa requiriendo conexión para gestionar. Los borradores y la cola ciudadana conservan su funcionamiento sin señal.

## Manuales

No se modificaron las fuentes ni los PDF de los manuales. El siguiente paso acordado es ajustar los textos a las funciones ya comprobadas, regenerar Markdown/PDF/manifiesto y retirar los avisos correspondientes. El catálogo real solo debe marcarse validado cuando el Consejo lo revise y confirme desde el panel; implementar el mecanismo no valida por sí solo los nombres reales.
