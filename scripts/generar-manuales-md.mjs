/**
 * Vuelca los dos manuales a Markdown, en `docs/`.
 *
 *   npm run manuales:md
 *
 * El texto de los manuales vive en `src/content/manual-*.ts` y de ahí salen la
 * página, el PDF y este Markdown. Quien edite el Markdown a mano pierde el
 * cambio la próxima vez que alguien corra esto, y `tests/unit/manuales.test.ts`
 * lo avisa antes.
 */
import { writeFile } from "node:fs/promises";
import { manualCiudadano } from "../src/content/manual-ciudadano.ts";
import { manualConsejo } from "../src/content/manual-consejo.ts";
import { fechaLarga } from "../src/content/manuales.ts";
import { aMarkdown } from "../src/content/manuales-markdown.ts";

for (const manual of [manualCiudadano, manualConsejo]) {
  const destino = `docs/manual-${manual.id}.md`;
  await writeFile(destino, aMarkdown(manual, fechaLarga(manual.fecha)));
  console.log(`${destino} escrito`);
}
