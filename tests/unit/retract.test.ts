import { expect, it, vi, beforeEach } from "vitest";

/**
 * Retirar un expediente, con el motivo que le llega a quien lo reportó.
 *
 * Lo que esta prueba sostiene no es que se borre —eso lo hace Firestore— sino
 * las tres condiciones que hacen que retirar no sea lo mismo que perder: que
 * sin motivo no se retira nada, que queda el acta de quién y por qué, y que a
 * quien lo envió le llega el aviso con ese mismo texto.
 */
const id = "b".repeat(64);
const state = vi.hoisted(() => ({
  incidente: undefined as Record<string, unknown> | undefined,
  acta: false,
  escrito: [] as Array<{ op: string; path: string; data?: unknown }>,
  evidencia: [] as string[],
  avisos: [] as Array<{
    destino: unknown;
    aviso: { title: string; body: string; url: string };
  }>,
}));

vi.mock("../../src/server/push", () => ({
  avisar: async (
    _db: unknown,
    destino: unknown,
    aviso: { title: string; body: string; url: string },
  ) => {
    state.avisos.push({ destino, aviso });
  },
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
  requireAdmin: async () => ({
    uid: "consejo-ana",
    db: {
      doc: (path: string) => ({
        path,
        collection: () => ({ doc: (d: string) => ({ path: `${path}/${d}` }) }),
      }),
      collection: (path: string) => {
        /* El barrido encadena `where(...).limit(...)`, así que el doble tiene
           que devolverse a sí mismo. Vacío: nada cuelga del caso. */
        const vacia: Record<string, unknown> = { path };
        vacia.where = () => vacia;
        vacia.limit = () => ({
          get: async () => ({ empty: true, docs: [], size: 0 }),
        });
        return vacia;
      },
      batch: () => ({ delete: () => undefined, commit: async () => undefined }),
      runTransaction: async (
        fn: (tx: {
          get: (ref: { path: string }) => Promise<unknown>;
          create: (ref: { path: string }, data: unknown) => void;
          set: (ref: { path: string }, data: unknown) => void;
          delete: (ref: { path: string }) => void;
        }) => unknown,
      ) =>
        fn({
          get: async (ref) => ({
            exists: ref.path.startsWith("removedIncidents/")
              ? state.acta
              : !!state.incidente,
            data: () =>
              ref.path.startsWith("removedIncidents/")
                ? undefined
                : state.incidente,
          }),
          create: (ref, data) =>
            state.escrito.push({ op: "create", path: ref.path, data }),
          /* El acta se escribe con `set`: un reenvío retirado dos veces tiene
             dos retiradas, y con `create` la segunda reventaría. */
          set: (ref, data) =>
            state.escrito.push({ op: "set", path: ref.path, data }),
          delete: (ref) => state.escrito.push({ op: "delete", path: ref.path }),
        }),
    },
  }),
}));

vi.mock("../../src/server/evidence", () => ({
  evidenceRequest: async (query: string) => {
    state.evidencia.push(query);
    return new Response("", { status: 204 });
  },
}));

import { POST } from "../../src/app/api/admin/incidents/[id]/retirada/route";

const retirar = (reason: string, codigo = id) =>
  POST(
    new Request(`http://localhost/api/admin/incidents/${codigo}/retirada/`, {
      method: "POST",
      headers: { authorization: "Bearer sintetico" },
      body: JSON.stringify({
        mutationId: "11111111-1111-4111-8111-111111111111",
        reason,
      }),
    }),
    { params: Promise.resolve({ id: codigo }) },
  );

beforeEach(() => {
  state.avisos = [];
  state.acta = false;
  state.escrito = [];
  state.evidencia = [];
  state.incidente = {
    owner: "uid-de-quien-reporto",
    title: "Creciente en la quebrada",
    category: "ambiental",
    vereda: "Bellavista",
    date: "2026-09-01T00:00:00.000Z",
    description: "El río se desbordó.",
    phone: "3001234567",
  };
});

it("sin motivo no se retira nada", async () => {
  const respuesta = await retirar("   ");
  expect(respuesta.status).toBe(400);
  expect((await respuesta.json()).error).toMatch(/motivo/i);
  expect(state.escrito).toHaveLength(0);
});

it("un motivo de dos palabras tampoco es un motivo", async () => {
  expect((await retirar("no sirve")).status).toBe(400);
  expect(state.escrito).toHaveLength(0);
});

it("retirar borra el expediente y su resumen público", async () => {
  const respuesta = await retirar(
    "Está repetido con el expediente del muelle.",
  );
  expect(respuesta.status).toBe(200);
  const borrados = state.escrito
    .filter((w) => w.op === "delete")
    .map((w) => w.path);
  expect(borrados).toContain(`incidents/${id}`);
  expect(borrados).toContain(`publicIncidents/${id}`);
});

