import { beforeEach, expect, it, vi } from "vitest";
import { anotarAporte, type Acumulado } from "../../src/server/veredas";
import type { Aporte } from "../../src/domain/veredas";

/**
 * El acumulador: el grano de arena que cada reporte deja para situar su vereda.
 *
 * Lo que se sostiene aquí no es la aritmética —eso es de `veredas.test.ts`— sino
 * las tres reglas de convivencia con el resto de la aplicación:
 *
 * 1. Lo que no cuenta **ni se guarda**. Un punto tocado sobre un mapa guardado
 *    «por si acaso» es la tentación de contarlo algún día.
 * 2. Una vereda ya situada no vuelve a molestar al Consejo por nada. Sin esto,
 *    cada reporte generaría una propuesta idéntica a la anterior.
 * 3. Un «no» del Consejo se respeta. Lo descartado no resucita solo.
 */
const almacen = new Map<string, Acumulado>();

/** Una base de datos de mentira, con transacción y todo. */
const db = {
  doc: (ruta: string) => ({
    ruta,
    get: async () => ({ data: () => almacen.get(ruta) }),
  }),
  runTransaction: async (
    fn: (tx: {
      get: (d: { ruta: string }) => Promise<{ data: () => unknown }>;
      set: (d: { ruta: string }, campos: Acumulado) => void;
    }) => Promise<void>,
  ) =>
    fn({
      get: async (d) => ({ data: () => almacen.get(d.ruta) }),
      set: (d, campos) =>
        void almacen.set(d.ruta, { ...almacen.get(d.ruta), ...campos }),
    }),
} as unknown as Parameters<typeof anotarAporte>[0];

const aporte = (p: Partial<Aporte> = {}): Aporte => ({
  lat: 2.2,
  lng: -78.2,
  exactitud: 15,
  origen: "aparato",
  cuenta: "ana",
  ...p,
});

const guardado = () => almacen.get("veredaProposals/el firme");

/** Tres aportes de dos cuentas: lo mínimo para que haya propuesta. */
async function tresDeDos(yaSituada: { lat: number; lng: number } | null = null) {
  for (const cuenta of ["ana", "beto", "ana"])
    await anotarAporte(db, "El Firme", aporte({ cuenta }), {
      nueva: true,
      yaSituada,
    });
}

beforeEach(() => {
  almacen.clear();
  vi.useRealTimers();
});

/* ── Lo que no cuenta ni se guarda ────────────────────────────────────── */

it("un punto marcado a mano no deja rastro", async () => {
  await anotarAporte(db, "El Firme", aporte({ origen: "mano" }), {
    nueva: true,
    yaSituada: null,
  });
  expect(almacen.size).toBe(0);
});

it("un punto con mal margen tampoco", async () => {
  await anotarAporte(db, "El Firme", aporte({ exactitud: 400 }), {
    nueva: true,
    yaSituada: null,
  });
  expect(almacen.size).toBe(0);
});

/* ── Lo que sí ────────────────────────────────────────────────────────── */

it("un punto del aparato se guarda, y todavía no propone nada", async () => {
  await anotarAporte(db, "El Firme", aporte(), { nueva: true, yaSituada: null });
  expect(guardado()).toMatchObject({
    nombre: "El Firme",
    nueva: true,
    estado: "recogiendo",
    propuesta: null,
  });
  expect(guardado()?.aportes).toHaveLength(1);
});

it("con tres de dos cuentas ya hay propuesta para el Consejo", async () => {
  await tresDeDos();
  expect(guardado()).toMatchObject({ estado: "propuesta" });
  expect(guardado()?.propuesta).toMatchObject({ aportes: 3, cuentas: 2 });
});

/* La clave es el nombre normalizado: «El Firme» y «el firme» son la misma
   vereda, y si no lo fueran, ninguna de las dos juntaría nunca tres aportes. */
it("el nombre escrito de otra manera cae en el mismo sitio", async () => {
  await anotarAporte(db, "El Firme", aporte({ cuenta: "ana" }), {
    nueva: true,
    yaSituada: null,
  });
  await anotarAporte(db, "el  firme", aporte({ cuenta: "beto" }), {
    nueva: true,
    yaSituada: null,
  });
  expect(almacen.size).toBe(1);
  expect(guardado()?.aportes).toHaveLength(2);
});

/* ── No molestar al Consejo dos veces por lo mismo ────────────────────── */

/**
 * Una vereda que ya está situada —por el catálogo o porque el Consejo aceptó un
 * punto— no vuelve a la bandeja por unos metros. Sin esto, cada reporte
 * generaría una propuesta que dice lo mismo que la anterior y la pantalla del
 * Consejo se volvería ruido que nadie mira.
 */
it("una vereda ya situada no propone nada por unos metros", async () => {
  await tresDeDos({ lat: 2.2004, lng: -78.2 });
  expect(guardado()).toMatchObject({ estado: "recogiendo" });
});

it("pero sí cuando el centro se ha ido lejos", async () => {
  await tresDeDos({ lat: 2.25, lng: -78.2 });
  expect(guardado()).toMatchObject({ estado: "propuesta" });
});

/* ── Y el «no» del Consejo se respeta ─────────────────────────────────── */

it("lo descartado no resucita con reportes nuevos", async () => {
  await tresDeDos();
  almacen.set("veredaProposals/el firme", {
    ...guardado()!,
    estado: "descartada",
  });
  await anotarAporte(db, "El Firme", aporte({ cuenta: "carmen" }), {
    nueva: true,
    yaSituada: null,
  });
  expect(guardado()).toMatchObject({ estado: "descartada" });
  /* Y ni siquiera se guarda el aporte: el documento queda como estaba. */
  expect(guardado()?.aportes).toHaveLength(3);
});

/* Lo aceptado sigue recogiendo —para poder avisar si el punto se mueve— pero no
   se degrada a «recogiendo», que borraría de la pantalla del Consejo el hecho
   de que esa vereda ya está resuelta. */
it("lo aceptado sigue aceptado mientras el punto no se mueva", async () => {
  await tresDeDos();
  almacen.set("veredaProposals/el firme", {
    ...guardado()!,
    estado: "aceptada",
  });
  await anotarAporte(db, "El Firme", aporte({ cuenta: "carmen" }), {
    nueva: true,
    yaSituada: { lat: 2.2, lng: -78.2 },
  });
  expect(guardado()).toMatchObject({ estado: "aceptada" });
  expect(guardado()?.aportes).toHaveLength(4);
});

/* ── El tamaño del documento ──────────────────────────────────────────── */

/* Un documento de Firestore no es un almacén de series. Se queda con lo
   reciente, que además describe mejor dónde está la gente hoy. */
it("no crece sin fin: se queda con los últimos", async () => {
  for (let i = 0; i < 70; i++)
    await anotarAporte(db, "El Firme", aporte({ cuenta: `vecina-${i}` }), {
      nueva: true,
      yaSituada: null,
    });
  expect(guardado()?.aportes).toHaveLength(60);
  expect(guardado()?.aportes.at(-1)?.cuenta).toBe("vecina-69");
});
