/**
 * La captura real de «npx vitest run», para la sección de calidad y seguridad
 * de la guía del proyecto.
 *
 *   node scripts/captura-pruebas.mjs
 *
 * **Por qué corre las pruebas en vez de recibir el número por parámetro.** La
 * guía dice cuántas pruebas pasan con una imagen, no con una frase, y una
 * imagen vieja en una sección que presume rigor es peor que no tener ninguna:
 * es la misma lección que ya costó corregir la lista de pendientes de
 * `knowledge.tsx`. Así que este script no acepta una cifra de fuera —la
 * calcula él mismo, cada vez— y si las pruebas no pasan, no genera nada: una
 * captura en rojo no tiene sitio en una sección que enseña que todo pasa.
 *
 * La imagen sale a `public/documentacion/pruebas-unitarias.png`, con el mismo
 * texto que imprimió la propia ejecución, sin reformatear los números.
 */
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const DESTINO = "public/documentacion/pruebas-unitarias.png";

function correrPruebas() {
  const resultado = spawnSync("npx vitest run", {
    shell: true,
    encoding: "utf8",
  });
  const salida = `${resultado.stdout ?? ""}${resultado.stderr ?? ""}`;
  if (resultado.status !== 0) {
    process.stderr.write(salida);
    throw new Error(
      "Las pruebas no pasan: no se genera una captura que diría lo contrario.",
    );
  }
  return salida;
}

/** Solo el resumen, no el ruido de arranque de los workers. */
function resumen(salida) {
  const lineas = salida.split(/\r?\n/);
  const quedan = (patron) => lineas.find((l) => patron.test(l))?.trimEnd();
  const cabecera = quedan(/^\s*RUN\s+v/);
  const partes = [
    cabecera,
    "",
    quedan(/^\s*Test Files\s/),
    quedan(/^\s*Tests\s/),
    quedan(/^\s*Start at\s/),
    quedan(/^\s*Duration\s/),
  ].filter((l) => l !== undefined);
  if (partes.length < 5)
    throw new Error(
      "No se reconoció el resumen de vitest: revisa el formato a mano antes de confiar en la captura.",
    );
  return partes.join("\n");
}

function paginaHtml(texto) {
  const esc = (v) =>
    v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const coloreada = esc(texto)
    .replace(/^(\s*RUN\s+)(v\S+.*)$/m, '<span class="run">$1</span>$2')
    .replace(/(\d+ passed)/g, '<span class="pass">$1</span>');
  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>
html,body{margin:0;background:#0d1117;}
.frame{display:inline-block;padding:24px 30px 28px;background:#0d1117;font-family:"Cascadia Code","Consolas","SFMono-Regular",Menlo,monospace;}
.titlebar{display:flex;gap:8px;margin-bottom:16px;}
.dot{width:12px;height:12px;border-radius:50%;}
.dot.red{background:#ff5f56;} .dot.yellow{background:#ffbd2e;} .dot.green{background:#27c93f;}
pre{margin:0;color:#c9d1d9;font-size:15px;line-height:1.65;white-space:pre;}
.prompt{color:#7ee787;}
.run{color:#58a6ff;font-weight:600;}
.pass{color:#3fb950;font-weight:700;}
</style></head><body>
<div class="frame" id="frame">
<div class="titlebar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>
<pre><span class="prompt">$</span> npx vitest run

${coloreada}</pre>
</div>
</body></html>`;
}

const texto = resumen(correrPruebas());
await mkdir("public/documentacion", { recursive: true });
const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage({ deviceScaleFactor: 2 });
  await pagina.setContent(paginaHtml(texto));
  await pagina.locator("#frame").screenshot({ path: DESTINO });
} finally {
  await navegador.close();
}
console.log(`Guardado ${DESTINO}\n\n${texto}`);
