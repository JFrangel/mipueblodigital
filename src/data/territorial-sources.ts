/** Historical evidence, not a certified current operational catalogue. */
export const historicalVeredas = [
  "Alto Merizalde",
  "Las Marías",
  "Cañas",
  "José",
  "Las Mercedes",
  "San Isidro",
  "Barro Caliente",
  "Bellavista",
  "Pueblo Nuevo",
  "Travesía",
  "El Cedro",
  "La Victoria",
  "Merizalde Porvenir",
  "Los Leyos",
  "Bajo Merizalde",
  "Víbora Paraíso",
  "Boca de Víbora",
  "Codemaco",
];
export const territorialSources = {
  eot: "https://repositoriocdim.esap.edu.co/bitstreams/73366870-71c2-4050-82fe-873f691e287c/download",
  culture:
    "https://redaprende.colombiaaprende.edu.co/metadatos/recurso/territorios-narrados-titulo-28-las-marias/",
};

/**
 * Puntos de referencia de las localidades del territorio.
 *
 * No todos merecen la misma confianza, y por eso cada uno declara de dónde
 * sale. La diferencia importa: una coordenada del DANE tiene código y acto
 * administrativo detrás; la de una escuela rural es una inferencia razonable
 * —el centro educativo lleva el nombre de su vereda y está en ella— pero
 * inferencia al fin.
 *
 * Ninguno es la ubicación de una incidencia ni un límite veredal. Ver
 * docs/investigacion-coordenadas-veredas.md para el detalle de cada fuente.
 */
export type LocalityKind =
  /** DANE o ANT: código oficial y acto administrativo. */
  | "oficial"
  /** Cartografía abierta (OpenStreetMap): plausible, sin respaldo estatal. */
  | "abierta"
  /** Deducido de la escuela rural que lleva el nombre de la vereda. */
  | "escuela";

export type LocalityReference = {
  name: string;
  lat: number;
  lng: number;
  source: string;
  kind: LocalityKind;
};

export const localityReferences: LocalityReference[] = [
  {
    name: "Boca de Víbora",
    lat: 2.339981,
    lng: -78.309402,
    kind: "oficial",
    source:
      "https://geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_CentrosPoblados.xlsx",
  },
  {
    name: "Lérida Las Marías",
    lat: 2.28328,
    lng: -78.25426,
    kind: "abierta",
    source: "https://mapcarta.com/fr/29623256",
  },
  {
    name: "Barro Caliente",
    lat: 2.21071,
    lng: -78.23532,
    kind: "abierta",
    source: "https://mapcarta.com/29623338",
  },
  {
    name: "Bellavista",
    lat: 2.2356,
    lng: -78.24741,
    kind: "abierta",
    source: "https://mapcarta.com/29623344",
  },
  {
    name: "Travesía",
    lat: 2.27432,
    lng: -78.26755,
    kind: "abierta",
    source: "https://www.openstreetmap.org/#map=15/2.27432/-78.26755",
  },
  {
    name: "El Cedro",
    lat: 2.29916,
    lng: -78.24719,
    kind: "abierta",
    source: "https://www.openstreetmap.org/#map=15/2.29916/-78.24719",
  },
  {
    name: "Merizalde Porvenir",
    lat: 2.34263,
    lng: -78.27183,
    kind: "abierta",
    source: "https://www.openstreetmap.org/#map=15/2.34263/-78.27183",
  },
  {
    name: "Alto Merizalde",
    lat: 2.33895,
    lng: -78.28002,
    kind: "escuela",
    source: "https://www.openstreetmap.org/#map=16/2.33895/-78.28002",
  },
  {
    name: "Bajo Merizalde",
    lat: 2.34823,
    lng: -78.28181,
    kind: "escuela",
    source: "https://www.openstreetmap.org/#map=16/2.34823/-78.28181",
  },
  {
    name: "Víbora Paraíso",
    lat: 2.3393,
    lng: -78.30691,
    kind: "escuela",
    source: "https://www.openstreetmap.org/#map=16/2.3393/-78.30691",
  },
  {
    name: "Codemaco",
    lat: 2.35365,
    lng: -78.32148,
    kind: "escuela",
    source: "https://www.openstreetmap.org/#map=16/2.35365/-78.32148",
  },
  {
    name: "San Isidro",
    lat: 2.19907,
    lng: -78.20389,
    kind: "abierta",
    source: "https://mapcarta.com/29623258",
  },
];

/** DANE, DIVIPOLA 52490000, clase CM. No es una vereda del título colectivo. */
export const municipalSeat: LocalityReference = {
  name: "Bocas de Satinga",
  lat: 2.347457,
  lng: -78.325814,
  kind: "oficial",
  source:
    "https://geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_CentrosPoblados.xlsx",
};

/**
 * Título colectivo del Consejo Comunitario del Río Satinga.
 *
 * Resolución 3292 del 18 de diciembre de 2000, 24 507,04 ha, municipio 52490.
 * La extensión sale del polígono publicado por la Agencia Nacional de Tierras.
 */
export const collectiveTitle = {
  resolution: "Resolución 3292 del 18 de diciembre de 2000",
  hectares: 24507.04,
  divipola: "52490",
  bounds: { south: 2.06451, north: 2.37358, west: -78.32801, east: -78.17089 },
  source: "https://geoportal.ant.gov.co/",
};
