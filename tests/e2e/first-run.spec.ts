import { test, expect } from "@playwright/test";
import { openDetails, openLocation } from "./report-flow";

test("la bienvenida se muestra la primera vez y después abre el inicio", async ({
  page,
}) => {
  // Contexto nuevo: nadie ha visitado todavía.
  await page.goto("/");
  await expect(page).toHaveURL(/\/bienvenida\//);
  await expect(
    page.getByRole("heading", {
      name: "Tu voz. Tu territorio. Nuestra comunidad.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Comenzar", exact: true }).click();
  await expect(page).toHaveURL(/\/inicio\//);

  // La segunda vez la raíz ya no pasa por la presentación.
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tu voz hace la diferencia." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("elegir vereda muestra su punto documentado y avisa cuando no lo hay", async ({
  page,
}) => {
  await openLocation(page);
  const vereda = page.getByRole("combobox", { name: "Vereda", exact: true });

  // Cartografía abierta: se dice que no la validó el Consejo.
  await vereda.selectOption("Bellavista");
  await expect(page.getByText("2.2356° N", { exact: false })).toBeVisible();
  await expect(
    page.getByText("cartografía abierta", { exact: false }),
  ).toBeVisible();

  // Coordenada oficial: se nombra la fuente, porque no todas valen igual.
  await vereda.selectOption("Boca de Víbora");
  await expect(page.getByText("2.3400° N", { exact: false })).toBeVisible();
  await expect(
    page.getByText("Punto oficial del DANE", { exact: false }),
  ).toBeVisible();

  // Deducida de la escuela: se invita a moverla si el caso está lejos.
  await vereda.selectOption("Codemaco");
  await expect(
    page.getByText("escuela rural que lleva el nombre", { exact: false }),
  ).toBeVisible();

  // Una vereda sin punto documentado no inventa coordenadas.
  await vereda.selectOption("Cañas");
  await expect(
    page.getByText("Sin punto de referencia documentado"),
  ).toBeVisible();
  await expect(page.getByText("2.2356° N", { exact: false })).toHaveCount(0);
});

test("la ayuda de redacción acompaña al recuento de palabras", async ({
  page,
}) => {
  await openDetails(page);
  const row = page.locator(".composer-meta");
  await expect(row.getByText("0 / 500 palabras")).toBeVisible();
  const help = row.getByRole("button", { name: "Mejorar redacción con IA" });
  await expect(help).toBeVisible();

  // Con el cuadro vacío no hay relato que corregir: la ayuda dice por qué.
  await expect(help).toBeDisabled();
  await expect(row).toContainText("al menos 12 palabras");

  // Con texto suficiente se habilita y el aviso pasa a ser el de privacidad.
  await page
    .getByRole("textbox", { name: "Descripción" })
    .fill(
      "El alumbrado de la calle principal del malecon esta apagado desde hace tres semanas",
    );
  await expect(row.getByText("14 / 500 palabras")).toBeVisible();
  await expect(help).toBeEnabled();
  await expect(row).toContainText("La IA recibe solo esta descripción");
});

test("el mapa permite corregir la ubicación y volver al punto de la vereda", async ({
  page,
}) => {
  await openLocation(page);
  await page
    .getByRole("combobox", { name: "Vereda", exact: true })
    .selectOption("Bellavista");

  const coords = page.locator(".located-head small");
  await expect(coords).toHaveText(/2\.2356° N/);
  const map = page.locator(".located-map");
  // Leaflet se carga bajo demanda: hasta que dibuja su marcador no hay a qué
  // hacer clic, y el clic perdido no deja rastro.
  await expect(map).toHaveClass(/leaflet-container/);
  await expect(page.locator(".leaflet-overlay-pane path")).toBeVisible();

  // Tocar el mapa marca el sitio exacto y lo anuncia como no verificado.
  await expect(async () => {
    const box = (await map.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.65);
    await expect(coords).not.toHaveText(/2\.2356° N/, { timeout: 1500 });
  }).toPass({ timeout: 15000 });
  await expect(
    page.getByText("Ubicación marcada por ti", { exact: false }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Volver al punto de la vereda" })
    .click();
  await expect(coords).toHaveText(/2\.2356° N/);
});
