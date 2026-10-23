import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";
const server = await createServer({
  configFile: false,
  esbuild: { jsx: "automatic" },
  server: { host: "127.0.0.1", port: 3191, strictPort: true },
  appType: "custom",
});
server.middlewares.use((req, res, next) => {
  if (req.url !== "/") return next();
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<html><body><div id="root"></div><script type="module" src="/tests/browser/report-list.tsx"></script></body></html>',
  );
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let mode = "wait",
    pending,
    started;
  let requested = new Promise((resolve) => {
    started = resolve;
  });
  await page.route("**/api/reports?*", async (route) => {
    const uid = new URL(route.request().url()).searchParams.get("uid");
    if (mode === "wait") {
      pending = route;
      started();
      return;
    }
    await route.fulfill(
      mode === "fail"
        ? {
            status: 503,
            json: { error: "No se pudieron consultar los reportes." },
          }
        : { json: { items: [{ id: `${uid}-nuevo` }], complete: true } },
    );
  });
  await page.goto("http://127.0.0.1:3191/");
  await requested;
  await expect(page.getByTestId("loading")).toHaveText("true");
  await pending.fulfill({
    json: {
      items: Array.from({ length: 4 }, (_, i) => ({ id: `alice-${i}` })),
      complete: true,
    },
  });
  await expect(page.getByTestId("complete")).toHaveText("true");
  await expect(page.getByTestId("items")).toContainText("alice-3");
  mode = "fail";
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByTestId("error")).toContainText(
    "No se pudieron consultar",
  );
  await expect(page.getByTestId("items")).toContainText("alice-3");
  await expect(page.getByTestId("complete")).toHaveText("false");
  mode = "wait";
  requested = new Promise((resolve) => {
    started = resolve;
  });
  await page.getByRole("button", { name: "Cambiar cuenta" }).click();
  await requested;
  await expect(page.getByTestId("items")).toHaveText("[]");
  await expect(page.getByTestId("error")).toHaveText("");
  await expect(page.getByTestId("loading")).toHaveText("true");
  await pending.fulfill({ json: { items: [{ id: "bob-1" }], complete: true } });
  await expect(page.getByTestId("items")).toContainText("bob-1");
  await expect(page.getByTestId("items")).not.toContainText("alice");
  await page.getByRole("button", { name: "Cambiar conexión" }).click();
  await expect(page.getByTestId("complete")).toHaveText("false");
  mode = "wait";
  requested = new Promise((resolve) => {
    started = resolve;
  });
  await page.getByRole("button", { name: "Cambiar conexión" }).click();
  await requested;
  await expect(page.getByTestId("loading")).toHaveText("true");
  await expect(page.getByTestId("complete")).toHaveText("false");
  await pending.fulfill({
    json: { items: [{ id: "bob-nuevo" }], complete: true },
  });
  await expect(page.getByTestId("items")).toContainText("bob-nuevo");
  await expect(page.getByTestId("complete")).toHaveText("true");
  console.log(
    "PASS: carga inicial, error explícito sin perder lista, aislamiento de cuentas y actualización al recuperar conexión.",
  );
} finally {
  await browser?.close();
  await server.close();
}
