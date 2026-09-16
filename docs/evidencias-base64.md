# Evidencias originales en Base64

La captura conserva el archivo original mediante FileReader.readAsDataURL. Se valida que la imagen sea legible, pero no se dibuja en canvas ni se recomprime. El tipo, resolución, contenido y metadatos originales se conservan. Las imágenes anteriormente comprimidas no recuperan su calidad: requieren volver a adjuntar el original.

Límites actuales de captura: JPG/PNG/WebP, 10 MiB de archivo y 24 megapíxeles. Los límites provocan un mensaje explícito, nunca una compresión silenciosa. El Base64 añade aproximadamente un tercio al tamaño original; no es cifrado.

La prueba E2E compara SHA-256 de los bytes originales con los decodificados desde Base64, tanto en la previsualización como después de guardar y recargar IndexedDB. Las ilustraciones de interfaz permanecen como recursos WebP, independientes de las evidencias.

## Base de datos remota

Firestore Standard admite [1 MiB por documento](https://firebase.google.com/docs/firestore/quotas). Un original de 10 MiB convertido a Base64 ocupa aproximadamente 13,33 MiB, por lo que no puede colocarse en un campo del documento de incidencia. Aún no se han enviado imágenes a una base remota.

El requisito aprobado es persistir el Base64 literalmente en una base de datos. Esto reemplaza el almacenamiento de archivos previsto por una tabla privada de evidencias separada, con metadatos/referencias en Firestore. Quedan por implementar la tabla con capacidad adecuada, la autorización mediante identidad verificada, la descarga bajo demanda y la comprobación de integridad del lado servidor. No dividir la imagen en documentos públicos ni ampliar permisos para sortear límites. La conexión remota sigue pendiente; IndexedDB no equivale a una entrega al Consejo.

Conservar el original también conserva EXIF. El original debe mantenerse privado; cualquier versión pública debe pasar por una política explícita de metadatos. No se debe adjuntar la imagen Base64 a las consultas de listados o estadísticas.
