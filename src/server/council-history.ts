import type { Firestore } from "firebase-admin/firestore";
import { ApiError } from "./admin-auth";
import {
  mergeHistory,
  validateHistory,
  type HistoryEntry,
} from "@/domain/council-history";

export async function readHistory(db: Firestore, publishedOnly = false) {
  // Leer también los borradores/archivos para que no reaparezca su semilla.
  const result = await db.collection("councilHistory").limit(1001).get();
  if (result.size > 1000)
    throw new ApiError(
      503,
      "El archivo necesita ampliar su paginación. Contacta al responsable técnico.",
    );
  const overrides = result.docs.map((doc) => ({
    id: doc.id,
    ...validateHistory(doc.data()),
  }));
  return mergeHistory(overrides, publishedOnly);
}

/** La ficha pública se arma campo a campo: ni versión, ni estado, ni autor. */
export function publicHistory(items: HistoryEntry[]) {
  return items.map((item) => ({
    id: item.id,
    occurredOn: item.occurredOn,
    time: item.time,
    title: item.title,
    account: item.account,
    period: item.period,
    sources: item.sources,
    qualification: item.qualification,
  }));
}

export function historyFailure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "No se pudo consultar o guardar la historia. Revisa la conexión.",
    },
    {
      status: error instanceof ApiError ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
