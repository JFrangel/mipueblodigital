import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
const server = await createServer({
  configFile: false,
  define: { "process.env.NODE_ENV": JSON.stringify("development") },
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "react/jsx-dev-runtime",
      "lucide-react",
    ],
    exclude: ["next/link"],
  },
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "next/link": fileURLToPath(
        new URL("../tests/browser/link.tsx", import.meta.url),
      ),
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  plugins: [
    {
      name: "council-test-boundaries",
      resolveId(id) {
        if (id === "next/link") return "\0test-link";
      },
      load(id) {
        id = id.replaceAll("\\", "/");
        if (id === "\0test-link" || id.endsWith("/node_modules/next/link.js"))
          return "export default function Link(){return null}";
        if (id.endsWith("/data/remote-reports.ts"))
          return 'export async function memberHeaders(){return {headers:{},uid:"alice"}}';
        if (id.endsWith("/data/session.ts"))
          return 'export function useSession(){return {uid:"alice",admin:true}};export function getSession(){return {uid:"alice"}}';
        if (id.endsWith("/platform/native.ts"))
          return "export function esNativo(){return false}";
        if (id.endsWith("/platform/export.ts"))
          return "export async function abrirEnNavegadorDelSistema(){}";
        if (id.endsWith("/features/private-evidence.tsx"))
          return "export function PrivateEvidence(){return null}";
        if (id.endsWith("/features/miniatura-expediente.tsx"))
          return "export function MiniaturaExpediente(){return null}";
        if (id.endsWith("/features/remote-history.tsx"))
          return "export function RemoteHistory(){return null}";
      },
    },
  ],
  server: { host: "127.0.0.1", port: 3192, strictPort: true },
  appType: "custom",
});
server.middlewares.use((req, res, next) => {
  if (req.url !== "/") return next();
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<html><body><div id="root"></div><script type="module" src="/tests/browser/council-inbox.tsx"></script></body></html>',
  );
});
let browser;
const watchdog = setTimeout(() => {
  console.error("Tiempo agotado en la prueba del formulario");
  process.exitCode = 1;
  void browser?.close();
  void server.close();
}, 45000);
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error(e.stack));
  page.on("console", (m) => {
    if (m.type() === "error") console.error(m.text());
  });
  const a = "a".repeat(64),
    b = "b".repeat(64);
  const make = (id, title) => ({
    id,
    title,
    description: "Descripción de prueba",
    vereda: "Bellavista",
    category: "infraestructura",
    status: "pendiente",
    version: 0,
    sensitivity: "safe",
    publication: "public",
    date: "2026-10-21T12:00:00Z",
  });
  let finishA;
  const requestedA = new Promise((resolve) => {
    finishA = resolve;
  });
  let slow;
  let removalAttempts = 0;
  let pendingSave;
  await page.route("**/api/admin/incidents/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "PATCH") {
      pendingSave = route;
      return;
    }
    if (path.endsWith("/retirada/"))
      return route.fulfill({
        json: { removed: true, complete: ++removalAttempts > 1 },
      });
    if (path === `/api/admin/incidents/${a}/`) {
      slow = route;
      finishA();
      return;
    }
    if (path === `/api/admin/incidents/${b}/`)
      return route.fulfill({
        json: {
          publicTitle: "Aprobado B",
          publicSummary: "Resumen B",
          publicVereda: "Bellavista",
        },
      });
    return route.fulfill({
      json: {
        items: [make(a, "Expediente A"), make(b, "Expediente B")],
        next: null,
        delayHours: 24,
      },
    });
  });
  await page.goto("http://127.0.0.1:3192/");
  await page.getByRole("button", { name: /Expediente A/ }).click();
  await requestedA;
  await page
    .getByRole("button", { name: /Volver a la bandeja/ })
    .first()
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: /Expediente B/ })
    .dispatchEvent("click");
  await expect(page.locator('input[value="Aprobado B"]')).toHaveCount(1);
  await slow.fulfill({
    json: {
      publicTitle: "Aprobado A",
      publicSummary: "Resumen A",
      publicVereda: "Otra",
    },
  });
  await page.waitForTimeout(250);
  await expect(page.locator('input[value="Aprobado B"]')).toHaveCount(1);
  await expect(page.locator('input[value="Aprobado A"]')).toHaveCount(0);
  slow = undefined;
  await page
    .getByRole("button", { name: /Volver a la bandeja/ })
    .first()
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: /Expediente A/ })
    .dispatchEvent("click");
  await expect.poll(() => !!slow).toBe(true);
  await page
    .getByLabel("Título público", { exact: true })
    .fill("Edición en curso");
  await page.getByLabel(/Resumen p/).fill("Resumen editado");
  await slow.fulfill({
    json: {
      publicTitle: "Aprobado A",
      publicSummary: "Resumen A",
      publicVereda: "Bellavista",
    },
  });
  await page.waitForTimeout(250);
  await expect(page.getByLabel("Título público", { exact: true })).toHaveValue(
    "Edición en curso",
  );
  await expect(page.getByLabel(/Resumen p/)).toHaveValue("Resumen editado");
  await page
    .getByRole("button", { name: "Retirar este reporte" })
    .dispatchEvent("click");
  await page
    .getByPlaceholder(
      "Por ejemplo: está repetido con el expediente del muelle enviado el mismo día.",
    )
    .fill("Está duplicado con el expediente del muelle.");
  await page
    .getByRole("button", { name: "Retirar y avisar a quien reportó" })
    .dispatchEvent("click");
  await expect(
    page.getByRole("button", { name: "Terminar limpieza" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conservar el reporte" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Terminar limpieza" })
    .dispatchEvent("click");
  await expect(
    page.getByRole("button", { name: "Terminar limpieza" }),
  ).toHaveCount(0);
  expect(removalAttempts).toBe(2);
  await page.getByRole("button", { name: /Expediente A/ }).click();
  await page.getByLabel(/Nota para el ciudadano/).fill("Seguimiento de A");
  await page
    .getByLabel("Título público", { exact: true })
    .fill("Resumen aprobado de A");
  await page.getByLabel(/Resumen p/).fill("Resumen aprobado de A");
  await page
    .getByRole("button", { name: "Guardar cambio en servidor" })
    .dispatchEvent("click");
  await expect.poll(() => !!pendingSave).toBe(true);
  await page
    .getByRole("button", { name: /Volver a la bandeja/ })
    .first()
    .dispatchEvent("click");
  await page.getByRole("button", { name: /Expediente B/ }).click();
  await page.getByLabel(/Nota para el ciudadano/).fill("B en curso");
  await pendingSave.fulfill({ json: { version: 2 } });
  await page.waitForTimeout(150);
  await expect(page.getByLabel(/Nota para el ciudadano/)).toHaveValue(
    "B en curso",
  );
  console.log(
    "PASS: respuestas tardías aisladas por expediente y edición en curso conservada.",
  );
} finally {
  clearTimeout(watchdog);
  await browser?.close();
  await server.close();
}
