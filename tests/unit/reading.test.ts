import { describe, expect, it } from "vitest";
import { readStatistics, shareableReading } from "../../src/domain/reading";
import type { Case } from "../../src/data/catalog";
import { sampleCase } from "../fixtures/cases";

const caso = (over: Partial<Case>) => ({
  ...sampleCase(),
  events: [],
  assignee: "Junta",
  ...over,
});

const claves = (items: Parameters<typeof readStatistics>[0], today = "") =>
  readStatistics(items, today).map((f) => f.id);

describe("lectura del conjunto", () => {
  it("sin datos lo dice y no arriesga una tendencia", () => {
    const lectura = readStatistics([]);
    expect(lectura).toHaveLength(1);
    expect(lectura[0].text).toContain("Amplía los filtros");
  });

  it("siempre cierra con la salvedad, aunque el conjunto sea mínimo", () => {
    expect(claves([caso({ status: "solucionado" })])).toContain("salvedad");
  });

  it("nombra el caso que más espera con su vereda y sus días", () => {
    const lectura = readStatistics(
      [
        caso({
          id: "A",
          title: "Muelle roto",
          vereda: "Bellavista",
          status: "pendiente",
          date: "2026-09-01T12:00:00Z",
        }),
        caso({ id: "B", status: "pendiente", date: "2026-09-12T12:00:00Z" }),
      ],
      "2026-09-14",
    );
    const frase = lectura.find((f) => f.id === "mas-antiguo")?.text ?? "";
    expect(frase).toContain("Muelle roto");
    expect(frase).toContain("Bellavista");
    expect(frase).toContain("13 días");
  });

  it("calla lo que no aplica en vez de decir cero", () => {
    // Todo cerrado y con responsable: no hay cola, ni escalados, ni huérfanos.
    const ids = claves(
      [caso({ status: "solucionado" }), caso({ status: "solucionado" })],
      "2026-09-14",
    );
    expect(ids).not.toContain("cola");
    expect(ids).not.toContain("sin-responsable");
    expect(ids).not.toContain("escalados");
    expect(ids).not.toContain("mas-antiguo");
  });

  it("no señala un día de la semana cuando el reparto es plano", () => {
    // Seis reportes en seis días distintos: ningún día destaca de verdad.
    const dias = ["07", "08", "09", "10", "11", "12"];
    expect(
      claves(
        dias.map((d) =>
          caso({ id: d, status: "pendiente", date: `2026-09-${d}T12:00:00Z` }),
        ),
        "2026-09-14",
      ),
    ).not.toContain("dia");
  });

  it("sí lo señala cuando un día concentra los reportes", () => {
    const lunes = Array.from({ length: 5 }, (_, i) =>
      caso({ id: `L${i}`, status: "pendiente", date: "2026-09-07T12:00:00Z" }),
    );
    const lectura = readStatistics(
      [...lunes, caso({ id: "X", status: "pendiente", date: "2026-09-09T12:00:00Z" })],
      "2026-09-14",
    );
    expect(lectura.find((f) => f.id === "dia")?.text).toContain("lunes");
  });

  it("sin el día del navegador omite la espera pero conserva el resto", () => {
    const ids = claves([caso({ status: "pendiente" })]);
    expect(ids).toContain("volumen");
    expect(ids).toContain("cola");
    expect(ids).not.toContain("mas-antiguo");
  });

  it("lo que sale hacia un modelo no lleva el título de ningún expediente", () => {
    const lectura = readStatistics(
      [
        caso({
          id: "A",
          title: "Denuncia contra Fulano de Tal",
          vereda: "Bellavista",
          status: "pendiente",
          date: "2026-09-01T12:00:00Z",
        }),
        /* Dos abiertos, porque «el que más espera» solo se nombra cuando hay
           más de uno: con uno solo repetiría la frase anterior. */
        caso({
          id: "B",
          vereda: "Bellavista",
          status: "pendiente",
          date: "2026-09-10T12:00:00Z",
        }),
      ],
      "2026-09-14",
    );
    // En pantalla sí: el Consejo ya tiene acceso al expediente.
    expect(lectura.find((f) => f.id === "mas-antiguo")?.text).toContain(
      "Fulano",
    );
    // Fuera del territorio no: el título lo escribe quien reporta y puede
    // llevar un nombre propio o un detalle sensible.
    const compartido = shareableReading(lectura).join(" ");
    expect(compartido).not.toContain("Fulano");
    expect(compartido).toContain("13 días");
  });

  it("concuerda el singular y el plural", () => {
    const uno = readStatistics([caso({ status: "pendiente" })], "2026-09-14");
    expect(uno.find((f) => f.id === "cola")?.text).toContain(
      "1 caso sigue abierto",
    );
    const dos = readStatistics(
      [caso({ id: "a", status: "pendiente" }), caso({ id: "b", status: "pendiente" })],
      "2026-09-14",
    );
    expect(dos.find((f) => f.id === "cola")?.text).toContain(
      "2 casos siguen abiertos",
    );
  });
});

/**
 * Las frases tienen que sostenerse con un solo reporte.
 *
 * Es el estado en el que la aplicación pasa sus primeras semanas en el río, y
 * es cuando más se mira: «la mitad de ellos» sobre un único caso, o «concentra
 * la mayor carga» sobre la única vereda que ha reportado, no son medidas —son
 * frases que delatan que nadie leyó lo que sale en pantalla.
 */
it("con un solo caso abierto no inventa medias ni comparaciones", () => {
  const lectura = readStatistics(
    [
      caso({
        id: "A",
        vereda: "Codemaco",
        status: "pendiente",
        date: "2026-09-13T12:00:00Z",
      }),
    ],
    "2026-09-14",
  );
  const cola = lectura.find((f) => f.id === "cola")?.text ?? "";
  expect(cola).toContain("1 caso sigue abierto");
  expect(cola).not.toContain("La mitad");
  /* Una sola vereda no concentra nada: lo es todo. */
  expect(lectura.find((f) => f.id === "vereda")).toBeUndefined();
  /* Y «el que más espera» sería ese mismo del que acaba de hablar. */
  expect(lectura.find((f) => f.id === "mas-antiguo")).toBeUndefined();
});
