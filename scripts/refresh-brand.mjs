/**
 * Los iconos de la aplicación web: el de la pestaña y los de instalarla.
 *
 *   node scripts/refresh-brand.mjs
 *
 * Una sola fuente con los iconos de Android —`marca-hoja.mjs`, que a su vez lee
 * los trazos de `src/components/palafito-trazos.ts`— para que la marca sea la
 * misma en el cajón del teléfono y en la pantalla de inicio de quien la instala
 * desde el navegador.
 *
 * **Llevaban la hoja, y eso era un descuido que se veía.** El APK pasó a la
 * marca del palafito y estos se quedaron atrás: quien instalaba desde el
 * navegador y quien instalaba el archivo acababan con dos iconos distintos en la
 * misma pantalla de inicio, con dos fondos de colores distintos, como si fueran
 * dos aplicaciones. El argumento por el que el teléfono lleva el palafito —a
 * cuarenta y ocho píxeles, compitiendo con decenas de aplicaciones, una casa
 * sobre pilotes no la tiene nadie más— vale exactamente igual aquí, porque es
 * exactamente el mismo cajón.
 *
 * La hoja-A no se pierde: sigue donde tiene sitio para leerse, que es el rótulo
 * dentro de la aplicación.
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { conPalafito, fondo, marcaSvg } from "./marca-hoja.mjs";

for (const [archivo, lado, fraccion, redondeo] of [
  ["public/brand/pwa-192.png", 192, 0.62, 0.22],
  ["public/brand/pwa-512.png", 512, 0.62, 0.22],
  /**
   * El enmascarable deja el margen que Android se come al recortar: el dibujo
   * baja a 0,46 del lienzo y el fondo va a sangre, sin esquinas redondeadas,
   * porque las pone el sistema. Con el margen de los otros, el recorte circular
   * se llevaba las patas del palafito.
   */
  ["public/brand/pwa-maskable-512.png", 512, 0.46, 0],
  /**
   * El de iOS, que no entiende de vectoriales ni de máscaras: pide un PNG de
   * 180 y lo redondea él. Sin él, al añadir la aplicación a la pantalla de
   * inicio desde un iPhone se guarda una captura de la propia página.
   */
  ["src/app/apple-icon.png", 180, 0.62, 0],
]) {
  await sharp(
    await conPalafito(
      sharp,
      Buffer.from(fondo(lado, Math.round(lado * redondeo))),
      lado,
      fraccion,
    ),
  )
    .png()
    .toFile(archivo);
  console.log("  " + archivo);
}

/**
 * El icono de la pestaña del navegador.
 *
 * **No existía ninguno**, así que la pestaña enseñaba el dibujo por defecto del
 * navegador: una aplicación del Consejo con la marca en blanco, entre otras diez
 * pestañas abiertas. Va en vectorial, que es lo que un navegador prefiere: pesa
 * poco más de un kilobyte y se ve nítido igual a dieciséis píxeles que a
 * doscientos. El redondeo lo lleva puesto porque aquí no hay lanzador que lo
 * recorte por su cuenta.
 *
 * El nombre y el sitio los manda Next: `src/app/icon.svg` se sirve solo como
 * icono del sitio, sin declararlo en ninguna parte. Lo escribe este guion, así
 * que no se edita a mano.
 */
await writeFile("src/app/icon.svg", marcaSvg(64, 14) + "\n");
console.log("  src/app/icon.svg");
