/**
 * Un cuarto de onda, en los cuatro momentos que tiene. En orden: de la línea a
 * la cresta, de la cresta a la línea, de la línea al seno, y del seno a la
 * línea. Encadenados dan la ola, y **empezando por uno u otro se consigue el
 * desfase sin redibujar nada**.
 *
 * Los puntos de control no están puestos a ojo: salen de la pendiente exacta
 * del seno en cada extremo del tramo —cero en cresta y seno, ±0,72 al cruzar la
 * línea—, que es lo que hace que la curva no se achate en las crestas.
 */
const CUARTOS = [
  "c.77 -.55 1.53 -1.05 2.3 -1.05",
  "c.77 0 1.53 .5 2.3 1.05",
  "c.77 .55 1.53 1.05 2.3 1.05",
  "c.77 0 1.53 -.5 2.3 -1.05",
];

/**
 * Las tres líneas: a qué altura va cada una, por qué cuarto empieza y con qué
 * desnivel arranca respecto a su línea —cero si sale de la línea, ±1,05 si sale
 * de una cresta o de un seno—.
 *
 * La de arriba entra bajando, la del medio sale del seno y la de abajo entra
 * subiendo: un cuarto de onda de diferencia entre cada una y la siguiente.
 */
const LINEAS = [
  { y: 6.8, desde: 2, alto: 0 },
  { y: 12, desde: 3, alto: 1.05 },
  { y: 17.2, desde: 0, alto: 0 },
];

/** Dos ondas enteras por línea: ocho cuartos. */
const TRAMOS = 8;

/**
 * Tres olas, para el botón que abre el menú en el teléfono.
 *
 * **Sigue siendo una hamburguesa.** Son tres trazos horizontales, a la misma
 * altura y con la misma separación que las tres rayas de siempre, y por eso se
 * entiende sin que nadie lo explique: lo que cambia es que ondulan. Un icono de
 * menú que deja de parecer un menú obliga a descubrir a tientas dónde está el
 * resto de la aplicación, y eso no lo compensa ningún dibujo bonito.
 *
 * **Y son agua porque aquí se vive del agua.** El Satinga es la calle del
 * territorio: las veredas se cuentan río arriba y río abajo, y a la mayoría se
 * llega en potrillo. Tres rayas rectas podrían ser de cualquier aplicación del
 * mundo; estas son de este río.
 *
 * **Cada línea va un cuarto de onda por detrás de la de arriba.** Alineadas,
 * las crestas se apilan en columnas y el dibujo se queda quieto, como una tela
 * plegada; escalonadas así, el ojo sigue el agua de una línea a la siguiente.
 * Un cuarto, no media: a media onda la del medio se lee al revés que las otras
 * dos y parece un error de dibujo.
 */
export function Olas({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      /* Algo más fino que los iconos de al lado: con las ondas tan seguidas, a
         dos unidades los trazos se cierran y el dibujo se apelmaza. */
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {LINEAS.map(({ y, desde, alto }) => (
        <path
          key={y}
          d={
            `M2.8 ${y + alto}` +
            Array.from(
              { length: TRAMOS },
              (_, i) => CUARTOS[(desde + i) % CUARTOS.length],
            ).join("")
          }
        />
      ))}
    </svg>
  );
}
