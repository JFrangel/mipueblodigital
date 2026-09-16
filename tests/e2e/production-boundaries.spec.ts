import { expect, test } from "@playwright/test";
import { seedCases } from "./seed-cases";
test("el listado del territorio abre el detalle del reporte", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/mapa/");
  await expect(
    page.getByRole("heading", { name: "Reportes del territorio" }),
  ).toBeVisible();
  const primero = page.locator(".map-results .case-row").first();
  const titulo = (await primero.locator("strong").first().innerText()).trim();
  await primero.click();
  await expect(page).toHaveURL(/\/reporte\//);
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
});
test("el territorio dice dónde hay casos abiertos, no solo dónde ocurren", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/mapa/");
  const tabla = page.locator(".vereda-load");
  await expect(tabla.getByRole("heading")).toHaveText("Cómo va cada vereda");

  // Se ordena por casos abiertos: la primera fila es la que más espera.
  const abiertos = await tabla
    .locator("tbody tr td:first-of-type")
    .allInnerTexts();
  const cifras = abiertos.map(Number);
  expect(cifras.length).toBeGreaterThan(1);
  expect([...cifras].sort((a, b) => b - a)).toEqual(cifras);

  // El filtro de arriba manda: al pedir solo lo solucionado no queda abierto.
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("solucionado");
  for (const valor of await tabla
    .locator("tbody tr td:first-of-type")
    .allInnerTexts())
    expect(Number(valor)).toBe(0);
});

test("una instalación sin reportes no inventa ninguno", async ({ page }) => {
  // El producto ya no trae expedientes fabricados: lo que se ve es lo que la
  // comunidad reportó. Con el almacén vacío, eso es nada, y hay que decirlo.
  await page.goto("/mapa/");
  await expect(page.locator(".map-results .case-row")).toHaveCount(0);
  await expect(page.locator(".map-results .empty")).toBeVisible();
  await expect(page.locator(".vereda-load")).toHaveCount(0);

  await page.goto("/estadisticas/");
  const total = page.locator(".metrics .metric").first();
  await expect(total).toContainText("0");
  await expect(page.locator(".waiting-panel")).toContainText(
    "Ningún caso abierto",
  );

  await page.goto("/inicio/");
  // Y ninguno de los títulos que solían venir de fábrica.
  for (const titulo of ["Alumbrado en el malecón", "Residuos en la ribera"])
    await expect(page.getByText(titulo)).toHaveCount(0);
});

test("el mapa nombra las veredas documentadas y las encuadra todas", async ({
  page,
}) => {
  await page.goto("/mapa/");
  const rotulos = page.locator(".vereda-label");
  await expect(rotulos.first()).toBeVisible();

  // Solo las que tienen punto: no se inventa una posición para las demás.
  await expect(rotulos).toHaveCount(12);
  await expect(page.getByText("Codemaco", { exact: true })).toBeVisible();
  await expect(page.getByText("Cañas", { exact: true })).toHaveCount(0);

  // Y el mapa abre mostrando el territorio entero, no una esquina: las del
  // tramo bajo del río deben caber en el encuadre inicial.
  const caja = (await page.locator(".leaflet-map").boundingBox())!;
  for (const nombre of ["Codemaco", "San Isidro", "Barro Caliente"]) {
    const marca = (await page
      .locator(".vereda-label", { hasText: nombre })
      .first()
      .boundingBox())!;
    expect(marca.y).toBeGreaterThanOrEqual(caja.y);
    expect(marca.y + marca.height).toBeLessThanOrEqual(caja.y + caja.height);
  }
});

test("la página del territorio no expone los mandos de prueba", async ({
  page,
}) => {
  await page.goto("/mapa/");
  await expect(page.getByText("Comprobar agrupación")).toHaveCount(0);
  await expect(
    page.getByText("Referencias de localidades y coordenadas"),
  ).toHaveCount(0);
});

test("la API del Consejo rechaza acceso anónimo", async ({ request }) => {
  const response = await request.post("/api/admin/analysis/");
  expect(response.status()).toBe(401);
  expect((await response.json()).error).toContain("Inicia sesión");
});
test("oscuro conserva contraste y banner a color, detalle navega como página", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/inicio/");
  await page.getByRole("button", { name: "Activar tema oscuro" }).click();
  await expect(page.locator(".greeting h1")).toHaveCSS(
    "color",
    "rgb(240, 240, 237)",
  );
  await expect(page.locator(".hero > img")).toHaveCSS("filter", "none");
  await page.screenshot({
    path: "test-results/inicio-dark-color.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Alumbrado en el malecón/ }).click();
  await expect(page).toHaveURL(/\/reporte\//);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Detalle del reporte" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/detalle-pagina.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Volver a los reportes" }).click();
  await expect(page).toHaveURL(/\/inicio\//);
});

/**
 * Lo que un navegador tiene que hacer por quien reporta.
 *
 * No había ninguna cabecera de seguridad. En una aplicación que guarda
 * fotografías y teléfonos, eso no es configuración: es si el navegador la
 * defiende o no. Se fija aquí porque es invisible en pantalla y se pierde con
 * cualquier cambio de despliegue.
 */
test("la aplicación llega con sus cabeceras de seguridad", async ({
  request,
}) => {
  const response = await request.get("/inicio/");
  const headers = response.headers();
  const csp = headers["content-security-policy"] ?? "";
  /* Nadie la enmarca dentro de otra página, que es como se roba una sesión. */
  expect(csp).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  /* Ni Supabase ni OpenRouter: sus claves no salen del servidor y el navegador
     no tiene por qué poder hablar con ellos. */
  expect(csp).not.toContain("supabase");
  expect(csp).not.toContain("openrouter");
  /* El mapa base sí, que si no la pantalla del territorio queda en blanco. */
  expect(csp).toContain("tile.openstreetmap.org");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  /* La ubicación del aparato no se pide: el punto del mapa se marca a mano. */
  expect(headers["permissions-policy"]).toContain("geolocation=()");
});

test("los buscadores no recorren expedientes ni el panel del Consejo", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const ruta of ["/api/", "/admin/", "/reporte/", "/cuenta/"])
    expect(robots).toContain(`Disallow: ${ruta}`);
  expect(robots).toContain("Allow: /bienvenida/");
});

test("una dirección que no existe se explica y ofrece salida", async ({
  page,
}) => {
  await page.goto("/esto-no-existe/");
  await expect(
    page.getByRole("heading", { name: /no lleva a ninguna parte/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ir al inicio" }).click();
  await expect(page).toHaveURL(/\/inicio\//);
});
