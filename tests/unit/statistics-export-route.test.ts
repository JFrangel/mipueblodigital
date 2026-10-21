import { expect, it, vi } from "vitest";

vi.mock("../../src/server/admin-auth", () => ({
  credentialsReady: async () => undefined,
  adminServices: () => ({ db: {} }),
}));
const consumir = vi.fn();
vi.mock("../../src/server/export-tickets", () => ({
  consumeExportTicket: (...args: unknown[]) => consumir(...args),
}));

import { GET } from "../../src/app/api/statistics/export/[ticket]/route";

/**
 * Lo que el navegador del sistema recibe al abrir un informe.
 *
 * El HTML lo escribió el teléfono de quien lo pidió —cualquier cuenta activa—
 * y se muestra desde el dominio de la aplicación. Esta prueba existe por lo que
 * pasaría sin la política propia de la respuesta: un `<script>` dentro de ese
 * HTML correría con la sesión de quien abriera el enlace.
 */
const billete = "123e4567-e89b-12d3-a456-426614174000";
const pedir = () =>
  GET(new Request(`https://x.test/api/statistics/export/${billete}/`), {
    params: Promise.resolve({ ticket: billete }),
  });

it("el informe se muestra aislado: sin origen propio, sin red y sin guiones ajenos", async () => {
  consumir.mockResolvedValueOnce({
    contentType: "text/html;charset=utf-8",
    filename: "informe.html",
    body: "<!doctype html><script>fetch('/api/x')</script>",
  });
  const response = await pedir();
  expect(response.status).toBe(200);
  const politica = response.headers.get("content-security-policy") ?? "";
  // Sin `allow-same-origin` el documento queda en un origen opaco: no alcanza
  // el almacenamiento ni la sesión de la aplicación.
  expect(politica).toMatch(/(^|;\s*)sandbox\s/);
  expect(politica).not.toContain("allow-same-origin");
  // Y sin red: ni la API propia ni un servidor ajeno.
  expect(politica).toContain("default-src 'none'");
  expect(politica).not.toMatch(/connect-src/);
  expect(politica).toContain("img-src data:");
  expect(politica).toContain("form-action 'none'");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-disposition")).toBe("inline");
});

it("el CSV se descarga como archivo, con la misma política", async () => {
  consumir.mockResolvedValueOnce({
    contentType: "text/csv;charset=utf-8",
    filename: "mi-pueblo-reportes.csv",
    body: "a,b",
  });
  const response = await pedir();
  expect(response.headers.get("content-disposition")).toBe(
    'attachment; filename="mi-pueblo-reportes.csv"',
  );
  expect(response.headers.get("content-security-policy")).toContain(
    "default-src 'none'",
  );
});

it("un billete que ya se usó o venció contesta 410, sin contenido", async () => {
  consumir.mockResolvedValueOnce(null);
  const response = await pedir();
  expect(response.status).toBe(410);
  expect(await response.text()).toContain("ya se usó o venció");
});
