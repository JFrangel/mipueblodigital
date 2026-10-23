import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

// Auditoría estática: las rutas de Next y los generadores son entradas válidas.
// Una candidatura requiere revisión; no se borran archivos automáticamente.
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile).config;
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ".");
function codeFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return codeFiles(file);
    return /\.(?:[cm]?js|jsx|ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
      ? [path.resolve(file)]
      : [];
  });
}
// El inventario no depende de que tsconfig incluya los archivos JavaScript.
const sources = codeFiles("src");
const scripts = codeFiles("scripts");
function isNextEntry(file) {
  const relative = path.relative(".", file).replaceAll("\\", "/");
  if (
    /^src\/(proxy|middleware|instrumentation|instrumentation-client|mdx-components)\.[jt]sx?$/.test(
      relative,
    )
  )
    return true;
  if (relative.startsWith("src/pages/")) return true;
  if (!relative.startsWith("src/app/")) return false;
  const parts = relative.split("/");
  if (parts.slice(2, -1).some((part) => part.startsWith("_"))) return false;
  return /^(page|layout|loading|error|not-found|global-error|global-not-found|route|template|default|forbidden|unauthorized|sitemap|robots|manifest|icon|apple-icon|opengraph-image|twitter-image)\.[jt]sx?$/.test(
    path.basename(file),
  );
}
const edges = new Map();
const unresolved = [];
for (const file of [...sources, ...scripts]) {
  const info = ts.preProcessFile(fs.readFileSync(file, "utf8"), true, true);
  edges.set(
    file,
    info.importedFiles
      .map(({ fileName }) => {
        const resolved = ts.resolveModuleName(
          fileName,
          file,
          parsed.options,
          ts.sys,
        ).resolvedModule?.resolvedFileName;
        if (
          !resolved &&
          (fileName.startsWith(".") || fileName.startsWith("@/")) &&
          !/\.(css|scss|sass|less|png|webp|jpe?g|gif|svg|ico|json|woff2?)(\?.*)?$/.test(
            fileName,
          )
        )
          unresolved.push(`${path.relative(".", file)} → ${fileName}`);
        return resolved;
      })
      .filter(Boolean)
      .map((file) => path.resolve(file)),
  );
}
const reached = new Set();
function visit(file) {
  if (reached.has(file)) return;
  reached.add(file);
  for (const dependency of edges.get(file) ?? []) visit(dependency);
}
for (const file of [...sources, ...scripts]) {
  if (scripts.includes(file) || isNextEntry(file)) visit(file);
}
const candidates = sources.filter((file) => !reached.has(file));
console.log(`Fuentes de src revisadas: ${sources.length}.`);
if (unresolved.length) {
  console.log("Imports locales sin resolver:");
  for (const entry of unresolved) console.log(entry);
  process.exitCode = 1;
}
if (candidates.length) {
  console.log("Módulos que requieren revisión:");
  for (const file of candidates) console.log(path.relative(".", file));
  process.exitCode = 1;
} else if (!unresolved.length) {
  console.log(
    "Sin módulos fuera del grafo de entradas de Next y scripts auditados.",
  );
}
