/**
 * Catálogo de portadas para los comunicados.
 *
 * Cada comunicado se publica con una portada dibujada —un motivo y dos líneas
 * de texto— en vez de una fotografía. Es deliberado: el Consejo publica desde
 * el río, donde subir imágenes cuesta datos, y una portada vectorial pesa
 * nada, se ve igual de nítida en cualquier pantalla y no arrastra derechos de
 * uso de terceros.
 *
 * El administrador elige la portada al publicar. Añadir una nueva es agregar
 * una entrada aquí; los comunicados ya publicados conservan la suya.
 */
export const newsMotifs = [
  "leaf",
  "river",
  "hands",
  "sprout",
  "sun",
  "shield",
] as const;
export type NewsMotif = (typeof newsMotifs)[number];

/** Tono de la portada; se corresponde con los fondos definidos en la hoja de estilos. */
export const newsTones = ["monte", "agua", "arena"] as const;
export type NewsTone = (typeof newsTones)[number];

export type NewsArt = {
  id: string;
  /** Dos líneas cortas; en mayúsculas dentro de la portada. */
  lines: [string, string];
  motif: NewsMotif;
  tone: NewsTone;
  /** Cómo nombrarla en el selector del Consejo. */
  label: string;
};

export const newsArtCatalogue: NewsArt[] = [
  {
    id: "territorio",
    lines: ["NUESTRO", "TERRITORIO"],
    motif: "leaf",
    tone: "monte",
    label: "Nuestro territorio · hoja",
  },
  {
    id: "rio",
    lines: ["NUESTRO RÍO.", "NUESTRA GENTE."],
    motif: "river",
    tone: "agua",
    label: "Nuestro río · corriente",
  },
  {
    id: "voz",
    lines: ["UNA VOZ.", "MUCHAS MANOS."],
    motif: "hands",
    tone: "agua",
    label: "Una voz, muchas manos · manos",
  },
  {
    id: "acciones",
    lines: ["PEQUEÑAS", "ACCIONES."],
    motif: "sprout",
    tone: "arena",
    label: "Pequeñas acciones · brote",
  },
  {
    id: "encuentro",
    lines: ["CRECEMOS", "EN COMUNIDAD."],
    motif: "sun",
    tone: "arena",
    label: "Crecemos en comunidad · sol",
  },
  {
    id: "transparencia",
    lines: ["TRANSPARENCIA", "Y COMUNIDAD."],
    motif: "shield",
    tone: "monte",
    label: "Transparencia y comunidad · resguardo",
  },
];

export const DEFAULT_NEWS_ART = "territorio";

export const findNewsArt = (id: unknown) =>
  newsArtCatalogue.find((art) => art.id === id) ??
  newsArtCatalogue.find((art) => art.id === DEFAULT_NEWS_ART)!;

export const isNewsArt = (value: unknown): value is string =>
  typeof value === "string" &&
  newsArtCatalogue.some((art) => art.id === value);
