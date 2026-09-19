import { describe, expect, it } from "vitest";
import {
  clave,
  comoLaDelCatalogo,
  cuenta,
  DERIVA_MINIMA,
  DISPERSION_AVISO,
  MARGEN_PARA_DEDUCIR,
  metrosEntre,
  proponer,
  seMovio,
  type Aporte,
} from "../../src/domain/veredas";

/**
 * Deducir dónde queda una vereda a partir de los reportes de quien está allí.
 *
 * Seis de las diecinueve veredas del catálogo no tienen punto, y sin punto no
 * hay mapa. Esto propone uno; acepta el Consejo. Lo que estas pruebas sostienen
 * son las cuatro maneras de deducir mal, que son silenciosas todas:
 *
 * 1. Con un promedio, un solo reporte lejano manda la vereda a otro sitio.
 * 2. Con los toques sobre el mapa contando, el sistema se mide a sí mismo.
 * 3. Con una sola cuenta, una persona decide dónde queda la vereda de todos.
 * 4. Con puntos de mal margen, el catálogo hereda el error del aparato.
 */

/** Un aporte válido, para no repetir lo mismo en cada prueba. */
const aporte = (p: Partial<Aporte> = {}): Aporte => ({
  lat: 2.2,
  lng: -78.2,
  exactitud: 15,
  origen: "aparato",
  cuenta: "ana",
  ...p,
});

