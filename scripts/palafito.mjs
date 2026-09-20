import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

/**
 * Los trazos del palafito, leídos de donde los lee la aplicación.
 *
 * **Existe para que no haya varios palafitos.** Este dibujo sale en cuatro
 * sitios que se compilan por caminos distintos —el icono del cajón, la pantalla
 * de arranque de Android, la portada que va dentro del APK y la portada de la
 * web— y cada uno tenía su copia de las curvas. Basta con que alguien retoque
 * una para que el teléfono enseñe dos casas distintas, y las que primero se
 * separan son justo las que nadie mira dos veces: las del arranque.
 *
 * Se lee `src/components/palafito-trazos.ts`, que es solo datos y por eso se
 * puede transpilar y ejecutar aquí sin arrastrar React.
 */
export function trazosPalafito() {
  const fuente = readFileSync("src/components/palafito-trazos.ts", "utf8");
  const js = ts.transpileModule(fuente, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const caja = {};
  new Function("exports", js)(caja);
  const trazos = caja.TRAZOS_PALAFITO;
  if (!Array.isArray(trazos) || !trazos.length)
    throw new Error(
      "palafito-trazos.ts no devolvió TRAZOS_PALAFITO. Sin el dibujo, el " +
        "arranque saldría vacío y nadie se enteraría hasta verlo en un teléfono.",
    );
  return trazos;
}

/** Los colores del palafito sobre el fondo del arranque. Los de la portada. */
export const CASA = "#a7e6b8";
export const AGUA = "#8fd0f0";
