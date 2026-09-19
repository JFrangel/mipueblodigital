import { createHash, randomUUID } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { ApiError, requireMember } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import {
  buildBackup,
  evidenceRequest,
  validateOriginal,
} from "@/server/evidence";
import { validateReport } from "@/domain/logic";
import { DEFAULT_PRIORITY } from "@/domain/priority";
import { categories } from "@/data/catalog";
import { anotarAporte } from "@/server/veredas";
import { avisar } from "@/server/push";
import {
  isCatalogued,
  isInsideTerritory,
  veredaReference,
} from "@/domain/territory";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "No se pudo confirmar el reporte. Conserva los datos y reintenta.",
    },
    { status: error instanceof ApiError ? error.status : 503, headers },
  );
}
export async function POST(request: Request) {
  try {
    /**
     * Reportar no exige tener el correo verificado.
     *
     * Lo exigía, y dejaba fuera a quien más falta hace que entre: en este
     * territorio hay quien abre una cuenta de correo para registrarse y no
     * vuelve a mirarla, y un reporte no vale menos por eso. La decisión ya
     * estaba tomada en la activación del perfil —que tampoco lo pide— y aquí
     * se había quedado sin actualizar, así que la aplicación se contradecía:
     * te dejaba crear la cuenta y luego no te dejaba usarla.
     *
     * Lo que sigue pidiéndolo es la asistencia de IA, que gasta crédito de un
     * tercero, y verificar sigue mereciendo la pena porque es lo que permite
     * recuperar la cuenta. Se ofrece desde Mi cuenta, como recomendación.
     */
    const { uid, db } = await requireMember(request);
    const input = (await readJson(request, 14010000)) as Record<
      string,
      unknown
    > | null;
    if (
      !input ||
      typeof input.requestId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(input.requestId)
    )
      throw new ApiError(400, "Falta el identificador de envío.");
    const fields = {
      category: input.category,
      vereda: input.vereda,
      description: input.description,
      phone: input.phone ?? "",
    };
    if (Object.values(fields).some((v) => typeof v !== "string"))
      throw new ApiError(400, "Revisa los campos del reporte.");
    const data = fields as {
      category: string;
      vereda: string;
      description: string;
      phone: string;
    };
    data.description = data.description.trim();
    data.vereda = data.vereda.trim();
    const errors = validateReport({ ...data, photos: 1 });
    if (
      errors.length ||
      data.description.length > 15000 ||
      data.vereda.length > 120
    )
      throw new ApiError(
        400,
        errors[0] || "El texto supera el límite permitido.",
      );
    // La vereda determina a quién se asigna el caso: solo se acepta del catálogo.
    if (!isCatalogued(data.vereda))
      throw new ApiError(
        400,
        "Selecciona una vereda del catálogo territorial vigente.",
      );
    /* Punto del caso: opcional, pero si viene tiene que ser un par completo y
       caer dentro del marco del territorio. */
    const hasPoint = input.lat !== undefined || input.lng !== undefined;
    if (hasPoint && !isInsideTerritory(input.lat, input.lng))
      throw new ApiError(
        400,
        "La ubicación ajustada queda fuera del territorio del Consejo.",
      );
    const point = hasPoint
      ? { lat: input.lat as number, lng: input.lng as number }
      : null;
    /**
     * De dónde salió ese punto, y con cuánto margen.
     *
     * **No es contabilidad: es lo que impide que el catálogo se muerda la
     * cola.** Con estos datos se deduce después dónde queda una vereda que el
     * catálogo no sitúa, y para eso un punto tocado sobre el mapa no vale: no
     * dice dónde está la vereda, dice dónde está el derrumbe, y sale de un mapa
     * que ya estaba centrado donde lo centró esta aplicación. Contarlo sería
     * medir su propia respuesta.
     *
     * Se guarda lo que diga el cliente sin creérselo para nada que importe: solo
     * decide si este punto cuenta para proponerle algo al Consejo, y el Consejo
     * mira la propuesta antes de aceptarla.
     */
    const pointSource =
      point && (input.pointSource === "aparato" || input.pointSource === "mano")
        ? (input.pointSource as "aparato" | "mano")
        : point
          ? "mano"
          : null;
    const pointAccuracy =
      point &&
      typeof input.pointAccuracy === "number" &&
      Number.isFinite(input.pointAccuracy) &&
      input.pointAccuracy >= 0
        ? Math.round(input.pointAccuracy)
        : null;
    const photo = await validateOriginal(input.photo);
    const id = createHash("sha256")
      .update(`${uid}:${input.requestId}`)
      .digest("hex");
    if (input.sensitive !== undefined && typeof input.sensitive !== "boolean")
      throw new ApiError(400, "Clasificación inválida.");
    const sensitivity = input.sensitive === true ? "sensitive" : "unreviewed";
    const hash = createHash("sha256")
      .update(
        JSON.stringify({ ...data, sensitivity, point, photo: photo.sha256 }),
      )
      .digest("hex");
    const ref = db.doc(`incidents/${id}`),
      intake = db.doc(`incidentIntake/${id}`);
    const evidenceId = await db.runTransaction(async (tx) => {
      const old = (await tx.get(intake)).data();
      if (old) {
        if (old.hash !== hash || old.owner !== uid)
          throw new ApiError(
            409,
            "Este envío ya tiene otro contenido. Recupera el original antes de reintentar.",
          );
        return String(old.evidenceId);
      }
      const limit = db.doc(`incidentLimits/${uid}`),
        previous = (await tx.get(limit)).data();
      const day = new Date().toISOString().slice(0, 10);
      const count = previous?.day === day ? Number(previous.count) || 0 : 0;
      if (count >= 10)
        throw new ApiError(
          429,
          "Has alcanzado 10 envíos nuevos por día (UTC). Puedes reintentar los anteriores.",
        );
      const evidenceId = randomUUID();
      tx.create(intake, {
        owner: uid,
        hash,
        evidenceId,
        state: "pending",
        createdAt: new Date().toISOString(),
      });
      tx.set(limit, { day, count: count + 1 });
      return evidenceId;
    });
    // Ignore duplicates, then verify the stored original before committing a receipt.
    await evidenceRequest("?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        id: evidenceId,
        incident_id: id,
        owner_uid: uid,
        ...photo,
      }),
    });
    const stored = await (
      await evidenceRequest(
        `?id=eq.${evidenceId}&select=sha256,owner_uid,incident_id`,
      )
    ).json();
    if (
      stored[0]?.sha256 !== photo.sha256 ||
      stored[0]?.owner_uid !== uid ||
      stored[0]?.incident_id !== id
    )
      throw new ApiError(
        503,
        "No se pudo verificar la integridad de la fotografía.",
      );
    const receipt = await db.runTransaction(async (tx) => {
      const account = (await tx.get(db.doc(`accounts/${uid}`))).data();
      if (account?.active !== true)
        throw new ApiError(
          403,
          "La cuenta fue desactivada antes de confirmar el envío.",
        );
      const existing = (await tx.get(ref)).data();
      /* Un aviso nulo distingue el recibo repetido del primero, y con eso la
         idempotencia alcanza también al teléfono: reenviar el mismo reporte no
         vuelve a sonar. Se quita de la respuesta más abajo. */
      if (existing) return { id, receivedAt: existing.date, aviso: null };
      const date = new Date().toISOString();
      /* Qué llegó y de dónde. Lo leen el aviso de la bandeja del Consejo y el
         que suena en el teléfono, y por eso se escribe una sola vez. */
      const queYDonde = `${categories.find((c) => c.id === data.category)?.name ?? "Otra situación"} en ${data.vereda}`;
      tx.create(ref, {
        ...data,
        id,
        title: data.description.slice(0, 70),
        owner: uid,
        status: "pendiente",
        priority: DEFAULT_PRIORITY,
        assignee: "",
        date,
        lat: point?.lat ?? null,
        lng: point?.lng ?? null,
        pointSource,
        pointAccuracy,
        /* Lo marcó quien reporta, no el Consejo: sigue sin verificar. */
        locationVerified: false,
        evidenceId,
        version: 1,
        sensitivity,
        publication: "private",
      });
      tx.create(ref.collection("events").doc("received"), {
        type: "received",
        at: date,
        actor: uid,
      });
      tx.create(db.doc(`councilNotifications/${id}-received`), {
        incidentId: id,
        type: "received",
        title: "Nuevo reporte recibido",
        /* Qué llegó y de dónde. El aviso decía que había algo nuevo sin decir
           qué, y para enterarse había que ir a buscarlo a la bandeja. No lleva
           el relato: eso es del expediente, y un aviso no es el sitio. */
        note: queYDonde,
        at: date,
      });
      tx.create(db.doc(`notifications/${uid}/items/${id}-received`), {
        incidentId: id,
        type: "received",
        title: "Tu reporte fue recibido",
        at: date,
        read: false,
      });
      tx.update(intake, { state: "received", receivedAt: date });
      return {
        id,
        receivedAt: date,
        /* El mismo texto que la bandeja, no una copia suya: si cambia lo que
           dice el aviso, cambia en los dos sitios a la vez o en ninguno. */
        aviso: {
          title: "Nuevo reporte recibido",
          body: queYDonde,
          url: `/reporte/${id}/`,
        },
      };
    });
    /* Respaldo de la fotografía junto al expediente, fuera de la transacción y
       sin poder tumbar el recibo: el original ya está guardado y verificado, y
       un envío confirmado no puede deshacerse porque falle una copia.
       Va en documento aparte porque `incidents/{id}` se lista de veinticinco en
       veinticinco en la bandeja del Consejo, y nadie quiere arrastrar ahí
       cientos de kilobytes de imagen por cada fila. */
    void buildBackup(photo.content_base64)
      .then((copia) =>
        copia
          ? db.doc(`incidentEvidence/${id}`).set({
              ...copia,
              incident_id: id,
              owner: uid,
              at: new Date().toISOString(),
            })
          : undefined,
      )
      .catch(() => undefined);
    /* Que el Consejo se entere sin abrir la aplicación. Fuera de la
       transacción y con `void` por lo mismo que el respaldo de la fotografía:
       un recibo confirmado es un recibo confirmado aunque el aviso no salga. Y
       no viaja en la respuesta, que no es asunto de quien reporta. */
    const { aviso, ...recibo } = receipt;
    if (aviso) void avisar(db, { consejo: true }, aviso);
    /**
     * Y el grano de arena para situar la vereda en el mapa.
     *
     * Con `void` y fuera de la transacción por lo mismo que el aviso: seis de
     * las diecinueve veredas del catálogo no tienen punto, y esto es lo que
     * acabará poniéndolas ahí —cuando varios reportes coincidan y el Consejo lo
     * acepte—, pero **es lo menos importante que ocurre en esta petición**. Un
     * recibo confirmado no se deshace porque falle un acumulador.
     *
     * Solo los puntos del aparato dejan rastro; `anotarAporte` descarta el
     * resto sin escribir nada.
     */
    if (point && pointSource && pointAccuracy !== null)
      void anotarAporte(
        db,
        data.vereda,
        {
          lat: point.lat,
          lng: point.lng,
          exactitud: pointAccuracy,
          origen: pointSource,
          cuenta: uid,
        },
        {
          nueva: !isCatalogued(data.vereda),
          /* Si ya está situada, solo se vuelve a molestar al Consejo cuando el
             centro se haya apartado de verdad. */
          yaSituada: veredaReference(data.vereda),
        },
      ).catch(() => undefined);
    return Response.json(recibo, { status: 200, headers });
  } catch (error) {
    return failure(error);
  }
}
export async function GET(request: Request) {
  try {
    const { uid, db } = await requireMember(request);
    const cursor = new URL(request.url).searchParams.get("after");
    if (cursor && !/^[0-9a-f]{64}$/.test(cursor))
      throw new ApiError(400, "Página inválida.");
    let query = db
      .collection("incidents")
      .where("owner", "==", uid)
      .orderBy(FieldPath.documentId())
      .limit(26);
    if (cursor) query = query.startAfter(cursor);
    const docs = (await query.get()).docs;
    const items = docs.slice(0, 25).map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title,
        description: d.description,
        vereda: d.vereda,
        category: d.category,
        status: d.status,
        date: d.date,
        /* El punto que marcó quien reportó. Va porque es suyo y lo está
           pidiendo él: sin esto, su propio reporte no salía en su mapa si lo
           había hecho desde otro teléfono o después de reinstalar. La
           coordenada exacta no sale en la proyección de la comunidad, que es
           otra cosa y otra ruta. */
        lat: typeof d.lat === "number" ? d.lat : null,
        lng: typeof d.lng === "number" ? d.lng : null,
      };
    });
    return Response.json(
      { items, next: docs.length > 25 ? items.at(-1)?.id : null },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
