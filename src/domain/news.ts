import { DEFAULT_NEWS_ART, isNewsArt } from "./news-art";
import { maxSayingLength } from "./signature";
export const newsKinds = ["Encuentro", "Boletín", "Alerta"] as const;
export type News = {
  id: string;
  title: string;
  body: string;
  kind: string;
  status: "draft" | "published" | "archived";
  version: number;
  publishedAt: string | null;
  pinned?: boolean;
  /** Identificador de portada del catálogo; ver domain/news-art. */
  art?: string;
  /**
   * Marca de la portada fotográfica, si la hay.
   *
   * La imagen no está aquí: vive en `newsCovers/{id}` y se sirve por la
   * aplicación. Este campo solo dice que existe y cambia al reemplazarla, para
   * que el navegador pida la nueva. Lo escribe su propia ruta, nunca el
   * editor, y por eso `validateNews` no lo toca.
   */
  cover?: string | null;
  /** Frase manuscrita que firma el comunicado; vacía usa la del repertorio. */
  saying?: string;
};
export function validateNews(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Comunicado inválido.");
  const n = input as Record<string, unknown>;
  if (
    typeof n.title !== "string" ||
    n.title.trim().length < 5 ||
    n.title.trim().length > 140
  )
    throw new Error("El título debe tener entre 5 y 140 caracteres.");
  if (
    typeof n.body !== "string" ||
    n.body.trim().length < 20 ||
    n.body.trim().length > 5000
  )
    throw new Error("El contenido debe tener entre 20 y 5000 caracteres.");
  if (!newsKinds.includes(n.kind as (typeof newsKinds)[number]))
    throw new Error("Selecciona un tipo de comunicado.");
  if (!["draft", "published", "archived"].includes(String(n.status)))
    throw new Error("Estado de publicación inválido.");
  if (!Number.isSafeInteger(n.version) || Number(n.version) < 0)
    throw new Error("Versión inválida.");
  if (n.art !== undefined && !isNewsArt(n.art))
    throw new Error("Selecciona una portada del catálogo.");
  /* La firma es opcional: en blanco, el comunicado toma la del repertorio. */
  if (
    n.saying !== undefined &&
    n.saying !== null &&
    (typeof n.saying !== "string" || n.saying.trim().length > maxSayingLength)
  )
    throw new Error(
      `La frase de la firma no puede pasar de ${maxSayingLength} caracteres.`,
    );
  return {
    art: isNewsArt(n.art) ? n.art : DEFAULT_NEWS_ART,
    saying: typeof n.saying === "string" ? n.saying.trim() : "",
    pinned: n.pinned === true,
    title: n.title.trim(),
    body: n.body.trim(),
    kind: String(n.kind),
    status: n.status as News["status"],
    version: Number(n.version),
  };
}