describe("proponer un punto", () => {
  /**
   * La razón de ser de la mediana. Alguien reporta desde el casco urbano algo
   * que pasó en la vereda; su punto está a kilómetros. Con un promedio se
   * llevaría la vereda consigo.
   */
  const cerca = [
    aporte({ lat: 2.2, lng: -78.2, cuenta: "ana" }),
    aporte({ lat: 2.201, lng: -78.201, cuenta: "beto" }),
    aporte({ lat: 2.199, lng: -78.199, cuenta: "carmen" }),
  ];

  it("un punto lejano no mueve el centro, y un promedio sí lo movería", () => {
    const intruso = aporte({ lat: 2.45, lng: -78.45, cuenta: "daniel" });
    const solo = proponer(cerca)!;
    const conIntruso = proponer([...cerca, intruso])!;
    /* La mediana aguanta: el centro se mueve un escalón de redondeo. */
    expect(metrosEntre(solo, conIntruso)).toBeLessThan(150);
    /* Y esto es de lo que se libra. El promedio se lo habría llevado kilómetros,
       que es exactamente lo que le pasaría a una vereda si un solo reporte se
       hiciera desde el casco urbano. */
    const todos = [...cerca, intruso];
    const promedio = {
      lat: todos.reduce((s, a) => s + a.lat, 0) / todos.length,
      lng: todos.reduce((s, a) => s + a.lng, 0) / todos.length,
    };
    expect(metrosEntre(solo, promedio)).toBeGreaterThan(5000);
  });

  /**
   * Y aun así el intruso tiene que verse, porque el Consejo hace dos preguntas
   * distintas: «¿están juntos?» y «¿hay alguno que no pinta nada aquí?». La
   * mediana contesta la primera; para eso se eligió, y por eso mismo se queda
   * callada en la segunda: con dos perdidos entre cinco sigue diciendo
   * trescientos metros. Los apartados se cuentan aparte.
   */
  it("pero se cuenta cuántos quedaron lejos", () => {
    const conIntrusos = proponer([
      ...cerca,
      aporte({ lat: 2.45, lng: -78.45, cuenta: "daniel" }),
      aporte({ lat: 2.46, lng: -78.46, cuenta: "elena" }),
    ])!;
    expect(conIntrusos.dispersion).toBeLessThan(DISPERSION_AVISO);
    expect(conIntrusos.apartados).toBe(2);
    expect(conIntrusos.disperso).toBe(true);
  });

  it("y un grupo apretado no acusa a nadie", () => {
    const junto = proponer(cerca)!;
    expect(junto.apartados).toBe(0);
    expect(junto.disperso).toBe(false);
  });

  /**
   * El que cierra el bucle. En cuanto una vereda tenga punto aceptado, el
   * formulario abrirá su mapa ahí y la gente tocará para ajustar **el caso**.
   * Esos toques no dicen dónde está la vereda: salen de un mapa que ya estaba
   * centrado donde nosotros lo centramos.
   */
  it("un punto marcado a mano no cuenta", () => {
    expect(cuenta(aporte({ origen: "mano" }))).toBe(false);
    expect(
      proponer([
        aporte({ origen: "mano", cuenta: "ana" }),
        aporte({ origen: "mano", cuenta: "beto" }),
        aporte({ origen: "mano", cuenta: "carmen" }),
      ]),
    ).toBeNull();
  });

  it("un punto con mal margen tampoco", () => {
    expect(cuenta(aporte({ exactitud: MARGEN_PARA_DEDUCIR + 1 }))).toBe(false);
    expect(cuenta(aporte({ exactitud: MARGEN_PARA_DEDUCIR }))).toBe(true);
    expect(
      proponer([
        aporte({ exactitud: 400, cuenta: "ana" }),
        aporte({ exactitud: 400, cuenta: "beto" }),
        aporte({ exactitud: 400, cuenta: "carmen" }),
      ]),
    ).toBeNull();
  });

  /* Una persona reportando tres veces desde su casa es **un** dato, no tres.
     Sin esto, quien más reporta decide dónde queda la vereda de todos. */
  it("tres reportes de una sola cuenta no proponen nada", () => {
    expect(
      proponer([aporte(), aporte({ lat: 2.201 }), aporte({ lat: 2.202 })]),
    ).toBeNull();
  });

  it("dos aportes no bastan aunque sean de dos cuentas", () => {
    expect(
      proponer([aporte({ cuenta: "ana" }), aporte({ cuenta: "beto" })]),
    ).toBeNull();
  });

  it("tres aportes de dos cuentas sí, y lo dice", () => {
    const p = proponer([
      aporte({ cuenta: "ana" }),
      aporte({ cuenta: "ana", lat: 2.201 }),
      aporte({ cuenta: "beto", lat: 2.199 }),
    ]);
    expect(p).toMatchObject({ aportes: 3, cuentas: 2, disperso: false });
  });

  /* El punto se redondea a tres decimales: unos 110 m. Nombra un sector, que es
     lo único que el catálogo promete, y de paso no señala una casa. */
  it("el punto propuesto viene redondeado", () => {
    const p = proponer([
      aporte({ lat: 2.2003456, lng: -78.2007891, cuenta: "ana" }),
      aporte({ lat: 2.2003456, lng: -78.2007891, cuenta: "beto" }),
      aporte({ lat: 2.2003456, lng: -78.2007891, cuenta: "carmen" }),
    ])!;
    expect(p.lat).toBe(2.2);
    expect(p.lng).toBe(-78.201);
  });

  /* Los aportes que no cuentan no cuentan tampoco para el mínimo: si tres de
     cinco están marcados a mano, quedan dos y no hay propuesta. */
  it("los aportes descartados no rellenan el mínimo", () => {
    expect(
      proponer([
        aporte({ cuenta: "ana" }),
        aporte({ cuenta: "beto" }),
        aporte({ cuenta: "carmen", origen: "mano" }),
        aporte({ cuenta: "dora", origen: "mano" }),
        aporte({ cuenta: "elena", exactitud: 900 }),
      ]),
    ).toBeNull();
  });
});

