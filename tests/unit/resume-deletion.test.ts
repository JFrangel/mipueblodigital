import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  admin: true,
  active: false,
  result: false,
  calls: 0,
  failCleanup: false,
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  docs: new Map<string, Record<string, unknown>>(),
}));
const doc = (path: string) => ({
  get: async () => ({ data: () => state.docs.get(path) }),
  set: async (data: Record<string, unknown>) => {
    state.docs.set(path, { ...state.docs.get(path), ...data });
  },
});
vi.mock("../../src/server/admin-auth", () => ({
  ApiError: state.ApiError,
  requireAdmin: async () => {
    if (!state.admin) throw new state.ApiError(403, "Solo Consejo");
    return {
      uid: "council",
      db: {
        doc,
        runTransaction: async (
          fn: (tx: {
            get: (
              ref: ReturnType<typeof doc>,
            ) => ReturnType<ReturnType<typeof doc>["get"]>;
            set: (
              ref: ReturnType<typeof doc>,
              data: Record<string, unknown>,
            ) => void;
          }) => unknown,
        ) =>
          fn({
            get: (ref) => ref.get(),
            set: (ref, data) => {
              void ref.set(data);
            },
          }),
      },
    };
  },
  adminServices: () => ({
    auth: {
      getUserByEmail: async () => ({ uid: "alice" }),
      updateUser: async () => {},
      revokeRefreshTokens: async () => {},
    },
  }),
}));
vi.mock("../../src/server/anonymize", () => ({
  anonymizeAccount: async () => {
    state.calls++;
    if (state.failCleanup) throw new Error("network");
    return {
      complete: state.result,
      incidents: 1,
      evidence: state.result,
      notifications: 0,
      devices: 0,
    };
  },
}));
import { POST } from "../../src/app/api/admin/accounts/eliminacion/route";
beforeEach(() => {
  state.admin = true;
  state.calls = 0;
  state.result = false;
  state.failCleanup = false;
  state.docs.clear();
  state.docs.set("accounts/alice", { active: false });
  state.docs.set("accountDeletionRequests/alice", {
    state: "partial",
    owner: "alice",
    pseudonym: "anon-old",
    requestedAt: "2026-10-01",
  });
});
it("exige el rol del Consejo", async () => {
  state.admin = false;
  expect((await POST(request())).status).toBe(403);
  expect(state.calls).toBe(0);
});
it("no ejecuta otra limpieza mientras hay un intento vigente", async () => {
  state.docs.set("accountDeletionRequests/alice", {
    ...state.docs.get("accountDeletionRequests/alice"),
    processingUntil: Date.now() + 60000,
  });
  expect((await POST(request())).status).toBe(409);
  expect(state.calls).toBe(0);
});
it("conserva la solicitud parcial y su seudónimo si se interrumpe la limpieza", async () => {
  state.failCleanup = true;
  expect((await POST(request())).status).toBe(503);
  expect(state.docs.get("accountDeletionRequests/alice")).toMatchObject({
    state: "partial",
    pseudonym: "anon-old",
  });
});
const request = () =>
  new Request("http://localhost/api/admin/accounts/eliminacion/", {
    method: "POST",
    body: JSON.stringify({ email: "alice@example.org" }),
  });
it("retoma una eliminación parcial sin la sesión deshabilitada y conserva su fecha", async () => {
  expect((await POST(request())).status).toBe(202);
  expect(state.docs.get("accountDeletionRequests/alice")?.pseudonym).toBe(
    "anon-old",
  );
  state.result = true;
  expect((await POST(request())).status).toBe(200);
  expect(state.docs.get("accountDeletionRequests/alice")).toMatchObject({
    state: "completed",
    pseudonym: null,
    requestedAt: "2026-10-01",
  });
  expect((await POST(request())).status).toBe(200);
  expect(state.calls).toBe(2);
});
it("no inicia una eliminación desde la herramienta de reanudación", async () => {
  state.docs.delete("accountDeletionRequests/alice");
  expect((await POST(request())).status).toBe(409);
  expect(state.calls).toBe(0);
});
it("rechaza continuar una solicitud sobre una cuenta reabierta", async () => {
  state.docs.set("accounts/alice", { active: true });
  expect((await POST(request())).status).toBe(409);
  expect(state.calls).toBe(0);
});
