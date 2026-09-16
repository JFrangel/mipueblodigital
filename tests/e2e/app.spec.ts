import { test, expect } from "@playwright/test";
import { openDetails } from "./report-flow";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
test("una foto de más de 24 megapíxeles se ajusta en vez de rechazarse", async ({
  page,
}) => {
  await openDetails(page);
  // 6000 × 4200 = 25,2 MP: lo que dispara un teléfono de gama alta en su modo
  // de máxima resolución. Antes se rechazaba, y rechazar significa que el
  // reporte no existe.
  const enorme = await sharp({
    create: {
      width: 6000,
      height: 4200,
      channels: 3,
      background: { r: 40, g: 110, b: 70 },
    },
  })
    .jpeg({ quality: 70 })
    .toBuffer();
  await page
    .getByLabel("Evidencia fotográfica", { exact: true })
    .setInputFiles({
      name: "gigante.jpg",
      mimeType: "image/jpeg",
      buffer: enorme,
    });

  await expect(page.getByText("Fotografía adjunta · cambiar")).toBeVisible();
  await expect(page.getByText(/se ajustó a .* megapíxeles/)).toBeVisible();

  // Y lo que queda cabe en el tope del servidor.
  const vista = page.getByRole("img", {
    name: "Vista previa de la fotografía del reporte",
  });
  const megapixeles = await vista.evaluate(
    (img: HTMLImageElement) => (img.naturalWidth * img.naturalHeight) / 1e6,
  );
  expect(megapixeles).toBeLessThanOrEqual(24);
  expect(megapixeles).toBeGreaterThan(20);
});

test("el borrador conserva foto, punto y texto para enviarlo después", async ({
  page,
}) => {
  await openDetails(page);
  await page
    .getByPlaceholder(
      "Describe qué ocurrió, cuándo y cómo afecta a tu comunidad.",
    )
    .fill("Reporte verificable de prueba del muelle");

  // Un archivo que no es una imagen se rechaza en el propio dispositivo.
  await page
    .getByLabel("Evidencia fotográfica", { exact: true })
    .setInputFiles({
      name: "danada.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("esto no es una imagen"),
    });
  /* El mensaje dice ahora qué archivo era. Se comprobó que adivinar el motivo
     desde aquí no funciona: hacen falta los datos del archivo que falló. */
  await expect(page.getByText(/No se pudo leer esa fotografía/)).toBeVisible();

  await page
    .getByLabel("Evidencia fotográfica", { exact: true })
    .setInputFiles("public/brand/territorio.webp");
  await expect(page.getByText("Fotografía adjunta · cambiar")).toBeVisible();

  // La fotografía viaja sin recomprimir: los bytes guardados son los del
  // archivo original, byte a byte.
  const original = await readFile("public/brand/territorio.webp");
  const digest = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex");
  const vista = page.getByRole("img", {
    name: "Vista previa de la fotografía del reporte",
  });
  const encoded = await vista.getAttribute("src");
  expect(digest(Buffer.from(encoded!.split(",")[1], "base64"))).toBe(
    digest(original),
  );

  // Guardar borrador es la forma de dejarlo para enviarlo más tarde, y la
  // pantalla lo confirma en lugar de dejar a quien lo guardó adivinando.
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  /* Exacto: el aviso flotante dice también «Guardado como borrador en este
     dispositivo», y una coincidencia parcial casaría con los dos. */
  await expect(
    page.getByText("GUARDADO COMO BORRADOR", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".toast-done")).toHaveText(
    "Guardado como borrador en este dispositivo.",
  );
  await expect(page.getByText("No sale hasta que tú lo envíes")).toBeVisible();

  await page.reload();

  // Un borrador completo abre en «Revisar»: se vuelve donde se dejó, no al
  // principio, que es lo único que hace útil guardarlo para después.
  await expect(
    page.getByRole("heading", { name: "Revisa antes de enviar." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enviar al Consejo" }),
  ).toBeVisible();

  // Y los pasos anteriores quedan navegables, con todo dentro.
  await page.getByRole("button", { name: /Detalles$/ }).click();
  await expect(
    page.getByPlaceholder(
      "Describe qué ocurrió, cuándo y cómo afecta a tu comunidad.",
    ),
  ).toHaveValue("Reporte verificable de prueba del muelle");

  // La fotografía vuelve intacta, no recomprimida al guardar el borrador.
  const recuperada = await vista.getAttribute("src");
  expect(digest(Buffer.from(recuperada!.split(",")[1], "base64"))).toBe(
    digest(original),
  );
});

test("inicio móvil no desborda y muestra navegación", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inicio/");
  await expect(
    page.getByRole("heading", { name: "Tu voz hace la diferencia." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/inicio-mobile.png",
    fullPage: true,
  });
});
test("inicio navega al reporte y exige los campos", async ({ page }) => {
  await page.goto("/inicio/");
  await expect(
    page.getByRole("heading", { name: "Tu voz hace la diferencia." }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Nuevo reporte", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByText("Selecciona una categoría.", { exact: true }),
  ).toBeVisible();
});
test("documentación y análisis explican límites", async ({ page }) => {
  await page.goto("/documentacion/");
  await page.getByPlaceholder("Buscar en la guía…").fill("mantendrá");
  await expect(
    page.getByText("¿Quién mantendrá la app después de la entrega?", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/estadisticas/");
  // Los límites de la lectura se declaran donde todos los ven, no solo el
  // Consejo: la salvedad acompaña a las cifras públicas.
  // La misma salvedad existe dos veces: al pie de las cifras y en el cierre
  // del informe impreso. Aquí se comprueba la de pantalla.
  await expect(page.locator(".stats-caveat")).toContainText(
    "no un censo de todos los problemas del territorio",
  );
});
