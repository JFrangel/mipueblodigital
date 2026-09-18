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
  /** Su dueña pidió eliminarla, que no es lo mismo que estar deshabilitada. */
  deleted: false,
  admin: false,
  role: "citizen",
  sellado: vi.fn(),
  reflejado: vi.fn(),
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
    doc: (ruta: string) => ({
      get: async () => ({
        exists: state.exists,
        data: () =>
          state.exists
            ? { active: state.active, deleted: state.deleted, role: state.role }
            : undefined,
      }),
      set: async (campos: Record<string, unknown>, opciones: unknown) =>
        state.reflejado(ruta, campos, opciones),
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
  state.deleted = false;
  state.admin = false;
  state.role = "citizen";
  state.sellado.mockClear();
  state.reflejado.mockClear();
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
 * Y dentro de esa, dos más. Que la cuenta la cerrara su propia dueña cambia lo
 * que hace a continuación: no es un trámite pendiente con el Consejo, es algo
 * que ella pidió y que solo el Consejo deshace. Leer «tu cuenta está
 * deshabilitada» después de haber pedido eliminarla es que la aplicación no
 * recuerde lo que uno mismo le dijo.
 */
it("la cuenta que su dueña cerró se dice distinto", async () => {
  state.exists = true;
  state.active = false;
  state.deleted = true;
  const error = await requireMember(request()).catch((e: ApiError) => e);
  expect((error as ApiError).message).toContain("pediste eliminarla");
  expect((error as ApiError).message).toContain("restablezcan");

  /* Y no al revés: una cuenta que el Consejo apagó no le dice a nadie que
     pidió irse. Sin esto, decir siempre lo mismo pasaría la prueba de arriba. */
  state.deleted = false;
  const otro = await requireMember(request()).catch((e: ApiError) => e);
  expect((otro as ApiError).message).not.toContain("pediste");
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

/**
 * Y al revés. Los avisos push resuelven el Consejo leyendo el campo `role`
 * (`src/server/push-tokens.ts`), así que una reivindicación sin su reflejo
 * —sellada por el guion, o por una escritura que falló— dejaba a esa persona
 * sin recibir ni un aviso y sin ningún síntoma.
 */
it("la reivindicación sin reflejo se escribe en la cuenta, y solo si falta", async () => {
  state.exists = true;
  state.active = true;
  state.admin = true;
  state.role = "citizen";
  await expect(requireAdmin(request())).resolves.toMatchObject({
    uid: "vecina",
  });
  expect(state.reflejado).toHaveBeenCalledWith(
    "accounts/vecina",
    { role: "admin" },
    { merge: true },
  );

  state.reflejado.mockClear();
  state.role = "admin";
  await requireAdmin(request());
  expect(state.reflejado).not.toHaveBeenCalled();
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
