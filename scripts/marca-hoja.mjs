/**
 * La marca de Mi Pueblo Digital, en un solo sitio.
 *
 * Es la hoja-A del rótulo: la misma pieza que lleva «DIGITAL» en la cabecera de
 * la aplicación, recortada de ahí. El rótulo entero no puede ser el icono —el
 * lanzador lo recorta a círculo o a cuadrado y «Mi Pueblo DIGITAL» a 48 dp sale
 * ilegible y con las puntas cortadas—, pero la hoja sí: está dibujada para
 * sobrevivir en pequeño.
 *
 * **Vive aquí y no en cada guion** porque son dos los que la dibujan, el de
 * Android y el de la web, y dos copias de unos trazos es garantizar que un día
 * el teléfono y el navegador enseñen marcas distintas. Si cambia el rótulo en
 * `src/components/ui.tsx`, cambia aquí, y se vuelven a ejecutar los dos.
 */

/** Los mismos trazos que `.brand-leaf` en `src/components/ui.tsx`. */
export const LAMINA =
  "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z";

/**
 * El travesaño de la A **es el río**, y por eso serpentea.
 *
 * Esto es el Gran Consejo Comunitario del Río Satinga: allí el río no es un
 * adorno del paisaje, es la calle. El meandro cruza a la altura a la que cabe
 * —se midió la distancia de cada punto al canto de la lámina— y con la
 * amplitud que deja raya de sombra contra ella.
 */
export const RIO =
  "M3.9 13C4.6 13.2 6.7 14.2 8.1 14.2C9.5 14.2 10.8 13.4 12.2 13C13.6 12.6 15 11.8 16.4 11.8C17.8 11.8 19.9 12.8 20.6 13";

/** El verde de la hoja, sobre el fondo oscuro de la casa. */
export const VERDE = "#9be49c";

/**
 * El azul del río: el mismo que usa la aplicación para el agua (#4a86b8), con
 * la claridad que pide un fondo verde oscuro. No es un azul nuevo, es el mismo
 * tono más claro.
 *
 * Es lo único de la marca que no es verde, y de ahí sale todo su trabajo: una
 * raya verde dentro de una hoja verde se lee como una nervadura; en azul se lee
 * como agua. A tamaños pequeños —11 px en el rótulo— la forma del meandro ya no
 * se distingue, pero el color sí, y es lo que sigue diciendo que hay un río.
 */
export const AZUL = "#83b9e0";

/**
 * La hoja, en SVG.
 *
 * `rio` se pasa aparte para el icono de avisos: de ese archivo Android usa
 * **solo el canal alfa** y lo tiñe él de un color, así que allí la hoja entera
 * va del mismo tono y el río solo puede ser forma.
 */
export const hoja = (color = VERDE, grosor = 2.4, rio = AZUL) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round">
  <g transform="rotate(-16 12 12)">
    <path d="${LAMINA}" stroke="${color}"/>
    <path d="${RIO}" stroke="${rio}"/>
  </g>
</svg>`;

/**
 * El fondo de la casa: el verde con la misma inclinación de luz que llevan las
 * tarjetas de la aplicación.
 */
export const fondo = (lado, radio = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a6048"/>
      <stop offset="1" stop-color="#0b3428"/>
    </linearGradient>
  </defs>
  <rect width="${lado}" height="${lado}" rx="${radio}" fill="url(#g)"/>
</svg>`;

/** El mismo fondo, redondo, para los lanzadores que piden icono circular. */
export const circulo = (lado) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a6048"/>
      <stop offset="1" stop-color="#0b3428"/>
    </linearGradient>
  </defs>
  <circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="url(#g)"/>
</svg>`;

/** La hoja centrada sobre una base, ocupando la fracción que se le diga. */
export async function conHoja(sharp, base, lado, fraccion, opciones = {}) {
  const dibujo = Math.round(lado * fraccion);
  const marca = await sharp(
    Buffer.from(hoja(opciones.color ?? VERDE, opciones.grosor ?? 2.4, opciones.rio ?? AZUL)),
  )
    .resize(dibujo, dibujo)
    .png()
    .toBuffer();
  const borde = Math.round((lado - dibujo) / 2);
  return sharp(base)
    .composite([{ input: marca, top: borde, left: borde }])
    .png()
    .toBuffer();
}
