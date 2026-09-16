# Revisión antes del empaquetado — 16 de septiembre de 2026

## Cambios de esta revisión

- Emblema vectorial propio: árbol ribereño, palafito, amanecer y agua. Fuente: `public/brand/emblem.svg`. `node scripts/refresh-brand.mjs` regenera los iconos PWA normales y maskable con margen seguro.
- Hojas de plátano ilustradas en los dos costados al enviar y al terminar el reporte. No son fotografías ni iconos de lluvia. La animación termina, no intercepta controles y se suprime con movimiento reducido. La confirmación continúa diferenciando recibo remoto de reporte en cola.
- Bandeja: filtra por la sesión actual también durante el cambio de cuenta. El reintento manual comprueba que la cuenta siga conectada. Se corrigió el texto que daba a entender que un reporte en cola ya estaba enviado.
- Service worker v7: sirve las imágenes públicas de marca desde caché; el emblema se incluye en la instalación. Antes se precargaban imágenes pero el manejador de peticiones no las devolvía sin conexión.
- Corregida la explicación de Background Sync: no hay envío garantizado con toda la aplicación cerrada. La cola se reanuda al abrirla con sesión y conexión.

## Verificación

- TypeScript y lint sin errores.
- 196 pruebas unitarias aprobadas, incluidas cinco de caché pública y exclusión de peticiones privadas/autenticadas.
- Compilación de producción correcta.
- Prueba Playwright: abrir Reportar sin red y avanzar desde categoría hasta ubicación, aprobada.
- Componente de hojas verificado de forma aislada en Chromium a 390 px: entrada, desaparición y preferencia de movimiento reducido. Esta comprobación no sustituye la prueba completa en un teléfono.

## Pendientes para empaquetar y publicar

1. Instalar/configurar Capacitor y crear el proyecto Android: no está en las dependencias actuales. Definir el dominio HTTPS definitivo del backend; las rutas API de Next necesitan servidor y no se incluyen como ejecutables dentro del APK.
2. Validar en dispositivo Android la persistencia de sesión, cámara, dictado, regreso desde segundo plano, cambio de red y reintento. El navegador puede suspender pestañas: no prometer tareas ilimitadas en segundo plano.
3. Probar una cola real antes y después de cerrar/reabrir la app, varios envíos, cuota agotada y cambio de cuenta. Las pruebas unitarias cubren la cola, pero esta revisión no ha enviado nuevos expedientes reales.
4. Comprobar el límite de cuerpo HTTP del alojamiento elegido frente a fotografías de 10 MB codificadas en Base64; no confundir compilación local con despliegue válido.
5. Preparar firma Android, versión de lanzamiento, dominio autorizado de autenticación y prueba de recuperación de cuenta en el dominio definitivo.
6. Confirmar responsables operativos, validación territorial por el Consejo y piloto comunitario. No se declaran terminadas estas tareas externas por pasar pruebas de código.

La cola actual permite hasta 10 reportes pendientes o 50 MiB de carga codificada por cuenta. Borrar los datos del navegador elimina los pendientes locales. La foto original no se guarda en la caché pública del service worker.
