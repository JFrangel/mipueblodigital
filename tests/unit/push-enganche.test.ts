import { beforeEach, expect, it, vi } from "vitest";

/**
 * Cuándo suena el teléfono, y cuándo no, en las dos rutas que no tenían banco
 * propio: el cambio de estado de un expediente y la solicitud de eliminación de
 * cuenta.
 *
 * La del cambio de estado es la del enganche más delicado de los cuatro. El
 * aviso de la bandeja solo se escribe si el caso tiene dueño **y** algo cambió
 * para él —el estado, o una nota pública—, así que el teléfono tiene que sonar
 * exactamente en esos mismos casos. Uno que suena cuando la bandeja no registra
 * nada es ruido, y el ruido enseña a la gente a ignorar el aviso.
 *
 * Lo que no se prueba aquí es Firestore. Se prueba quién recibe qué.
 */
const id = "c".repeat(64);

const state = vi.hoisted(() => ({
  caso: {} as Record<string, unknown>,
  /* Documentos que ya existen: los cambios aplicados y las solicitudes de
     eliminación anteriores. Sirve para probar los reintentos. */
  existentes: new Map<string, Record<string, unknown>>(),
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

vi.mock("../../src/server/anonymize", () => ({
  anonymizeAccount: async () => ({
    complete: true,
    incidents: 0,
    notifications: 0,
    devices: 0,
    evidence: 0,
  }),
}));

/**
 * La misma base de datos de mentira para las dos rutas.
 *
 * Va en una declaración de función y no en una constante a propósito: las
 * fábricas de `vi.mock` se elevan por encima del resto del módulo, y una
 * constante todavía no existiría cuando se evalúan.
 */
function baseDeDatos() {
  return {
    doc: (path: string) => ({
      path,
      get: async () => ({ data: () => state.existentes.get(path) }),
      set: async (data: unknown) => {
        state.escrito.push({ path, data });
      },
      collection: (name: string) => ({
        doc: (docId: string) => ({ path: `${path}/${name}/${docId}` }),
      }),
    }),
    runTransaction: async (fn: (t: unknown) => unknown) => {
      const escrituras: Array<() => void> = [];
      const resultado = await fn({
        get: async (ref: { path: string }) => {
          if (ref.path === `incidents/${id}`) return { data: () => state.caso };
          const doc = state.existentes.get(ref.path);
          return { exists: !!doc, data: () => doc };
        },
        create: (ref: { path: string }, data: Record<string, unknown>) =>
          escrituras.push(() => {
            state.escrito.push({ path: ref.path, data });
            state.existentes.set(ref.path, data);
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
  };
}

vi.mock("../../src/server/admin-auth", () => ({
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  adminServices: () => ({
    auth: {
      updateUser: async () => undefined,
      revokeRefreshTokens: async () => undefined,
    },
  }),
  requireIdentity: async () => ({
    identity: { uid: "vecina-luz", admin: false },
    db: baseDeDatos(),
  }),
  requireAdmin: async () => ({
    uid: "consejo-ana",
    db: baseDeDatos(),
  }),
}));

import { PATCH } from "../../src/app/api/admin/incidents/[id]/route";
import { POST as solicitarBorrado } from "../../src/app/api/account/deletion/route";

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
  state.existentes.clear();
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

/* ── El expediente cambia de estado ───────────────────────────────────── */

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
  expect(
    state.avisos.filter((a) => "consejo" in (a.destino as object)),
  ).toEqual([]);
});

/* El aviso de la bandeja solo se escribe si algo cambió para el vecino. El
   teléfono sigue esa misma condición, ni más ni menos: guardar el caso con el
   mismo estado y una nota interna no es novedad para nadie de fuera. */
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
   reporte cambió» obliga a abrir la aplicación para saber a qué, que es justo
   lo que el aviso venía a evitar. */
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

/* ── Alguien pide borrar su cuenta ────────────────────────────────────── */

const pedirBorrado = () =>
  solicitarBorrado(
    new Request("http://localhost/api/account/deletion/", { method: "POST" }),
  );

/* Una solicitud de eliminación tiene plazos legales y el Consejo es quien
   responde por ellos. Enterarse al abrir el panel, cuando se abra, no sirve. */
it("una solicitud de eliminación le suena al Consejo", async () => {
  expect((await pedirBorrado()).status).toBe(200);
  expect(state.avisos).toHaveLength(1);
  expect(state.avisos[0].destino).toEqual({ consejo: true });
  expect(state.avisos[0].aviso.title).toBe(
    "Solicitud de eliminación de cuenta",
  );
  expect(state.avisos[0].aviso.url).toBe("/admin/");
});

/* El aviso no dice de quién es la solicitud. El Consejo lo verá en el panel,
   con su control de acceso delante; una notificación se lee en la pantalla de
   bloqueo, y ahí no va el nombre de quien pidió irse. */
it("el aviso de eliminación no nombra a quien la pidió", async () => {
  await pedirBorrado();
  const texto = JSON.stringify(state.avisos[0].aviso);
  expect(texto).not.toContain("vecina-luz");
});

/* Esta ruta se reintenta a propósito cuando algo quedó a medias, y el reintento
   no es una solicitud nueva. */
it("reintentar una solicitud a medias no vuelve a sonar", async () => {
  state.existentes.set("accountDeletionRequests/vecina-luz", {
    owner: "vecina-luz",
    state: "pending",
    pseudonym: "anon-ya-asignado",
    requestedAt: "2026-09-01T00:00:00.000Z",
  });
  await pedirBorrado();
  expect(state.avisos).toEqual([]);
});
