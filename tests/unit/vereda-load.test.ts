import { describe, expect, it } from "vitest";
import { veredaLoad } from "../../src/domain/vereda-load";

const caso = (vereda: string, status: string) => ({ vereda, status });

describe("carga por vereda", () => {
  it("ordena por casos abiertos, no por total", () => {
    const carga = veredaLoad([
      ...Array.from({ length: 9 }, () => caso("Bocas", "solucionado")),
      caso("Bocas", "pendiente"),
      caso("Bellavista", "pendiente"),
      caso("Bellavista", "en_proceso"),
    ]);
    // Bocas tiene más reportes, pero Bellavista tiene más por atender.
    expect(carga.map((v) => v.vereda)).toEqual(["Bellavista", "Bocas"]);
    expect(carga[0].open).toBe(2);
    expect(carga[1].open).toBe(1);
  });

  it("no cuenta como abiertos los descartados ni los no solucionados", () => {
    const [carga] = veredaLoad([
      caso("Alto", "descartado"),
      caso("Alto", "no_solucionado"),
      caso("Alto", "en_proceso"),
    ]);
    expect(carga.open).toBe(1);
    // Cerrados: descartado y no solucionado. Ninguno se resolvió.
    expect(carga.rate).toBe(0);
  });

  it("sin casos decididos no inventa una tasa de cero", () => {
    const [carga] = veredaLoad([caso("Nueva", "pendiente")]);
    expect(carga.rate).toBeNull();
    expect(carga.solved).toBe(0);
  });

  it("ignora los reportes sin vereda en vez de agruparlos aparte", () => {
    expect(veredaLoad([caso("", "pendiente"), caso("  ", "pendiente")])).toEqual(
      [],
    );
  });

  it("cuenta los escalados a otra entidad, que siguen abiertos", () => {
    const [carga] = veredaLoad([caso("San Isidro", "escalado")]);
    expect(carga.escalated).toBe(1);
    expect(carga.open).toBe(1);
  });
});
