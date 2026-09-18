import { expect, test } from "@playwright/test";
import { openDetails } from "./report-flow";

/**
 * Intentar enviar sin haber entrado no puede costar lo escrito.
 *
 * Antes, el formulario contestaba «Inicia sesión antes de preparar envíos» y
 * ahí se quedaba: lo escrito solo vivía en la memoria de esa pestaña, así que
 * quien hacía caso al mensaje y se iba a entrar volvía con todo en blanco,
 * incluida la fotografía. Pedirle a alguien que escriba dos veces lo que acaba
 * de pasarle en el río es la mejor forma de que no lo escriba una tercera.
 *
 * Va a la **bandeja de envíos** y no a un borrador, y eso tiene su razón: el
 * borrador es uno solo, así que el segundo reporte pisaba al primero sin
 * avisar. La bandeja es una lista y admite varios.
 */
test("enviar sin sesión deja el reporte esperando y lleva al acceso", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDetails(page);
  await page
    .getByPlaceholder(
      "Describe qué ocurrió, cuándo y cómo afecta a tu comunidad.",
    )
    .fill("El muelle de tablas está partido y la gente pasa por encima igual.");
  await page
    .getByLabel("Evidencia fotográfica", { exact: true })
    .setInputFiles("public/brand/territorio.webp");
  await expect(page.getByText("Fotografía adjunta · cambiar")).toBeVisible();

  /* De «Detalles» a «Revisar», que es donde vive el botón de enviar. Se
     reintenta el avance como hace report-flow.ts: el HTML estático se pinta
     antes de hidratar y un clic puede caer en el vacío. */
  const enviar = page.getByRole("button", { name: "Enviar al Consejo" });
  await expect(async () => {
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(enviar).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  await enviar.click();

  /* Acaba en el acceso, y el acceso sabe a qué vino. */
  await page.waitForURL(/\/acceso\//, { timeout: 20000 });
  await expect(page).toHaveURL(/volver=reporte/);

  /* Y el reporte quedó en la bandeja de este dispositivo, a nombre de nadie
     porque todavía no lo tiene. Se mira en IndexedDB, que es donde vive. */
  const esperando = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const abrir = indexedDB.open("mi-pueblo-outbox");
        abrir.onsuccess = () => {
          const db = abrir.result;
          const pedir = db
            .transaction("reports", "readonly")
            .objectStore("reports")
            .getAll();
          pedir.onsuccess = () =>
            resolve(
              (pedir.result as Array<{ owner: string }>).map((e) => e.owner),
            );
          pedir.onerror = () => resolve([]);
        };
        abrir.onerror = () => resolve([]);
      }),
  );
  expect(esperando).toContain("sin-cuenta");
});

/**
 * Y el acceso, cuando se llega desde ahí, no manda a la portada.
 *
 * Quien llegó porque intentó enviar venía haciendo algo; dejarlo en «Continuar
 * a mi comunidad» le obliga a buscar otra vez el camino de vuelta. Esta prueba
 * fija además que la pantalla cargue con ese parámetro: leer la dirección en
 * una página prerenderizada la tumbaba hasta envolverla en Suspense.
 */
test("el acceso con volver=reporte carga y ofrece entrar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/acceso/?volver=reporte");
  await expect(
    page.getByRole("button", { name: /entrar|iniciar sesión/i }).first(),
  ).toBeVisible();
});
