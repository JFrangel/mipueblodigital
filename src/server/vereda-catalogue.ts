import type { Firestore } from "firebase-admin/firestore";
import { seedCatalogue, type Catalogue } from "@/domain/vereda-catalogue";
import { clave } from "@/domain/veredas";
export async function readCatalogue(db: Firestore): Promise<Catalogue> {
  const saved = (
    await db.runTransaction((tx) =>
      tx.get(db.doc("territoryCatalogue/current")),
    )
  ).data() as Catalogue | undefined;
  if (saved) return saved;
  const seed = seedCatalogue();
  // Incorporar decisiones anteriores antes de que exista el catálogo editable.
  const points = await db.collection("veredaPoints").get();
  for (const doc of points.docs) {
    const p = doc.data();
    if (
      typeof p.nombre !== "string" ||
      typeof p.lat !== "number" ||
      typeof p.lng !== "number"
    )
      continue;
    const item = seed.items.find((v) => clave(v.name) === clave(p.nombre));
    if (item)
      Object.assign(item, {
        lat: p.lat,
        lng: p.lng,
        source: "Consejo Comunitario",
      });
    else
      seed.items.push({
        id: clave(p.nombre).replace(/\s+/g, "-"),
        name: p.nombre,
        aliases: [],
        active: true,
        lat: p.lat,
        lng: p.lng,
        source: "Consejo Comunitario",
      });
  }
  return seed;
}
