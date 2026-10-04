import { describe, expect, it, vi } from "vitest";
import {
  chronological,
  historySeeds,
  mergeHistory,
  validateHistory,
  historyDate,
} from "../../src/domain/council-history";
import { councilSources } from "../../src/content/council-history";
import { publicHistory } from "../../src/server/council-history";
vi.mock("../../src/server/admin-auth", () => ({
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
const entry = {
  ...historySeeds[0],
  id: "new-history",
  title: "Un hecho documentado",
  occurredOn: "1994",
  status: "published" as const,
};
describe("archivo histórico del Consejo", () => {
  it("inserta hechos antiguos por fecha y no por orden de carga", () => {
    const result = mergeHistory([entry]);
    const index = result.findIndex((item) => item.id === entry.id);
    expect(result[index - 1].occurredOn).toBe("1993");
    expect(result[index + 1].occurredOn).toBe("1995");
  });
  it("archivar una semilla no hace reaparecer su copia original", () => {
    expect(
      mergeHistory(
        [{ ...historySeeds[0], status: "archived", version: 1 }],
        true,
      ).some((item) => item.id === historySeeds[0].id),
    ).toBe(false);
  });
  it("los borradores no salen en la lectura pública", () =>
    expect(
      mergeHistory([{ ...entry, status: "draft" }], true).some(
        (item) => item.id === entry.id,
      ),
    ).toBe(false));
  it("editar una semilla reemplaza su contenido sin duplicarla", () => {
    const result = mergeHistory([
      { ...historySeeds[0], title: "Título corregido", version: 1 },
    ]);
    expect(result).toHaveLength(historySeeds.length);
    expect(result.find((item) => item.id === historySeeds[0].id)?.title).toBe(
      "Título corregido",
    );
  });
  it("ordena precisión parcial y hora local sin convertir husos horarios", () => {
    const dates = ["1994-06-15", "1994", "1994-06"];
    expect(
      chronological(
        dates.map((occurredOn, i) => ({ ...entry, id: String(i), occurredOn })),
      ).map((item) => item.occurredOn),
    ).toEqual(["1994", "1994-06", "1994-06-15"]);
    expect(
      historyDate({ ...entry, occurredOn: "1994-06-15", time: "08:30" }),
    ).toBe("15 de junio de 1994 · 08:30");
  });
  it.each([
    "1994-02-29",
    "2024-04-31",
    "1994-00",
    "1994-13",
    "94",
    "1994-1-01",
  ])("rechaza la fecha inválida %s", (occurredOn) =>
    expect(() => validateHistory({ ...entry, occurredOn })).toThrow(),
  );
  it("acepta año, mes y día bisiesto", () => {
    for (const occurredOn of ["1994", "1994-06", "2024-02-29"])
      expect(validateHistory({ ...entry, occurredOn }).occurredOn).toBe(
        occurredOn,
      );
  });
  it("no admite hora con una fecha incompleta", () =>
    expect(() => validateHistory({ ...entry, time: "08:30" })).toThrow());
  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "https://user:password@example.com",
  ])("rechaza enlaces inseguros %s", (url) =>
    expect(() =>
      validateHistory({ ...entry, sources: [{ ...entry.sources[0], url }] }),
    ).toThrow(),
  );
  it("exige fuente y elimina campos ajenos al esquema", () => {
    expect(() => validateHistory({ ...entry, sources: [] })).toThrow();
    expect(
      validateHistory({ ...entry, actorUid: "secret" }),
    ).not.toHaveProperty("actorUid");
  });
  it("cada hito base tiene identidad única y datos válidos", () => {
    expect(new Set(historySeeds.map((item) => item.id)).size).toBe(
      historySeeds.length,
    );
    for (const item of historySeeds)
      expect(() => validateHistory(item)).not.toThrow();
  });
  it("la ficha pública sale campo a campo: sin versión, estado ni autor", () => {
    const filtrada = {
      ...entry,
      version: 7,
      actorUid: "admin",
      updatedBy: "a",
    };
    const [visible] = publicHistory([filtrada]);
    expect(Object.keys(visible).sort()).toEqual([
      "account",
      "id",
      "occurredOn",
      "period",
      "qualification",
      "sources",
      "time",
      "title",
    ]);
  });
  it("la biblioteca de fuentes solo enlaza por HTTPS y sin repetir direcciones", () => {
    const urls = Object.values(councilSources).map((source) => source.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(new URL(url).protocol).toBe("https:");
  });
});
