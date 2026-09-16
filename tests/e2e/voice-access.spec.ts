import { test, expect } from "@playwright/test";
import { openDetails } from "./report-flow";
test("dictado se revisa y añade sin reemplazar el relato", async ({ page }) => {
  await page.addInitScript(() => {
    class Recognition {
      onresult?: (event: unknown) => void;
      onend?: () => void;
      start() {
        /* Como lo manda el navegador de verdad: `resultIndex` dice desde dónde
           es nuevo lo que llega. Sin él, el doble no representaba la API y
           dejaba pasar justo el fallo que se arregló —que en el teléfono se
           repetían las palabras—. */
        this.onresult?.({
          resultIndex: 0,
          results: [
            { isFinal: true, 0: { transcript: "El muelle está dañado." } },
          ],
        });
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: Recognition,
      configurable: true,
    });
  });
  await openDetails(page);
  const description = page.getByRole("textbox", {
    name: "Descripción",
    exact: true,
  });
  await description.fill("Desde ayer.");
  await page.getByRole("button", { name: "Activar micrófono" }).click();
  await expect(description).toHaveValue("Desde ayer. El muelle está dañado.");
  await page.getByRole("button", { name: "Detener dictado" }).click();
  await expect(
    page.getByRole("textbox", { name: "Revisar transcripción" }),
  ).toHaveCount(0);
  await expect(description).toHaveValue("Desde ayer. El muelle está dañado.");
  await page.getByRole("button", { name: "Deshacer último dictado" }).click();
  await expect(description).toHaveValue("Desde ayer.");
});
test("dictado no disponible conserva el formulario", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
    });
  });
  await openDetails(page);
  await page.getByRole("button", { name: "Activar micrófono" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "no admite dictado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Descripción", exact: true }),
  ).toBeEditable();
});
test("acceso móvil permite revisar contraseña y cambiar tema", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/acceso/");
  await page.getByLabel("Contraseña", { exact: true }).fill("prueba-local");
  await page
    .getByRole("button", { name: "Mostrar contraseña", exact: true })
    .click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Activar tema oscuro" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/acceso-dark-mobile.png",
    fullPage: true,
  });
});
test("noticias administrativas requieren autenticación", async ({
  request,
}) => {
  expect((await request.get("/api/admin/news/")).status()).toBe(401);
  expect(
    (await request.put("/api/admin/news/prueba/", { data: {} })).status(),
  ).toBe(401);
});
