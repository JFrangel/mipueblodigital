import { beforeEach, expect, it, vi } from "vitest";

/**
 * Volver después de haberse ido.
 *
 * Dos rutas que solo tienen sentido juntas: la que vuelve a abrir una cuenta
 * cerrada y la que la cerró. Lo que se sostiene aquí no es que cada una escriba
 * sus campos —eso se ve leyéndolas— sino las tres cosas que se rompen en
 * silencio si se separan:
 *
 * 1. Que restablecer **abra la puerta y encienda la casa**, no una de las dos.
 * 2. Que el orden aguante un fallo por la mitad sin dejar a nadie entrando a
 *    una aplicación que le contesta 403 en todo.
 * 3. Que una cuenta restablecida **se pueda volver a eliminar**, con su fecha
 *    de hoy y avisando al Consejo. El derecho no se gasta por haberlo ejercido
 *    una vez, y ese fallo no daría la cara hasta meses después.
 */
const state = vi.hoisted(() => {
  class ApiErrorDoble extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    ApiErrorDoble,
    /** Lo que hay en Firestore, por ruta de documento. */
    docs: new Map<string, Record<string, unknown>>(),
    /** Lo escrito, en orden, para poder mirar el orden. */
    escrituras: [] as Array<{ ruta: string; campos: Record<string, unknown> }>,
    añadidos: [] as Array<{ coleccion: string; campos: unknown }>,
    /** El registro de identidad. */
    identidad: { uid: "vecina", email: "vecina@rio.co", disabled: true },
    /** Lo que se le pidió cambiar a la identidad. */
    identidadEscrita: [] as Array<[string, unknown]>,
    /** Para forzar el fallo a mitad de camino. */
    falloAlEscribir: false,
    admin: true,
    avisos: [] as unknown[],
    anonimizado: 0,
  };
});

const doc = (ruta: string) => ({
  get: async () => ({
    exists: state.docs.has(ruta),
    data: () => state.docs.get(ruta),
  }),
  set: async (campos: Record<string, unknown>) => {
    state.docs.set(ruta, { ...state.docs.get(ruta), ...campos });
    state.escrituras.push({ ruta, campos });
  },
  delete: async () => state.docs.delete(ruta),
});

vi.mock("../../src/server/admin-auth", () => ({
  ApiError: state.ApiErrorDoble,
  adminServices: () => ({
    auth: {
      getUserByEmail: async (email: string) =>
        email === state.identidad.email
          ? { uid: state.identidad.uid, disabled: state.identidad.disabled }
          : null,
      updateUser: async (uid: string, cambios: { disabled?: boolean }) => {
        state.identidadEscrita.push([uid, cambios]);
        /* Aplicando lo que le piden, no lo que espera la prueba. Devolvía
           siempre `false` y con eso una cuenta recién eliminada parecía
           abierta: el doble contestaba lo que hacía falta para pasar. */
        if (typeof cambios.disabled === "boolean")
          state.identidad.disabled = cambios.disabled;
      },
      revokeRefreshTokens: async () => undefined,
    },
    db: {},
  }),
  requireAdmin: async (request: Request) => {
    if (!request.headers.get("authorization"))
      throw new state.ApiErrorDoble(401, "Inicia sesión.");
    if (!state.admin)
      throw new state.ApiErrorDoble(403, "Solo el Consejo puede.");
    return { uid: "quien-administra", db: baseDeDatos() };
  },
  requireIdentity: async () => ({
    identity: { uid: state.identidad.uid, admin: false, auth_time: Date.now() / 1000 },
    db: baseDeDatos(),
  }),
}));

