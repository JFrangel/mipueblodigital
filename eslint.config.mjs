import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...ts,
  globalIgnores([
    "out/**",
    ".next/**",
    "test-results/**",
    "playwright-report/**",
    ".npm-cache/**",
    /* El proyecto Android: es de Capacitor y del sistema de compilación, no
       nuestro. Sus intermedios traen un puente en JavaScript generado que
       llenaba la revisión de avisos sobre código que nadie va a tocar. */
    "android/**",
    ".runtime/**",
  ]),
]);
