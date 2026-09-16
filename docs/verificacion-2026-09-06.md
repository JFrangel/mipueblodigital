# Verificación local — 6 de septiembre de 2026

- `npm test`: 8 pruebas aprobadas: agrupación y paginación, coordenadas inválidas, estadísticas, validación del formulario, persistencia y exportación CSV.
- `npm run lint`: sin errores.
- `npm run build`: exportación estática de 13 páginas generada correctamente.
- `npm run test:e2e`: 5 pruebas aprobadas sobre la compilación `out/` servida localmente: reporte con foto y recarga, ancho móvil de 390 px, validación obligatoria, 300 casos y guía/lectura estadística.
- Vista móvil inspeccionada; contraste del texto secundario y fondo del encabezado ajustados. No equivale a auditoría completa de accesibilidad ni a prueba en dispositivos físicos.
- CI añadida, sin ejecución remota comprobada.

No probado ni conectado: autenticación, autorización real, subida privada, IA externa, notificaciones, sincronización offline, carga remota a escala, recuperación de respaldos, Android/iOS o piloto comunitario. No se declara preparación para producción.
