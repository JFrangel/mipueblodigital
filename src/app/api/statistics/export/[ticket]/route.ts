import { adminServices, credentialsReady } from "@/server/admin-auth";
import { consumeExportTicket } from "@/server/export-tickets";
export const runtime = "nodejs";

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
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return noEncontrado();
  }
}
