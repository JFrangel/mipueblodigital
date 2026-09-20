/**
 * La marca de Mi Pueblo Digital, en un solo sitio.
 *
 * Es el palafito: la casa levantada sobre el agua. El icono del cajón del
 * teléfono, el de la pestaña del navegador, el de la pantalla de inicio de quien
 * instala desde la web, el de la barra de estado y el de la pantalla de
 * arranque. Se eligió porque a cuarenta y ocho píxeles, compitiendo en el cajón
 * con decenas de aplicaciones, ninguna otra es una casa sobre pilotes — y
 * porque es lo que esto es: en el Satinga se vive sobre el agua.
 *
 * **Vive aquí y no en cada guion** porque son dos los que lo dibujan, el de
 * Android y el de la web, y dos copias de unos trazos es garantizar que un día
 * el teléfono y el navegador enseñen marcas distintas. Y los trazos ni siquiera
 * están aquí: se leen de `src/components/palafito-trazos.ts`, que es la misma
 * fuente que usa la aplicación.
 *
 * La hoja ya no está en ninguna parte: fue la marca y fue la A de «DIGITAL» en
 * el rótulo, y las dos cosas pasaron al palafito o volvieron a ser letra. Sus
 * trazos se quitaron de aquí el día que dejaron de dibujarse en algún sitio;
 * quien los quiera de vuelta, están en el historial.
 */
import { trazosPalafito } from "./palafito.mjs";

/** El verde de la casa, sobre el fondo azul del icono. */
export const VERDE = "#9be49c";

/**
 * El azul del agua: el mismo que usa la aplicación (#4a86b8), con la claridad
 * que pide un fondo oscuro. No es un azul nuevo, es el mismo tono más claro.
 *
 * Es lo que separa la casa del río dentro del dibujo. En un solo color, a
 * tamaño de icono las olas se leerían como tres rayas más de la casa.
 */
export const AZUL = "#83b9e0";

/**
 * Las tres olas, las mismas del botón del menú.
 *
 * Salen de `src/components/olas.tsx` trazo por trazo: un cuarto de onda cada
 * tramo —de la línea a la cresta, de la cresta a la línea, de la línea al seno,
 * del seno a la línea— encadenados de a ocho, y cada línea empezando por un
 * cuarto distinto, que es lo que las escalona sin que ninguna quede al revés.
 *
 * **Van más gruesas que en el botón.** Allí miden veintidós píxeles en pantalla
 * y 1,8 basta; aquí el dibujo se estira a cuarenta y ocho o a ciento noventa y
 * dos, y a ese tamaño un trazo fino se vuelve un rayado de tres pelos que a
 * cuarenta y ocho dedos de distancia no se lee como agua.
 */
const CUARTOS = [
  "c.77 -.55 1.53 -1.05 2.3 -1.05",
  "c.77 0 1.53 .5 2.3 1.05",
  "c.77 .55 1.53 1.05 2.3 1.05",
  "c.77 0 1.53 -.5 2.3 -1.05",
];

const LINEAS = [
  { y: 6.8, desde: 2, alto: 0 },
  { y: 12, desde: 3, alto: 1.05 },
  { y: 17.2, desde: 0, alto: 0 },
];

export const OLAS = LINEAS.map(
  ({ y, desde, alto }) =>
    `M2.8 ${y + alto}` +
    Array.from({ length: 8 }, (_, i) => CUARTOS[(desde + i) % 4]).join(""),
);

export const olas = (color = AZUL, grosor = 2.6) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke="${color}" stroke-width="${grosor}" stroke-linecap="round">
  ${OLAS.map((d) => `<path d="${d}"/>`).join("")}
