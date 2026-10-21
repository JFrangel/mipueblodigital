import { afterEach, beforeEach, expect, it, vi } from "vitest";

const abrirEnlace = vi.fn();
vi.mock("@capacitor/core", () => ({
  registerPlugin: () => ({ abrirEnlace }),
}));
vi.mock("@/data/remote-reports", () => ({
  memberHeaders: async () => ({ headers: {} }),
}));

import { abrirArchivo, abrirExportacion } from "../../src/platform/export";

/**
 * Entregarle un archivo al navegador del sistema desde dentro del APK.
 *
 * La ventana de Capacitor no sabe descargar, así que tanto los PDF de los
 * manuales como el informe de estadísticas salen por el mismo camino: la
 * dirección se le da al navegador del teléfono. Lo que se comprueba aquí es lo
 * que ese camino promete a quien lo usa: que la dirección sea absoluta y
 * HTTPS, y que cuando algo falla el mensaje diga qué hacer.
 */
beforeEach(() => {
  abrirEnlace.mockReset();
  vi.stubGlobal("location", { origin: "https://mipueblo.test" });
});
afterEach(() => vi.unstubAllGlobals());

it("un PDF publicado se abre con su dirección completa", async () => {
  abrirEnlace.mockResolvedValueOnce(undefined);
  await abrirArchivo("/manuales/manual-ciudadano.pdf");
  expect(abrirEnlace).toHaveBeenCalledWith({
    url: "https://mipueblo.test/manuales/manual-ciudadano.pdf",
  });
});

it("si el APK no trae el complemento, el mensaje deja la dirección a mano", async () => {
  abrirEnlace.mockRejectedValueOnce(new Error("no existe"));
  await expect(abrirArchivo("/manuales/manual-consejo.pdf")).rejects.toThrow(
    /abre esta dirección en tu navegador: https:\/\/mipueblo\.test\/manuales\/manual-consejo\.pdf/,
  );
});

it("sin señal, exportar lo dice en español y antes de esperar", async () => {
  vi.stubGlobal("navigator", { onLine: false });
  const fetchFalso = vi.fn();
  vi.stubGlobal("fetch", fetchFalso);
  await expect(
    abrirExportacion("text/csv;charset=utf-8", "a.csv", "a,b"),
  ).rejects.toThrow(/Sin conexión/);
  // No llegó a pedir nada: no hay por qué esperar veinte segundos.
  expect(fetchFalso).not.toHaveBeenCalled();
});

it("si el servidor no contesta, el error no es el crudo del navegador", async () => {
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  await expect(
    abrirExportacion("text/csv;charset=utf-8", "a.csv", "a,b"),
  ).rejects.toThrow(/Sin conexión\. El informe se prepara en el servidor/);
});
