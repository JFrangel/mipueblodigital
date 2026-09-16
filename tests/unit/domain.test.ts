import { describe, expect, it } from "vitest";
import {
  clusterPoints,
  pageItems,
  summarize,
  validateReport,
  explainStatistics,
} from "../../src/domain/logic";
describe("mapa y escala", () => {
  it("conserva 300 casos en la misma coordenada sin confundirlos con duplicados", () => {
    const points = Array.from({ length: 300 }, (_, i) => ({
      id: String(i),
      lat: 2.347,
      lng: -78.325,
    }));
    const groups = clusterPoints(points, 18);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(300);
    expect(new Set(groups[0].items.map((p) => p.id)).size).toBe(300);
    expect(pageItems(groups[0].items, 12, 25)).toHaveLength(25);
    expect(pageItems(groups[0].items, 13, 25)).toHaveLength(0);
  });
  it("deja fuera del mapa lo que no tiene coordenadas, sin inventarlas", () => {
    // Cinco veredas del catálogo no tienen punto documentado. Sus reportes
    // existen y están en la lista, pero no se pueden dibujar: situarlos en el
    // casco urbano sería poner en el mapa una ubicación que nadie declaró.
    const groups = clusterPoints([
      { id: "con-punto", lat: 2.2, lng: -78.25 },
      { id: "sin-punto" },
      { id: "media", lat: 2.2 },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((p) => p.id)).toEqual(["con-punto"]);
  });
  it("descarta coordenadas imposibles y agrupa menos al acercar", () => {
    const points = [
      { id: "a", lat: 2, lng: -78 },
      { id: "b", lat: 2.001, lng: -78 },
      { id: "c", lat: 91, lng: 0 },
    ];
    expect(clusterPoints(points, 8)).toHaveLength(2);
    expect(clusterPoints(points, 18)).toHaveLength(2);
  });
  it("agrupa cinco cercanos y conserva coincidencias menores", () => {
    const points = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      lat: 2.01 + i * 0.000001,
      lng: -78.01,
    }));
    expect(clusterPoints(points, 8)).toHaveLength(1);
    expect(clusterPoints(points.slice(0, 4), 8)).toHaveLength(4);
    expect(
      clusterPoints(
        [
          { id: "a", lat: 2, lng: -78 },
          { id: "b", lat: 2, lng: -78 },
        ],
        18,
      )[0].items,
    ).toHaveLength(2);
  });
});
describe("métricas verificables", () => {
  it("no cuenta escalado como solucionado y calcula sobre todos los casos", () => {
    expect(
      summarize([
        { status: "solucionado" },
        { status: "pendiente" },
        { status: "escalado" },
      ]),
    ).toEqual({ total: 3, solved: 1, pending: 1, active: 0, rate: 33 });
  });
  it("no divide entre cero ni inventa explicaciones causales", () => {
    expect(summarize([]).rate).toBe(0);
    expect(explainStatistics([])).toContain("No hay datos");
    expect(explainStatistics([{ status: "pendiente" }])).toContain("1");
  });
});
describe("reporte", () => {
  it("requiere foto y rechaza 501 palabras", () => {
    const errors = validateReport({
      category: "infraestructura",
      vereda: "Bocas de Satinga",
      description: Array(501).fill("palabra").join(" "),
      photos: 0,
      phone: "12345678901",
    });
    expect(errors).toContain("La descripción no puede superar 500 palabras.");
    expect(errors).toContain("Añade al menos una fotografía.");
    expect(errors).toContain("El celular debe contener hasta 10 dígitos.");
  });
  it("permite celular vacío y 500 palabras", () => {
    expect(
      validateReport({
        category: "infraestructura",
        vereda: "Bocas de Satinga",
        description: Array(500).fill("palabra").join(" "),
        photos: 1,
        phone: "",
      }),
    ).toEqual([]);
  });
});
