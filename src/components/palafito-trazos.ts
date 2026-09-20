/**
 * El palafito, solo los trazos.
 *
 * **Vive aparte del componente para poder viajar a sitios donde no hay React.**
 * La portada de arranque que va dentro del APK es una página suelta, escrita
 * por `scripts/pagina-sin-red.mjs`, y necesita este mismo dibujo: si se copiara
 * allí, el día que alguien retoque una curva habría dos palafitos distintos y
 * el de dentro del archivo solo se vería en el arranque, que es justo donde
 * nadie mira dos veces. Aquí solo hay datos, así que ese guion puede leerlos.
 *
 * **El orden de pintado cuenta la profundidad y no se puede tocar.** De atrás
 * hacia delante: las dos patas de atrás, la ola de arriba —que las tapa—, la
 * casa, las dos patas de delante, y la ola de abajo —que las tapa a ellas—. Así
 * cada pata queda cortada por una ola distinta. Cambiar el orden lo aplana y
 * deja un dibujo plano con dos líneas más claras.
 */

/** Una ola: cuatro arcos de la misma curva que las olas del menú. */
const ola = (y: number) =>
  `M2.6 ${y}c1.55-1.05 3.1-1.05 4.65 0s3.1 1.05 4.65 0 3.1-1.05 4.65 0 3.1 1.05 4.65 0`;

/**
 * Dónde termina cada pata.
 *
 * **En el eje de su ola, ni antes ni después**, y ese punto está medido
 * recorriendo el trazado —no estimado—: la ola ondula, así que cruza cada pata
 * a una altura distinta. Con un largo igual para todas, unas quedaban tapadas y
 * a otras se les veía el final al aire.
 *
 * Y en el eje, no por debajo: el cabo del trazo es redondo y sobresale medio
 * grosor más allá del punto final, así que terminando ahí el cabo llega justo
 * al canto de abajo de la ola y desaparece. Un pelo por encima, para que ningún
 * redondeo deje asomar un píxel.
 */
const PATAS = {
  atras: ["M10.4 15.3V19.04", "M13.6 15.3V17.62"],
  delante: ["M7.7 15.3V21.23", "M16.3 15.3V20.79"],
};

/** Cuánto se apagan las de atrás. Lo que las pone detrás del agua. */
export const OPACIDAD_ATRAS = 0.45;

/** Los trazos, en orden de pintado. `[d, cuál, opacidad]`. */
export const TRAZOS_PALAFITO: Array<[string, "casa" | "agua", number]> = [
  [PATAS.atras[0], "casa", OPACIDAD_ATRAS],
  [PATAS.atras[1], "casa", OPACIDAD_ATRAS],
  [ola(18.4), "agua", 1],
  ["M2.5 11.3 12 3.7l9.5 7.6", "casa", 1],
  ["M6.1 11.2v3.7", "casa", 1],
  ["M17.9 11.2v3.7", "casa", 1],
  ["M4.1 15.1h15.8", "casa", 1],
  [PATAS.delante[0], "casa", 1],
  [PATAS.delante[1], "casa", 1],
  [ola(21), "agua", 1],
];
