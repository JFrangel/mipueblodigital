import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * La huella de todo lo que decide cómo sale un manual.
 *
 * Los PDF de `public/manuales/` se generan a mano y se guardan en el
 * repositorio, así que pueden quedarse atrás: alguien corrige una frase, o
 * retoca un color, y el PDF sigue diciendo lo de antes. Esta huella junta lo
 * que los determina —el texto de los dos manuales, la vista que los dibuja, su
 * hoja de estilos y los dibujos— y `generar-manuales-pdf.mjs` la apunta en
 * `public/manuales/manifest.json` junto a cada PDF. La prueba
 * `tests/unit/manuales.test.ts` compara las dos: si no coinciden, el PDF está
 * viejo y la prueba dice cuál comando correr.
 *
 * Los saltos de línea se normalizan: en Windows Git puede convertir `\n` en
 * `\r\n` al descargar, y eso no cambia lo que sale impreso.
 */
export const FUENTES = [
  "src/content/manuales.ts",
  "src/content/manual-ciudadano.ts",
  "src/content/manual-consejo.ts",
  "src/features/manuales.tsx",
  "src/features/manuales-escenas.tsx",
  "src/features/manuales.module.css",
  "src/components/filigranas.tsx",
];

const raiz = fileURLToPath(new URL("..", import.meta.url));

export function huellaDeFuentes() {
  const hash = createHash("sha256");
  for (const ruta of FUENTES) {
    hash.update(`${ruta}\n`);
    hash.update(
      readFileSync(`${raiz}${ruta}`, "utf8").replaceAll("\r\n", "\n"),
    );
    hash.update("\n");
  }
  return hash.digest("hex");
}
