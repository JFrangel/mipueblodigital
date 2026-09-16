import { expect, it, vi } from "vitest";

/**
 * Un expediente suelto, pedido al servidor desde la pantalla de detalle.
 *
 * Es la misma proyección con más que perder de toda la aplicación —el
 * documento lleva al lado el teléfono de quien reportó y su identificador de
 * cuenta— pero por una puerta nueva: aquí se pide **uno**, por su código, y
 * quien pregunta puede no tener nada que ver con él. Lo que esta prueba fija es
 * que la puerta reparte lo mismo que el listado: el expediente a quien lo firmó
 * y al Consejo, la ficha pública a los demás, y «no encontrado» al resto, sin
 * decir cuál de las dos ausencias es.
 */
const id = "a".repeat(64);
const state = vi.hoisted(() => ({
  quien: "ana",
  consejo: false,
  incidente: undefined as Record<string, unknown> | undefined,
  publico: undefined as Record<string, unknown> | undefined,
  acta: undefined as Record<string, unknown> | undefined,
}));

vi.mock("../../src/server/admin-auth", () => ({
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  requireMember: async () => ({
    uid: state.quien,
    identity: { uid: state.quien, admin: state.consejo },
    db: {
      doc: (path: string) => ({
        get: async () => ({
          data: () =>
            path.startsWith("publicIncidents/")
              ? state.publico
              : path.startsWith("removedIncidents/")
                ? state.acta
                : state.incidente,
        }),
      }),
    },
  }),
}));

import { GET } from "../../src/app/api/incidents/[id]/route";

const viejo = "2026-09-01T00:00:00.000Z";
const expediente = (cambios: Record<string, unknown> = {}) => ({
  title: "Creciente en la quebrada",
  description: "El río se desbordó y se llevó el paso de tablas.",
  category: "infraestructura",
  vereda: "Bellavista",
  status: "en_proceso",
  date: viejo,
  sensitivity: "unreviewed",
  /* Lo que nunca puede salir. */
  phone: "3001234567",
  owner: "uid-de-quien-reporto",
  evidenceId: "7a1f0c22-0000-4000-8000-000000000000",
  ...cambios,
});

const pedir = (codigo = id) =>
  GET(
    new Request(`http://localhost/api/incidents/${codigo}/`, {
      headers: { authorization: "Bearer sintetico" },
    }),
    { params: Promise.resolve({ id: codigo }) },
  );

it("quien lo reportó recibe su expediente tal como lo mandó", async () => {
  state.quien = "uid-de-quien-reporto";
  state.consejo = false;
  state.incidente = expediente();
  state.publico = undefined;
  state.acta = undefined;
  const respuesta = await pedir();
  expect(respuesta.status).toBe(200);
  expect((await respuesta.json()).item).toEqual({
    id,
    scope: "propio",
    title: "Creciente en la quebrada",
    description: "El río se desbordó y se llevó el paso de tablas.",
    category: "infraestructura",
    vereda: "Bellavista",
    status: "en_proceso",
    date: viejo,
    /* El punto que marcó quien reportó: aquí no marcó ninguno. Va porque es
       suyo y lo está pidiendo él; en la proyección de la comunidad no. */
    lat: null,
    lng: null,
  });
});

it("al Consejo se le sirve el expediente aunque no sea suyo", async () => {
  state.quien = "ana";
  state.consejo = true;
  state.incidente = expediente();
  state.publico = undefined;
  state.acta = undefined;
  const { item } = await (await pedir()).json();
  expect(item.scope).toBe("propio");
  expect(item.description).toContain("paso de tablas");
});

/* El caso que trajo todo esto: se abre un reporte de otra persona desde el
   mapa o desde el historial. Consta, pero solo hasta donde consta. */
it("a otra persona se le sirve lo que la comunidad ve, y nada más", async () => {
  state.quien = "ana";
  state.consejo = false;
  state.incidente = expediente();
  state.publico = undefined;
  state.acta = undefined;
  const respuesta = await pedir();
  expect(respuesta.status).toBe(200);
  const cuerpo = await respuesta.text();
  expect(JSON.parse(cuerpo).item.scope).toBe("automatico");
  for (const secreto of [
    "3001234567",
    "uid-de-quien-reporto",
    "7a1f0c22-0000-4000-8000-000000000000",
  ])
    expect(cuerpo).not.toContain(secreto);
});

