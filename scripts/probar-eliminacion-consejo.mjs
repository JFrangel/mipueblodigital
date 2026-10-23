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
  server: { host: "127.0.0.1", port: 3195, strictPort: true },
  appType: "custom",
});
server.middlewares.use((req, res, next) => {
  if (req.url !== "/") return next();
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<html><body><div id="root"></div><script type="module" src="/tests/browser/council-roles.tsx"></script></body></html>',
  );
});

let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let attempts = 0;
  await page.route("**/api/admin/**", async (route) => {
    if (route.request().url().includes("/accounts/eliminacion/"))
      return route.fulfill({
        status: ++attempts === 1 ? 202 : 200,
        json: {
          complete: attempts > 1,
          message:
            attempts === 1 ? "Limpieza pendiente" : "Eliminacion completada",
        },
      });
    return route.fulfill({ json: { people: [] } });
  });
  await page.goto("http://127.0.0.1:3195/");
  await page
    .getByText("Terminar una eliminación pendiente", { exact: true })
    .click();
  await page
    .getByLabel("Correo de la cuenta con eliminación pendiente")
    .fill("alice@example.org");
  const submit = page.getByRole("button", {
    name: "Completar eliminación pendiente",
  });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Limpieza pendiente");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole("status")).toContainText(
    "Eliminacion completada",
  );
  expect(attempts).toBe(2);
  console.log(
    "PASS: el Consejo puede reintentar y completar una eliminacion parcial desde su panel.",
  );
} finally {
  await browser?.close();
  await server.close();
}
