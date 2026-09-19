import { readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * Le dice a la página de arranque del APK dónde vive la aplicación.
 *
 * Esa página —la que se ve al instalar sin señal— tiene un botón de reintentar
 * que necesita la dirección del servidor, y **no puede averiguarla sola**:
 * Capacitor la sirve desde `localhost` y el puente que inyecta no trae ni la
 * dirección ni los complementos. Sin esto, el botón no tiene a dónde ir:
 * recargar vuelve a `localhost` y Capacitor, que espera la aplicación en otra
 * dirección, **abre eso en Chrome** y deja a la persona fuera de su aplicación.
 * Medido en el emulador el 19 de septiembre de 2026.
 *
 * Se escribe en la copia que hace `cap sync` —`android/app/src/main/assets/
 * public/`, que git ignora— y **no en `capacitor/www/`**, que sí se versiona.
 * Así la dirección nunca queda escrita en un archivo del repositorio, que es la
 * misma regla por la que `capacitor.config.ts` la exige por variable de entorno
 * en vez de tenerla dentro.
 */
const url = process.env.MPD_APP_URL;
if (!url) {
  console.error(
    "Falta MPD_APP_URL. Es la misma que pide `cap sync`: ejecútalos juntos.",
  );
  process.exit(1);
}

const destino = "android/app/src/main/assets/public/index.html";
if (!existsSync(destino)) {
  console.error(
    `No existe ${destino}. Esto va después de \`cap sync\`, no antes.`,
  );
  process.exit(1);
}

const marca = "<!--SERVIDOR-->";
let pagina = readFileSync(destino, "utf8");
if (!pagina.includes(marca)) {
  console.error(
    `${destino} no lleva la marca ${marca}. Mira capacitor/www/index.html.`,
  );
  process.exit(1);
}

/* Entre comillas dobles y con JSON.stringify: la dirección viene de fuera y
   acaba dentro de un <script>. */
writeFileSync(
  destino,
  pagina.replace(
    marca,
    `<script>window.MPD_APP=${JSON.stringify(url)}</script>`,
  ),
);
console.log(`  ${destino} ← ${url}`);
