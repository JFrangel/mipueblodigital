import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const [vitestPath, playwrightPath, outputPath = "docs/catalogo-pruebas.md"] =
  process.argv.slice(2);
if (!vitestPath || !playwrightPath) {
  console.error(
    "Uso: node scripts/generar-catalogo-pruebas.mjs vitest.json playwright.json [salida.md]",
  );
  process.exit(1);
}

const unit = JSON.parse(readFileSync(vitestPath, "utf8"));
const browser = JSON.parse(readFileSync(playwrightPath, "utf8"));
const lines = [
  "# Catálogo de pruebas automatizadas",
  "",
  "Inventario generado a partir de los nombres que reportan Vitest y Playwright. **Aparecer en el catálogo no significa que una prueba de navegador se haya ejecutado**: Playwright se consultó con `--list`. Los resultados de ejecución se registran por separado en [Pruebas y rendimiento](pruebas-y-rendimiento.md).",
  "",
  `- Unitarias: **${unit.numTotalTests} casos en ${unit.testResults.length} archivos**; estado del reporte usado: ${unit.numPassedTests} pasan, ${unit.numFailedTests} fallan, ${unit.numPendingTests} pendientes.`,
];

const collect = (suite, file = suite.file, result = []) => {
  for (const spec of suite.specs ?? [])
    result.push({
      file: spec.file ?? file,
      title: spec.title,
      line: spec.line,
    });
  for (const child of suite.suites ?? [])
    collect(child, child.file ?? file, result);
  return result;
};
const e2e = browser.suites.flatMap((suite) => collect(suite));
lines.push(
  `- Navegador: **${e2e.length} casos en ${browser.suites.length} archivos** registrados por Playwright.`,
  "",
  "## Vitest: lógica, datos y rutas",
  "",
);

for (const suite of [...unit.testResults].sort((a, b) =>
  a.name.localeCompare(b.name),
)) {
  const path = relative(process.cwd(), resolve(suite.name)).replaceAll(
    "\\",
    "/",
  );
  lines.push(
    `### [${path}](../${path}) — ${suite.assertionResults.length} casos`,
    "",
  );
  for (const test of suite.assertionResults)
    lines.push(`- ${test.fullName.replaceAll("`", "'")}`);
  lines.push("");
}
lines.push("## Playwright: recorridos de interfaz", "");
const byFile = Map.groupBy(e2e, (test) => test.file);
for (const [file, tests] of [...byFile].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  lines.push(
    `### [tests/e2e/${file}](../tests/e2e/${file}) — ${tests.length} casos`,
    "",
  );
  for (const test of tests)
    lines.push(
      `- ${test.title.replaceAll("`", "'")} ([línea ${test.line}](../tests/e2e/${file}#L${test.line}))`,
    );
  lines.push("");
}
lines.push(
  "## Alcance",
  "",
  "Los nombres documentan el comportamiento buscado, no sustituyen la revisión de las aserciones ni demuestran que un servicio externo real respondió. Las pruebas unitarias con dobles verifican contratos de código; las de navegador recorren la aplicación local; las pruebas de Firestore con emulador y las de campo tienen procedimientos distintos.",
  "",
);
writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(
  `Catálogo escrito: ${outputPath} (${unit.numTotalTests} unitarias, ${e2e.length} de navegador)`,
);
