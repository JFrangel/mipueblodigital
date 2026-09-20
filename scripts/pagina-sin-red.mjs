import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

/**
 * Arma la página que el APK enseña cuando todavía no ha visto la red.
 *
 * **Lo importante de este guion es lo que NO hace: duplicar lógica.** Esa
 * página tiene que meter un reporte en la misma bandeja de envíos que usa la
 * aplicación, con la misma clave, la misma fotografía preparada igual y las
 * mismas validaciones. Reescribir todo eso a mano sería garantizar que un día
 * se desincronice, y el síntoma de esa desincronización es el peor que hay
 * aquí: **el reporte se escribe y no lo recoge nadie**.
 *
 * Así que se inlinan los módulos de verdad. Pueden hacerlo porque no tienen
 * dependencias en tiempo de ejecución —solo `territory` importa de
 * `territorial-sources`, y van en ese orden— y **si algún día las tienen, esto
 * se detiene** en vez de dejar pasar una página rota. Ese guardián es la mitad
 * del valor de este archivo.
 *
 * Escribe en la copia que hace `cap sync`, que git ignora, no en
 * `capacitor/www/`. Así ni la dirección del servidor ni el volcado de los
 * módulos quedan en el repositorio.
 */

const url = process.env.MPD_APP_URL;
if (!url) {
  console.error(
    "Falta MPD_APP_URL. Es la misma que pide `cap sync`: ejecútalos juntos.",
  );
  process.exit(1);
}

/** En orden: cada uno solo puede usar lo que ya se declaró antes. */
const MODULOS = [
  { ruta: "src/data/territorial-sources.ts", nombre: "Fuentes" },
  { ruta: "src/domain/territory.ts", nombre: "Territorio", usa: ["Fuentes"] },
  { ruta: "src/domain/logic.ts", nombre: "Logica" },
  { ruta: "src/platform/evidence.ts", nombre: "Evidencia" },
  { ruta: "src/data/outbox.ts", nombre: "Bandeja" },
];

/** Qué exporta un módulo, para poder devolverlo desde su envoltorio. */
function exportados(fuente) {
  const nombres = new Set();
  for (const [, nombre] of fuente.matchAll(
    /^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm,
  ))
    nombres.add(nombre);
  return [...nombres];
}

/**
 * Un módulo, envuelto en su propio ámbito.
 *
 * El envoltorio no es adorno: dos de estos archivos declaran constantes con
 * nombres parecidos —`MAX_BYTES` y `OUTBOX_BYTES`— y juntarlos en un solo
 * ámbito sería esperar a que un día coincidan y se pisen sin avisar.
 */
function envolver({ ruta, nombre, usa = [] }) {
  if (!existsSync(ruta)) {
    console.error(`No existe ${ruta}. ¿Se movió?`);
    process.exit(1);
  }
  const fuente = readFileSync(ruta, "utf8");

  /**
   * El guardián.
   *
   * Un `import` que no sea de tipos, y que no venga de un módulo ya inlinado
   * más arriba, significa que este archivo dejó de ser autosuficiente y que la
   * página quedaría a medias. Se mira la sentencia entera y no línea a línea,
   * porque estos imports ocupan varias —lo cazó él mismo la primera vez que
   * corrió—.
   */
  for (const [sentencia, de] of fuente.matchAll(
    /^import\s[\s\S]*?from\s+["']([^"']+)["']/gm,
  )) {
    if (/^import\s+type\s/.test(sentencia)) continue;
    /* Vale si viene de un módulo que ya está declarado antes que este. */
    if (usa.some((n) => de.toLowerCase().includes(archivoDe(n)))) continue;
    console.error(
      `${ruta} ya no es autosuficiente:\n  importa de «${de}»\n\n` +
        "La página sin red inlina este módulo y no puede resolver importaciones.\n" +
        "O se quita esa dependencia, o esa parte deja de compartirse y hay que\n" +
        "decidir a mano qué hace la página. No se sigue a ciegas.",
    );
    process.exit(1);
  }

  const js = ts.transpileModule(fuente, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      removeComments: false,
    },
  }).outputText;

  /* Fuera las importaciones y las reexportaciones: lo que hace falta ya está
     declarado más arriba, en el ámbito del guion. */
  const cuerpo = js
    .split(/\r?\n/)
    .filter((l) => !/^\s*import\s/.test(l) && !/^\s*export\s*\{/.test(l))
    .join("\n")
    .replace(/^export\s+/gm, "");

  const devuelve = exportados(fuente);
  const dependencias = usa.map((n) => `const { ${exportadosDe(n)} } = ${n};`);
  return `const ${nombre} = (() => {\n${dependencias.join("\n")}\n${cuerpo}\nreturn { ${devuelve.join(", ")} };\n})();`;
}

/** Lo que un módulo ya procesado pone a disposición del siguiente. */
const yaExportados = new Map();
function exportadosDe(nombre) {
  return (yaExportados.get(nombre) ?? []).join(", ");
}

/** El nombre de archivo de un módulo, para reconocer sus importaciones. */
function archivoDe(nombre) {
  const modulo = MODULOS.find((m) => m.nombre === nombre);
  return modulo ? modulo.ruta.split("/").pop().replace(/\.ts$/, "") : nombre;
}

const piezas = [];
for (const modulo of MODULOS) {
  const { ruta, nombre } = modulo;
  yaExportados.set(nombre, exportados(readFileSync(ruta, "utf8")));
  piezas.push(envolver(modulo));
}

const destino = "android/app/src/main/assets/public/index.html";
if (!existsSync(destino)) {
  console.error(`No existe ${destino}. Esto va después de \`cap sync\`.`);
  process.exit(1);
}

const marca = "<!--MODULOS-->";
const pagina = readFileSync(destino, "utf8");
if (!pagina.includes(marca)) {
  console.error(`${destino} no lleva ${marca}. Mira capacitor/www/index.html.`);
  process.exit(1);
}

writeFileSync(
  destino,
  pagina.replace(
    marca,
    `<script>window.MPD_APP=${JSON.stringify(url)};\n${piezas.join("\n")}\nwindow.MPD = { Territorio, Logica, Evidencia, Bandeja };\n</script>`,
  ),
);
console.log(
  `  ${destino} ← ${url} y ${MODULOS.length} módulos (${piezas.join("").length} bytes)`,
);
