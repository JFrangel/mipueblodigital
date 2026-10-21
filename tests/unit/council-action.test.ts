import { expect, it } from "vitest";
import { councilAction } from "../../src/domain/council-action";
it("las notas anteriores siguen siendo actuaciones ordinarias", () => {
  expect(councilAction({})).toEqual({ type: "update" });
});
it("una visita requiere fecha válida y responsable", () => {
  expect(() =>
    councilAction({
      type: "visit",
      visitDate: "2026-02-30",
      visitResponsible: "Ana",
    }),
  ).toThrow();
  expect(() =>
    councilAction({ type: "visit", visitDate: "2026-10-21" }),
  ).toThrow();
  expect(
    councilAction({
      type: "visit",
      visitDate: "2026-10-21",
      visitResponsible: "Ana",
    }),
  ).toMatchObject({ type: "visit", visitResponsible: "Ana" });
});
