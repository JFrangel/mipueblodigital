/**
 * Los iconos y la pantalla de arranque de la aplicación Android.
 *
 *   node scripts/iconos-android.mjs
 *
 * Para qué existe: Capacitor genera el proyecto Android con **su propio
 * logotipo**. Una aplicación del Consejo Comunitario que en el cajón del
 * teléfono aparece con el logo de una herramienta de programación no parece del
 * Consejo: parece una prueba de alguien.
 *
 * Todo sale de `marca-hoja.mjs`, así que no hay dos dibujos que mantener. Se
 * vuelve a ejecutar cuando cambie la marca, junto a `refresh-brand.mjs`.
 *
 * **El teléfono lleva las olas; la web lleva la hoja-A.** No es un descuido: en
 * el cajón del teléfono el icono compite con decenas de aplicaciones a cuarenta
 * y ocho píxeles, y tres trazos de agua se reconocen de un vistazo donde una
 * hoja con un río dentro se vuelve una mancha verde más. Son la misma agua que
 * abre el menú dentro de la aplicación, así que quien toca el icono encuentra
 * el mismo dibujo al entrar.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { circulo, conOlas, fondo, olas } from "./marca-hoja.mjs";

/* El verde de la pantalla de arranque: el mismo que declara `capacitor.config.ts`
   en `SplashScreen.backgroundColor`. Si cambia allí, cambia aquí, o el dibujo
   aparece sobre un color y el resto de la pantalla sobre otro. */
const FONDO_ARRANQUE = "#123f39";

const res = "android/app/src/main/res";

/** Los tamaños del cajón, por densidad, y el lienzo del icono adaptable. */
const DENSIDADES = [
  ["mdpi", 48, 108, 24],
  ["hdpi", 72, 162, 36],
  ["xhdpi", 96, 216, 48],
  ["xxhdpi", 144, 324, 72],
  ["xxxhdpi", 192, 432, 96],
];

/** Las pantallas de arranque, en vertical y apaisado. */
const ARRANQUES = [
  ["port-mdpi", 320, 480],
  ["port-hdpi", 480, 800],
  ["port-xhdpi", 720, 1280],
  ["port-xxhdpi", 960, 1600],
  ["port-xxxhdpi", 1280, 1920],
  ["land-mdpi", 480, 320],
  ["land-hdpi", 800, 480],
  ["land-xhdpi", 1280, 720],
  ["land-xxhdpi", 1600, 960],
  ["land-xxxhdpi", 1920, 1280],
];

const transparente = (lado) => ({
  create: {
    width: lado,
    height: lado,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
});

for (const [densidad, legado, adaptativo, aviso] of DENSIDADES) {
  const mip = `${res}/mipmap-${densidad}`;
  const draw = `${res}/drawable-${densidad}`;
  await mkdir(mip, { recursive: true });
  await mkdir(draw, { recursive: true });

  /**
   * El icono adaptable: el fondo a sangre y las olas dentro de la ventana.
   *
   * Android recorta el lienzo de 108 dp con la forma que use el lanzador
   * —círculo, cuadrado redondeado, gota— y solo garantiza los 72 dp centrales,
   * que son dos tercios. El dibujo va a 0,46 del lienzo entero: deja aire por
   * dentro de esa ventana, así que ninguna forma de recorte le corta una ola.
   */
  await writeFile(
    `${mip}/ic_launcher_background.png`,
    await sharp(Buffer.from(fondo(adaptativo)))
      .png()
      .toBuffer(),
  );
  await writeFile(
    `${mip}/ic_launcher_foreground.png`,
    await conOlas(sharp, transparente(adaptativo), adaptativo, 0.46),
  );

  /* Los heredados: la marca entera ya compuesta, para lanzadores viejos que no
     entienden el adaptable y enseñarían el PNG tal cual. */
  await writeFile(
    `${mip}/ic_launcher.png`,
    await conOlas(
      sharp,
      Buffer.from(fondo(legado, Math.round(legado * 0.22))),
      legado,
      0.62,
    ),
  );
  await writeFile(
    `${mip}/ic_launcher_round.png`,
    await conOlas(sharp, Buffer.from(circulo(legado)), legado, 0.58),
  );

  /**
   * El icono del aviso en la barra de estado.
   *
   * Android usa **solo el canal alfa** de este archivo y lo tiñe él según el
   * tema, así que se dibuja en blanco puro: el azul del agua allí no existe, y
   * lo único que queda de las olas es su forma. Y los tamaños son los de
   * notificación, que son la mitad de los del cajón.
   */
  const dibujo = Math.round(aviso * 0.82);
  const margen = Math.round(aviso * 0.09);
  await writeFile(
    `${draw}/ic_stat_notify.png`,
    await sharp(Buffer.from(olas("#ffffff", 3)))
      .resize(dibujo, dibujo)
      .extend({
        top: margen,
        bottom: aviso - dibujo - margen,
        left: margen,
        right: aviso - dibujo - margen,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer(),
  );
  console.log(`  ${densidad}: cajón, adaptable y aviso`);
}

/* El icono adaptable apunta a los dos PNG de arriba. El fondo **no** es un
   color plano: es el mismo degradado de la marca, para que el vaivén del
   lanzador no descubra un borde ni un color que no sea de la casa. */
await mkdir(`${res}/mipmap-anydpi-v26`, { recursive: true });
for (const cual of ["ic_launcher", "ic_launcher_round"]) {
  await writeFile(
    `${res}/mipmap-anydpi-v26/${cual}.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<!-- El lanzador recorta este lienzo con la forma que use el teléfono. Delante,
     la marca dentro de la ventana de 72 dp; detrás, el degradado a sangre. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`,
  );
}
console.log("  icono adaptable");

/**
 * La pantalla de arranque: la marca centrada sobre el verde del Consejo.
 *
 * Es lo que se ve mientras la ventana alcanza la aplicación, y sin ella ese
 * momento es un rectángulo blanco. Van las mismas olas que el cajón: abrir con
 * un logotipo y aterrizar en otro hace dudar de en qué aplicación se ha
 * entrado.
 */
async function arranque(ancho, alto, destino) {
  const lado = Math.round(Math.min(ancho, alto) * 0.32);
  const marca = await sharp(Buffer.from(olas()))
    .resize(lado, lado)
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: ancho,
      height: alto,
      channels: 4,
      background: FONDO_ARRANQUE,
    },
  })
    .composite([{ input: marca, gravity: "centre" }])
    .png()
    .toFile(destino);
}

for (const [nombre, ancho, alto] of ARRANQUES) {
  const carpeta = `${res}/drawable-${nombre}`;
  await mkdir(carpeta, { recursive: true });
  await arranque(ancho, alto, `${carpeta}/splash.png`);
}
/* Y el de reserva, sin densidad, que es el que Android usa si no encaja. */
await mkdir(`${res}/drawable`, { recursive: true });
await arranque(720, 1280, `${res}/drawable/splash.png`);
console.log(`  ${ARRANQUES.length + 1} pantallas de arranque`);

console.log("\nListo. Recompila con: npm run cap:apk");
