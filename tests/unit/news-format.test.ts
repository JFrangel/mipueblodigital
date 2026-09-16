import { describe, expect, it } from "vitest";
import {
  parseNewsBody,
  plainNewsBody,
  spansOf,
} from "../../src/domain/news-format";

describe("marcas dentro de una línea", () => {
  it("reconoce negrita y cursiva sin tocar el resto", () => {
    expect(spansOf("Se recogieron **catorce puntos** del margen")).toEqual([
      { text: "Se recogieron " },
      { text: "catorce puntos", bold: true },
      { text: " del margen" },
    ]);
    expect(spansOf("el _Gran Consejo_ decidió")).toEqual([
      { text: "el " },
      { text: "Gran Consejo", italic: true },
      { text: " decidió" },
    ]);
  });

  it("deja pasar los signos sueltos, que en un texto corriente abundan", () => {
    expect(spansOf("3 * 4 y un guion_bajo")).toEqual([
      { text: "3 * 4 y un guion_bajo" },
    ]);
  });
});

describe("bloques del comunicado", () => {
  it("separa apartados, listas y citas", () => {
    const body = [
      "## Lo que falta",
      "",
      "- El tramo alto",
      "- La señalización",
      "",
      "> La memoria se corrige entre todos.",
      "",
      "Un párrafo corriente que cierra el comunicado.",
    ].join("\n");
    expect(parseNewsBody(body).map((b) => b.kind)).toEqual([
      "heading",
      "list",
      "quote",
      "paragraph",
    ]);
  });

  it("respeta los comunicados antiguos, escritos sin marcas", () => {
    const [first] = parseNewsBody("Qué se hizo\n\nSe recogieron residuos.");
    expect(first.kind).toBe("heading");
  });

  it("no confunde una frase larga con un título", () => {
    const [only] = parseNewsBody(
      "Una sola línea, pero larga y con punto final, que es un párrafo.",
    );
    expect(only.kind).toBe("paragraph");
  });

  it("agrupa los renglones de una lista en un solo bloque", () => {
    const [block] = parseNewsBody("- uno\n- dos\n- tres");
    expect(block).toEqual({
      kind: "list",
      items: [[{ text: "uno" }], [{ text: "dos" }], [{ text: "tres" }]],
    });
  });
});

describe("resumen para el feed", () => {
  it("retira las marcas y conserva el texto", () => {
    expect(plainNewsBody("## Título\n\n- **uno**\n> _dos_")).toBe(
      "Título\n\nuno\ndos",
    );
  });
});
