import { test, expect } from "@playwright/test";
test("la interfaz de reportes abre sin señal después de instalar la PWA", async ({
  page,
  context,
}) => {
  await page.goto("/reportar/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Cuéntanos qué está pasando." }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Cuéntanos qué está pasando." }),
  ).toBeVisible();
  // El HTML estático se pinta antes de hidratar: reintentar hasta que el
  // formulario responda distingue «no hay interfaz» de «todavía no reacciona».
  await expect(async () => {
    await page.getByRole("button", { name: /Infraestructura/ }).click();
    await expect(page.locator("button.category.selected")).toHaveCount(1);
  }).toPass({ timeout: 15000 });
  /* Aquí sin reintentar el clic: la selección de arriba ya probó que el
     formulario responde, y un segundo «Continuar» avanzaría al paso siguiente
     y dejaría de verse justo el encabezado que se está esperando. Se le da
     margen a la comprobación, no al clic. */
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "¿Dónde está ocurriendo?" }),
  ).toBeVisible({ timeout: 15000 });
  await context.setOffline(false);
});

/**
 * Los comunicados, sin señal.
 *
 * Es lo que más sentido tiene leer en el río y era justo lo que no sobrevivía:
 * el armazón de la pantalla estaba en el caché, pero los datos venían de una
 * ruta de la API, y el worker descartaba la API entera.
 */
test("los comunicados se leen sin red y dicen que son una copia", async ({
  page,
  context,
}) => {
  await page.goto("/comunidad/");
  /* El worker se instala durante esta visita, pero todavía no gobierna la
     página: la consulta de comunicados iría directa a la red sin pasar por él,
     y no quedaría copia. Hay que esperarlo y recargar. */
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByText("Cargando comunicados…")).toHaveCount(0);
  const cards = page.locator(".news-card");
  await expect(cards.first()).toBeVisible();
  const titulo = (await cards.first().locator("h2").innerText()).trim();

  await context.setOffline(true);
  await page.reload();

  await expect(cards.first().locator("h2")).toHaveText(titulo);
  /* Y se dice que es una copia: un boletín sin esa nota parece de hoy. */
  await expect(page.locator(".offline-copy")).toContainText("copia guardada");
  await context.setOffline(false);
});
