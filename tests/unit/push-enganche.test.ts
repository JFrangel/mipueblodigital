import { beforeEach, expect, it, vi } from "vitest";

/**
 * Cuándo suena el teléfono al cambiar el estado de un expediente, y cuándo no.
 *
 * Esta ruta era la única de las cuatro sin banco de pruebas propio, y es la del
 * enganche más delicado: el aviso de la bandeja solo se escribe si el caso tiene
 * dueño **y** algo cambió para él —el estado, o una nota pública—, así que el
 * teléfono tiene que sonar exactamente en esos mismos casos. Uno que suena
 * cuando la bandeja no recibe nada es ruido, y el ruido enseña a la gente a
 * ignorar el aviso.
 *
 * Lo que no se prueba aquí es Firestore. Se prueba quién recibe qué.
 */
const id = "c".repeat(64);

const state = vi.hoisted(() => ({
  caso: {} as Record<string, unknown>,
  /* Los cambios ya aplicados, por identificador de mutación. */
  eventos: new Map<string, Record<string, unknown>>(),
  escrito: [] as Array<{ path: string; data?: unknown }>,
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
        collection: (name: string) => ({
          doc: (docId: string) => ({ path: `${path}/${name}/${docId}` }),
        }),
      }),
      runTransaction: async (fn: (t: unknown) => unknown) => {
        const escrituras: Array<() => void> = [];
        const resultado = await fn({
          get: async (ref: { path: string }) => {
            if (ref.path === `incidents/${id}`)
              return { data: () => state.caso };
            const evento = state.eventos.get(ref.path);
            return { exists: !!evento, data: () => evento };
          },
          create: (ref: { path: string }, data: Record<string, unknown>) =>
            escrituras.push(() => {
              state.escrito.push({ path: ref.path, data });
              state.eventos.set(ref.path, data);
            }),
          set: (ref: { path: string }, data: Record<string, unknown>) =>
            escrituras.push(() => state.escrito.push({ path: ref.path, data })),
          update: (ref: { path: string }, data: Record<string, unknown>) =>
            escrituras.push(() => state.escrito.push({ path: ref.path, data })),
          delete: (ref: { path: string }) =>
            escrituras.push(() => state.escrito.push({ path: ref.path })),
        });
        escrituras.forEach((w) => w());
        return resultado;
      },
    },
  }),
}));

import { PATCH } from "../../src/app/api/admin/incidents/[id]/route";

const cambiar = (extra: Record<string, unknown> = {}) =>
  PATCH(
    new Request(`http://localhost/api/admin/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        mutationId: "11111111-1111-4111-8111-111111111111",
        version: 0,
        status: "en_proceso",
        publicNote: "",
        /* La ruta exige un motivo para el historial, público o interno. El
           interno no sale de la bandeja del Consejo y por eso no es novedad
           para quien reportó: sirve para que estas pruebas puedan guardar sin
           decirle nada al vecino. */
        internalNote: "Queda anotado para la próxima salida.",
        sensitivity: "sensitive",
        assignee: "",
        publicTitle: "",
        publicSummary: "",
        publicVereda: "",
        publication: "private",
        priority: "media",
        ...extra,
      }),
    }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  state.eventos.clear();
  state.escrito = [];
  state.avisos = [];
  state.caso = {
    id,
    owner: "vecina-luz",
    version: 0,
    status: "pendiente",
    publication: "private",
    title: "Derrumbe en la vía",
  };
});

it("un cambio de estado le suena al vecino dueño del reporte", async () => {
  expect((await cambiar()).status).toBe(200);
  expect(state.avisos).toHaveLength(1);
  expect(state.avisos[0].destino).toEqual({ uid: "vecina-luz" });
  expect(state.avisos[0].aviso.title).toBe("El Consejo actualizó tu reporte");
  expect(state.avisos[0].aviso.url).toBe(`/reporte/${id}/`);
});

/* El cambio lo acaba de hacer uno de ellos y está en la bandeja compartida.
   Avisar a cinco personas de lo que hizo la sexta es spam. */
it("al Consejo no le suena lo que acaba de hacer uno de ellos", async () => {
  await cambiar();
  expect(state.avisos.filter((a) => "consejo" in (a.destino as object))).toEqual(
    [],
  );
});

/* El aviso de la bandeja solo se escribe si algo cambió para el vecino. El
   teléfono tiene que seguir esa misma condición, ni más ni menos: guardar el
   caso con el mismo estado y sin nota no es novedad para nadie de fuera. */
it("guardar sin cambiar nada para el vecino no suena", async () => {
  await cambiar({ status: "pendiente" });
  expect(state.avisos).toEqual([]);
});

/* Una nota pública sí es novedad, aunque el estado se quede como estaba. */
it("una nota pública suena aunque el estado no cambie", async () => {
  await cambiar({ status: "pendiente", publicNote: "Pasamos el martes." });
  expect(state.avisos).toHaveLength(1);
  expect(state.avisos[0].aviso.body).toBe("Pasamos el martes.");
});

/* Sin nota, el cuerpo dice en qué quedó el caso. Un aviso que solo dice «tu
   reporte cambió» obliga a abrir la aplicación para saber a qué. */
it("sin nota, el aviso dice en qué estado quedó", async () => {
  await cambiar();
  expect(state.avisos[0].aviso.body).toContain("En proceso");
});

/* Un expediente sin dueño —anonimizado— no tiene a quién avisar. */
it("un caso sin dueño no suena en ningún teléfono", async () => {
  state.caso.owner = "";
  await cambiar();
  expect(state.avisos).toEqual([]);
});

/* La idempotencia alcanza al teléfono: reintentar el mismo cambio no vuelve a
   sonar, igual que no vuelve a escribir en la bandeja. */
it("repetir el mismo cambio no vuelve a sonar", async () => {
  await cambiar();
  await cambiar();
  expect(state.avisos).toHaveLength(1);
});

/* La respuesta es del panel del Consejo y no tiene por qué llevar de quién es
   el caso: el aviso viaja aparte y se quita antes de contestar. */
it("la respuesta no lleva el identificador del vecino", async () => {
  const cuerpo = await (await cambiar()).json();
  expect(JSON.stringify(cuerpo)).not.toContain("vecina-luz");
  expect(cuerpo).toEqual({ version: 1 });
});
