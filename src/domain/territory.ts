import {
  collectiveTitle,
  historicalVeredas,
  localityReferences,
  municipalSeat,
  type LocalityKind,
} from "@/data/territorial-sources";

/**
 * Catálogo territorial del Gran Consejo Comunitario Río Satinga (HU-07).
 *
 * Las veredas provienen del EOT de 2007 y del recurso «Territorios Narrados»;
 * las coordenadas, de referencias abiertas. Ninguna de las dos fuentes ha sido
 * ratificada todavía por el Consejo, así que el catálogo se marca como
 * pendiente y la interfaz debe decirlo con todas sus letras. Cuando exista acta
 * de validación, basta cambiar `validated` y añadir las coordenadas oficiales:
 * los reportes ya guardados siguen siendo válidos porque referencian el nombre.
 */
export type Vereda = {
  /** Nombre tal como debe mostrarse y guardarse en el expediente. */
  name: string;
  /** Punto de referencia aproximado, cuando existe fuente pública. */
  lat?: number;
  lng?: number;
  source?: string;
  /** Qué respalda ese punto; ver LocalityKind. */
  kind?: LocalityKind;
};

export const catalogueValidated = false;

export const catalogueNotice = catalogueValidated
  ? "Catálogo validado por el Consejo Comunitario."
  : "Catálogo documentado a partir del EOT de 2007 y de fuentes abiertas. Está pendiente de validación por el Consejo Comunitario: los nombres pueden cambiar y los puntos son aproximados.";

export const veredaCatalogue: Vereda[] = [
  ...historicalVeredas.map((name) => {
    const reference = localityReferences.find(
      (locality) =>
        locality.name === name || locality.name.endsWith(` ${name}`),
    );
    return reference
      ? {
          name,
          lat: reference.lat,
          lng: reference.lng,
          source: reference.source,
          kind: reference.kind,
        }
      : { name };
  }),
  municipalSeat,
].sort((a, b) => a.name.localeCompare(b.name, "es"));

export const veredaNames = veredaCatalogue.map((v) => v.name);

export const localityLabel = (name: string) =>
  name === municipalSeat.name
    ? `${name} · cabecera municipal de Olaya Herrera`
    : name;
export const localitySearchText = (name: string) => localityLabel(name);

/** Un punto de referencia solo se usa si la fuente lo documenta. */
export function veredaReference(name: string) {
  const match = veredaCatalogue.find((v) => v.name === name);
  return match?.lat !== undefined && match.lng !== undefined
    ? {
        lat: match.lat,
        lng: match.lng,
        source: match.source,
        kind: match.kind,
      }
    : null;
}

export const isCatalogued = (name: string) => veredaNames.includes(name);

/**
 * Marco de la cuenca del Satinga. Un punto ajustado a mano solo se acepta si
 * cae aquí dentro: evita que una coordenada equivocada —o manipulada— sitúe un
 * caso en otro territorio.
 *
 * Sale del polígono del título colectivo publicado por la Agencia Nacional de
 * Tierras, ensanchado unos veinte kilómetros por lado. El margen es
 * deliberado: **el territorio de uso desborda el título**. La gente pesca,
 * siembra y transita fuera del polígono, y un reporte en ese margen sigue
 * siendo del río.
 *
 * El marco anterior (1,5–3,2 N, −79,2 a −77,2 O) abarcaba unas setenta veces
 * esta área y admitía un punto a ciento cincuenta kilómetros.
 *
 * **El borde norte llega a 2,62 y no a 2,55, y eso se midió.** El contorno del
 * municipio de Olaya Herrera —OpenStreetMap, relación 1311681, `admin_level=6`,
 * 1.929 vértices— sube hasta 2,60209 N. Con el borde en 2,55 quedaban fuera
 * unos 146 km² de la esquina norte del municipio, hacia el Pacífico: ninguna
 * vereda conocida está allí, pero es exactamente donde estaría una que no
 * conocemos, y el marco decide qué reportes se aceptan.
 *
 * **Y por eso sigue siendo un rectángulo y no el polígono del municipio.** Al
 * cruzar las fuentes aparece que el DANE sitúa Pueblo Nuevo —una de las
 * dieciocho veredas del Consejo— en −78,4514, al oeste del borde municipal: en
 * Mosquera. El territorio del Consejo **no coincide con el municipio**, así que
 * validar contra el contorno municipal dejaría fuera una vereda propia. Un
 * rectángulo generoso admite las dos cosas; un polígono exacto tendría que
 * elegir, y elegiría mal.
 *
 * Con estos cuatro números el marco cubre el municipio entero con margen, el
 * título colectivo, y las doce localidades del catálogo con al menos veinte
 * kilómetros de holgura cada una.
 */
export const territoryBounds = {
  south: 1.9,
  north: 2.62,
  west: -78.5,
  east: -78.0,
};

/**
 * Dónde abre un mapa que no tiene un punto propio al que ir.
 *
 * Es el centro del título colectivo, **no el casco urbano**: con la vista fija
 * en Bocas de Satinga, las veredas del tramo bajo del río quedaban fuera de
 * pantalla y nadie sabía que existían. El acercamiento deja ver el río entero,
 * que es lo que hace falta cuando alguien va a buscar su sitio a mano.
 */
export const territoryCentre = { lat: 2.2068, lng: -78.2287, zoom: 11 };

/** El título colectivo tal como lo publica la ANT, para citarlo en la interfaz. */
export { collectiveTitle };

export function isInsideTerritory(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= territoryBounds.south &&
    lat <= territoryBounds.north &&
    lng >= territoryBounds.west &&
    lng <= territoryBounds.east
  );
}
