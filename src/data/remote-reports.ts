import { firebaseClient } from "./firebase/client";
export type ReportPayload = {
  category: string;
  vereda: string;
  description: string;
  phone: string;
  photo: string;
  sensitive: boolean;
  /** Punto ajustado a mano sobre el mapa; ausente si se dejó el de la vereda. */
  lat?: number;
  lng?: number;
};
export class DeliveryError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function memberHeaders(expectedUid?: string) {
  const { auth } = firebaseClient();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || (expectedUid && user.uid !== expectedUid))
    throw new DeliveryError(
      401,
      "Inicia sesión con la cuenta que preparó este reporte.",
    );
  return {
    uid: user.uid,
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    },
  };
}
export async function sendReport(
  payload: ReportPayload,
  requestId: string,
  owner: string,
) {
  const { headers } = await memberHeaders(owner);
  const response = await fetch("/api/incidents/", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, requestId }),
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new DeliveryError(
      response.status,
      result.error || "No se pudo confirmar el envío.",
    );
  if (typeof result.id !== "string" || typeof result.receivedAt !== "string")
    throw new Error("El servidor no devolvió un recibo válido.");
  return result as { id: string; receivedAt: string };
}