describe("volver a molestar al Consejo", () => {
  /* El acumulador sigue acumulando después de aceptar, pero no mueve nada solo.
     Solo cuando el centro se aparta lo suficiente se vuelve a proponer. */
  it("una deriva pequeña no se propone; una grande sí", () => {
    const aceptado = { lat: 2.2, lng: -78.2 };
    expect(seMovio(aceptado, { lat: 2.2005, lng: -78.2 })).toBe(false);
    expect(seMovio(aceptado, { lat: 2.21, lng: -78.2 })).toBe(true);
  });

  it("el umbral es el declarado, no uno inventado", () => {
    const aceptado = { lat: 2.2, lng: -78.2 };
    const justo = { lat: 2.2 + DERIVA_MINIMA / 111320, lng: -78.2 };
    expect(seMovio(aceptado, justo)).toBe(true);
  });
});

describe("el nombre de una vereda", () => {
  /**
   * La bandeja del Consejo ya arrastra esta lección: sin normalizar,
   * «Bellavista», «Bella Vista» y «bellavista» son tres sitios, el mapa los
   * dibuja tres veces y las cifras los cuentan por separado.
   */
  it("se reconoce escrito de cualquier manera", () => {
    const catalogo = ["Bellavista", "Boca de Víbora", "Las Marías"];
    for (const escrito of [
      "bellavista",
      "BELLAVISTA",
      "Bella Vista",
      "  bella   vista  ",
      "Bellavísta",
    ])
      expect(comoLaDelCatalogo(escrito, catalogo)).toBe("Bellavista");
  });

  it("los acentos y los signos no hacen una vereda distinta", () => {
    const catalogo = ["Boca de Víbora", "Las Marías"];
    expect(comoLaDelCatalogo("boca de vibora", catalogo)).toBe("Boca de Víbora");
    expect(comoLaDelCatalogo("Las Marias.", catalogo)).toBe("Las Marías");
  });

  /* Y una que de verdad es nueva se reconoce como nueva: si esto devolviera
     cualquier cosa parecida, el catálogo no crecería nunca y la gente vería su
     vereda renombrada sin haberlo pedido. */
  it("una vereda nueva no se confunde con ninguna", () => {
    expect(comoLaDelCatalogo("El Firme", ["Bellavista", "Las Marías"])).toBeNull();
  });

  it("un nombre vacío no encuentra nada", () => {
    expect(comoLaDelCatalogo("   ", ["Bellavista"])).toBeNull();
    expect(clave("  ")).toBe("");
  });
});

describe("la distancia", () => {
  /* Un grado de latitud son unos 111 km. Si esto se desviara, todos los
     umbrales de arriba medirían otra cosa sin que nada lo dijera. */
  it("mide en metros de verdad", () => {
    const uno = metrosEntre({ lat: 2.2, lng: -78.2 }, { lat: 2.21, lng: -78.2 });
    expect(uno).toBeGreaterThan(1100);
    expect(uno).toBeLessThan(1120);
  });

  it("y el mismo punto dista cero", () => {
    expect(metrosEntre({ lat: 2.2, lng: -78.2 }, { lat: 2.2, lng: -78.2 })).toBe(
      0,
    );
  });

  /**
   * Un grado de longitud es más corto que uno de latitud, y cuánto más corto
   * depende de dónde estés. Aquí, a 2,2° N, son unos ochenta metros menos.
   *
   * Es poco, y por eso está esta prueba: sin ella, quitar la corrección no
   * cambiaba ningún resultado de las pruebas de arriba —una mutación
   * sobrevivió— y la fórmula se habría quedado diciendo una cosa y haciendo
   * otra hasta que alguien la reutilizara en otra latitud.
   */
  it("un grado de longitud mide menos que uno de latitud", () => {
    const latitud = metrosEntre(
      { lat: 2.2, lng: -78.2 },
      { lat: 3.2, lng: -78.2 },
    );
    const longitud = metrosEntre(
      { lat: 2.2, lng: -78.2 },
      { lat: 2.2, lng: -77.2 },
    );
    expect(latitud).toBeGreaterThan(longitud);
    expect(latitud - longitud).toBeGreaterThan(50);
  });
});
