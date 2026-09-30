import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const base = process.env.MPD_BASE_URL ?? "http://127.0.0.1:3100";
const routes = ["/bienvenida/", "/comunidad/", "/memoria/"];
const samples = Math.max(
  1,
  Math.min(20, Number(process.env.MPD_PERF_SAMPLES) || 5),
);
const output =
  process.env.MPD_PERF_OUTPUT ?? "docs/resultado-rendimiento-local.json";
const browser = await chromium.launch({ headless: true });
const report = {
  measuredAt: new Date().toISOString(),
  environment: {
    node: process.version,
    base,
    browser: browser.version(),
    samples,
    mode: "Next production build, navegador local",
  },
  warning:
    "Mide navegación en un equipo y servidor locales. No mide concurrencia, red móvil, Core Web Vitals de usuarios reales ni servicios externos autenticados.",
  routes: {},
};

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.ceil((p / 100) * sorted.length) - 1]);
}
try {
  for (const route of routes) {
    const readings = [];
    for (let i = 0; i < samples; i++) {
      const context = await browser.newContext({ serviceWorkers: "block" });
      const page = await context.newPage();
      const response = await page.goto(new URL(route, base).href, {
        waitUntil: "load",
        timeout: 30000,
      });
      const timing = await page.evaluate(() => {
        const entry = performance.getEntriesByType("navigation")[0];
        return entry
          ? {
              domContentLoadedMs: entry.domContentLoadedEventEnd,
              loadMs: entry.loadEventEnd,
              responseMs: entry.responseEnd,
              transferBytes: entry.transferSize,
            }
          : null;
      });
      readings.push({ status: response?.status() ?? null, ...timing });
      await context.close();
    }
    report.routes[route] = {
      samples: readings,
      p50LoadMs: percentile(
        readings.map((r) => r.loadMs),
        50,
      ),
      p95LoadMs: percentile(
        readings.map((r) => r.loadMs),
        95,
      ),
      p95DomContentLoadedMs: percentile(
        readings.map((r) => r.domContentLoadedMs),
        95,
      ),
    };
  }
} finally {
  await browser.close();
}
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(`Medición local guardada en ${output}`);
