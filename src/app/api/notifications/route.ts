import { ApiError, requireMember } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { nameOf, namesOf } from "@/server/people";
export async function GET(request: Request) {
  try {
    const { uid, db, identity } = await requireMember(request);
    const scope = new URL(request.url).searchParams.get("scope");
    if (scope === "council" && identity.admin !== true)
      throw new ApiError(403, "Solo el Consejo puede acceder a esta bandeja.");
    const docs = (
      await db
        .collection(
          scope === "council"
            ? "councilNotifications"
            : `notifications/${uid}/items`,
        )
        .orderBy("at", "desc")
        .limit(50)
        .get()
    ).docs;
    /* Quién firmó cada aviso del Consejo. Solo ahí: la bandeja personal cuenta
       lo que le pasó a tu reporte, no quién de dentro lo movió. */
    const names =
      scope === "council"
        ? await namesOf(docs.map((d) => String(d.data().actor ?? "")))
        : new Map<string, string>();
    const personal = docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        title: v.title,
        note: v.note ?? "",
        type: v.type,
        at: v.at,
        incidentId: v.incidentId ?? null,
        newsId: null,
        actor: scope === "council" ? nameOf(names, String(v.actor ?? "")) : "",
        read: v.read === true,
      };
    });
    const announcements =
      scope === "council"
        ? []
        : (
            await db
              .collection("communityAnnouncements")
              .orderBy("at", "desc")
              .limit(20)
              .get()
          ).docs.map((d) => {
            const v = d.data();
            return {
              id: `announcement-${d.id}`,
              title: v.title,
              note: v.note,
              type: "announcement",
              at: v.at,
              incidentId: null,
              /* Con qué comunicado abre el aviso. Sin esto, un aviso de un
                 comunicado nuevo no llevaba a ninguna parte. */
              newsId: v.newsId ?? null,
              actor: "",
              /* Un aviso a la comunidad es un solo documento para todo el
                 territorio: su «leído» no cabe aquí, porque sería el mismo
                 para todos. Lo resuelve quien lo recibe. Venía marcado como
                 leído, y por eso publicar un comunicado no encendía ninguna
                 campana. */
              read: false,
            };
          });
    const items = [...personal, ...announcements]
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 50);
    return Response.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudieron consultar las novedades.",
      },
      {
        status: e instanceof ApiError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const { uid, db } = await requireMember(request),
      input = (await readJson(request, 2000)) as {
        id?: unknown;
        all?: unknown;
      };
    /* Marcar todas: con cincuenta avisos, hacerlo de uno en uno son cincuenta
       viajes al servidor. Se limita a doscientos por llamada para no pasar del
       tamaño de lote que admite Firestore. */
    if (input?.all === true) {
      const pending = await db
        .collection(`notifications/${uid}/items`)
        .where("read", "==", false)
        .limit(200)
        .get();
      if (!pending.empty) {
        const batch = db.batch();
        for (const doc of pending.docs) batch.update(doc.ref, { read: true });
        await batch.commit();
      }
      return Response.json(
        { ok: true, updated: pending.size },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (typeof input?.id !== "string" || !/^[\w-]{1,160}$/.test(input.id))
      throw new ApiError(400, "Notificación inválida.");
    const ref = db.doc(`notifications/${uid}/items/${input.id}`);
    await db.runTransaction(async (tx) => {
      if (!(await tx.get(ref)).exists)
        throw new ApiError(404, "Notificación no encontrada.");
      tx.update(ref, { read: true });
    });
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudo actualizar la notificación.",
      },
      {
        status: e instanceof ApiError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
