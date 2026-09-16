import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { chromium } from "@playwright/test";
const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  fs.readFileSync("src/features/leaf-fall.tsx", "utf8"),
  {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  },
).outputText;
const mod = { exports: {} };
new Function("require", "exports", "module", compiled)(
  (name) =>
    name.endsWith(".css")
      ? { frame: "frame", left: "left", right: "right", sending: "sending" }
      : require(name),
  mod.exports,
  mod,
);
const leaves = renderToStaticMarkup(React.createElement(mod.exports.LeafFall));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 650 } });
const css = fs.readFileSync("src/features/banana-leaves.module.css", "utf8");
await page.setContent(
  `<style>${css}body{margin:0;background:#edf1eb;font-family:Arial;color:#153f32;padding:24px}.panel{position:relative;overflow:hidden;background:#fffdf5;border:1px solid #d4ded3;border-radius:26px;text-align:center;padding:70px 30px;margin-top:40px}h1{font-size:27px}p{line-height:1.6;font-size:15px}button{border:0;border-radius:30px;padding:16px;background:#195f47;color:white}</style><div class="panel">${leaves}<div style="font-size:30px">✓</div><p>RECEPCIÓN CONFIRMADA</p><h1>Tu reporte ya tiene un lugar.</h1><p>El servidor recibió tu reporte. Está pendiente de revisión.</p><button>Ver mis reportes</button></div>`,
);
await page.waitForTimeout(1000);
await page.screenshot({ path: "test-results/banana-leaves-preview.png" });
const before = await page
  .locator(".left")
  .evaluate((el) => getComputedStyle(el).transform);
await page.waitForTimeout(3000);
const after = await page
  .locator(".left")
  .evaluate((el) => getComputedStyle(el).opacity);
await page.emulateMedia({ reducedMotion: "reduce" });
const reduced = await page
  .locator(".frame")
  .evaluate((el) => getComputedStyle(el).display);
console.log(
  JSON.stringify({
    animationTransform: before,
    opacityAfter: after,
    reducedMotionDisplay: reduced,
  }),
);
await browser.close();