function baseDeDatos() {
  return {
    doc,
    batch: () => {
      const pendientes: Array<() => void> = [];
      return {
        set: (
          d: { get: () => unknown },
          campos: Record<string, unknown>,
        ) => {
          pendientes.push(() => void (d as unknown as ReturnType<typeof doc>).set(campos));
        },
        commit: async () => {
          if (state.falloAlEscribir) throw new Error("Firestore no contestó.");
          for (const p of pendientes) p();
        },
      };
    },
    collection: (coleccion: string) => ({
      add: async (campos: unknown) => {
        state.añadidos.push({ coleccion, campos });
      },
    }),
    runTransaction: async (
      fn: (tx: {
        get: (d: ReturnType<typeof doc>) => Promise<unknown>;
        set: (d: ReturnType<typeof doc>, campos: Record<string, unknown>) => void;
      }) => Promise<unknown>,
    ) =>
      fn({
        get: (d) => d.get(),
        set: (d, campos) => void d.set(campos),
      }),
  };
}

vi.mock("../../src/server/request-body", () => ({
  readJson: async (request: Request) => await request.json(),
}));

vi.mock("../../src/server/anonymize", () => ({
  anonymizeAccount: async () => {
    state.anonimizado += 1;
    /* Y deja la cuenta como la deja la de verdad: `deleted: true` lo escribe
       la anonimización, no la ruta. Sin eso, una cuenta eliminada en la prueba
       no se parecía a una cuenta eliminada. */
    state.docs.set("accounts/vecina", {
      ...state.docs.get("accounts/vecina"),
      active: false,
      deleted: true,
    });
    return { incidents: 2, notifications: 0, devices: 0, evidence: true, complete: true };
  },
}));

vi.mock("../../src/server/push", () => ({
  avisar: async (..._args: unknown[]) => {
    state.avisos.push(_args);
  },
}));

import { POST as restablecer } from "../../src/app/api/admin/accounts/restablecer/route";
import { POST as eliminar } from "../../src/app/api/account/deletion/route";

const pide = (cuerpo: unknown, sesion = true) =>
  new Request("http://localhost/api/admin/accounts/restablecer/", {
    method: "POST",
    headers: sesion ? { authorization: "Bearer sintetico" } : {},
    body: JSON.stringify(cuerpo),
  });

/** Una cuenta tal como la deja una eliminación completada. */
function cuentaCerrada() {
  state.docs.set("accounts/vecina", { active: false, deleted: true, role: "citizen" });
  state.docs.set("accountDeletionRequests/vecina", {
    owner: "vecina",
    state: "completed",
    requestedAt: "2026-03-01T10:00:00.000Z",
    pseudonym: null,
  });
  state.identidad.disabled = true;
}

beforeEach(() => {
  state.docs = new Map();
  state.escrituras = [];
  state.añadidos = [];
  state.identidadEscrita = [];
  state.identidad = { uid: "vecina", email: "vecina@rio.co", disabled: true };
  state.falloAlEscribir = false;
  state.admin = true;
  state.avisos = [];
  state.anonimizado = 0;
});

/* ── Quién puede, y sobre qué ─────────────────────────────────────────── */

it("sin rol del Consejo no se restablece nada", async () => {
  cuentaCerrada();
  state.admin = false;
  expect((await restablecer(pide({ email: "vecina@rio.co" }))).status).toBe(403);
  expect(state.identidadEscrita).toEqual([]);
  expect(state.escrituras).toEqual([]);
});

it("un correo que no existe se dice, y no se toca nada", async () => {
  const r = await restablecer(pide({ email: "nadie@rio.co" }));
  expect(r.status).toBe(404);
  expect(state.identidadEscrita).toEqual([]);
});

/* Restablecer lo que está abierto escribiría `active: true` sobre una cuenta
   que quizá esté apagada por otro motivo, y este no es el sitio donde se
   decide eso. */
it("una cuenta que no está cerrada no se restablece", async () => {
  state.docs.set("accounts/vecina", { active: true, role: "citizen" });
  state.identidad.disabled = false;
  const r = await restablecer(pide({ email: "vecina@rio.co" }));
  expect(r.status).toBe(409);
  expect(state.escrituras).toEqual([]);
});

/* ── Lo que hace cuando sí ────────────────────────────────────────────── */

