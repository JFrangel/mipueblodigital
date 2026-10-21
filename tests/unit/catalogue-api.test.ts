import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  admin: true,
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
  const doc = (path: string) => ({ path });
  const db = {
    doc,
    collection: (name: string) => ({
      doc: () => doc(`${name}/${state.docs.size}`),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const writes: (() => void)[] = [];
      const result = await fn({
        get: async (ref: { path: string }) => ({
          data: () => state.docs.get(ref.path),
        }),
        set: (ref: { path: string }, data: Record<string, unknown>) =>
          writes.push(() => state.docs.set(ref.path, data)),
        create: (ref: { path: string }, data: Record<string, unknown>) =>
          writes.push(() => state.docs.set(ref.path, data)),
      });
      writes.forEach((w) => w());
      return result;
    },
  };
  return {
    ApiError,
    requireMember: async () => ({ uid: "vecina", db }),
    requireAdmin: async () => {
      if (!state.admin) throw new ApiError(403, "Solo Consejo");
      return { uid: "ana", db };
    },
  };
});
import { POST } from "../../src/app/api/admin/territorio/catalogo/route";
import { GET } from "../../src/app/api/territorio/catalogo/route";
beforeEach(() => {
  state.admin = true;
  state.docs.clear();
  state.docs.set("territoryCatalogue/current", {
    version: 0,
    items: [
      { id: "bellavista", name: "Bellavista", aliases: [], active: true },
    ],
  });
});
const request = (body: Record<string, unknown>) =>
  new Request("http://localhost/api/admin/territorio/catalogo/", {
    method: "POST",
    body: JSON.stringify(body),
  });
it("valida una versión y la consulta ciudadana omite la identidad de quien validó", async () => {
  expect((await POST(request({ action: "validate", version: 0 }))).status).toBe(
    200,
  );
  const result = await (
    await GET(new Request("http://localhost/api/territorio/catalogo/"))
  ).json();
  expect(result.validated).toEqual({ version: 0, at: expect.any(String) });
  expect(JSON.stringify(result)).not.toContain('"actor"');
});
it("no pierde la edición de otro administrador y niega escritura a ciudadanos", async () => {
  expect(
    (
      await POST(
        request({
          action: "save",
          version: 0,
          id: "bellavista",
          name: "Nueva Bellavista",
        }),
      )
    ).status,
  ).toBe(200);
  expect(
    (await POST(request({ action: "remove", version: 0, id: "bellavista" })))
      .status,
  ).toBe(409);
  state.admin = false;
  expect((await POST(request({ action: "validate", version: 1 }))).status).toBe(
    403,
  );
});
