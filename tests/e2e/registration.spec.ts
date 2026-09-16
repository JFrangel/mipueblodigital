import { test, expect } from "@playwright/test";
test("registro valida confirmación sin crear cuenta", async ({ page }) => {
  await page.goto("/acceso/");
  await page
    .getByRole("button", { name: "Crear una cuenta", exact: true })
    .click();
  await page.getByLabel("Tu nombre", { exact: true }).fill("Persona de prueba");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("prueba@example.invalid");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("contraseña-de-prueba");
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill("otra-contraseña");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(
    page.getByText("Las contraseñas no coinciden.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ya tengo una cuenta" }).click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
});
test("IA rechaza solicitudes sin identidad", async ({ request }) => {
  const response = await request.post("/api/ai/improve/", {
    data: { text: "El muelle tiene varias tablas sueltas." },
  });
  expect(response.status()).toBe(401);
});
