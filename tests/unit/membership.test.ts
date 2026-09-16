import { expect, it, vi, beforeEach } from "vitest";

/**
 * El guardián de pertenencia. Distingue dos situaciones que antes decían lo
 * mismo: todavía no hay perfil —se arregla solo al abrir la aplicación con el
 * correo verificado— y el Consejo deshabilitó la cuenta, que no se arregla
 * desde aquí. Quien lee el error tiene que poder saber en cuál está.
 */
const state = vi.hoisted(() => ({
  exists: false,
  active: false,
  admin: false,
  role: "citizen",
  sellado: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({
  cert: () => ({}),
  getApps: () => [],
  initializeApp: () => ({}),
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: async () => ({
      uid: "vecina",
      email_verified: true,
      admin: state.admin,
    }),
    setCustomUserClaims: state.sellado,
  }),
}));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    doc: () => ({
      get: async () => ({
        exists: state.exists,
        data: () =>
          state.exists ? { active: state.active, role: state.role } : undefined,
      }),
    }),
  }),
}));

import { requireMember, requireAdmin, ApiError } from "../../src/server/admin-auth";

const request = () =>
  new Request("http://localhost/api/incidents", {
    headers: { authorization: "Bearer sintetico" },
  });

beforeEach(() => {
  state.exists = false;
  state.active = false;
  state.admin = false;
  state.role = "citizen";
  state.sellado.mockClear();
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "prueba";
});

it("sin perfil dice cómo se activa, no solo que no está habilitada", async () => {
  await expect(requireMember(request())).rejects.toMatchObject({
    status: 403,
  });
  const error = await requireMember(request()).catch((e: ApiError) => e);
  expect((error as ApiError).message).toContain("Mi cuenta");
});

it("cuenta deshabilitada remite al Consejo, no a activarla de nuevo", async () => {
  state.exists = true;
  state.active = false;
  const error = await requireMember(request()).catch((e: ApiError) => e);
  expect((error as ApiError).status).toBe(403);
  expect((error as ApiError).message).toContain("Consejo");
  expect((error as ApiError).message).not.toContain("Mi cuenta");
});

/**
 * El rol también se concede desde la consola de la base, escribiendo `role` en
 * la cuenta. Es seguro porque las reglas prohíben a todo cliente escribir ahí;
 * si eso cambiara, esta puerta habría que cerrarla.
 */
it("el rol escrito en la cuenta vale, y se sella en el token", async () => {
  state.exists = true;
  state.active = true;
  state.admin = false;
  state.role = "admin";
  await expect(requireAdmin(request())).resolves.toMatchObject({
    uid: "vecina",
  });
  expect(state.sellado).toHaveBeenCalledWith("vecina", { admin: true });
});

it("perfil activo pasa, y el rol sigue siendo cosa aparte", async () => {
  state.exists = true;
  state.active = true;
  await expect(requireMember(request())).resolves.toMatchObject({
    uid: "vecina",
  });
  await expect(requireAdmin(request())).rejects.toMatchObject({ status: 403 });
  state.admin = true;
  await expect(requireAdmin(request())).resolves.toMatchObject({
    uid: "vecina",
  });
});
