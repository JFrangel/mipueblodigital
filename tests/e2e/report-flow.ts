import { expect, type Page } from "@playwright/test";

/**
 * Preámbulo del formulario de reporte, compartido por las pruebas que
 * necesitan llegar a un paso concreto.
 *
 * El HTML estático se pinta antes de hidratar, así que con la máquina cargada
 * un clic puede caer en el vacío. Cada avance se comprueba contra la pantalla
 * que debía aparecer y se reintenta si no llegó: es la diferencia entre una
 * prueba que falla una vez de cada veinte y una que dice la verdad.
 */
async function advance(page: Page, expected: RegExp) {
  await expect(async () => {
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByRole("heading", { name: expected })).toBeVisible({
      timeout: 2000,
    });
  }).toPass({ timeout: 15000 });
}

/** Paso 1: elegir categoría. Deja el formulario en «Tipo» con una marcada. */
export async function chooseCategory(page: Page) {
  await expect(async () => {
    await page
      .getByRole("button", { name: /Infraestructura Alumbrado/ })
      .click();
    await expect(page.locator("button.category.selected")).toHaveCount(1, {
      timeout: 2000,
    });
  }).toPass({ timeout: 15000 });
}

/** Deja el formulario abierto en «Ubicación», con la categoría ya elegida. */
export async function openLocation(page: Page) {
  await page.goto("/reportar/");
  await expect(async () => {
    // La hidratación puede reemplazar la selección inicial después del clic.
    // Elegir de nuevo en cada intento evita avanzar con la categoría vacía.
    await chooseCategory(page);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /¿Dónde está ocurriendo\?/ }),
    ).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
}

/** Deja el formulario abierto en «Detalles», con tipo y vereda elegidos. */
export async function openDetails(page: Page, vereda = "Bellavista") {
  await openLocation(page);
  await page
    .getByRole("combobox", { name: "Vereda", exact: true })
    .selectOption(vereda);
  await advance(page, /Los detalles hacen la diferencia\./);
}