it("el resumen del Consejo reemplaza al automático también aquí", async () => {
  state.quien = "ana";
  state.consejo = false;
  state.incidente = expediente({ status: "solucionado" });
  state.publico = {
    published: true,
    title: "Paso de tablas en Bellavista",
    summary: "El Consejo acordó una visita técnica esta semana.",
    vereda: "Bellavista",
    category: "infraestructura",
    createdAt: viejo,
  };
  const { item } = await (await pedir()).json();
  expect(item.scope).toBe("revisado");
  expect(item.title).toBe("Paso de tablas en Bellavista");
  /* El texto es del Consejo; en qué va el caso, del expediente vivo. */
  expect(item.status).toBe("solucionado");
});

it("lo marcado como delicado no aparece por este camino", async () => {
  state.quien = "ana";
  state.consejo = false;
  state.incidente = expediente({ sensitivity: "sensitive" });
  state.publico = undefined;
  state.acta = undefined;
  expect((await pedir()).status).toBe(404);
});

it("dentro del plazo y sin revisión, todavía no consta", async () => {
  state.quien = "ana";
  state.consejo = false;
  state.incidente = expediente({ date: new Date().toISOString() });
  state.publico = undefined;
  state.acta = undefined;
  expect((await pedir()).status).toBe(404);
});

/* La ausencia se dice igual en los dos casos: distinguir «no existe» de «no es
   para ti» ya confirma que el expediente existe. */
it("no existe y no es para ti se dicen con la misma frase", async () => {
  state.quien = "ana";
  state.consejo = false;
  state.incidente = undefined;
  const inexistente = await pedir();
  state.incidente = expediente({ sensitivity: "sensitive" });
  const ajeno = await pedir();
  expect(inexistente.status).toBe(404);
  expect(ajeno.status).toBe(404);
  expect(await inexistente.text()).toBe(await ajeno.text());
});

it("un código que no es de un expediente se rechaza sin consultar nada", async () => {
  state.quien = "ana";
  state.incidente = expediente();
  expect((await pedir("no-es-un-codigo")).status).toBe(404);
});

/**
 * Un expediente retirado no es un expediente perdido.
 *
 * Quien lo reportó abre su enlace viejo, o el código que apuntó en un papel, y
 * la pantalla le decía «no encontramos este reporte». Es lo contrario de lo que
 * pasó: el Consejo lo retiró a propósito y le mandó el motivo. A un tercero sí
 * se le dice «no encontrado», porque por qué se retiró el reporte de otro es
 * deliberación del Consejo sobre alguien que no es él.
 */
it("a quien lo reportó se le cuenta que se retiró, y por qué", async () => {
  state.quien = "uid-de-quien-reporto";
  state.consejo = false;
  state.incidente = undefined;
  state.acta = {
    owner: "uid-de-quien-reporto",
    reason: "Está repetido con el expediente del muelle del mismo día.",
    at: "2026-09-15T22:00:00.000Z",
    vereda: "Bellavista",
    category: "infraestructura",
    date: viejo,
  };
  const respuesta = await pedir();
  expect(respuesta.status).toBe(410);
  expect((await respuesta.json()).removed).toMatchObject({
    reason: "Está repetido con el expediente del muelle del mismo día.",
    at: "2026-09-15T22:00:00.000Z",
  });
});

it("al Consejo también, que es quien lo retiró", async () => {
  state.quien = "ana";
  state.consejo = true;
  state.incidente = undefined;
  state.acta = {
    owner: "otra-persona",
    reason: "No es del territorio.",
    at: viejo,
  };
  expect((await pedir()).status).toBe(410);
});

it("a un tercero el acta no le consta", async () => {
  state.quien = "ana";
  state.consejo = false;
  state.incidente = undefined;
  state.acta = {
    owner: "uid-de-quien-reporto",
    reason: "Nombraba a una persona por su nombre.",
    at: viejo,
  };
  const respuesta = await pedir();
  expect(respuesta.status).toBe(404);
  expect(await respuesta.text()).not.toContain("Nombraba");
});
