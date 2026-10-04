import { expect, test } from "@playwright/test";

test("la memoria del Consejo permite consultar hitos y fuentes en móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/memoria/");
  const nav = page.getByRole("navigation", { name: "Secciones de comunidad" });
  await expect(nav.getByRole("link", { name: "El Consejo" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("heading", { name: "Línea de tiempo" }),
  ).toBeVisible();
  await expect(page.locator("ol li")).toHaveCount(18);
  await page.getByRole("button", { name: "Territorio", exact: true }).click();
  await expect(page.locator("ol li")).toHaveCount(5);
  await expect(
    page.getByRole("heading", { name: "Titulación colectiva del Río Satinga" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toda la historia" }).click();
  await page
    .getByRole("textbox", { name: "Buscar en la historia del Consejo" })
    .fill("Asamblea");
  await expect(page.locator("ol li")).toHaveCount(3);
  await page
    .getByRole("textbox", { name: "Buscar en la historia del Consejo" })
    .fill("sin coincidencia 394920");
  await expect(
    page.getByRole("status", { name: "" }).filter({ hasText: "No hay hitos" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar en la historia del Consejo" })
    .fill("");
  const source = page
    .getByRole("link", { name: /Abrir Constitución de 1991/ })
    .first();
  await expect(source).toHaveAttribute("href", /funcionpublica\.gov\.co/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});

test("la memoria explica la ley, los derechos y los tres consejos del municipio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/memoria/");
  const index = page.getByRole("navigation", { name: "En esta página" });
  await expect(index.getByRole("link")).toHaveCount(8);
  await expect(index.getByRole("link", { name: "Derechos" })).toHaveAttribute(
    "href",
    "#derechos",
  );
  for (const heading of [
    "Quién decide y quién ejecuta.",
    "Lo que respalda al Consejo.",
    "Un municipio, tres consejos.",
    "Cómo se llama cada cosa.",
    "Lo que solo el Consejo puede aportar.",
  ])
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  const own = page.locator("article", { hasText: "Este Consejo" });
  await expect(own).toContainText("Resolución 3292 · 18 de diciembre de 2000");
  await expect(own).toContainText("24.507,04 hectáreas");
  await expect(page.locator("article", { hasText: "Gualmar" })).toContainText(
    "5.787,73 hectáreas",
  );
  await expect(
    page
      .getByRole("link", { name: /Abrir Ley 21 de 1991 · Convenio 169/ })
      .first(),
  ).toHaveAttribute("href", /funcionpublica\.gov\.co/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});

test("el banco de consulta abre sin internet después de instalar la PWA", async ({
  page,
  context,
}) => {
  await page.goto("/memoria/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Línea de tiempo" }),
  ).toBeVisible();
  await context.setOffline(false);
});