/* Las tres por separado a propósito: dejar una fuera abre la puerta y deja la
   casa cerrada, o al revés, y ninguna de las dos mitades se nota sola. */
it("abre la puerta", async () => {
  cuentaCerrada();
  expect((await restablecer(pide({ email: "vecina@rio.co" }))).status).toBe(200);
  expect(state.identidadEscrita).toEqual([["vecina", { disabled: false }]]);
});

it("enciende la casa", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  expect(state.docs.get("accounts/vecina")).toMatchObject({
    active: true,
    deleted: false,
  });
  expect(state.docs.get("accounts/vecina")?.restoredAt).toEqual(
    expect.any(String),
  );
});

it("levanta el registro de la solicitud", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  expect(state.docs.get("accountDeletionRequests/vecina")).toMatchObject({
    state: "restored",
    requestedAt: null,
    pseudonym: null,
  });
});

/* El rol no se toca. La eliminación rechaza a las cuentas del Consejo, así que
   por aquí solo pasan ciudadanas: escribirlo sería la única forma de que un
   fallo lo convirtiera en otra cosa. */
it("no concede el rol del Consejo", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  expect(state.docs.get("accounts/vecina")?.role).toBe("citizen");
  for (const { campos } of state.escrituras) expect(campos).not.toHaveProperty("role");
});

it("deja constancia de quién la reabrió", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  expect(state.añadidos).toContainEqual({
    coleccion: "accountRestoreEvents",
    campos: expect.objectContaining({
      actor: "quien-administra",
      target: "vecina",
      targetEmail: "vecina@rio.co",
    }),
  });
});

/* Y la Novedad deja de parecer pendiente. */
it("marca la Novedad como atendida", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  expect(state.docs.get("councilNotifications/deletion-vecina")).toMatchObject({
    resolved: true,
    resolvedBy: "quien-administra",
  });
});

/* La respuesta lo dice, porque el panel la enseña tal cual: si dejara de
   decirlo, el Consejo acabaría prometiendo unos reportes que ya no existen. */
it("la respuesta avisa de que los reportes no vuelven", async () => {
  cuentaCerrada();
  const datos = await (await restablecer(pide({ email: "vecina@rio.co" }))).json();
  expect(datos.message).toMatch(/anónimo|anonimiz/i);
});

/* ── El orden ─────────────────────────────────────────────────────────── */

/**
 * Firestore primero y la identidad después.
 *
 * Al revés, un fallo aquí dejaría a esa persona entrando a una aplicación que
 * le contesta 403 en todo, porque `requireMember` mira `accounts.active`: la
 * puerta abierta y la casa cerrada. Así, un fallo deja la puerta cerrada y no
 * lo nota nadie.
 */
it("si la base falla, la puerta no llega a abrirse", async () => {
  cuentaCerrada();
  state.falloAlEscribir = true;
  expect((await restablecer(pide({ email: "vecina@rio.co" }))).status).toBe(503);
  expect(state.identidadEscrita).toEqual([]);
  expect(state.identidad.disabled).toBe(true);
});

/* ── Y después, poder volver a irse ───────────────────────────────────── */

const pideBaja = () =>
  new Request("http://localhost/api/account/deletion/", {
    method: "POST",
    headers: { authorization: "Bearer sintetico" },
  });

/**
 * El fallo que no da la cara.
 *
 * `accountDeletionRequests` se queda en `completed` para siempre. Si
 * restablecer no lo levantara, esta persona no podría volver a eliminar su
 * cuenta **nunca**, y se descubriría meses después, cuando lo pidiera otra vez
 * y la aplicación le dijera que ya está eliminada mientras la está usando.
 */
it("una cuenta restablecida se puede volver a eliminar", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  const r = await eliminar(pideBaja());
  expect(r.status).toBe(200);
  expect(state.anonimizado).toBe(1);
});

/* Y con la fecha de hoy. La ruta hereda `requestedAt` de la solicitud anterior,
   así que sin el nulo los plazos del Consejo se contarían desde un día que ya
   pasó. */
