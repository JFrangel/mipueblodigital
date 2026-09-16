import { test, expect } from "@playwright/test";
import { seedCases } from "./seed-cases";
import { sampleCase, sampleCases } from "../fixtures/cases";
test("bienvenida, tema oscuro y navegación", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  /* Con actuaciones de verdad: la línea de tiempo solo pliega lo de en medio
     cuando hay algo que plegar, y un caso recién registrado no lo tiene. */
  await seedCases(page, [
    sampleCase({
      events: [
        {
          id: "uno",
          at: "2026-09-07T15:00:00Z",
          status: "pendiente",
          note: "Se agendó la visita.",
          actor: "Consejo",
          assignee: "Equipo del muelle",
        },
        {
          id: "dos",
          at: "2026-09-08T16:00:00Z",
          status: "en_proceso",
          note: "Cuadrilla en el sitio.",
          actor: "Consejo",
          assignee: "Equipo del muelle",
        },
      ],
    }),
    ...sampleCases().slice(1),
  ]);
  await page.goto("/bienvenida/");
  await expect(
    page.getByRole("heading", {
      name: "Tu voz. Tu territorio. Nuestra comunidad.",
    }),
  ).toBeVisible();
  // El HTML estático se pinta antes de hidratar: el primer clic puede perderse.
  await expect(async () => {
    await page.getByRole("button", { name: "Activar tema oscuro" }).click();
    await expect(
      page.getByRole("button", { name: "Activar tema claro" }),
    ).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  await page.screenshot({
    path: "test-results/bienvenida-dark.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Comenzar", exact: true }).click();
  // El tema viaja con la sesión del navegador. En el teléfono se cambia desde
  // Mi cuenta, así que aquí se comprueba el resultado, no el control.
  await expect(page.locator(".workspace.dark")).toBeVisible();
  await page.getByRole("button", { name: /Alumbrado en el malecón/ }).click();
  const dialog = page.getByRole("region", { name: "Detalle del reporte" });
  await expect(
    dialog.getByRole("heading", { name: "Seguimiento", exact: true }),
  ).toBeVisible();
  /* La línea de tiempo cuenta el caso, no lo registra entero: lo de en medio
     se pliega detrás de un solo mando, dentro de la propia línea. */
  await dialog
    .getByRole("button", { name: /Ver las \d+ actuaciones anteriores/ })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Ocultar las actuaciones anteriores" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/detalle-dark.png" });
});
test("el acceso comparte el escenario de la bienvenida", async ({ page }) => {
  // El fondo del acceso se compone del módulo de la bienvenida, así que ambas
  // pantallas llevan literalmente la misma clase generada. Si alguien duplica
  // los estilos en vez de componerlos, esto lo detecta.
  const claseDe = async (ruta: string) => {
    await page.goto(ruta);
    return (await page.locator("main").first().getAttribute("class")) ?? "";
  };
  const bienvenida = await claseDe("/bienvenida/");
  const acceso = await claseDe("/acceso/");
  const escenario = bienvenida
    .split(" ")
    .find((c) => c.includes("welcome-module"));
  expect(escenario).toBeTruthy();
  expect(acceso).toContain(escenario!);
});

test("el acceso se adapta al teléfono sin perder el formulario", async ({
  page,
}) => {
  await page.setViewportSize({ width: 380, height: 820 });
  await page.goto("/acceso/");

  // El paisaje sigue ahí y el vidrio sube desde abajo, como en la bienvenida.
  await expect(page.locator("main img").first()).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();

  // Y nada desborda a lo ancho, que es lo que arruina un formulario en móvil.
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(desborde).toBeLessThanOrEqual(1);
});

test("el acceso con Google lleva su marca de cuatro colores", async ({
  page,
}) => {
  await page.goto("/acceso/");
  const boton = page.getByRole("button", { name: "Continuar con Google" });
  await expect(boton).toBeVisible();
  // La gente reconoce el botón por la G antes que por el texto; redibujarla en
  // un solo color lo vuelve sospechoso en la pantalla de la contraseña.
  const colores = await boton
    .locator("svg path")
    .evaluateAll((nodos) => nodos.map((n) => n.getAttribute("fill")));
  expect(new Set(colores).size).toBe(4);
  expect(colores).toContain("#4285F4");
});

test("acceso presenta formulario sin simular una sesión", async ({ page }) => {
  await page.goto("/acceso/");
  await expect(
    page.getByRole("button", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Conectado como", { exact: false })).toHaveCount(
    0,
  );
});
test("mapa filtra por estado y comunidad presenta fuentes", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/mapa/");
  const listado = page.locator(".map-results .case-row");
  /* El listado se llena al leer el almacén del dispositivo, y `count()` no
     espera a nadie: contar antes de que aparezca la primera fila devolvía cero
     de vez en cuando. */
  await expect(listado.first()).toBeVisible();
  const todos = await listado.count();
  expect(todos).toBeGreaterThan(0);

  // El filtro recorta el listado del territorio y deja solo lo solucionado.
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("solucionado");
  await expect(listado).not.toHaveCount(todos);
  for (const fila of await listado.all())
    await expect(fila).toContainText("Solucionado");
  await page.goto("/comunidad/");
  // El feed lee comunicados del servidor, así que se comprueban invariantes y
  // no títulos concretos: el contenido lo edita el Consejo.
  // El feed se llena desde el servidor: contar antes de que responda no mide nada.
  await expect(page.getByText("Cargando comunicados…")).toHaveCount(0);
  const cards = page.locator(".news-card");
  await expect(cards.first()).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Tipo de noticia" }),
  ).toBeVisible();
  // Todo comunicado se publica con una portada del catálogo.
  expect(await page.locator(".news-card .news-art").count()).toBe(
    await cards.count(),
  );
  await page
    .getByRole("combobox", { name: "Tipo de noticia" })
    .selectOption("Alerta");
  await expect(
    page.locator(".news-card .eyebrow", { hasText: "Boletín" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Leer .?Las Marías.? en Colombia Aprende/ }),
  ).toBeVisible();
});

