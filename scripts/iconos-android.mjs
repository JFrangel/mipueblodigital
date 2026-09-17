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
 * Todo sale del mismo emblema que ya usa la aplicación web, así que no hay dos
 * marcas que mantener. Se vuelve a ejecutar cuando cambie el emblema, junto a
 * `refresh-brand.mjs`.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const EMBLEMA = "public/brand/emblem.svg";
/* El verde del Consejo: el mismo del manifiesto y de la barra de estado. */
const FONDO = "#123f39";

/** Los cinco tamaños que Android pide, por densidad de pantalla. */
const DENSIDADES = [
  ["mdpi", 48],
  ["hdpi", 72],
  ["xhdpi", 96],
  ["xxhdpi", 144],
  ["xxxhdpi", 192],
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

const res = "android/app/src/main/res";

/** El icono del cajón: emblema sobre el verde, con margen. */
async function icono(lado) {
  const emblema = await sharp(EMBLEMA)
    .resize(Math.round(lado * 0.64), Math.round(lado * 0.64))
    .png()
    .toBuffer();
  const borde = Math.round(lado * 0.18);
  return sharp({
    create: { width: lado, height: lado, channels: 4, background: FONDO },
  })
    .composite([{ input: emblema, left: borde, top: borde }])
    .png()
    .toBuffer();
}

for (const [densidad, lado] of DENSIDADES) {
  const carpeta = `${res}/mipmap-${densidad}`;
  await mkdir(carpeta, { recursive: true });
  const cuadrado = await icono(lado);
  await writeFile(`${carpeta}/ic_launcher.png`, cuadrado);
  await writeFile(`${carpeta}/ic_launcher_round.png`, cuadrado);
  /**
   * La capa de delante del icono adaptable.
   *
   * Android recorta el icono a la forma del lanzador —círculo, cuadrado
   * redondeado, gota— y solo garantiza el 72 % central. Sin ese margen, la
   * máscara se lleva el palafito.
   */
  const seguro = Math.round(lado * 0.5);
  const emblema = await sharp(EMBLEMA).resize(seguro, seguro).png().toBuffer();
  const delante = await sharp({
    create: {
      width: lado,
      height: lado,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: emblema,
        left: Math.round((lado - seguro) / 2),
        top: Math.round((lado - seguro) / 2),
      },
    ])
    .png()
    .toBuffer();
  await writeFile(`${carpeta}/ic_launcher_foreground.png`, delante);
  console.log(`  icono ${densidad} (${lado}px)`);
}

/* El fondo del icono adaptable pasa de ser un dibujo de Capacitor a un color
   plano: el emblema ya lleva el suyo. */
await writeFile(
  `${res}/drawable/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>
<!-- El verde del Consejo, detrás del emblema del icono adaptable. -->
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="${FONDO}" />
</shape>
`,
);
for (const cual of ["ic_launcher", "ic_launcher_round"]) {
  await writeFile(
    `${res}/mipmap-anydpi-v26/${cual}.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`,
  );
}
console.log("  icono adaptable");

/* La pantalla de arranque: el emblema centrado sobre el verde. Es lo que se ve
   mientras la ventana alcanza la aplicación, y sin ella ese momento es un
   rectángulo blanco. */
for (const [nombre, ancho, alto] of ARRANQUES) {
  const carpeta = `${res}/drawable-${nombre}`;
  await mkdir(carpeta, { recursive: true });
  const lado = Math.round(Math.min(ancho, alto) * 0.32);
  const emblema = await sharp(EMBLEMA).resize(lado, lado).png().toBuffer();
  await sharp({
    create: { width: ancho, height: alto, channels: 4, background: FONDO },
  })
    .composite([{ input: emblema, gravity: "centre" }])
    .png()
    .toFile(`${carpeta}/splash.png`);
}
/* Y el de reserva, sin densidad, que es el que Android usa si no encaja. */
await mkdir(`${res}/drawable`, { recursive: true });
const emblema = await sharp(EMBLEMA).resize(240, 240).png().toBuffer();
await sharp({
  create: { width: 720, height: 1280, channels: 4, background: FONDO },
})
  .composite([{ input: emblema, gravity: "centre" }])
  .png()
  .toFile(`${res}/drawable/splash.png`);
console.log(`  ${ARRANQUES.length + 1} pantallas de arranque`);

/* El icono del aviso en la barra de estado.

   Va de su propio archivo y no del emblema. De un icono de notificación
   Android solo usa la transparencia, y el emblema es una escena entera dentro
   de un recorte redondeado: su canal alfa es un rectángulo lleno. Se comprobó
   midiéndolo —87 % de píxeles opacos—, así que sacar de ahí una silueta daba
   exactamente el cuadrado blanco que hace que una aplicación parezca rota.
   `notify-mark.svg` es esa misma imagen, el palafito sobre el río, reducida a
   lo que sobrevive a 24 dp.

   Y los tamaños son los de notificación, que son la mitad de los del cajón. */
const AVISO = [
  ["mdpi", 24],
  ["hdpi", 36],
  ["xhdpi", 48],
  ["xxhdpi", 72],
  ["xxxhdpi", 96],
];
for (const [densidad, lado] of AVISO) {
  const carpeta = `${res}/drawable-${densidad}`;
  await mkdir(carpeta, { recursive: true });
  await sharp("public/brand/notify-mark.svg")
    .resize(lado, lado)
    .png()
    .toFile(`${carpeta}/ic_stat_notify.png`);
}
console.log(`  icono de aviso en ${AVISO.length} densidades`);

console.log("\nListo. Recompila con: npm run cap:apk");
