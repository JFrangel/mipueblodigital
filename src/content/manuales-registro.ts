import type { Manual } from "./manuales";
import { manualCiudadano } from "./manual-ciudadano";
import { manualConsejo } from "./manual-consejo";

/**
 * Los manuales que existen.
 *
 * Solo lo importan quienes corren en el servidor o en pruebas: la ruta que
 * imprime, el volcado a Markdown y las comprobaciones. **El navegador nunca lo
 * carga entero**, porque llevaría el contenido de los dos manuales a quien
 * solo abre uno; cada página importa el suyo.
 */
export const manuales: Record<Manual["id"], Manual> = {
  ciudadano: manualCiudadano,
  consejo: manualConsejo,
};

/** Dónde queda el PDF de un manual una vez generado. */
export const archivoPdf = (id: Manual["id"]) => `/manuales/manual-${id}.pdf`;
