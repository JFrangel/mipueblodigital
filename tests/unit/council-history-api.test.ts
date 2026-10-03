import { beforeEach, expect, it, vi } from "vitest";
import { historySeeds } from "../../src/domain/council-history";
const state = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
  saved: null as Record<string, unknown> | null,
  audit: null as Record<string, unknown> | null,
  denied: false,
}));
vi.mock("../../src/server/admin-auth", () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  const ref = { collection: () => ({ doc: () => ({ audit: true }) }) };
  return {
    ApiError,
    requireAdmin: async () => {
      if (state.denied) throw new ApiError(403, "Acceso restringido.");
      return {
        uid: "admin-one",
        db: {
          doc: () => ref,
          runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
            fn({
              get: async () => ({ data: () => state.current }),
              set: (_ref: unknown, next: Record<string, unknown>) => {
                state.saved = next;
              },
              create: (_ref: unknown, next: Record<string, unknown>) => {
                state.audit = next;
              },
            }),
        },
      };
    },
  };
});
import { PUT } from "../../src/app/api/admin/history/[id]/route";
beforeEach(() => {
  state.current = null;
  state.saved = null;
  state.audit = null;
  state.denied = false;
});
const save = (body: unknown, id = "new-history") =>
  PUT(
    new Request("http://localhost/api/admin/history/new-history/", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
it("guarda y audita con versión confirmada y autor del servidor", async () => {
  const response = await save({ ...historySeeds[0], updatedBy: "spoofed" });
  expect(response.status).toBe(200);
  expect(state.saved).toMatchObject({ version: 1, updatedBy: "admin-one" });
  expect(state.audit).toMatchObject({ actorUid: "admin-one" });
  expect(await response.json()).not.toHaveProperty("updatedBy");
});
it("rechaza versiones antiguas sin sobrescribir", async () => {
  state.current = { version: 2 };
  expect((await save(historySeeds[0])).status).toBe(409);
  expect(state.saved).toBeNull();
});
it("rechaza al no administrador antes de escribir", async () => {
  state.denied = true;
  expect((await save(historySeeds[0])).status).toBe(403);
  expect(state.saved).toBeNull();
});
it("valida contenido e identificador antes de escribir", async () => {
  expect(
    (await save({ ...historySeeds[0], occurredOn: "2001-02-29" })).status,
  ).toBe(400);
  expect((await save(historySeeds[0], "base-inventada")).status).toBe(400);
  expect(state.saved).toBeNull();
});
