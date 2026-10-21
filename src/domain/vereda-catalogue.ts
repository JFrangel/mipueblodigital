import { veredaCatalogue, isInsideTerritory } from "./territory";
import { clave } from "./veredas";

export type CatalogueItem = {
  id: string;
  name: string;
  aliases: string[];
  active: boolean;
  lat?: number;
  lng?: number;
  source?: string;
};
export type Catalogue = {
  version: number;
  items: CatalogueItem[];
  validated?: { version: number; at: string; actor: string };
};
export function seedCatalogue(): Catalogue {
  return {
    version: 0,
    items: veredaCatalogue.map((v) => ({
      id: clave(v.name).replace(/\s+/g, "-"),
      name: v.name,
      aliases: [],
      active: true,
      ...(v.lat !== undefined && v.lng !== undefined
        ? { lat: v.lat, lng: v.lng }
        : {}),
      ...(v.source ? { source: v.source } : {}),
    })),
  };
}
export function changeCatalogue(
  old: Catalogue,
  input: Record<string, unknown>,
  actor: string,
  at: string,
): Catalogue {
  if (input.action === "validate")
    return { ...old, validated: { version: old.version, actor, at } };
  const id = String(input.id ?? "");
  if (!/^[\w-]{1,120}$/.test(id))
    throw new Error("Identificador de vereda inválido.");
  const items = old.items.map((v) => ({ ...v, aliases: [...v.aliases] }));
  const previous = items.find((v) => v.id === id);
  if (input.action === "remove") {
    if (!previous) throw new Error("La vereda ya no existe.");
    previous.active = false;
  } else if (input.action === "save") {
    const name =
      typeof input.name === "string"
        ? input.name.trim().replace(/\s+/g, " ")
        : "";
    if (name.length < 2 || name.length > 120)
      throw new Error("Escribe un nombre de 2 a 120 caracteres.");
    if (
      items.some(
        (v) =>
          v.id !== id &&
          [v.name, ...v.aliases].some((n) => clave(n) === clave(name)),
      )
    )
      throw new Error("Ya existe una vereda con ese nombre o nombre anterior.");
    const hasPoint = input.lat != null || input.lng != null;
    if (hasPoint && !isInsideTerritory(input.lat, input.lng))
      throw new Error("Señala un punto dentro del territorio.");
    const item: CatalogueItem = {
      id,
      name,
      active: true,
      aliases: previous?.aliases ?? [],
      ...(hasPoint
        ? {
            lat: input.lat as number,
            lng: input.lng as number,
            source: "Consejo Comunitario",
          }
        : {}),
    };
    if (previous && previous.name !== name)
      item.aliases = [...new Set([...item.aliases, previous.name])];
    if (previous) items[items.indexOf(previous)] = item;
    else items.push(item);
  } else throw new Error("Acción de catálogo inválida.");
  if (items.length > 500)
    throw new Error("El catálogo admite hasta 500 localidades.");
  return { ...old, version: old.version + 1, items };
}

export function resolveVereda(catalogue: Catalogue, name: string) {
  return catalogue.items.find((v) =>
    [v.name, ...v.aliases].some((n) => clave(n) === clave(name)),
  );
}
