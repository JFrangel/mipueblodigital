import type { Case } from "@/data/catalog";
import { resolveVereda, type Catalogue } from "./vereda-catalogue";

/** Las ubicaciones comunitarias siguen al catálogo; el punto propio no se cambia. */
export function locateMapCase(item: Case, catalogue: Catalogue): Case {
  const vereda = resolveVereda(catalogue, item.vereda);
  return {
    ...item,
    vereda: vereda?.name ?? item.vereda,
    ...(item.owner === "community" && catalogue.version > 0 && vereda
      ? { lat: vereda.lat, lng: vereda.lng }
      : {}),
  };
}