it("la segunda solicitud lleva su propia fecha", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  await eliminar(pideBaja());
  expect(state.docs.get("accountDeletionRequests/vecina")?.requestedAt).not.toBe(
    "2026-03-01T10:00:00.000Z",
  );
});

/* Y avisa. `nuevo` distingue la primera solicitud del reintento mirando si el
   documento existía; tras un restablecimiento existe, así que sin tratar
   «restored» como si no hubiera nada, la segunda eliminación se procesaría
   entera en silencio y el Consejo no se enteraría de que alguien se fue. */
it("la segunda solicitud avisa al Consejo", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  await eliminar(pideBaja());
  expect(state.avisos).toHaveLength(1);
});

/* Contraprueba del anterior: un reintento de la **misma** solicitud no vuelve a
   avisar. Sin esto, «avisar siempre» pasaría la prueba de arriba. */
it("reintentar la misma solicitud no avisa dos veces", async () => {
  await eliminar(pideBaja());
  expect(state.avisos).toHaveLength(1);
  state.docs.set("accountDeletionRequests/vecina", {
    ...state.docs.get("accountDeletionRequests/vecina"),
    state: "partial",
  });
  await eliminar(pideBaja());
  expect(state.avisos).toHaveLength(1);
});

/* ── Y HU-19 se queda como estaba ─────────────────────────────────────── */

/**
 * Restablecer devuelve la puerta y **nada más**.
 *
 * No hay copia de la fotografía ni del relato en ninguna parte, y el seudónimo
 * se tiró a propósito al completar la eliminación. Aquí eso deja de ser un
 * argumento y pasa a ser comprobable: si alguien intentara alguna vez «mejorar»
 * el restablecimiento devolviéndole sus reportes a la persona, se caería esta
 * prueba, que es exactamente lo que tiene que pasar.
 */
it("restablecer no toca ningún expediente", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  const rutas = state.escrituras.map((e) => e.ruta);
  expect(rutas).toEqual([
    "accounts/vecina",
    "accountDeletionRequests/vecina",
    "councilNotifications/deletion-vecina",
  ]);
  expect(rutas.some((r) => r.startsWith("incidents/"))).toBe(false);
  expect(state.anonimizado).toBe(0);
});

/* Y la eliminación sigue anonimizando lo mismo que antes: lo que cambió de esa
   ruta es a quién avisa y con qué fecha, nunca qué destruye. */
it("la eliminación sigue anonimizando, antes y después de un restablecimiento", async () => {
  await eliminar(pideBaja());
  expect(state.anonimizado).toBe(1);
  expect(state.docs.get("accounts/vecina")).toMatchObject({ active: false });

  await restablecer(pide({ email: "vecina@rio.co" }));
  await eliminar(pideBaja());
  expect(state.anonimizado).toBe(2);
  expect(state.docs.get("accounts/vecina")).toMatchObject({ active: false });
});

/**
 * `accounts/{uid}` es el único documento que su dueña puede leer desde el
 * navegador —las reglas lo declaran `allow get` al dueño y niegan todo lo
 * demás—, así que lo que se escriba ahí se lo lleva ella. Quién de dentro le
 * reabrió la cuenta no es asunto suyo, por la misma razón por la que su bandeja
 * de novedades le cuenta lo que le pasó a su reporte y no quién lo movió. La
 * constancia va donde nadie la lee desde fuera.
 */
it("el nombre de quien administra no acaba en el documento de la cuenta", async () => {
  cuentaCerrada();
  await restablecer(pide({ email: "vecina@rio.co" }));
  expect(state.docs.get("accounts/vecina")).not.toHaveProperty("restoredBy");
  /* Y sí consta en los dos sitios que ninguna regla deja leer. */
  expect(state.docs.get("accountDeletionRequests/vecina")).toMatchObject({
    restoredBy: "quien-administra",
  });
  expect(state.añadidos[0]).toMatchObject({ coleccion: "accountRestoreEvents" });
});
