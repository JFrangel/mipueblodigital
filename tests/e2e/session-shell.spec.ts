import { test, expect } from "@playwright/test";
import { seedCases } from "./seed-cases";
import { openLocation } from "./report-flow";

test("sin sesión el shell no finge una identidad ni ofrece gestión", async ({
  page,
}) => {
  await page.goto("/inicio/");
  const menu = page.getByRole("navigation", { name: "Principal" });
  await expect(menu).toBeVisible();
  // HU-12.1: la gestión del Consejo no se ofrece a quien no tiene el rol.
  await expect(
    page.getByRole("link", { name: "Panel del Consejo" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Sin sesión iniciada")).toBeVisible();
  await expect(page.getByText("José Padilla")).toHaveCount(0);
});

test("la bandeja de novedades explica que es personal", async ({ page }) => {
  await page.goto("/inicio/");
  await page.getByRole("button", { name: "Notificaciones" }).click();
  await expect(
    page.getByText("Inicia sesión para recibir avisos sobre tus reportes."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tus novedades" }),
  ).toHaveCount(0);
  // Tocar fuera del panel también lo cierra.
  await page.getByRole("button", { name: "Notificaciones" }).click();
  await expect(
    page.getByRole("heading", { name: "Tus novedades" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar novedades" }).click();
  await expect(
    page.getByRole("heading", { name: "Tus novedades" }),
  ).toHaveCount(0);
});

/**
 * La dirección del Consejo sin el rol.
 *
 * Caía en una consola de gestión sobre las copias de este aparato: «Espacio de
 * gestión», «Bandeja de incidencias», estado y responsable. Nada de eso salía
 * del navegador, no le servía a nadie, y bajo una dirección que dice «admin»
 * hacía creer que se tenían permisos que no se tienen.
 */
test("la dirección del Consejo sin el rol lo dice y ofrece salida", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/admin/");
  // Nada del Consejo: ni la bandeja del servidor, ni sus pestañas, ni el
  // asistente ni el editor de comunicados.
  await expect(
    page.getByRole("heading", { name: "Expedientes recibidos" }),
  ).toHaveCount(0);
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Analizar reportes remotos" }),
  ).toHaveCount(0);
  // Ni la consola que había antes en su lugar.
  await expect(page.getByText("Espacio de gestión")).toHaveCount(0);
  await expect(page.getByText("Gestión local")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Alumbrado en el malecón/ }),
  ).toHaveCount(0);
  // Lo que sí hay: por qué no se entra, y por dónde seguir.
  await expect(
    page.getByRole("heading", { name: "Esta pantalla es del Consejo" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver mis reportes" }).click();
  await expect(page).toHaveURL(/\/mis-reportes\//);
});

test("el formulario ofrece el catálogo territorial documentado y advierte su estado", async ({
  page,
}) => {
  await openLocation(page);
  const vereda = page.getByRole("combobox", { name: "Vereda", exact: true });
  await expect(vereda).toBeVisible();
  // HU-07: nombres del EOT, no inventados.
  await vereda.selectOption("Barro Caliente");
  await expect(
    page.getByText("pendiente de validación por el Consejo Comunitario", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText("Vuelta Larga")).toHaveCount(0);
});

test("la cabecera lleva identidad y estado de red en el teléfono, no en escritorio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/inicio/");
  const bar = page.locator("header.topbar");
  await expect(bar.getByText("Mi Pueblo")).toBeVisible();
  await expect(bar.getByText("En línea")).toBeVisible();
  // El territorio salió de la barra —le quitaba ancho a la marca— y lo nombra
  // el saludo, con el nombre completo del Consejo.
  await expect(bar.getByText("Río Satinga", { exact: false })).toHaveCount(0);
  await expect(
    page.getByText("Gran Consejo Comunitario Río Satinga"),
  ).toBeVisible();
  // El rastro de navegación desapareció de ambos tamaños.
  await expect(bar.getByText("Mi comunidad")).toHaveCount(0);
  // Nada desborda el ancho del teléfono.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(bar.getByText("Mi Pueblo")).toBeHidden();
  await expect(bar.getByText("En línea")).toBeHidden();
  await expect(
    bar.getByRole("button", { name: "Notificaciones" }),
  ).toBeVisible();
});

/**
 * Ninguna pantalla debe poder desplazarse a lo ancho en un teléfono. No es una
 * comprobación de estilo: un desbordamiento lateral esconde la mitad del texto
 * y no se nota hasta que alguien abre esa pantalla concreta. La guía lleva una
 * fila desplazable dentro, que es justo lo que tira del ancho cuando algo por
 * encima deja de acotarlo.
 */
test("ninguna pantalla desborda el ancho del teléfono", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of [
    "/inicio/",
    "/mapa/",
    "/reportar/",
    "/comunidad/",
    "/estadisticas/",
    "/mis-reportes/",
    "/cuenta/",
    "/documentacion/",
  ]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      view: document.documentElement.clientWidth,
    }));
    expect(
      overflow.scroll,
      `${route} se desplaza a lo ancho`,
    ).toBeLessThanOrEqual(overflow.view);
  }
});

test("cada pantalla lleva sus propias cifras del territorio", async ({
  page,
}) => {
  await page.goto("/inicio/");
  const inicio = page.locator(".community-pulse");
  await expect(
    inicio.getByRole("heading", { name: "En tu comunidad" }),
  ).toBeVisible();
  await expect(inicio.getByText("Tasa de resolución")).toBeVisible();

  await page.goto("/mis-reportes/");
  const propios = page.locator(".community-pulse");
  await expect(
    propios.getByRole("heading", { name: "Tus reportes" }),
  ).toBeVisible();
  await expect(propios.getByText("Registrados")).toBeVisible();
});
