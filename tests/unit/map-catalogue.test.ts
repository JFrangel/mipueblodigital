import { expect, test } from "vitest";
import { sampleCase } from "../fixtures/cases";
import { seedCatalogue } from "../../src/domain/vereda-catalogue";
import { locateMapCase } from "../../src/domain/map-catalogue";
test("el mapa usa el punto actual del catálogo y conserva puntos propios", () => {
  const seed = seedCatalogue();
  const first = {
    ...seed,
    version: 1,
    items: [
      {
        id: "v",
        name: "Nueva",
        aliases: ["Anterior"],
        active: true,
        lat: 2,
        lng: -78,
      },
    ],
  };
  const report = sampleCase({
    owner: "community",
    vereda: "Anterior",
    lat: undefined,
    lng: undefined,
  });
  expect(locateMapCase(report, first)).toMatchObject({
    vereda: "Nueva",
    lat: 2,
    lng: -78,
  });
  const moved = { ...first, items: [{ ...first.items[0], lat: 3, lng: -77 }] };
  expect(locateMapCase(report, moved)).toMatchObject({ lat: 3, lng: -77 });
  const unlocated = {
    ...first,
    items: [{ ...first.items[0], lat: undefined, lng: undefined }],
  };
  expect(
    locateMapCase({ ...report, lat: 2, lng: -78 }, unlocated).lat,
  ).toBeUndefined();
  expect(
    locateMapCase({ ...report, owner: "propio", lat: 4, lng: -76 }, moved),
  ).toMatchObject({ lat: 4, lng: -76 });
});
