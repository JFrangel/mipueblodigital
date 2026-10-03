import { describe, expect, it } from "vitest";
import {
  catalogueValidated,
  catalogueNotice,
  isCatalogued,
  veredaCatalogue,
  veredaNames,
  veredaReference,
  territoryBounds,
  isInsideTerritory,
  collectiveTitle,
} from "../../src/domain/territory";
import { historicalVeredas } from "../../src/data/territorial-sources";

describe("catálogo territorial", () => {
  it("ofrece todas las veredas documentadas, sin repetir y ordenadas", () => {
    expect(veredaNames).toHaveLength(historicalVeredas.length + 1);
    expect(historicalVeredas).toHaveLength(18);
    expect(veredaReference("Bocas de Satinga")).toMatchObject({
      lat: 2.347457,
      lng: -78.325814,
      kind: "oficial",
    });
    expect(new Set(veredaNames).size).toBe(veredaNames.length);
    expect([...veredaNames].sort((a, b) => a.localeCompare(b, "es"))).toEqual(
      veredaNames,
    );
  });

  it("solo entrega coordenadas donde existe una fuente documentada", () => {
    for (const vereda of veredaCatalogue) {
      const reference = veredaReference(vereda.name);
      if (reference) {
        expect(reference.source).toBeTruthy();
        // La cuenca del Satinga está en el suroccidente colombiano.
        expect(reference.lat).toBeGreaterThan(1.5);
        expect(reference.lat).toBeLessThan(3);
        expect(reference.lng).toBeLessThan(-77);
        expect(reference.lng).toBeGreaterThan(-79);
      } else expect(vereda.lat).toBeUndefined();
    }
    expect(veredaReference("Vereda inexistente")).toBeNull();
  });

  it("no declara validación mientras el Consejo no la firme", () => {
    expect(catalogueValidated).toBe(false);
    expect(catalogueNotice).toContain("pendiente de validación");
  });

  it("reconoce solo nombres del catálogo", () => {
    expect(isCatalogued("Bellavista")).toBe(true);
    expect(isCatalogued("bellavista")).toBe(false);
    expect(isCatalogued("")).toBe(false);
  });
});

describe("procedencia de los puntos de referencia", () => {
  it("cada punto declara de dónde sale", () => {
    for (const vereda of veredaCatalogue.filter((v) => v.lat !== undefined)) {
      expect(vereda.source).toBeTruthy();
      expect(["oficial", "abierta", "escuela"]).toContain(vereda.kind);
    }
  });

  it("Boca de Víbora usa la coordenada oficial del DANE", () => {
    const punto = veredaReference("Boca de Víbora");
    expect(punto?.kind).toBe("oficial");
    expect(punto?.lat).toBeCloseTo(2.339981, 5);
    expect(punto?.lng).toBeCloseTo(-78.309402, 5);
  });

  it("todos los puntos caen dentro del marco del territorio", () => {
    // Un punto de referencia fuera del marco haría que el propio catálogo
    // propusiera una ubicación que después el servidor rechaza.
    for (const vereda of veredaCatalogue.filter((v) => v.lat !== undefined))
      expect(isInsideTerritory(vereda.lat, vereda.lng)).toBe(true);
  });

  it("el marco contiene el título colectivo y no mucho más", () => {
    const { bounds } = collectiveTitle;
    expect(territoryBounds.south).toBeLessThan(bounds.south);
    expect(territoryBounds.north).toBeGreaterThan(bounds.north);
    expect(territoryBounds.west).toBeLessThan(bounds.west);
    expect(territoryBounds.east).toBeGreaterThan(bounds.east);
    // Y no vuelve a ser el rectángulo de medio departamento de antes.
    expect(territoryBounds.north - territoryBounds.south).toBeLessThan(1);
    expect(territoryBounds.east - territoryBounds.west).toBeLessThan(1);
  });

  /**
   * **El marco tiene que cubrir el municipio entero, esquinas incluidas.**
   *
   * El catálogo solo tiene doce puntos y ninguno está cerca de los bordes, así
   * que comprobar el catálogo no dice nada sobre si cabe una vereda que todavía
   * no conocemos. Esto sí: son los extremos del contorno del municipio de Olaya
   * Herrera —OpenStreetMap, relación 1311681, `admin_level=6`, 1.929 vértices—,
   * y si alguien vuelve a apretar el marco, caen.
   *
   * Con el borde norte en 2,55 quedaban fuera unos 146 km² de la esquina norte,
   * hacia el Pacífico. Ninguna vereda conocida está allí; es exactamente donde
   * estaría una que no conocemos.
   */
  const municipio = {
    south: 2.01777,
    north: 2.60209,
    west: -78.42888,
    east: -78.20023,
  };

  it("el marco cubre el municipio entero, esquinas incluidas", () => {
    for (const lat of [municipio.south, municipio.north])
      for (const lng of [municipio.west, municipio.east])
        expect(isInsideTerritory(lat, lng)).toBe(true);
  });

  /**
   * Y no se valida contra el contorno del municipio, a propósito: el DANE sitúa
   * **Pueblo Nuevo** —una de las dieciocho veredas del Consejo— en Mosquera, al
   * oeste del borde municipal. El territorio del Consejo no coincide con el
   * municipio, y un marco que siguiera la frontera administrativa dejaría fuera
   * una vereda propia.
   */
  it("admite una vereda del Consejo que cae fuera del municipio", () => {
    expect(2.24645 > municipio.south && -78.451425 < municipio.west).toBe(true);
    expect(isInsideTerritory(2.24645, -78.451425)).toBe(true);
  });

  it("rechaza un punto en los Andes aunque siga en Nariño", () => {
    // San Isidro de Taminango, el homónimo lejano: 1.5718, −77.3140.
    expect(isInsideTerritory(1.5718, -77.314)).toBe(false);
  });
});
