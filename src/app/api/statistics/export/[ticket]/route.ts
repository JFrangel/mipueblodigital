import { adminServices, credentialsReady } from "@/server/admin-auth";
import { consumeExportTicket } from "@/server/export-tickets";
export const runtime = "nodejs";

/**
 * Lo que el navegador puede hacer con lo que muestra esta dirección.
 *
 * **El contenido lo armó otra cuenta, no esta aplicación.** Quien pide un
 * informe lo calcula y lo redacta en su teléfono, y el servidor solo lo
 * guarda; cualquier cuenta activa puede acuñar un billete. Servido desde el
 * dominio de la aplicación y con la política general —que permite guiones en
 * línea—, un `<script>` metido en ese HTML correría **con la sesión de quien
 * abra el enlace**: bastaría pasarle uno a alguien del Consejo para que el
 * código leyera su token y actuara en su nombre.
 *
 * Por eso esta respuesta lleva su propia política, más estricta que la general
 * (el navegador cumple todas las que reciba):
 *
 * - `sandbox` sin `allow-same-origin`: el documento queda en un origen opaco,
 *   sin acceso al almacenamiento, a las galletas ni a las sesiones de la
 *   aplicación. Es lo que de verdad cierra el hueco.
 * - `default-src 'none'`: tampoco puede pedir nada a nadie —ni a la propia
 *   API ni a un servidor ajeno—, así que no hay por dónde sacar datos.
 * - `allow-scripts` y `allow-modals` solo existen para el botón «Guardar como
 *   PDF» del informe, que llama a `print()`. Con el origen opaco y sin red, un
 *   guion ajeno no alcanza nada de lo que valga la pena.
 */
const POLITICA_DE_UN_INFORME = [
  "sandbox allow-scripts allow-modals",
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/**
 * Lo que abre el navegador del sistema al recibir el enlace.
 *
 * **Sin sesión a propósito.** Quien pide esto es Chrome, no la ventana de la
 * aplicación, y Chrome no trae el token de quien inició sesión ahí dentro. La
 * autorización ya se comprobó al acuñar el billete —ver
 * `src/server/export-tickets.ts`—; aquí basta con el propio billete, que es
 * opaco, de un solo uso y vence en minutos.
 *
 * El CSV se entrega para descargar; el informe, para mostrarse e imprimirse
 * desde el propio Chrome, que es donde `window.print()` sí sabe convertir a
 * PDF.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticket: string }> },
) {
  const { ticket } = await params;
  const noEncontrado = () =>
    new Response(
      "Este enlace ya se usó o venció. Vuelve a la aplicación y pulsa el botón de nuevo.",
      {
        status: 410,
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  if (!/^[0-9a-f-]{36}$/i.test(ticket)) return noEncontrado();
  try {
    // Fallar antes de que Firestore inicie reintentos si faltan credenciales.
    await credentialsReady();
    const { db } = adminServices();
    const contenido = await consumeExportTicket(db, ticket);
    if (!contenido) return noEncontrado();
    return new Response(contenido.body, {
      headers: {
        "Content-Type": contenido.contentType,
        /* El CSV se descarga; el informe se muestra, porque hay que poder
           imprimirlo desde la propia pestaña. */
        "Content-Disposition":
          contenido.contentType === "text/csv;charset=utf-8"
            ? `attachment; filename="${contenido.filename}"`
            : "inline",
        "Content-Security-Policy": POLITICA_DE_UN_INFORME,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return noEncontrado();
  }
}
