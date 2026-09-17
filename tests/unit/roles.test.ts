import { expect, it, vi, beforeEach } from "vitest";

/**
 * Conceder y retirar el rol del Consejo.
 *
 * Lo que se protege aquí es el acceso a todos los expedientes del territorio,
 * así que las tres cautelas se comprueban una por una: no se concede a quien no
 * ha entrado, nadie se retira a sí mismo, y nunca se retira al último —porque
 * entonces la única salida sería el guion de servidor con las credenciales
 * privadas, que no todo el mundo tiene a mano.
 */
const state = vi.hoisted(() => ({
  actor: "presidenta",
  admin: true,
  active: true,
  usuarios: [
    {
      uid: "presidenta",
      email: "presidenta@rio.test",
      displayName: "Presidenta",
      customClaims: { admin: true },
      metadata: { lastSignInTime: "Mon, 14 Sep 2026 10:00:00 GMT" },
    },
    {
      uid: "vecino",
      email: "vecino@rio.test",
      displayName: "Vecino",
      customClaims: {},
      metadata: { lastSignInTime: "Mon, 14 Sep 2026 11:00:00 GMT" },
    },
    /* Registrada pero sin entrar nunca: el panel no puede ofrecerle el rol,
       porque el servidor lo va a rechazar. */
    {
      uid: "nueva",
      email: "nueva@rio.test",
      displayName: "Nueva",
      customClaims: {},
      metadata: { lastSignInTime: "" },
    },
  ] as Array<{
    uid: string;
    email: string;
    displayName: string;
    customClaims: Record<string, unknown>;
    metadata: { lastSignInTime: string };
  }>,
  claims: vi.fn(),
  registrado: vi.fn(),
  sincronizado: vi.fn(),
  falloAlSincronizar: false,
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
  requireAdmin: async () => {
    if (!state.admin) throw new Error("no admin");
    return { uid: state.actor, db: fakeDb(), identity: { admin: true } };
  },
  adminServices: () => ({
    auth: {
      listUsers: async () => ({ users: state.usuarios }),
      getUserByEmail: async (email: string) => {
        const found = state.usuarios.find((u) => u.email === email);
        if (!found) throw new Error("not-found");
        return found;
      },
      setCustomUserClaims: state.claims,
    },
    db: fakeDb(),
  }),
}));

function fakeDb() {
  return {
    doc: () => ({
      get: async () => ({ data: () => ({ active: state.active }) }),
      set: async (campos: Record<string, unknown>, opciones: unknown) => {
        if (state.falloAlSincronizar) throw new Error("Firestore no responde");
        return state.sincronizado(campos, opciones);
      },
    }),
    collection: () => ({ add: state.registrado }),
  };
}

import { POST, GET } from "../../src/app/api/admin/roles/route";

const peticion = (body: unknown) =>
  new Request("http://localhost/api/admin/roles", {
    method: "POST",
    headers: { authorization: "Bearer sintetico" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  state.actor = "presidenta";
  state.admin = true;
  state.active = true;
  state.claims.mockClear();
  state.registrado.mockClear();
  state.sincronizado.mockClear();
  state.falloAlSincronizar = false;
});

it("concede el rol y lo deja registrado", async () => {
  const response = await POST(peticion({ email: "vecino@rio.test", admin: true }));
  expect(response.status).toBe(200);
  expect(state.claims).toHaveBeenCalledWith("vecino", { admin: true });
  expect(state.registrado.mock.calls[0][0].actor).toBe("presidenta");
  /* El campo de la base sí lo lee alguien: los avisos push resuelven el Consejo
     por él. Se escribe con `merge` —el documento puede no existir— y sin
     tragarse el fallo, que es lo que comprueba la prueba siguiente. */
  expect(state.sincronizado).toHaveBeenCalledWith(
    { role: "admin" },
    { merge: true },
  );
});

/* Si el reflejo se queda atrás, la persona entra al panel del Consejo y no
   recibe un solo aviso, sin error en ninguna parte. Antes se tragaba con un
   `.catch(() => undefined)`; ahora se dice. */
it("si el campo de la cuenta no se puede escribir, el rol no se concede a medias", async () => {
  state.falloAlSincronizar = true;
  const response = await POST(
    peticion({ email: "vecino@rio.test", admin: true }),
  );
  expect(response.status).toBe(503);
  expect(state.claims).not.toHaveBeenCalled();
});

it("no concede a una cuenta que todavía no ha entrado", async () => {
  state.active = false;
  const response = await POST(peticion({ email: "vecino@rio.test", admin: true }));
  expect(response.status).toBe(409);
  expect(state.claims).not.toHaveBeenCalled();
});

it("no se lo concede a un correo que no existe", async () => {
  const response = await POST(peticion({ email: "nadie@rio.test", admin: true }));
  expect(response.status).toBe(404);
  expect(state.claims).not.toHaveBeenCalled();
});

it("nadie se retira a sí mismo", async () => {
  const response = await POST(
    peticion({ email: "presidenta@rio.test", admin: false }),
  );
  expect(response.status).toBe(409);
  expect(state.claims).not.toHaveBeenCalled();
});

it("no se retira al último administrador", async () => {
  state.actor = "vecino";
  const response = await POST(
    peticion({ email: "presidenta@rio.test", admin: false }),
  );
  expect(response.status).toBe(409);
  expect(state.claims).not.toHaveBeenCalled();
});

it("la consulta y el cambio exigen el rol", async () => {
  state.admin = false;
  expect((await GET(peticion({}))).status).toBe(503);
  expect(
    (await POST(peticion({ email: "vecino@rio.test", admin: true }))).status,
  ).toBe(503);
  expect(state.claims).not.toHaveBeenCalled();
});

it("la consulta devuelve todas las cuentas con su rol, no solo las que administran", async () => {
  const { people } = await (await GET(peticion({}))).json();
  expect(people).toHaveLength(3);
  /* Quien administra encabeza: es la pregunta de esa pantalla. */
  expect(people[0]).toMatchObject({ email: "presidenta@rio.test", admin: true });
  expect(people.filter((p: { admin: boolean }) => p.admin)).toHaveLength(1);
  /* Y se dice quién no ha entrado, para no ofrecer un botón que va a fallar. */
  expect(
    people.find((p: { email: string }) => p.email === "nueva@rio.test")
      .lastSignIn,
  ).toBeNull();
});
