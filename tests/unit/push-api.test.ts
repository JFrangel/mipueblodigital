import { beforeEach, expect, it, vi } from "vitest";

/**
 * Las dos rutas por las que un aparato entra y sale del registro.
 *
 * Aquí no se prueba Firestore —eso es cosa de `push-tokens`— sino lo único que
 * estas rutas deciden: de dónde sale la identidad, qué cuerpos se rechazan y
 * que nada se escriba cuando el cuerpo no vale.
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
    uid: "ana",
    guardados: [] as unknown[],
    borrados: [] as unknown[],
    falloAlGuardar: null as unknown,
  };
});

vi.mock("../../src/server/admin-auth", () => {
  /* El doble mira la petición de verdad en vez de devolver un uid fijo. Con un
     doble que siempre dice que sí, quitar el guardia de la sesión de una ruta
     dejaba las pruebas en verde, y ese guardia es del que cuelga todo el
     aislamiento del registro de tokens. */
  const sesion = (request: Request) => {
    if (!request.headers.get("authorization"))
      throw new state.ApiErrorDoble(401, "Inicia sesión para continuar.");
    return { uid: state.uid, db: {} as never };
  };
  return {
    ApiError: state.ApiErrorDoble,
    requireIdentity: async (request: Request) => {
      const { uid, db } = sesion(request);
      return { identity: { uid }, db };
    },
    requireMember: async (request: Request) => {
      const { uid, db } = sesion(request);
      return { uid, db, identity: { uid }, account: {} };
    },
  };
});

vi.mock("../../src/server/push-tokens", () => ({
  guardar: async (
    _db: unknown,
    uid: string,
    token: string,
    plataforma: string,
    agente: string,
  ) => {
    if (state.falloAlGuardar) throw state.falloAlGuardar;
    state.guardados.push([uid, token, plataforma, agente]);
  },
  olvidarUno: async (_db: unknown, uid: string, token: string) => {
    state.borrados.push([uid, token]);
  },
}));

import { POST as registro } from "../../src/app/api/push/registro/route";
import { POST as baja } from "../../src/app/api/push/baja/route";

beforeEach(() => {
  state.guardados = [];
  state.borrados = [];
  state.falloAlGuardar = null;
});

const pide = (
  url: string,
  cuerpo: unknown,
  opciones: { agente?: string; sesion?: boolean } = {},
) => {
  const headers: Record<string, string> = {
    "user-agent": opciones.agente ?? "Pixel",
  };
  if (opciones.sesion !== false) headers.authorization = "Bearer x";
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify(cuerpo),
  });
};

it("el alta guarda el aparato de quien pregunta", async () => {
  const r = await registro(
    pide("/api/push/registro", { token: "tok-1", platform: "android" }),
  );
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
  expect(state.guardados[0]).toEqual(["ana", "tok-1", "android", "Pixel"]);
});

/* La baja ya fijaba esto y el alta no, que es la mitad que más importa: si el
   cuerpo pudiera decir de quién es un token, cualquiera apuntaría su teléfono a
   nombre de otra persona y le leería los avisos. La ruta lo hace bien; sin esta
   prueba, dejar de hacerlo bien no rompía nada. */
it("el alta ignora un uid puesto en el cuerpo", async () => {
  await registro(
    pide("/api/push/registro", {
      token: "tok-1",
      platform: "android",
      uid: "otro",
    }),
  );
  /* El uid es el de la sesión, no el que venía en el cuerpo. */
  expect(state.guardados[0]).toEqual(["ana", "tok-1", "android", "Pixel"]);
});

/* Una plataforma que no es ninguna de las dos no se guarda: el registro se usa
   luego para decidir cómo se dibuja el aviso. */
it("rechaza una plataforma desconocida", async () => {
  expect(
    (
      await registro(
        pide("/api/push/registro", { token: "tok-1", platform: "nokia" }),
      )
    ).status,
  ).toBe(400);
  expect(state.guardados).toEqual([]);
});

