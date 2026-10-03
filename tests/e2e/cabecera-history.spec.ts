import { expect, test } from "@playwright/test";
import { historySeeds } from "../../src/domain/council-history";
import { openLocation } from "./report-flow";

test("la API editorial de historia exige sesión administrativa", async ({
  request,
}) => {
  expect((await request.get("/api/admin/history/")).status()).toBe(401);
  expect(
    (
      await request.put("/api/admin/history/new-entry/", {
        data: historySeeds[0],
      })
    ).status(),
  ).toBe(401);
});

test("la cabecera se encuentra buscando el municipio y conserva el nombre del expediente", async ({
  page,
}) => {
  await openLocation(page);
  await page
    .getByRole("searchbox", { name: "Buscar vereda por nombre" })
    .fill("Olaya Herrera");
  const select = page.getByRole("combobox", { name: "Vereda", exact: true });
  await expect(select.locator("option[value='Bocas de Satinga']")).toHaveText(
    /cabecera municipal/,
  );
  await select.selectOption("Bocas de Satinga");
  await expect(select).toHaveValue("Bocas de Satinga");
  await expect(
    page.getByRole("button", { name: "Continuar", exact: true }),
  ).toBeEnabled();
});

test("la línea de tiempo ordena una publicación antigua y recupera su copia sin red", async ({
  page,
}) => {
  const inserted = {
    ...historySeeds[0],
    id: "historic-new",
    occurredOn: "1994-06",
    title: "Un hecho antiguo añadido hoy",
  };
  await page.route("**/api/history/", (route) =>
    route.fulfill({ json: { items: [inserted, ...historySeeds] } }),
  );
  await page.goto("/memoria/");
  await expect(page.locator("ol li")).toHaveCount(14);
  const titles = await page.locator("ol li h3").allTextContents();
  expect(titles.indexOf(inserted.title)).toBe(2);
  await expect(page.getByText("junio de 1994", { exact: true })).toBeVisible();
  await page.route("**/api/history/", (route) => route.abort());
  await page.reload();
  await expect(
    page.getByRole("heading", { name: inserted.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Copia guardada" }),
  ).toBeVisible();
});
