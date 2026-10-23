import { afterEach, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const base = path.resolve(".runtime");
const script = path.resolve("scripts/revisar-modulos-sin-uso.mjs");
const roots: string[] = [];
function project(files: Record<string, string>) {
  fs.mkdirSync(base, { recursive: true });
  const root = fs.mkdtempSync(path.join(base, "module-audit-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "scripts"));
  const entries = {
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        moduleResolution: "bundler",
        module: "esnext",
        paths: { "@/*": ["./src/*"] },
      },
      include: ["src/**/*.ts", "src/**/*.tsx"],
    }),
    "src/app/page.tsx": "export default function Page(){return null}",
    ...files,
  };
  for (const [name, content] of Object.entries(entries)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}
function audit(root: string) {
  try {
    return {
      code: 0,
      output: execFileSync(process.execPath, [script], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    const result = error as { status: number; stdout: string; stderr: string };
    return {
      code: result.status,
      output: String(result.stdout) + String(result.stderr),
    };
  }
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    const absolute = path.resolve(root);
    if (
      !absolute.startsWith(base + path.sep) ||
      !path.basename(absolute).startsWith("module-audit-")
    )
      throw new Error("Ruta de limpieza inválida");
    fs.rmSync(absolute, { recursive: true, force: true });
  }
});
it("detecta un helper olvidado dentro de app", () => {
  const result = audit(
    project({ "src/app/unused.ts": "export const forgotten=1;" }),
  );
  expect(result.code).toBe(1);
  expect(result.output).toContain("unused.ts");
});
it("incluye JavaScript aunque tsconfig enumere solo TS", () => {
  const result = audit(
    project({ "src/unused.js": "export const forgotten=1;" }),
  );
  expect(result.code).toBe(1);
  expect(result.output).toContain("unused.js");
});
it("conserva helpers usados por generadores anidados y por import dinámico", () => {
  const result = audit(
    project({
      "src/app/page.tsx":
        "export default async function Page(){return (await import('@/used')).value}",
      "src/used.ts": "export const value=1;",
      "src/generator.ts": "export const value=2;",
      "scripts/nested/generate.mjs":
        "import {value} from '../../src/generator.ts';console.log(value);",
    }),
  );
  expect(result.output).not.toContain("Módulos que requieren revisión");
  expect(result.code).toBe(0);
});
it("no omite silenciosamente un import local roto", () => {
  const result = audit(
    project({
      "src/app/page.tsx":
        "import './missing';export default function Page(){return null}",
    }),
  );
  expect(result.code).toBe(1);
  expect(result.output).toContain("missing");
});
