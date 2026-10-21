import { expect, it } from "vitest";
import {
  seedCatalogue,
  changeCatalogue,
} from "../../src/domain/vereda-catalogue";

it("valida una versión y pide nueva validación después de editar", () => {
  const seed = seedCatalogue();
  const checked = changeCatalogue(
    seed,
    { action: "validate" },
    "ana",
    "2026-10-21T12:00:00Z",
  );
  expect(checked.validated?.version).toBe(checked.version);
  const edited = changeCatalogue(
    checked,
    { action: "save", id: seed.items[0].id, name: "Nombre corregido" },
    "ana",
    "2026-10-21T13:00:00Z",
  );
  expect(edited.items[0].aliases).toContain(seed.items[0].name);
  expect(edited.validated?.version).not.toBe(edited.version);
});
it("retira sin borrar y conserva el ID al renombrar", () => {
  const seed = seedCatalogue(),
    id = seed.items[0].id;
  const changed = changeCatalogue(seed, { action: "remove", id }, "ana", "hoy");
  expect(changed.items.find((v) => v.id === id)?.active).toBe(false);
  expect(changed.items).toHaveLength(seed.items.length);
});
it("rechaza duplicados normalizados y coordenadas incompletas", () => {
  const seed = seedCatalogue();
  expect(() =>
    changeCatalogue(
      seed,
      { action: "save", id: "nueva", name: seed.items[0].name.toUpperCase() },
      "ana",
      "hoy",
    ),
  ).toThrow();
  expect(() =>
    changeCatalogue(
      seed,
      { action: "save", id: "nueva", name: "Otra", lat: 2 },
      "ana",
      "hoy",
    ),
  ).toThrow();
});
