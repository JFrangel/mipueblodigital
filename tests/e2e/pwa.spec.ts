import { test, expect } from "@playwright/test";
import { seedCases } from "./seed-cases";
import { sampleCase } from "../fixtures/cases";
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
  //
  // La comprobación espera un momento antes de dar por buena la selección. Sin
  // esa pausa, un clic que entra justo antes de hidratar marcaba el botón y el
  // primer dibujado de React lo devolvía a cero: la prueba seguía con una
  // categoría que ya no estaba puesta y fallaba en el paso siguiente, con un
  // «Selecciona una categoría» que no tenía nada que ver con lo que se estaba
  // probando. Al reintentar dentro, se vuelve a pulsar y ya queda.
  await expect(async () => {
    await page.getByRole("button", { name: /Infraestructura/ }).click();
    await page.waitForTimeout(300);
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

/**
 * El expediente de un reporte, sin señal.
 *
 * Era la peor ausencia de todas: el caso estaba guardado en este mismo
 * teléfono y su pantalla caía en la página de respaldo. La dirección lleva el
 * identificador dentro, así que el service worker no la puede precachear —no
 * la conoce hasta que el reporte existe— y dentro de la aplicación se navega
 * sin recargar, de modo que tampoco la ve pasar. La guarda la aplicación,
 * a propósito, mientras hay red.
 */
test("un reporte guardado se abre sin red desde su propia dirección", async ({
  page,
  context,
}) => {
  await seedCases(page, [
    sampleCase({ id: "LOCAL-SINRED", title: "Poste caído en la escuela" }),
  ]);
  await page.goto("/mis-reportes/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  /* La aplicación guarda la pantalla del expediente con un respiro. */
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const cache = await caches.open("mi-pueblo-pages-v1");
          return (await cache.keys()).map((r) => new URL(r.url).pathname);
        }),
      { timeout: 15000 },
    )
    .toContain("/reporte/LOCAL-SINRED/");

  await context.setOffline(true);
  await page.goto("/reporte/LOCAL-SINRED/");
  await expect(
    page.getByRole("heading", { name: "Poste caído en la escuela" }),
  ).toBeVisible({ timeout: 15000 });
  await context.setOffline(false);
});

/**
 * Y el historial de la comunidad, que estaba en la barra de navegación y era la
 * única pantalla fija que no se había precacheado: tocarla sin red llevaba a la
 * página de respaldo.
 */
test("el historial de la comunidad abre sin red", async ({ page, context }) => {
  await page.goto("/inicio/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForTimeout(2500);
  await context.setOffline(true);
  await page.goto("/historial/");
  await expect(
    page.getByRole("heading", { name: /Lo que pasa en/ }),
  ).toBeVisible({ timeout: 15000 });
  await context.setOffline(false);
});

/**
 * Lo que una pantalla no puede saber, no lo dice como si lo supiera.
 *
 * Sin señal, «Mis reportes» enseña solo la copia de este aparato mientras su
 * rótulo promete «lo que el Consejo tiene a tu nombre», y el observatorio
 * calculaba una tasa de solución del territorio sobre los reportes de un
 * teléfono. Una cifra que el sistema no puede conocer se declara, no se
 * presenta como cierta.
 */
test("sin señal, cada lista dice que va corta", async ({ page, context }) => {
  await seedCases(page, [
    sampleCase({
      id: "LOCAL-AVISO",
      title: "Caso del aviso",
      delivery: "enviado",
    }),
  ]);
  await page.goto("/inicio/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForTimeout(2500);
  await context.setOffline(true);

  await page.goto("/mis-reportes/");
  await expect(
    page.getByText(/Sin conexión: esto es lo que guarda/),
  ).toBeVisible({ timeout: 15000 });

  await page.goto("/estadisticas/");
  await expect(
    page.getByText(/cuentan solo lo que guarda este teléfono/),
  ).toBeVisible({ timeout: 15000 });

  await page.goto("/historial/");
  await expect(page.getByText(/se consultan al volver la señal/)).toBeVisible({
    timeout: 15000,
  });
  await context.setOffline(false);
});
