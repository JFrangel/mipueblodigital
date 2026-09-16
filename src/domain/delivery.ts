import type { Case } from "@/data/catalog";

/**
 * En qué punto del camino está un reporte guardado en el dispositivo.
 *
 * Son tres cosas distintas que la aplicación venía enseñando como una sola, y
 * confundirlas tiene consecuencias: un borrador no sale nunca solo, y uno que
 * espera señal sale sí o sí en cuanto haya red. Quien reportó necesita saber en
 * cuál de las dos está antes de irse tranquilo.
 *
 * El borrador no aparece aquí porque no es un reporte todavía: vive aparte, en
 * su propio almacén, y solo hay uno por cuenta.
 */
export type Delivery = "enviado" | "en-cola" | "sin-enviar";

export function deliveryOf(item: Pick<Case, "id" | "delivery">): Delivery {
  if (item.delivery) return item.delivery;
  /* Registros de versiones anteriores, que no llevan la marca. El
     identificador es lo único que los separa: el servidor devuelve el suyo al
     recibir, así que un «LOCAL-» es un reporte que nunca tuvo recibo. */
  return item.id.startsWith("LOCAL-") ? "sin-enviar" : "enviado";
}

export const deliveryLabel: Record<Delivery, string> = {
  enviado: "Enviado",
  /* «En la bandeja de salida» nombra el sitio; lo que hace falta saber de un
     vistazo es qué está pasando, y lo que pasa es que espera señal. */
  "en-cola": "Esperando señal",
  "sin-enviar": "Sin enviar",
};

export const deliveryNote: Record<Delivery, string> = {
  enviado: "El Consejo lo recibió y tiene su expediente.",
  "en-cola":
    "Ya lo enviaste: está esperando señal y saldrá solo en cuanto haya red. No hace falta que hagas nada.",
  "sin-enviar":
    "Este reporte se guardó en el dispositivo pero nunca llegó al Consejo. Retómalo para revisarlo y enviarlo.",
};