it("rechaza un token vacío", async () => {
  expect(
    (await registro(pide("/api/push/registro", { token: "", platform: "web" })))
      .status,
  ).toBe(400);
  expect(state.guardados).toEqual([]);
});

/* El user-agent no lo acota `readJson`: viaja en una cabecera, y Node admite
   unos 16 KB de cabeceras. Sin recortarlo, quien quiera puede dejar esa
   cadena entera escrita en Firestore bajo su uid. */
it("recorta el agente antes de guardarlo", async () => {
  await registro(
    pide(
      "/api/push/registro",
      { token: "tok-1", platform: "web" },
      { agente: "A".repeat(5000) },
    ),
  );
  expect((state.guardados[0] as string[])[3]).toBe("A".repeat(200));
});

it("la baja borra ese aparato", async () => {
  const r = await baja(pide("/api/push/baja", { token: "tok-1" }));
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
  expect(state.borrados[0]).toEqual(["ana", "tok-1"]);
});

/* El token viaja en el cuerpo y el uid sale de la sesión, nunca del cuerpo:
   si no, cualquiera podría dar de baja el teléfono de otra persona. */
it("la baja ignora un uid puesto en el cuerpo", async () => {
  await baja(pide("/api/push/baja", { token: "tok-1", uid: "otro" }));
  expect(state.borrados[0]).toEqual(["ana", "tok-1"]);
});

/* La baja sin token borraría `…/devices/undefined`, o peor, lo que dijera la
   coerción de turno. Es la misma prueba que el alta ya tenía. */
it("la baja rechaza un token vacío", async () => {
  expect((await baja(pide("/api/push/baja", {}))).status).toBe(400);
  expect(state.borrados).toEqual([]);
});

/* `JSON.parse("null")` es `null`, y leer una propiedad de ahí revienta. Un
   cuerpo que el cliente escribió mal es un 400, no un fallo del servidor. */
it("un cuerpo nulo es una solicitud mala, no un fallo del servidor", async () => {
  expect((await registro(pide("/api/push/registro", null))).status).toBe(400);
  expect((await baja(pide("/api/push/baja", null))).status).toBe(400);
  expect(state.guardados).toEqual([]);
  expect(state.borrados).toEqual([]);
});

/* La forma del token la comprueba `push-tokens` y lanza un 400. La ruta tiene
   que dejarlo pasar tal cual en vez de taparlo con un error genérico. */
it("un token con forma rara sale como 400 y no como fallo del servidor", async () => {
  state.falloAlGuardar = new state.ApiErrorDoble(
    400,
    "El token del aparato no tiene una forma válida.",
  );
  expect(
    (
      await registro(
        pide("/api/push/registro", { token: "a/b/c", platform: "web" }),
      )
    ).status,
  ).toBe(400);
});

/* Cuando el que falla es Firestore, no quien llama, el repositorio contesta
   503 en sus veintitantas rutas: «ahora mismo no puedo», no «te equivocaste». */
it("un fallo de Firestore es un 503", async () => {
  state.falloAlGuardar = new Error("Firestore no responde");
  expect(
    (
      await registro(
        pide("/api/push/registro", { token: "tok-1", platform: "web" }),
      )
    ).status,
  ).toBe(503);
});

/* La mitad de lo que estas rutas tienen que hacer es exigir sesión: un aviso
   es de alguien, y el uid decide bajo qué subárbol se escribe. */
it("sin sesión no se apunta ni se borra nada", async () => {
  expect(
    (
      await registro(
        pide(
          "/api/push/registro",
          { token: "tok-1", platform: "web" },
          { sesion: false },
        ),
      )
    ).status,
  ).toBe(401);
  expect(
    (await baja(pide("/api/push/baja", { token: "tok-1" }, { sesion: false })))
      .status,
  ).toBe(401);
  expect(state.guardados).toEqual([]);
  expect(state.borrados).toEqual([]);
});
