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
  server: { host: "127.0.0.1", port: 3193, strictPort: true },
  appType: "custom",
});
server.middlewares.use((req, res, next) => {
  if (req.url !== "/") return next();
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<html><body><div id="root"></div><script type="module" src="/tests/browser/history-list.tsx"></script></body></html>',
  );
});

let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let slow,
    pageTwo,
    bob,
    failPage = false,
    holdPage = false;
  await page.route("**/api/incidents/*/history/**", async (route) => {
    const url = route.request().url();
    const isBob = await page.evaluate(() => window.historyUid === "bob");
    if (isBob) {
      bob = route;
      return;
    }
    if (url.includes("/A/")) {
      slow = route;
      return;
    }
    if (url.includes("after=")) {
      if (holdPage) {
        pageTwo = route;
        return;
      }
      if (failPage)
        return route.fulfill({
          status: 503,
          json: { error: "Fallo temporal" },
        });
      return route.fulfill({ json: { items: [{ id: "page-2" }], next: null } });
    }
    await route.fulfill({
      json: {
        items: [{ id: url.includes("/A/") ? "A-note" : "B-note" }],
        next: "older",
      },
    });
  });
  await page.goto("http://127.0.0.1:3193/");
  await expect.poll(() => !!slow).toBe(true);
  await page.getByRole("button", { name: "Cambiar reporte" }).click();
  await expect(page.getByTestId("items")).toContainText("B-note");
  await slow.fulfill({ json: { items: [{ id: "A-note" }], next: null } });
  await page.waitForTimeout(200);
  await expect(page.getByTestId("items")).toContainText("B-note");
  await expect(page.getByTestId("items")).not.toContainText("A-note");
  failPage = true;
  await page.getByRole("button", { name: "Mas", exact: true }).click();
  await expect(page.getByTestId("error")).toHaveText("Fallo temporal");
  await expect(page.getByTestId("items")).toContainText("B-note");
  failPage = false;
  await page.getByRole("button", { name: "Reintentar actuaciones" }).click();
  await expect(page.getByTestId("items")).toContainText("page-2");
  await expect(page.getByTestId("error")).toHaveText("");
  await page.getByRole("button", { name: "Activar consulta" }).click();
  await expect(page.getByTestId("items")).toHaveText("[]");
  await page.getByRole("button", { name: "Activar consulta" }).click();
  await expect(page.getByTestId("items")).toContainText("B-note");
  holdPage = true;
  await page.getByRole("button", { name: "Mas", exact: true }).click();
  await expect.poll(() => !!pageTwo).toBe(true);
  await page.getByRole("button", { name: "Activar consulta" }).click();
  await pageTwo.fulfill({ json: { items: [{ id: "late-page" }], next: null } });
  await expect(page.getByTestId("items")).toHaveText("[]");
  await page.getByRole("button", { name: "Activar consulta" }).click();
  await expect(page.getByTestId("items")).toContainText("B-note");
  await page.getByRole("button", { name: "Cambiar cuenta" }).click();
  await expect.poll(() => !!bob).toBe(true);
  await expect(page.getByTestId("items")).toHaveText("[]");
  await expect(page.getByTestId("busy")).toHaveText("true");
  await bob.fulfill({ json: { items: [{ id: "bob-note" }], next: null } });
  await expect(page.getByTestId("items")).toContainText("bob-note");
  bob = undefined;
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("report-updated", { detail: "B" })),
  );
  await expect.poll(() => !!bob).toBe(true);
  await expect(page.getByTestId("busy")).toHaveText("true");
  await bob.fulfill({ json: { items: [{ id: "bob-updated" }], next: null } });
  await expect(page.getByTestId("items")).toContainText("bob-updated");
  console.log(
    "PASS: historial aislado, paginas tardias descartadas, reintento de pagina y cambio de cuenta.",
  );
} finally {
  await browser?.close();
  await server.close();
}
