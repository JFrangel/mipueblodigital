import { describe, it, expect } from "vitest";
import { deliveryOf, deliveryLabel } from "../../src/domain/delivery";
import { sampleCase } from "../fixtures/cases";

describe("en qué punto del camino va un reporte", () => {
  it("separa lo que ya salió de lo que espera señal y de lo que nunca salió", () => {
    expect(deliveryOf(sampleCase({ id: "MPD-0248", delivery: "enviado" }))).toBe(
      "enviado",
    );
    expect(
      deliveryOf(sampleCase({ id: "LOCAL-abc", delivery: "en-cola" })),
    ).toBe("en-cola");
    expect(
      deliveryOf(sampleCase({ id: "LOCAL-abc", delivery: "sin-enviar" })),
    ).toBe("sin-enviar");
  });

  /**
   * Los registros anteriores a esta marca son mayoría en cualquier teléfono que
   * ya tuviera la aplicación. Si no se leyeran bien, uno que el Consejo tiene
   * desde hace meses aparecería como pendiente de enviar, y al revés.
   */
  it("lee los registros antiguos por su identificador", () => {
    expect(deliveryOf({ id: "MPD-0248", delivery: undefined })).toBe("enviado");
    expect(
      deliveryOf({ id: "LOCAL-9d7d18ba-1f0a", delivery: undefined }),
    ).toBe("sin-enviar");
  });

  it("cada estado se nombra de una sola manera en toda la aplicación", () => {
    expect(new Set(Object.values(deliveryLabel)).size).toBe(3);
    expect(deliveryLabel["en-cola"]).not.toBe(deliveryLabel["sin-enviar"]);
  });
});