it("el motivo le llega a quien reportó, tal como se escribió", async () => {
  const motivo = "Está repetido con el expediente del muelle del mismo día.";
  await retirar(motivo);
  const aviso = state.escrito.find((w) =>
    w.path.startsWith("notifications/uid-de-quien-reporto/items/"),
  );
  expect(aviso).toBeDefined();
  expect(aviso?.data).toMatchObject({
    type: "case_removed",
    title: "El Consejo retiró tu reporte",
    note: motivo,
  });
  /* Sin expediente al que llevar: ya no existe. */
  expect((aviso?.data as Record<string, unknown>).incidentId).toBeUndefined();
});

it("queda el acta con quién lo retiró y por qué, y sin el relato", async () => {
  await retirar("No corresponde al territorio del Consejo.");
  const acta = state.escrito.find((w) => w.path === `removedIncidents/${id}`);
  expect(acta?.data).toMatchObject({
    incidentId: id,
    owner: "uid-de-quien-reporto",
    reason: "No corresponde al territorio del Consejo.",
    actor: "consejo-ana",
  });
  const texto = JSON.stringify(acta?.data);
  expect(texto).not.toContain("3001234567");
  expect(texto).not.toContain("El río se desbordó");
});

it("la fotografía se borra del archivo privado", async () => {
  await retirar("Está repetido con el expediente del muelle.");
  expect(state.evidencia.join()).toContain(`incident_id=eq.${id}`);
});

it("repetir la llamada sobre algo ya retirado no vuelve a avisar", async () => {
  /* Un reintento de red: el acta está y el expediente ya no. */
  state.acta = true;
  state.incidente = undefined;
  const respuesta = await retirar(
    "Está repetido con el expediente del muelle.",
  );
  expect(respuesta.status).toBe(200);
  expect(await respuesta.json()).toMatchObject({ removed: true });
  expect(state.escrito).toHaveLength(0);
});

/**
 * El identificador de un expediente es el hash de su contenido, así que quien
 * reenvía el mismo reporte crea otro **con el mismo identificador** y el acta
 * de la primera retirada sigue ahí. Mirando solo el acta, la segunda retirada
 * contestaba «retirado» con su confirmación y el expediente se quedaba en la
 * bandeja.
 */
it("un reporte reenviado con el mismo contenido se puede volver a retirar", async () => {
  state.acta = true;
  const respuesta = await retirar("Lo volvió a mandar igual; sigue repetido.");
  expect(respuesta.status).toBe(200);
  expect(
    state.escrito.filter((w) => w.op === "delete").map((w) => w.path),
  ).toContain(`incidents/${id}`);
});

it("un expediente que no existe se dice y no se inventa un acta", async () => {
  state.incidente = undefined;
  const respuesta = await retirar(
    "Está repetido con el expediente del muelle.",
  );
  expect(respuesta.status).toBe(404);
  expect(state.escrito).toHaveLength(0);
});

/**
 * El motivo también suena en el teléfono.
 *
 * Es el aviso que más falta hace de los cuatro: a quien reportó le desaparece
 * el expediente de la lista, y sin esto se entera cuando vuelva a abrir la
 * aplicación —o no se entera—. Lleva el motivo tal cual, por lo mismo que lo
 * lleva el de la bandeja: enterarse de que retiraron tu reporte sin saber por
 * qué es peor que no enterarse.
 */
it("el motivo también le suena en el teléfono a quien reportó", async () => {
  const motivo = "Está repetido con el expediente del muelle.";
  await retirar(motivo);
  await new Promise((r) => setTimeout(r, 0));
  expect(state.avisos).toHaveLength(1);
  expect(state.avisos[0].destino).toEqual({ uid: "uid-de-quien-reporto" });
  expect(state.avisos[0].aviso.title).toBe("El Consejo retiró tu reporte");
  expect(state.avisos[0].aviso.body).toBe(motivo);
});

/* El expediente ya no existe, así que su dirección daría un 404: el aviso
   lleva a la lista, que es donde la persona puede ver que ya no está. */
it("el aviso de retirada no lleva a un expediente que ya no existe", async () => {
  await retirar("Está repetido con el expediente del muelle.");
  await new Promise((r) => setTimeout(r, 0));
  expect(state.avisos[0].aviso.url).toBe("/mis-reportes/");
});

/* La idempotencia alcanza al teléfono: un reintento de red no vuelve a sonar. */
it("repetir la retirada no vuelve a sonar el teléfono", async () => {
  state.acta = true;
  state.incidente = undefined;
  await retirar("Está repetido con el expediente del muelle.");
  await new Promise((r) => setTimeout(r, 0));
  expect(state.avisos).toHaveLength(0);
});
