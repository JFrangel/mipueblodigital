import { test, expect } from "@playwright/test";
import { chooseCategory, openDetails } from "./report-flow";

test("abrir un comunicado lleva a su pantalla de lectura con enlace propio", async ({
  page,
}) => {
  await page.goto("/comunidad/");
  // El feed se llena desde el servidor: hay que esperar a que responda.
  await expect(page.getByText("Cargando comunicados…")).toHaveCount(0);
  const cards = page.locator(".news-card");
  await expect(cards.first()).toBeVisible();

  const title = (await cards.first().locator("h2").innerText()).trim();
  // El feed se pinta antes de hidratar: el primer clic puede perderse.
  await expect(async () => {
    await cards.first().click();
    await expect(page).toHaveURL(/\/noticia\//, { timeout: 3000 });
  }).toPass({ timeout: 15000 });

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator(".bulletin .news-art")).toBeVisible();
  await expect(page.getByRole("button", { name: "Compartir" })).toBeVisible();

  await page.getByRole("link", { name: "Volver a la comunidad" }).click();
  await expect(page).toHaveURL(/\/comunidad\//);
});

test("un comunicado largo se lee con sus apartados, listas, citas e imágenes", async ({
  page,
}) => {
  await page.goto("/noticia/jornada-de-limpieza-del-rio/");
  const body = page.locator(".bulletin-body");
  await expect(body).toBeVisible();

  // Las marcas del editor llegan como elementos, nunca como asteriscos sueltos.
  await expect(body.locator("h2").first()).toHaveText("Qué se hizo");
  await expect(body.locator("strong").first()).toContainText("catorce puntos");
  await expect(body.locator("ul li")).toHaveCount(2);
  await expect(body.locator("blockquote")).toContainText(
    "se corrige entre todos",
  );
  await expect(body).not.toContainText("**");
  await expect(body).not.toContainText("## ");

  // Las imágenes viven aparte del documento y se sirven por la aplicación.
  const gallery = page.locator(".bulletin-gallery img");
  await expect(gallery.first()).toBeVisible();
  // Que decodifique es la prueba de que los bytes viajaron enteros.
  await expect
    .poll(() => gallery.first().evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);

  // La columna lateral trae el índice del propio texto; la firma cierra abajo.
  const rail = page.locator(".bulletin-rail");
  await expect(rail.getByRole("link", { name: "Lo que falta" })).toBeVisible();
  await rail.getByRole("link", { name: "Cómo participar" }).click();
  await expect(page).toHaveURL(/#como-participar$/);

  const sign = page.locator(".bulletin-meta > .rail-sign");
  await expect(sign.locator("span")).toHaveText(
    "Gran Consejo Comunitario Río Satinga",
  );
  // Sin frase propia, el comunicado firma con una del repertorio.
  await expect(sign.locator("p")).not.toBeEmpty();

  // Ampliar es lo que hace visible el detalle del original sin recomprimir.
  await page.getByRole("button", { name: /^Ampliar/ }).first().click();
  const viewer = page.getByRole("dialog");
  await expect(viewer).toBeVisible();
  await expect(viewer.locator("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
});

test("un comunicado inexistente lo dice en vez de quedarse en blanco", async ({
  page,
}) => {
  await page.goto("/noticia/no-existe/");
  // Se apunta al aviso propio, no al anunciador de rutas del marco.
  await expect(page.locator("p.notice[role=alert]")).toContainText(
    "No pudimos abrir",
  );
});

test("los pasos recorridos del reporte se pueden reabrir", async ({ page }) => {
  await page.goto("/reportar/");
  await chooseCategory(page);
  // Un paso futuro no se puede abrir todavía.
  await expect(
    page.getByRole("button", { name: /^3\s*Detalles$/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "¿Dónde está ocurriendo?" }),
  ).toBeVisible();

  // El paso ya recorrido sí: volver no pierde lo elegido.
  await page.getByRole("button", { name: /^1?\s*Tipo$/ }).click();
  await expect(
    page.getByRole("heading", { name: "¿Qué tipo de situación es?" }),
  ).toBeVisible();
  await expect(page.locator("button.category.selected")).toHaveCount(1);

  // Y volver adelante también: retroceder no cierra la puerta de vuelta.
  await page.getByRole("button", { name: /Ubicación$/ }).click();
  await expect(
    page.getByRole("heading", { name: "¿Dónde está ocurriendo?" }),
  ).toBeVisible();
});

test("vaciar un paso anterior vuelve a cerrar los siguientes", async ({
  page,
}) => {
  await openDetails(page);

  // Desde Detalles se puede ir y venir mientras lo anterior siga completo.
  await page.getByRole("button", { name: /Ubicación$/ }).click();
  await expect(page.getByRole("button", { name: /Detalles$/ })).toBeEnabled();

  // Al borrar la vereda, Detalles deja de ser alcanzable aunque ya se visitó.
  await page
    .getByRole("combobox", { name: "Vereda", exact: true })
    .selectOption("");
  await expect(page.getByRole("button", { name: /Detalles$/ })).toBeDisabled();
});
