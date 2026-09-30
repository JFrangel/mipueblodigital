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
  await expect(page.locator("ol li")).toHaveCount(13);
  await page.getByRole("button", { name: "Territorio", exact: true }).click();
  await expect(page.locator("ol li")).toHaveCount(3);
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
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "No hay hitos" })).toBeVisible();
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
