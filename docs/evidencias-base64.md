# Evidencias fotográficas y Base64

Estado verificado en el código el 29 de septiembre de 2026. Base64 es una codificación reversible, **no cifrado**. Véase [seguridad y privacidad](seguridad-y-privacidad.md) para permisos y riesgos.

## Entrada y validación

El cliente envía la imagen como `data:image/...;base64,...`. `validateOriginal` en `src/server/evidence.ts` admite JPEG, PNG y WebP de hasta 10 MiB y 24 megapíxeles. Comprueba la sintaxis Base64, el tamaño, formato declarado y que Sharp pueda decodificar **todos** los píxeles. Un hash SHA-256 identifica los bytes recibidos antes de archivar, pero no los cifra.

## Lo que realmente se persiste

`POST /api/incidents` **recodifica** el archivo a WebP, lo rota y limita a 2200 px con calidades descendentes. Esa versión de mayor fidelidad se guarda en una tabla privada Supabase `mpd_evidence_originals`, como texto Base64, y se comprueba allí su hash SHA-256 antes de emitir recibo del caso en Firestore. Por tanto, el nombre heredado “originals” identifica la tabla, **no implica conservar el archivo exacto que llegó del teléfono**. El archivo inicial puede perder metadatos y detalles por recodificación.

Una copia de respaldo de hasta 1600 px se prepara después del recibo y se guarda de forma asíncrona en `incidentEvidence/{id}` de Firestore. Si falla esta operación no se revoca el acuse: el archivo de Supabase ya fue verificado. Un documento Firestore tiene límite de 1 MiB; por eso no se incluye el Base64 de la foto en el expediente ni en listados.

`GET /api/incidents/{id}/evidence` comprueba identidad, dueño o rol del Consejo. `?vista=copia` prefiere el respaldo liviano; de lo contrario intenta el archivo de mayor fidelidad y usa respaldo si ese servicio no responde. La cabecera `X-Evidencia` indica cuál se sirvió, aunque el valor heredado `original` se refiere al WebP archivado, no a los bytes capturados. La respuesta es privada y no se almacena en caché. Las fotografías jamás forman parte del resumen comunitario.

## Comprobaciones que importan

- Formato y decodificación completa: `tests/unit/evidence.test.ts` y `tests/unit/incident-api.test.ts`.
- Reintento idempotente: el mismo `requestId` no crea otro expediente; si cambia el contenido reservado, responde conflicto.
- Falla del archivo privado: no se emite un recibo falso; la bandeja local conserva el envío para reintento.
- Acceso a fotografía de otra persona y contenido sensible: verificar con cuentas reales y emulador además de dobles unitarios.

La retención, peritaje de una copia recodificada y preservación exacta de una evidencia futura son decisiones institucionales pendientes. Si un proceso exige cadena de custodia de los bytes originales, esta implementación no la acredita.
