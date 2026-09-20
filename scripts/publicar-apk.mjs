/**
 * Publica el APK compilado y deja dicho qué versión es.
 *
 *   node scripts/publicar-apk.mjs
 *
 * **Lo importante no es copiar el archivo: es el `version.json` que va al
 * lado.** La aplicación instalada es una ventana a la web, así que todo lo que
 * cambia en la web llega sola a los teléfonos. Lo que no llega nunca es lo que
 * vive dentro del archivo —el icono, los permisos, los complementos nativos, la
 * pantalla de arranque—, y para eso hay que reinstalar. Este archivo es cómo la
 * aplicación se entera de que hay una versión nueva esperando: compara el
 * `versionCode` de aquí con el suyo y, si el de aquí es mayor, lo dice.
 *
 * Sin esto, avisar de una actualización es imposible: no habría con qué
 * comparar. Por eso el guion **se niega a publicar** si el `versionCode` del
 * APK no ha subido respecto al que ya está publicado; sería dejar el aviso
 * roto sin que nadie se entere hasta que hiciera falta.
 */
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  statSync,
} from "node:fs";

const APK_COMPILADO = "android/app/build/outputs/apk/debug/app-debug.apk";
const APK_PUBLICO = "public/descargas/mi-pueblo-digital.apk";
const VERSION_PUBLICA = "public/descargas/version.json";

/** Lee la versión del único sitio donde se declara, para que no haya dos. */
function versionDelProyecto() {
  const gradle = readFileSync("android/app/build.gradle", "utf8");
  const code = gradle.match(/versionCode\s+(\d+)/);
  const name = gradle.match(/versionName\s+"([^"]+)"/);
  if (!code || !name)
    throw new Error("No encuentro versionCode/versionName en build.gradle");
  return { versionCode: Number(code[1]), versionName: name[1] };
}

const { versionCode, versionName } = versionDelProyecto();

if (!existsSync(APK_COMPILADO))
  throw new Error(
    `No hay APK compilado en ${APK_COMPILADO}. Compílalo antes: npm run cap:apk`,
  );

/* La comprobación que evita publicar un aviso roto. */
if (existsSync(VERSION_PUBLICA)) {
  const anterior = JSON.parse(readFileSync(VERSION_PUBLICA, "utf8"));
  if (versionCode <= anterior.versionCode)
    throw new Error(
      `El APK dice ser la versión ${versionCode} y la publicada ya es la ` +
        `${anterior.versionCode}. Sube versionCode en android/app/build.gradle: ` +
        `sin eso, quien tenga la anterior no se entera de que hay una nueva.`,
    );
}

copyFileSync(APK_COMPILADO, APK_PUBLICO);

/**
 * Lo que la aplicación lee para decidir si avisa.
 *
 * `notas` es lo único que se escribe a mano, y se escribe **para quien va a
 * decidir si se descarga treinta megas con la señal del río**: qué gana
 * haciéndolo. «Mejoras y correcciones» no le sirve a nadie para decidir nada.
 */
const publicada = {
  versionCode,
  versionName,
  bytes: statSync(APK_PUBLICO).size,
  fecha: new Date().toISOString().slice(0, 10),
  notas: process.env.MPD_NOTAS_VERSION ?? "",
  /**
   * De dónde se baja.
   *
   * **No es un detalle de reparto: decide si el botón «Descargar» funciona.**
   * La ventana de Capacitor no sabe descargar archivos, y solo suelta al
   * navegador del teléfono las direcciones de **otro dominio**. Una del mismo
   * sitio se la queda ella y no pasa nada. Hasta la versión 1.1 eso lo resolvía
   * un método nativo; quien tenga una anterior necesita que el archivo esté
   * fuera. Por eso se puede apuntar a otro lado sin recompilar nada:
   *   MPD_URL_APK="https://otro-sitio/mi-pueblo-digital.apk" node scripts/publicar-apk.mjs
   */
  url: process.env.MPD_URL_APK ?? "/descargas/mi-pueblo-digital.apk",
};
writeFileSync(VERSION_PUBLICA, JSON.stringify(publicada, null, 2) + "\n");

const megas = (publicada.bytes / 1024 / 1024).toFixed(1);
console.log(`  ${APK_PUBLICO}  (${megas} MB)`);
console.log(`  ${VERSION_PUBLICA}  → versión ${versionName} (${versionCode})`);
if (!publicada.notas)
  console.log(
    "\n  Sin notas. Ponlas y vuelve a ejecutarlo si esta versión arregla algo\n" +
      "  que la gente esté esperando:\n" +
      '    MPD_NOTAS_VERSION="El dictado ya no se apaga solo." node scripts/publicar-apk.mjs',
  );
