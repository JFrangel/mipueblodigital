import { expect, it, vi, beforeEach } from "vitest";

/**
 * Lo que no se manda, no se toca.
 *
 * La ruta que gestiona un expediente la usan ahora dos pantallas: el panel del
 * Consejo, que tiene delante la clasificación entera, y la ficha del propio
 * expediente, desde donde solo se cambia el estado y se deja dicho por qué.
 *
 * **Lo que se juega aquí es privacidad.** Si la ruta rellenara con valores por
 * defecto lo que la ficha no manda, un simple cambio de estado despublicaría un
 * caso —o peor, publicaría uno que el Consejo dejó reservado— sin que nadie lo
 * hubiera pedido. Estas pruebas sostienen que un cliente parcial no puede hacer
 * ese daño, y que uno completo sigue mandando exactamente igual que antes.
 */
const id = "c".repeat(64);

const state = vi.hoisted(() => ({
  incidente: undefined as Record<string, unknown> | undefined,
  publico: undefined as Record<string, unknown> | undefined,
  escrito: [] as Array<{ op: string; path: string; data?: unknown }>,
}));

vi.mock("../../src/server/push", () => ({ avisar: async () => undefined }));

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
        collection: (c: string) => ({
          doc: (d: string) => ({ path: `${path}/${c}/${d}` }),
        }),
      }),
      runTransaction: async (
        fn: (tx: {
          get: (ref: { path: string }) => Promise<unknown>;
          create: (ref: { path: string }, data: unknown) => void;
          set: (ref: { path: string }, data: unknown) => void;
          update: (ref: { path: string }, data: unknown) => void;
          delete: (ref: { path: string }) => void;
        }) => unknown,
      ) =>
        fn({
          get: async (ref) => ({
            exists: ref.path.startsWith("publicIncidents/")
              ? !!state.publico
              : ref.path.includes("/events/")
                ? false
                : !!state.incidente,
            data: () =>
              ref.path.startsWith("publicIncidents/")
                ? state.publico
                : ref.path.includes("/events/")
                  ? undefined
                  : state.incidente,
          }),
          create: (ref, data) =>
            state.escrito.push({ op: "create", path: ref.path, data }),
          set: (ref, data) =>
            state.escrito.push({ op: "set", path: ref.path, data }),
          update: (ref, data) =>
            state.escrito.push({ op: "update", path: ref.path, data }),
          delete: (ref) => state.escrito.push({ op: "delete", path: ref.path }),
        }),
    },
  }),
}));

const { PATCH } = await import("../../src/app/api/admin/incidents/[id]/route");

const params = Promise.resolve({ id });

/** Lo mínimo que manda la ficha: estado, quién y el porqué. */
const desdeLaFicha = (extra: Record<string, unknown> = {}) =>
  new Request(`http://localhost/api/admin/incidents/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      mutationId: "12345678-1234-4234-8234-123456789abc",
      version: 3,
      status: "en_proceso",
      publicNote: "Ya fuimos a mirarlo",
      ...extra,
    }),
  });

const guardado = () =>
  state.escrito.find((e) => e.path === `incidents/${id}`)?.data as Record<
    string,
    unknown
  >;

beforeEach(() => {
  state.escrito = [];
  state.publico = undefined;
  state.incidente = {
    version: 3,
    status: "pendiente",
    owner: "vecina",
    date: "2026-09-01T00:00:00Z",
    category: "infraestructura",
    assignee: "Cuadrilla del muelle",
    priority: "alta",
    sensitivity: "safe",
    publication: "private",
  };
});

it("un cambio de estado sin clasificación conserva la que ya tenía", async () => {
  const r = await PATCH(desdeLaFicha(), { params });
  expect(r.status).toBe(200);
  expect(guardado()).toMatchObject({
    status: "en_proceso",
    sensitivity: "safe",
    publication: "private",
  });
});

/* El caso contrario, que es el que asusta: reservado tiene que seguir
   reservado, y no hay `set` sobre la ficha pública que lo estrene. */
it("no publica un caso reservado por no venir la clasificación", async () => {
  await PATCH(desdeLaFicha(), { params });
  expect(
    state.escrito.filter(
      (e) => e.path === `publicIncidents/${id}` && e.op !== "delete",
    ),
  ).toHaveLength(0);
});

it("y no despublica uno que ya estaba público", async () => {
  state.incidente!.publication = "public";
  state.publico = { published: true, title: "Muelle dañado" };
  await PATCH(desdeLaFicha(), { params });
  expect(guardado()).toMatchObject({ publication: "public" });
  /* La ficha pública no se reescribe con lo que no vino: se le pone al día lo
     único que cambió, que es el estado. */
  expect(
    state.escrito.find((e) => e.path === `publicIncidents/${id}`),
  ).toMatchObject({ op: "update", data: { status: "en_proceso" } });
});

it("conserva la prioridad y el responsable que no se mandaron", async () => {
  await PATCH(desdeLaFicha(), { params });
  expect(guardado()).toMatchObject({
    priority: "alta",
    assignee: "Cuadrilla del muelle",
  });
});

it("pero sí cambia el responsable cuando la ficha lo manda, incluso a vacío", async () => {
  await PATCH(desdeLaFicha({ assignee: "" }), { params });
  expect(guardado()).toMatchObject({ assignee: "" });
});

/* Y el panel del Consejo sigue mandando igual que siempre: lo que llega manda
   sobre lo guardado, que es justo lo que esta ruta hacía antes. */
it("lo que el panel manda sigue pisando lo guardado", async () => {
  await PATCH(
    desdeLaFicha({
      sensitivity: "sensitive",
      publication: "private",
      priority: "baja",
      assignee: "Otra cuadrilla",
    }),
    { params },
  );
  expect(guardado()).toMatchObject({
    sensitivity: "sensitive",
    publication: "private",
    priority: "baja",
    assignee: "Otra cuadrilla",
  });
});

/* Un caso reservado que se quiere publicar sin ficha pública sigue sin poder:
   la puerta que protege la privacidad no se abrió al hacer opcional el resto. */
it("publicar sin ficha pública sigue rechazándose", async () => {
  const r = await PATCH(
    desdeLaFicha({ publication: "public", sensitivity: "safe" }),
    { params },
  );
  expect(r.status).toBe(400);
});

/* Y publicar sin la revisión de sensibilidad tampoco, venga de donde venga. */
it("publicar sin revisar la sensibilidad sigue rechazándose", async () => {
  state.incidente!.sensitivity = "unreviewed";
  const r = await PATCH(desdeLaFicha({ publication: "public" }), { params });
  expect(r.status).toBe(409);
});

it("una clasificación inventada se rechaza, no se ignora", async () => {
  expect(
    (await PATCH(desdeLaFicha({ publication: "medio-publico" }), { params }))
      .status,
  ).toBe(400);
  expect(
    (await PATCH(desdeLaFicha({ sensitivity: "quizas" }), { params })).status,
  ).toBe(400);
});
