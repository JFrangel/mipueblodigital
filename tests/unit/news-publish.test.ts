import { beforeEach, expect, it, vi } from "vitest";

/**
 * Guardar un comunicado.
 *
 * Dos reglas que no se ven en la pantalla y que cuestan caro si se rompen:
 * publicar avisa **una vez** —corregir una coma después no puede volver a
 * sonar en el teléfono de todo el río—, y guardar un cambio de título no
 * puede llevarse por delante la portada, que la pone otra ruta.
 */
type Documento = Record<string, unknown>;

const state = vi.hoisted(() => ({
  guardado: null as Documento | null,
  aviso: null as Documento | null,
  escrito: {} as Record<string, Documento | null>,
}));

const ruta = (path: string) => ({
  path,
  collection: () => ({ doc: () => ruta(`${path}/history/uno`) }),
});

const instantanea = (datos: Documento | null) => ({
  exists: datos !== null,
  data: () => datos ?? undefined,
});

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
    uid: "presidenta",
    db: {
      doc: ruta,
      runTransaction: async (
        fn: (tx: {
          get: (r: { path: string }) => Promise<unknown>;
          set: (r: { path: string }, v: Documento) => void;
          create: (r: { path: string }, v: Documento) => void;
          delete: (r: { path: string }) => void;
        }) => Promise<unknown>,
      ) =>
        fn({
          get: async (r) =>
            instantanea(
              r.path.startsWith("communityAnnouncements")
                ? state.aviso
                : state.guardado,
            ),
          set: (r, v) => {
            state.escrito[r.path] = v;
          },
          create: (r, v) => {
            state.escrito[r.path] = v;
          },
          delete: (r) => {
            state.escrito[r.path] = null;
          },
        }),
    },
  }),
}));

import { PUT } from "../../src/app/api/admin/news/[id]/route";

const comunicado = (cambios: Documento = {}) => ({
  title: "Jornada de limpieza del río Satinga",
  body: "Durante tres jornadas se recorrió el tramo entre Bocas de Satinga y Barro Caliente.",
  kind: "Boletín",
  status: "published",
  version: 0,
  ...cambios,
});

const guardar = (cuerpo: Documento) =>
  PUT(
    new Request("http://localhost/api/admin/news/jornada", {
      method: "PUT",
      headers: { authorization: "Bearer sintetico" },
      body: JSON.stringify(cuerpo),
    }),
    { params: Promise.resolve({ id: "jornada" }) },
  );

beforeEach(() => {
  state.guardado = null;
  state.aviso = null;
  state.escrito = {};
});

it("publicar deja el aviso con su comunicado y con la hora de ahora", async () => {
  const response = await guardar(comunicado());
  expect(response.status).toBe(200);
  const avisado = state.escrito["communityAnnouncements/jornada"];
  expect(avisado).toMatchObject({
    type: "announcement",
    newsId: "jornada",
    note: "Jornada de limpieza del río Satinga",
  });
  expect(String(avisado?.at).length).toBeGreaterThan(0);
});

it("corregir un comunicado ya publicado no vuelve a sonar la campana", async () => {
  const antes = "2026-09-01T10:00:00.000Z";
  state.guardado = { version: 1, cover: "a1b2c3d4e5f6" };
  state.aviso = { at: antes };
  await guardar(comunicado({ version: 1, title: "Jornada de limpieza, corregida" }));
  const avisado = state.escrito["communityAnnouncements/jornada"];
  /* La hora es lo que decide si suena: se conserva. El texto sí se actualiza. */
  expect(avisado?.at).toBe(antes);
  expect(avisado?.note).toBe("Jornada de limpieza, corregida");
});

it("guardar no se lleva por delante la portada, que la pone otra ruta", async () => {
  state.guardado = { version: 1, cover: "a1b2c3d4e5f6" };
  state.aviso = { at: "2026-09-01T10:00:00.000Z" };
  await guardar(comunicado({ version: 1 }));
  expect(state.escrito["news/jornada"]?.cover).toBe("a1b2c3d4e5f6");
});

it("retirar de la comunidad borra el aviso", async () => {
  state.guardado = { version: 1 };
  state.aviso = { at: "2026-09-01T10:00:00.000Z" };
  await guardar(comunicado({ version: 1, status: "draft" }));
  expect(state.escrito["communityAnnouncements/jornada"]).toBeNull();
});

it("una versión vieja se rechaza en vez de pisar lo de otra persona", async () => {
  state.guardado = { version: 3 };
  const response = await guardar(comunicado({ version: 1 }));
  expect(response.status).toBe(409);
  expect(state.escrito["news/jornada"]).toBeUndefined();
});
