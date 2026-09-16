/**
 * Formato de los comunicados del Consejo (HU-08, HU-21).
 *
 * Quien redacta en el Consejo no escribe HTML: escribe en un cuadro de texto y
 * marca lo importante con signos que también se entienden al leerlos en crudo.
 * Ese texto viaja tal cual a la base de datos, así que el mismo comunicado se
 * puede releer, corregir o exportar sin arrastrar etiquetas.
 *
 * Al mostrarlo no se inyecta HTML en ningún momento: este módulo devuelve una
 * estructura y la interfaz la convierte en elementos. Un comunicado nunca puede
 * traer marcado que la aplicación ejecute.
 */

export type Span = { text: string; bold?: boolean; italic?: boolean };

export type Block =
  | { kind: "heading"; spans: Span[] }
  | { kind: "paragraph"; spans: Span[] }
  | { kind: "quote"; spans: Span[] }
  | { kind: "list"; items: Span[][] };

/** Marcas que el editor inserta y el lector interpreta. */
export const newsMarks = {
  bold: "**",
  italic: "_",
  heading: "## ",
  item: "- ",
  quote: "> ",
} as const;

const INLINE = /(\*\*[^*\n]+\*\*|_[^_\n]+_)/g;
const HEADING = /^#{1,3}\s+/;
const ITEM = /^[-•*]\s+/;
const QUOTE = /^>\s?/;

/** Negrita y cursiva dentro de una línea. No se anidan: el texto manda. */
export function spansOf(text: string): Span[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((piece) => {
      if (piece.length > 4 && piece.startsWith("**") && piece.endsWith("**"))
        return { text: piece.slice(2, -2), bold: true };
      if (piece.length > 2 && piece.startsWith("_") && piece.endsWith("_"))
        return { text: piece.slice(1, -1), italic: true };
      return { text: piece };
    });
}

function blockOf(text: string): Block {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.every((line) => ITEM.test(line)))
    return {
      kind: "list",
      items: lines.map((line) => spansOf(line.replace(ITEM, ""))),
    };
  if (lines.every((line) => QUOTE.test(line)))
    return {
      kind: "quote",
      spans: spansOf(lines.map((line) => line.replace(QUOTE, "")).join(" ")),
    };
  if (HEADING.test(text))
    return { kind: "heading", spans: spansOf(text.replace(HEADING, "")) };
  /* Los comunicados anteriores a las marcas no llevan «##»: una línea corta,
     suelta y sin punto final sigue siendo un apartado y se respeta como tal. */
  if (lines.length === 1 && text.length <= 60 && !/[.:;?!]$/.test(text))
    return { kind: "heading", spans: spansOf(text) };
  return { kind: "paragraph", spans: spansOf(text) };
}

/**
 * Un comunicado largo llega con apartados separados por línea en blanco.
 * Distinguirlos es lo que hace legible un texto de varias pantallas.
 */
export function parseNewsBody(body: string): Block[] {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(blockOf);
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Los apartados de un comunicado, con un ancla estable para cada uno.
 *
 * Es el índice del documento: lo que permite saber de qué trata un comunicado
 * de varias pantallas sin recorrerlo entero, y saltar al apartado que importa.
 * El índice sale del propio texto, así que nunca queda desfasado respecto a lo
 * que el Consejo escribió.
 */
export function newsOutline(body: string) {
  const seen = new Map<string, number>();
  return parseNewsBody(body).flatMap((block, index) => {
    if (block.kind !== "heading") return [];
    const text = block.spans.map((span) => span.text).join("");
    const base = slug(text) || `apartado-${index}`;
    /* Dos apartados con el mismo nombre no pueden compartir ancla. */
    const repeat = (seen.get(base) ?? 0) + 1;
    seen.set(base, repeat);
    return [{ index, text, id: repeat > 1 ? `${base}-${repeat}` : base }];
  });
}

/** El texto sin marcas, para los resúmenes del feed y los avisos. */
export const plainNewsBody = (body: string) =>
  body
    .replace(HEADING, "")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^[-•*>]\s+/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1");