test("las estadísticas señalan lo que más espera y llevan al expediente", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/estadisticas/");
  const panel = page.locator(".waiting-panel");
  // La espera se calcula en el navegador: el servidor no sabe qué día es allí.
  // Y hasta que hidrata no hay cola que leer, así que se espera a la primera
  // fila en vez de contar sobre una lista que todavía no existe.
  await expect(panel.locator("li b").first()).toBeVisible();

  const dias = (await panel.locator("li b").allInnerTexts()).map((t) =>
    Number(t.split("\n")[0]),
  );
  expect(dias.length).toBeGreaterThan(1);
  expect([...dias].sort((a, b) => b - a)).toEqual(dias);

  // La tarjeta de seguimiento resume esa misma cola con una mediana.
  await expect(page.locator(".management-metrics")).toContainText(
    "Espera mediana de lo abierto",
  );

  // Cada fila lleva a su expediente, que es de lo que sirve señalarlo.
  const primera = panel.locator("li a").first();
  const titulo = (await primera.locator("strong").innerText()).trim();
  await primera.click();
  await expect(page).toHaveURL(/\/reporte\/.*desde=estadisticas/);
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
});

test("el tema oscuro conserva el color de las gráficas y del mapa", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/estadisticas/");
  await page.getByRole("button", { name: "Activar tema oscuro" }).click();
  // Un filtro de escala de grises borraría lo que distingue una categoría.
  for (const selector of [".donut", ".bar-chart"])
    expect(
      await page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).filter),
    ).not.toContain("grayscale");

  // Y dos estados distintos deben verse distintos, no dos grises iguales.
  const fondo = (clase: string) =>
    page
      .locator(`.badge.${clase}`)
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  // La tarjeta de espera solo trae casos abiertos, así que se comparan tres
  // estados que sí aparecen ahí.
  expect(await fondo("en_proceso")).not.toBe(await fondo("pendiente"));
  expect(await fondo("escalado")).not.toBe(await fondo("pendiente"));
});

test("el asistente de análisis no existe para quien no es del Consejo", async ({
  page,
}) => {
  /* Hace falta algo que contar: sin sesión y sin reportes, la pantalla
     dice que no puede saberlo en vez de enseñar ceros. */
  await seedCases(page);
  await page.goto("/estadisticas/");
  // La lectura nombra expedientes y señala a quién le falta responsable: es
  // material de trabajo del Consejo, no del listado público.
  await expect(page.locator(".insight-panel")).toHaveCount(0);
  await expect(page.locator(".reading")).toHaveCount(0);

  // Las cifras y los cuadros sí son de todos.
  await expect(page.locator(".metrics .metric")).not.toHaveCount(0);
  await expect(page.locator(".waiting-panel")).toBeVisible();
  await expect(page.locator(".management-metrics")).toBeVisible();
});

test("la redacción con IA se cierra en el servidor, no solo en la interfaz", async ({
  page,
  request,
}) => {
  await page.goto("/estadisticas/");
  await expect(page.locator(".reading-ai")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Redactar con IA/ }),
  ).toHaveCount(0);

  // Esconder el botón no es cerrar la puerta: la petición directa se rechaza.
  const anonima = await request.post("/api/ai/reading/", {
    data: { findings: ["Una frase.", "Otra frase."] },
  });
  expect(anonima.status()).toBe(401);
});

test("el informe se arma con la portada y el cierre del Consejo", async ({
  page,
}) => {
  /* Hace falta algo que contar: sin sesión y sin reportes, la pantalla
     dice que no puede saberlo en vez de enseñar ceros. */
  await seedCases(page);
  await page.goto("/estadisticas/");
  const portada = page.locator(".report-cover");
  const cierre = page.locator(".report-foot");

  // En pantalla no existen: son piezas del papel, no de la aplicación.
  await expect(portada).toBeHidden();
  await expect(cierre).toBeHidden();

  // Al imprimir aparecen, y los mandos desaparecen.
  await page.emulateMedia({ media: "print" });
  await expect(portada).toBeVisible();
  await expect(portada).toContainText("Informe del observatorio comunitario");
  await expect(portada).toContainText("Gran Consejo Comunitario Río Satinga");
  await expect(portada).toContainText("Todo el registro disponible");
  await expect(cierre).toContainText("no un censo");
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".filters")).toBeHidden();
  await expect(page.locator(".export-actions")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
});

test("la portada del informe declara el filtro con el que se emitió", async ({
  page,
}) => {
  await seedCases(page);
  await page.goto("/estadisticas/");
  await page
    .getByRole("combobox", { name: "Vereda estadística" })
    .selectOption("Alto Satinga");
  await page.emulateMedia({ media: "print" });
  // Un informe sin sus filtros declarados no prueba nada: podría ser cualquier
  // recorte presentado como el total.
  await expect(page.locator(".report-cover")).toContainText("Alto Satinga");
  await page.emulateMedia({ media: "screen" });
});
