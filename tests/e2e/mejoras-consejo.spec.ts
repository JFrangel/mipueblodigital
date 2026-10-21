import { expect, test } from "@playwright/test";
import { openDetails, openLocation } from "./report-flow";

test("varias fotografías conservan el borrador y se pueden quitar individualmente", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDetails(page);
  await page
    .getByPlaceholder(
      "Describe qué ocurrió, cuándo y cómo afecta a tu comunidad.",
    )
    .fill("El muelle necesita revisión técnica");
  await page
    .getByLabel("Evidencia fotográfica", { exact: true })
    .setInputFiles(Array(5).fill("public/brand/territorio.webp"));
  await expect(page.locator(".evidence-gallery figure")).toHaveCount(5);
  await expect(
    page.getByLabel("Evidencia fotográfica", { exact: true }),
  ).toBeDisabled();
  await page
    .locator(".evidence-gallery figure")
    .nth(2)
    .getByRole("button", { name: "Quitar", exact: true })
    .click();
  await expect(page.locator(".evidence-gallery figure")).toHaveCount(4);
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Revisa antes de enviar." }),
  ).toBeVisible();
  await expect(page.locator(".evidence-gallery figure")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("la captura usa los nombres y la validación del catálogo guardado", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "mpd-catalogue-v1",
      JSON.stringify({
        version: 3,
        validated: { version: 3, at: "2026-10-21T12:00:00Z" },
        items: [
          {
            id: "nueva",
            name: "Vereda revisada por el Consejo",
            aliases: ["Nombre antiguo"],
            active: true,
            lat: 2.25,
            lng: -78.25,
          },
          {
            id: "retirada",
            name: "Vereda retirada",
            aliases: [],
            active: false,
          },
        ],
      }),
    ),
  );
  await openLocation(page);
  const select = page.getByRole("combobox", { name: "Vereda", exact: true });
  await expect(
    select
      .locator("option")
      .filter({ hasText: "Vereda revisada por el Consejo" }),
  ).toHaveCount(1);
  await expect(
    select.locator("option").filter({ hasText: "Vereda retirada" }),
  ).toHaveCount(0);
  await select.selectOption("Vereda revisada por el Consejo");
  await expect(
    page.getByText("Catálogo validado por el Consejo Comunitario.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("las rutas nuevas no permiten gestionar ni descargar sin sesión", async ({
  request,
}) => {
  for (const path of [
    "/api/admin/territorio/catalogo/",
    "/api/admin/incidents/export/",
    `/api/admin/incidents/${"a".repeat(64)}/events/12345678-1234-4234-8234-123456789abc/image/`,
  ]) {
    expect((await request.get(path)).status()).toBe(401);
  }
});
