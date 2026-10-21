import { createHash } from "node:crypto";
import { archivePhoto, evidenceRequest, validateOriginal } from "./evidence";
import { ApiError } from "./admin-auth";
export async function archiveEventImage(
  incident: string,
  mutation: string,
  owner: string,
  image: unknown,
) {
  const original = await validateOriginal(image);
  if (original.byte_size > 700_000)
    throw new ApiError(413, "La imagen de la nota supera el tamaño permitido.");
  const photo = await archivePhoto(
    Buffer.from(original.content_base64, "base64"),
  );
  const hash = createHash("sha256")
    .update(`event:${incident}:${mutation}`)
    .digest("hex");
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  await evidenceRequest("?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      ...photo,
      id,
      owner_uid: owner,
      incident_id: incident,
    }),
  });
  const stored = await (
    await evidenceRequest(`?id=eq.${id}&select=sha256,owner_uid,incident_id`)
  ).json();
  if (
    stored[0]?.sha256 !== photo.sha256 ||
    stored[0]?.owner_uid !== owner ||
    stored[0]?.incident_id !== incident
  )
    throw new ApiError(
      409,
      "La imagen no coincide con la actuación. Conserva los datos y reintenta.",
    );
  return { imageId: id, imageHash: photo.sha256 };
}
