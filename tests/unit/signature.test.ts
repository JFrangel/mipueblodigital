import { describe, expect, it } from "vitest";
import {
  councilSayings,
  maxSayingLength,
  sayingFor,
} from "../../src/domain/signature";
import { validateNews } from "../../src/domain/news";

const comunicado = (extra: Record<string, unknown> = {}) => ({
  title: "Jornada de limpieza",
  body: "Durante tres jornadas se recorrió el tramo entre las dos veredas.",
  kind: "Boletín",
  status: "draft",
  version: 0,
  ...extra,
});

describe("firma del Consejo", () => {
  it("siempre devuelve una frase del repertorio", () => {
    for (const id of ["a", "jornada-de-limpieza-del-rio", "", "ñ-ó-ü", "9"])
      expect(councilSayings).toContain(sayingFor(id));
  });

  it("es estable: el mismo comunicado firma siempre igual", () => {
    // Si variara entre el servidor y el navegador, la página se redibujaría
    // entera al hidratar.
    const id = "jornada-de-limpieza-del-rio";
    expect(sayingFor(id)).toBe(sayingFor(id));
  });

  it("el Consejo puede poner la suya, y en blanco no estorba", () => {
    expect(validateNews(comunicado({ saying: "  El río nos reúne  " })).saying)
      .toBe("El río nos reúne");
    expect(validateNews(comunicado()).saying).toBe("");
  });

  it("rechaza una firma que ya no es una firma", () => {
    expect(() =>
      validateNews(comunicado({ saying: "x".repeat(maxSayingLength + 1) })),
    ).toThrow(/firma/);
  });

  it("reparte entre comunicados distintos en vez de repetir una sola", () => {
    const ids = Array.from({ length: 60 }, (_, i) => `comunicado-${i}`);
    const usadas = new Set(ids.map(sayingFor));
    expect(usadas.size).toBeGreaterThan(councilSayings.length / 2);
  });
});
