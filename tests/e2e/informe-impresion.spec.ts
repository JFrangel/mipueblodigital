import { expect, test, type Page } from "@playwright/test";
import { extractText, getDocumentProxy } from "unpdf";
import { seedCases } from "./seed-cases";

/**
 * Lo que sale en cada hoja cuando se imprime Estadísticas.
 *
 * Sin esto, «Descargar informe» se rompió una vez en silencio: quien imprimía
 * con la cuenta del Consejo recibía **la primera hoja en blanco**. El panel de
 * cifras del territorio no tenía lugar en el orden de impresión, salía antes
 * que la portada y, siendo más alto que una hoja, el navegador lo empujaba a la
 * hoja siguiente. Las pruebas de impresión que había miraban si los elementos
 * eran visibles, no cómo se reparten en el papel, y eso solo se ve en el PDF.
 *
 * Aquí se genera el PDF de verdad —el mismo motor que el diálogo de imprimir
 * de Chrome— y se lee hoja por hoja.
 */

/**
 * El panel de cifras de todo el territorio y la lectura del asistente: lo que
 * se añade a la pantalla cuando quien mira es del Consejo.
 *
 * Se planta en el documento y no se pide al servidor porque estas pruebas no
 * tienen sesión de administración, y es justo lo que hace falta: un panel **más
 * alto que una hoja**, que es el que dejaba la primera en blanco. Lleva las
 * mismas clases que `CouncilStatistics` y `Statistics`; si cambian allí, esta
 * copia debe seguirlas.
 */
function panelesDelConsejo(veredas: number, categorias: number) {
  const fila = (i: number) =>
    `<tr><td>Vereda ${i}</td><td>${10 + i}</td><td>${4 + i}</td><td>${i % 3}</td><td>${40 + i} %</td></tr>`;
  const barra = (i: number) =>
    `<li><span>Categoría ${i}<small>${8 + i}</small></span><i><em class="pendiente" style="flex-grow:3"></em><em class="resuelto" style="flex-grow:4"></em></i></li>`;
  const metrica = (texto: string) =>
    `<article class="metric"><strong>4 días</strong><small>${texto}</small></article>`;
  const consejo = `
    <section class="panel council-stats">
      <span class="eyebrow">CONSEJO COMUNITARIO · TODO EL TERRITORIO</span>
      <h2>Dónde está el trabajo.</h2>
      <p>Lo que el servidor tiene de toda la comunidad, no solo de este dispositivo.</p>
      <ul class="council-alerts">
        ${[1, 2, 3, 4, 5, 6, 7].map((i) => `<li class="alert-atencion"><span>Hay ${i} reportes abiertos sin responsable en la vereda ${i}.</span></li>`).join("")}
      </ul>
      <div class="metrics council-metrics">
        ${["Sin responsable", "Lo que más espera", "Espera mediana", "Hasta cerrar"].map(metrica).join("")}
      </div>
      <div class="council-split">
        <div class="panel-heading"><h3>Cuánto se tarda en cerrar</h3></div>
        <ul class="council-figures"><li><b>9 días</b><span>de media</span></li></ul>
      </div>
      <div class="council-splits">
        <div class="council-split wide">
          <div class="panel-heading"><h3>Por vereda</h3></div>
          <table class="council-table"><tbody>${Array.from({ length: veredas }, (_, i) => fila(i + 1)).join("")}</tbody></table>
        </div>
        <div class="council-split wide">
          <div class="panel-heading"><h3>Por categoría</h3></div>
          <ul class="council-stack">${Array.from({ length: categorias }, (_, i) => barra(i + 1)).join("")}</ul>
        </div>
      </div>
    </section>`;
  const lectura = `
    <section class="insight-panel">
      <div class="insight-heading"><div><h2>De los números a las preguntas.</h2></div></div>
      <ul class="reading">${[1, 2, 3, 4, 5, 6].map((i) => `<li>Una frase de la lectura número ${i}, sostenida por un cálculo.</li>`).join("")}</ul>
    </section>`;
  return consejo + lectura;
}

/** El texto de cada hoja del PDF que saldría al imprimir esta pantalla. */
async function hojasImpresas(page: Page): Promise<string[]> {
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
  });
  const documento = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(documento, { mergePages: false });
  return text;
}

test("imprimir las estadísticas abre con la portada en la primera hoja", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/estadisticas/");
  await expect(page.locator(".metrics .metric").first()).toBeVisible();

  const hojas = await hojasImpresas(page);
  expect(hojas.length).toBeGreaterThanOrEqual(2);
  expect(hojas[0]).toContain("Informe del observatorio comunitario");
  // El aviso de «sin sesión» matiza el informe: va después de la portada, no antes.
  expect(hojas[0].indexOf("Informe del observatorio")).toBeLessThan(
    hojas[0].indexOf("Sin sesión"),
  );
  for (const [i, hoja] of hojas.entries())
    expect(
      hoja.trim().length,
      `la hoja ${i + 1} está en blanco`,
    ).toBeGreaterThan(60);
});

test("con las cifras del Consejo la primera hoja tampoco sale en blanco", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/estadisticas/");
  await expect(page.locator(".metrics .metric").first()).toBeVisible();
  await page.evaluate(
    (html) => {
      document
        .querySelector("main.main-content")!
        .insertAdjacentHTML("beforeend", html);
    },
    panelesDelConsejo(18, 12),
  );

  const hojas = await hojasImpresas(page);
  const todo = hojas.join("\n");
  // Un panel que ocupa más de una hoja se reparte: no se queda esperando una
  // hoja nueva dejando la anterior vacía.
  expect(hojas.length).toBeGreaterThanOrEqual(4);
  expect(hojas[0]).toContain("Informe del observatorio comunitario");
  for (const [i, hoja] of hojas.entries())
    expect(
      hoja.trim().length,
      `la hoja ${i + 1} está en blanco`,
    ).toBeGreaterThan(60);
  // Primero la portada y la lectura; las cifras del territorio, después.
  expect(todo.indexOf("Informe del observatorio")).toBeLessThan(
    todo.indexOf("De los números a las preguntas"),
  );
  expect(todo.indexOf("De los números a las preguntas")).toBeLessThan(
    todo.indexOf("Dónde está el trabajo"),
  );
  // Y lo que va en hoja propia sigue yendo: la espera empieza en una limpia.
  expect(todo.indexOf("Dónde está el trabajo")).toBeLessThan(
    todo.indexOf("Lo que lleva más esperando"),
  );
});
