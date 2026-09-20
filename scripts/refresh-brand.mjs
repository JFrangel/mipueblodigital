/**
 * Los iconos instalables de la aplicación web.
 *
 *   node scripts/refresh-brand.mjs
 *
 * Una sola fuente con los iconos de Android —`marca-hoja.mjs`— para que la
 * marca sea la misma en el cajón del teléfono y en la pantalla de inicio de
 * quien la instala desde el navegador.
 */
import sharp from "sharp";
import { conHoja, fondo } from "./marca-hoja.mjs";

for (const [archivo, lado, fraccion, redondeo] of [
  ["public/brand/pwa-192.png", 192, 0.62, 0.22],
  ["public/brand/pwa-512.png", 512, 0.62, 0.22],
  /**
   * El enmascarable deja el margen que Android se come al recortar: la hoja
   * baja a 0,46 del lienzo y el fondo va a sangre, sin esquinas redondeadas,
   * porque las pone el sistema. Con el margen de los otros, el recorte
   * circular se llevaba la punta.
   */
  ["public/brand/pwa-maskable-512.png", 512, 0.46, 0],
]) {
  await sharp(
    await conHoja(
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
