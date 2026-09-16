import { test, expect } from "@playwright/test";

test("comunidad conserva sus tres secciones al navegar y recargar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 436, height: 698 });
  await page.goto("/comunidad/");
  const nav = page.getByRole("navigation", { name: "Secciones de comunidad" });
  for (const name of ["Reportes", "Estadísticas", "Noticias"]) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(nav.getByRole("link")).toHaveCount(3);
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.reload();
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  }
});
