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
        if (id.replaceAll("\\", "/").endsWith("/data/firebase/client.ts"))
          return 'export function firebaseClient(){return {auth:{currentUser:{uid:window.historyUid||"alice"}}}}';
        id = id.replaceAll("\\", "/");
        if (id === "\0test-link" || id.endsWith("/node_modules/next/link.js"))
          return "export default function Link(){return null}";
        if (id.endsWith("/data/remote-reports.ts"))
          return 'export async function memberHeaders(){return {headers:{},uid:window.historyUid||"alice"}}';
        if (id.endsWith("/data/session.ts"))
          return 'import {useSyncExternalStore} from "react";export function useSession(){const uid=useSyncExternalStore(fn=>{window.addEventListener("history-account",fn);return ()=>window.removeEventListener("history-account",fn)},()=>window.historyUid||"alice");return {uid,admin:true}}';
        if (id.endsWith("/platform/native.ts"))
          return "export function esNativo(){return false}";
        if (id.endsWith("/platform/export.ts"))
          return "export async function abrirEnNavegadorDelSistema(){}";
        if (id.endsWith("/features/private-evidence.tsx"))
          return "export function PrivateEvidence(){return null}";
        if (id.endsWith("/features/miniatura-expediente.tsx"))
          return "export function MiniaturaExpediente(){return null}";
      },
    },
  ],
  server: { host: "127.0.0.1", port: 3196, strictPort: true },
  appType: "custom",
});
server.middlewares.use((req, res, next) => {
  if (req.url !== "/") return next();
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<html><body><div id="root"></div><script type="module" src="/tests/browser/report-lookup.tsx"></script></body></html>',
  );
});

let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let bob,
    count = 0;
  await page.route("**/api/incidents/one/", async (route) => {
    if (await page.evaluate(() => window.historyUid === "bob")) {
      bob = route;
      return;
    }
    await route.fulfill({
      json: {
        item: {
          scope: "propio",
          id: "one",
          title: ++count === 1 ? "Privado Alice" : "Alice actualizado",
          description: "Privado",
          category: "infraestructura",
          status: "pendiente",
          vereda: "Bellavista",
          date: "2026-10-22",
        },
      },
    });
  });
  await page.goto("http://127.0.0.1:3196/");
  await expect(page.getByTestId("data")).toContainText("Privado Alice");
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByTestId("data")).toContainText("Alice actualizado");
  await page.getByRole("button", { name: "Cambiar cuenta" }).click();
  await expect(page.getByTestId("data")).not.toContainText("Alice actualizado");
  await expect.poll(() => !!bob).toBe(true);
  await bob.fulfill({ status: 404, json: { error: "No encontrado" } });
  await expect(page.getByTestId("data")).toContainText('"ready":true');
  await expect(page.getByTestId("data")).toContainText('"item":null');
  console.log(
    "PASS: el detalle se actualiza al guardar y oculta el expediente anterior al cambiar de cuenta.",
  );
} finally {
  await browser?.close();
  await server.close();
}