</svg>`;

/**
 * `[d, color, opacidad]`, en orden de pintado.
 *
 * **El orden es la profundidad**: patas de atrás, ola de arriba —que las tapa—,
 * casa, patas de delante, ola de abajo. Cambiarlo deja un dibujo plano.
 *
 * **Los trazos no están escritos aquí: se leen.** Eran una copia —la cuarta— de
 * las mismas curvas que dibuja la aplicación, y el día que alguien retocara una
 * el teléfono habría enseñado dos casas distintas. Vienen de
 * `src/components/palafito-trazos.ts`, que es de donde las leen también la web,
 * la portada del archivo y la pantalla de arranque de Android.
 */
export const palafitoTrazos = (color = VERDE, agua = AZUL) =>
  trazosPalafito().map(([d, cual, opacidad]) => [
    d,
    cual === "agua" ? agua : color,
    opacidad,
  ]);

export const palafito = (color = VERDE, grosor = 1.8, agua = AZUL) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round">
  ${palafitoTrazos(color, agua)
    .map(([d, c, o]) => `<path d="${d}" stroke="${c}" opacity="${o}"/>`)
    .join("")}
</svg>`;

/**
 * El fondo de la casa: el azul hondo del río de noche, con la misma inclinación
 * de luz que llevan las tarjetas de la aplicación. Contra él, el agua del
 * palafito pertenece al fondo en vez de flotar encima de otra familia de color,
 * y la casa verde se recorta con fuerza a tamaño de icono.
 */
export const fondo = (lado, radio = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#15495c"/>
      <stop offset="1" stop-color="#081f28"/>
    </linearGradient>
  </defs>
  <rect width="${lado}" height="${lado}" rx="${radio}" fill="url(#g)"/>
</svg>`;

/**
 * La marca entera en un solo SVG: el fondo y el palafito encima.
 *
 * **Existe para el icono de la pestaña del navegador**, que es el único sitio
 * donde hace falta la marca completa en vectorial. Los demás iconos se componen
 * en mapa de bits con `sharp` porque Android los quiere así; un navegador
 * prefiere el vectorial, que pesa unos cientos de bytes y se ve nítido lo mismo
 * a dieciséis píxeles que a doscientos.
 *
 * El grosor del trazo se engorda a propósito: a dieciséis píxeles el dibujo
 * entero mide menos que la uña de un dedo, y con el grosor de los iconos
 * grandes las diez líneas se emborronan en una mancha.
 */
export const marcaSvg = (lado, radio = 0, fraccion = 0.62, grosor = 2.2) => {
  const dibujo = lado * fraccion;
  const margen = (lado - dibujo) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#15495c"/>
      <stop offset="1" stop-color="#081f28"/>
    </linearGradient>
  </defs>
  <rect width="${lado}" height="${lado}" rx="${radio}" fill="url(#g)"/>
  <g transform="translate(${margen} ${margen}) scale(${dibujo / 24})"
     fill="none" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round">
    ${palafitoTrazos()
      .map(([d, c, o]) => `<path d="${d}" stroke="${c}" opacity="${o}"/>`)
      .join("\n    ")}
  </g>
</svg>`;
};

/** El mismo fondo, redondo, para los lanzadores que piden icono circular. */
export const circulo = (lado) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#15495c"/>
      <stop offset="1" stop-color="#081f28"/>
    </linearGradient>
  </defs>
  <circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="url(#g)"/>
</svg>`;

/** Un dibujo centrado sobre una base, ocupando la fracción que se le diga. */
async function centrado(sharp, base, lado, fraccion, svg) {
  const dibujo = Math.round(lado * fraccion);
  const marca = await sharp(Buffer.from(svg))
    .resize(dibujo, dibujo)
    .png()
    .toBuffer();
  const borde = Math.round((lado - dibujo) / 2);
  return sharp(base)
    .composite([{ input: marca, top: borde, left: borde }])
    .png()
    .toBuffer();
}

/** El palafito centrado sobre una base. Es la marca del teléfono. */
export async function conPalafito(sharp, base, lado, fraccion, opciones = {}) {
  return centrado(
    sharp,
    base,
    lado,
    fraccion,
    palafito(
      opciones.color ?? VERDE,
      opciones.grosor ?? 1.8,
      opciones.agua ?? AZUL,
    ),
  );
}
