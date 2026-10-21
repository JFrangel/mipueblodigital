import { expect, test } from "@playwright/test";
import { extractText, getDocumentProxy } from "unpdf";
import { manualCiudadano } from "../../src/content/manual-ciudadano";
import { manualConsejo } from "../../src/content/manual-consejo";
import { fechaLarga } from "../../src/content/manuales";

/**
 * La sección de manuales: lo que se lee, lo que se descarga y lo que se reserva.
 *
 * Los PDF son archivos estáticos que se generan aparte, así que aquí se
 * comprueba que **se sirven** y que son el manual que dicen ser; que su
 * contenido coincida con el texto actual lo vigila `tests/unit/manuales.test.ts`.
 */

test("la página de manuales ofrece el del ciudadano y reserva el del Consejo", async ({
  page,
}) => {
  await page.goto("/manuales/");
  await expect(
    page.getByRole("heading", { name: "Manuales", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Manual del ciudadano" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Leer" })).toHaveAttribute(
    "href",
    "/manuales/ciudadano/",
  );
  await expect(
    page.getByRole("link", { name: "Descargar PDF" }),
  ).toHaveAttribute("href", "/manuales/manual-ciudadano.pdf");
  // Sin la cuenta del Consejo no se enlaza ni se descarga el otro.
  await expect(
    page.getByText("Es para quienes trabajan en el Consejo."),
  ).toBeVisible();
  await expect(page.locator('a[href*="consejo"]')).toHaveCount(0);
});

test("el manual del ciudadano se lee con su índice y cada capítulo", async ({
  page,
}) => {
  await page.goto("/manuales/ciudadano/");
  await expect(
    page.getByRole("heading", { name: manualCiudadano.titulo, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText(`Actualizado el ${fechaLarga(manualCiudadano.fecha)}`),
  ).toBeVisible();

  // El índice de pantalla son las pastillas: una por capítulo.
  const indice = page.getByRole("navigation", { name: "En este manual" });
  await expect(indice.getByRole("link")).toHaveCount(
    manualCiudadano.capitulos.length,
  );
  await expect(page.locator("section[id]")).toHaveCount(
    manualCiudadano.capitulos.length,
  );
  // Llevan al capítulo.
  const ultimo = manualCiudadano.capitulos.at(-1)!;
  await indice.getByRole("link", { name: ultimo.titulo }).click();
  await expect(page).toHaveURL(new RegExp(`#${ultimo.id}$`));
  await expect(
    page.getByRole("heading", { name: ultimo.titulo, level: 2 }),
  ).toBeInViewport();

  // Descarga el PDF por la barra de arriba y por la portada.
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toHaveCount(
    2,
  );
});

test("el manual del ciudadano no se sale de la pantalla del teléfono", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const ruta of ["/manuales/", "/manuales/ciudadano/"]) {
    await page.goto(ruta);
    const [ancho, visible] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(ancho, ruta).toBeLessThanOrEqual(visible);
  }
});

test("el manual del Consejo no llega a quien no es del Consejo", async ({
  page,
  request,
}) => {
  await page.goto("/manuales/consejo/");
  await expect(
    page.getByText("Este manual es para quienes trabajan en el Consejo."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: manualConsejo.titulo, level: 1 }),
  ).toHaveCount(0);
  // Ni siquiera va en el HTML que recibe cualquiera: el contenido se pide con
  // el código de la pantalla, y esa solo lo dibuja con el rol puesto.
  const html = await (await request.get("/manuales/consejo/")).text();
  expect(html).not.toContain(manualConsejo.capitulos[0].titulo);
});

test("la ruta que imprime los PDF no existe fuera de quien los genera", async ({
  request,
}) => {
  for (const id of ["ciudadano", "consejo"])
    expect((await request.get(`/manuales/impresion/${id}/`)).status(), id).toBe(
      404,
    );
});

test("los buscadores no ven el manual del Consejo ni la ruta de impresión", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Allow: /manuales/");
  expect(robots).toContain("Disallow: /manuales/consejo/");
  expect(robots).toContain("Disallow: /manuales/impresion/");
});

test("los PDF se sirven y son los manuales", async ({ request }) => {
  for (const manual of [manualCiudadano, manualConsejo]) {
    const respuesta = await request.get(`/manuales/manual-${manual.id}.pdf`);
    expect(respuesta.status(), manual.id).toBe(200);
    expect(respuesta.headers()["content-type"]).toContain("application/pdf");
    const cuerpo = await respuesta.body();
    expect(cuerpo.subarray(0, 5).toString()).toBe("%PDF-");
    // Un PDF de pocos KB sería un manual vacío.
    expect(cuerpo.length).toBeGreaterThan(200_000);
    const documento = await getDocumentProxy(new Uint8Array(cuerpo));
    const { text } = await extractText(documento, { mergePages: false });
    // La portada se reconoce por su pie: pdf.js pierde alguna «s» de las letras
    // grandes del título aunque el PDF las lleva (poppler y MuPDF las leen bien).
    expect(text[0].replaceAll(/\s+/g, " ")).toContain(
      `Actualizado el ${fechaLarga(manual.fecha)}`,
    );
  }
});

test("imprimir la página del manual da un cuadernillo, no una pantalla", async ({
  page,
}) => {
  await page.goto("/manuales/ciudadano/");
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });
  // Sin la barra de arriba ni los botones: son de pantalla.
  await expect(
    page.getByRole("link", { name: "Descargar PDF" }).first(),
  ).toBeHidden();
  const pdf = await page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
  });
  const documento = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(documento, { mergePages: false });
  expect(text[0].replaceAll(/\s+/g, " ")).toContain(
    `Actualizado el ${fechaLarga(manualCiudadano.fecha)}`,
  );
  // Portada, índice y al menos un capítulo por hoja y media.
  expect(text.length).toBeGreaterThan(manualCiudadano.capitulos.length);
  for (const [i, hoja] of text.entries())
    expect(
      hoja.trim().length,
      `la hoja ${i + 1} está en blanco`,
    ).toBeGreaterThan(40);
});

test("«Manuales» está en la columna de herramientas", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/inicio/");
  await page.getByRole("link", { name: "Manuales", exact: true }).click();
  await expect(page).toHaveURL(/\/manuales\/$/);
});
