import { ApiError, requireAdmin } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { clave } from "@/domain/veredas";
import { isInsideTerritory, veredaNames } from "@/domain/territory";
import { pendientes, type Acumulado } from "@/server/veredas";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

/**
 * Dónde el Consejo sitúa las veredas que el catálogo no sitúa.
 *
 * Seis de las diecinueve no tienen punto documentado. Los reportes de quien
 * está allí van dejando su coordenada, y cuando varias coinciden esta ruta le
 * pone la propuesta delante al Consejo: cuántos reportes, de cuántas cuentas y
 * cómo de repartidos. **Aquí no se acepta nada solo.** El catálogo territorial
 * de un consejo comunitario no lo edita una media.
 *
 * Lo que sale hacia el panel es el punto propuesto y sus cifras. **Las
 * coordenadas de cada reporte no salen**: el Consejo puede verlas una a una en
 * su bandeja si le hacen falta, pero esta pantalla no tiene por qué ser un mapa
 * de por dónde anduvo la gente.
 */

/** Lo que ve el panel. Nótese lo que no lleva: los aportes. */
type Propuesta = {
  clave: string;
  nombre: string;
  nueva: boolean;
  lat: number;
  lng: number;
  aportes: number;
  cuentas: number;
  dispersion: number;
  apartados: number;
  disperso: boolean;
  actualizado: string;
};

const aPropuesta = (a: Acumulado): Propuesta | null =>
  a.propuesta
    ? {
        clave: clave(a.nombre),
        nombre: a.nombre,
        nueva: a.nueva,
        lat: a.propuesta.lat,
        lng: a.propuesta.lng,
        aportes: a.propuesta.aportes,
        cuentas: a.propuesta.cuentas,
        dispersion: a.propuesta.dispersion,
        apartados: a.propuesta.apartados,
        disperso: a.propuesta.disperso,
        actualizado: a.actualizado,
      }
    : null;

export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    const items = (await pendientes(db))
      .map(aPropuesta)
      .filter((p): p is Propuesta => p !== null)
      /* Lo más sostenido primero: una propuesta con ocho reportes de cinco
         personas merece la atención antes que una con los tres mínimos. */
      .sort((a, b) => b.cuentas - a.cuentas || b.aportes - a.aportes);
    return Response.json({ items }, { headers });
  } catch (e) {
    return fallo(e);
  }
}

export async function POST(request: Request) {
  try {
    const { uid: actor, db } = await requireAdmin(request);
    const input = (await readJson(request, 2000)) as {
      clave?: unknown;
      accion?: unknown;
      lat?: unknown;
      lng?: unknown;
      nombre?: unknown;
      motivo?: unknown;
    };
    const llave = String(input?.clave ?? "").trim();
    if (!llave || llave.length > 120)
      throw new ApiError(400, "Falta la vereda.");
    const accion = input?.accion;
    if (accion !== "aceptar" && accion !== "descartar" && accion !== "fundir")
      throw new ApiError(400, "Indica qué hacer con la propuesta.");

    const ref = db.doc(`veredaProposals/${llave}`);
    const acumulado = (await ref.get()).data() as Acumulado | undefined;
    if (!acumulado?.propuesta)
      throw new ApiError(404, "Esa propuesta ya no existe.");

    const at = new Date().toISOString();

    if (accion === "descartar") {
      const motivo = String(input?.motivo ?? "").trim();
      /* Con motivo, y no por formalidad: descartar apaga esta vereda para
         siempre —los reportes siguientes ya no la vuelven a proponer— y dentro
         de un año alguien va a preguntar por qué. */
      if (motivo.length < 3 || motivo.length > 300)
        throw new ApiError(400, "Escribe por qué se descarta.");
      await ref.set({ estado: "descartada", motivo, actor, at }, { merge: true });
      await registrar(db, { accion, llave, actor, at, motivo });
      return Response.json({ ok: true }, { headers });
    }

    if (accion === "fundir") {
      /**
       * Era otra vereda escrita de otra manera.
       *
       * Reescribir los reportes es la mitad que importa: sin eso el catálogo
       * queda limpio y los datos siguen teniendo tres «bellavistas», que es
       * exactamente el problema que se venía a evitar.
       */
      const destino = String(input?.nombre ?? "").trim();
      if (!veredaNames.includes(destino))
        throw new ApiError(400, "Elige una vereda del catálogo.");
      const movidos = await reescribir(db, acumulado.nombre, destino);
      await ref.set(
        { estado: "descartada", motivo: `Fundida con ${destino}`, actor, at },
        { merge: true },
      );
      await registrar(db, { accion, llave, actor, at, destino, movidos });
      return Response.json({ ok: true, movidos }, { headers });
    }

    /* Aceptar. El punto puede venir ajustado a mano: el Consejo conoce el
       territorio mejor que la mediana de cinco teléfonos. */
    const aMano =
      typeof input?.lat === "number" && typeof input?.lng === "number";
    if (aMano && !isInsideTerritory(input.lat, input.lng))
      throw new ApiError(400, "Ese punto cae fuera de la cuenca del Satinga.");
    const lat = aMano ? (input.lat as number) : acumulado.propuesta.lat;
    const lng = aMano ? (input.lng as number) : acumulado.propuesta.lng;

    await db.doc(`veredaPoints/${llave}`).set({
      nombre: acumulado.nombre,
      lat,
      lng,
      /* Distinta de «DANE» y de «cartografía abierta»: cuando esta vereda salga
         en el formulario de un reporte, su nota dirá de dónde vino el punto. */
      fuente: aMano ? "consejo" : "comunidad",
      aportes: acumulado.propuesta.aportes,
      aceptadoPor: actor,
      aceptadoEn: at,
    });
    await ref.set({ estado: "aceptada", actor, at }, { merge: true });
    await registrar(db, { accion, llave, actor, at, lat, lng, aMano });
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    return fallo(e);
  }
}

/**
 * Cambia de vereda los reportes de un nombre a otro.
 *
 * Por lotes y con tope, como el resto de los barridos de este servidor: una
 * consulta sin límite sobre una colección que crece es una petición que un día
 * no termina.
 */
async function reescribir(
  db: FirebaseFirestore.Firestore,
  de: string,
  a: string,
): Promise<number> {
  let movidos = 0;
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const page = await db
      .collection("incidents")
      .where("vereda", "==", de)
      .limit(50)
      .get();
    if (page.empty) break;
    const lote = db.batch();
    for (const doc of page.docs)
      lote.update(doc.ref, { vereda: a, veredaProposed: false });
    await lote.commit();
    movidos += page.size;
    if (page.size < 50) break;
  }
  return movidos;
}

/** Cada decisión deja constancia, igual que cada cambio de rol. */
const registrar = (
  db: FirebaseFirestore.Firestore,
  evento: Record<string, unknown>,
) => db.collection("veredaPointEvents").add(evento);

function fallo(e: unknown) {
  return Response.json(
    {
      error:
        e instanceof ApiError ? e.message : "No se pudo atender la propuesta.",
    },
    { status: e instanceof ApiError ? e.status : 503, headers },
  );
}
