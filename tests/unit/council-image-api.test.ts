import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  allowed: true,
}));
type DocReference = {
  path: string;
  get: () => Promise<{
    exists: boolean;
    data: () => Record<string, unknown> | undefined;
  }>;
  collection: (key: string) => { doc: (key: string) => DocReference };
};
const doc: (path: string) => DocReference = (
  path: string,
): {
  path: string;
  get: () => Promise<{
    exists: boolean;
    data: () => Record<string, unknown> | undefined;
  }>;
  collection: (key: string) => { doc: (key: string) => DocReference };
} => ({
  path,
  get: async () => ({
    exists: state.docs.has(path),
    data: () => state.docs.get(path),
  }),
  collection: (key) => ({ doc: (id) => doc(`${path}/${key}/${id}`) }),
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
  requireAdmin: async () => {
    if (!state.allowed)
      throw Object.assign(new Error("Acceso denegado"), { status: 403 });
    return {
      uid: "consejo",
      db: {
        doc,
        runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
          const writes: (() => void)[] = [];
          const result = await fn({
            get: async (ref: { path: string }) => doc(ref.path).get(),
            create: (ref: { path: string }, d: Record<string, unknown>) =>
              writes.push(() => state.docs.set(ref.path, d)),
            update: (ref: { path: string }, d: Record<string, unknown>) =>
              writes.push(() =>
                state.docs.set(ref.path, { ...state.docs.get(ref.path), ...d }),
              ),
            set: (ref: { path: string }, d: Record<string, unknown>) =>
              writes.push(() => state.docs.set(ref.path, d)),
            delete: (ref: { path: string }) =>
              writes.push(() => state.docs.delete(ref.path)),
          });
          writes.forEach((w) => w());
          return result;
        },
      },
    };
  },
}));
vi.mock("../../src/server/push", () => ({ avisar: async () => undefined }));
vi.mock("../../src/server/event-image", () => ({
  archiveEventImage: async () => ({
    imageId: "12345678-1234-4234-8234-123456789abc",
    imageHash: "a".repeat(64),
  }),
}));
import { PATCH } from "../../src/app/api/admin/incidents/[id]/route";
const id = "b".repeat(64),
  mutationId = "12345678-1234-4234-8234-123456789abc";
beforeEach(() => {
  state.docs.clear();
  state.docs.set(`incidents/${id}`, {
    version: 1,
    status: "pendiente",
    sensitivity: "unreviewed",
    publication: "private",
    owner: "vecina",
  });
});
const request = (extra = {}) =>
  new Request(`http://localhost/api/admin/incidents/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      version: 1,
      mutationId,
      status: "pendiente",
      internalNote: "Visita al muelle",
      image: "foto",
      type: "visit",
      visitDate: "2026-10-21",
      visitResponsible: "Ana",
      ...extra,
    }),
  });
it("registra visita con imagen sin cambiar estado y permite reintento idéntico", async () => {
  expect(
    (await PATCH(request(), { params: Promise.resolve({ id }) })).status,
  ).toBe(200);
  expect(state.docs.get(`incidents/${id}`)).toMatchObject({
    version: 2,
    status: "pendiente",
  });
  expect(state.docs.get(`incidents/${id}/events/${mutationId}`)).toMatchObject({
    type: "visit",
    visitDate: "2026-10-21",
    imageId: expect.any(String),
  });
  expect(
    (await PATCH(request(), { params: Promise.resolve({ id }) })).status,
  ).toBe(200);
  expect(state.docs.get(`incidents/${id}`)?.version).toBe(2);
  expect(
    (
      await PATCH(request({ internalNote: "Contenido cambiado" }), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(409);
});
