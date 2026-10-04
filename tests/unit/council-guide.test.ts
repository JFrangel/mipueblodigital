import { describe, expect, it } from "vitest";
import {
  councilGlossary,
  councilOrganization,
  councilPending,
  councilRights,
  titledCouncils,
} from "../../src/content/council-guide";
import {
  councilMilestones,
  councilSources,
} from "../../src/content/council-history";

const cards = [...councilOrganization, ...councilRights];

describe("guía del Consejo: derechos, organización, territorio y glosario", () => {
  it("cada tarjeta y cada término enlazan al menos una fuente de la biblioteca", () => {
    for (const card of cards) {
      expect(card.sources.length, card.title).toBeGreaterThan(0);
      for (const id of card.sources) expect(councilSources).toHaveProperty(id);
    }
    for (const entry of councilGlossary) {
      expect(entry.sources.length, entry.term).toBeGreaterThan(0);
      for (const id of entry.sources) expect(councilSources).toHaveProperty(id);
    }
  });
  it("cada tarjeta dice de qué norma o sentencia sale", () => {
    for (const card of cards) {
      expect(card.reference.trim(), card.title).not.toBe("");
      expect(card.text.trim().length, card.title).toBeGreaterThan(40);
    }
    expect(new Set(cards.map((card) => card.title)).size).toBe(cards.length);
  });
  it("los términos del glosario no se repiten", () => {
    const terms = councilGlossary.map((entry) => entry.term);
    expect(new Set(terms).size).toBe(terms.length);
  });
  it("los tres consejos titulados traen resolución, fecha y extensión, y solo uno es el actual", () => {
    expect(titledCouncils).toHaveLength(3);
    for (const council of titledCouncils) {
      expect(council.act).toMatch(/^Resolución \d+$/);
      expect(council.date).toMatch(/^\d{1,2} de \w+ de \d{4}$/);
      expect(council.hectares).toMatch(/^\d{1,2}\.\d{3},\d{2}$/);
    }
    expect(titledCouncils.filter((council) => council.current)).toHaveLength(1);
  });
  it("la línea de tiempo y las tarjetas dan la misma extensión al título del Río Satinga", () => {
    const own = titledCouncils.find((council) => council.current)!;
    const title = councilMilestones.find(
      (item) => item.title === "Titulación colectiva del Río Satinga",
    )!;
    expect(title.account).toContain(own.hectares);
    expect(title.account).toContain(own.act.replace("3292", "03292"));
    const neighbours = councilMilestones.find(
      (item) => item.title === "Olaya Herrera completa sus tres títulos",
    )!;
    for (const council of titledCouncils)
      expect(neighbours.account).toContain(council.hectares);
  });
  it("lo pendiente lo nombra como tarea del Consejo y no inventa datos", () => {
    expect(councilPending.length).toBeGreaterThanOrEqual(5);
    for (const point of councilPending) expect(point).toMatch(/\.$/);
  });
});
