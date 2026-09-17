import { beforeEach, expect, it, vi } from "vitest";

/**
 * La puerta que esconde en qué mundo corre la aplicación.
 *
 * Dentro del APK el token lo da el complemento nativo; en el navegador, el SDK
 * web con una clave pública. Son dos bibliotecas distintas, con dos formas de
 * pedir permiso y dos maneras de fallar. Lo que estas pruebas sostienen es que
 * el resto de la aplicación no tenga que enterarse: pide «apunta este aparato»
 * y recibe una de tres respuestas.
 *
 * Y lo que más importa de todo: que **la ausencia de la clave del navegador no
 * toque al APK**. Es la única pieza de todo esto que depende de un dato que hoy
 * no está puesto.
 */
const state = vi.hoisted(() => ({
  nativo: true,
  soportado: true,
  permisoNativo: "granted" as string,
  tokenNativo: "tok-nativo",
  tokenWeb: "tok-web" as string | null,
  usuario: { uid: "ana" } as { uid: string } | null,
  llamadas: [] as Array<{ url: string; cuerpo: unknown; cabeceras: unknown }>,
  borradoNativo: 0,
  borradoWeb: 0,
}));

vi.mock("../../src/platform/native", () => ({ esNativo: () => state.nativo }));

vi.mock("../../src/data/remote-reports", () => ({
  memberHeaders: async () => {
    if (!state.usuario) throw new Error("sin sesión");
    return {
      uid: state.usuario.uid,
      headers: {
        Authorization: "Bearer token-de-sesion",
        "Content-Type": "application/json",
      },
    };
  },
}));

vi.mock("../../src/data/firebase/client", () => ({
  firebaseClient: () => ({ auth: { currentUser: state.usuario }, db: {} }),
}));

vi.mock("@capacitor-firebase/messaging", () => ({
  FirebaseMessaging: {
    requestPermissions: async () => ({ receive: state.permisoNativo }),
    checkPermissions: async () => ({ receive: state.permisoNativo }),
    getToken: async () => ({ token: state.tokenNativo }),
    deleteToken: async () => {
      state.borradoNativo += 1;
    },
  },
}));

vi.mock("firebase/messaging", () => ({
  isSupported: async () => state.soportado,
  getMessaging: () => ({}),
  getToken: async () => state.tokenWeb,
  deleteToken: async () => {
    state.borradoWeb += 1;
    return true;
  },
}));

import {
  darDeBaja,
  disponible,
  refrescar,
  registrar,
} from "../../src/platform/push";

beforeEach(() => {
  state.nativo = true;
  state.soportado = true;
  state.permisoNativo = "granted";
  state.tokenNativo = "tok-nativo";
  state.tokenWeb = "tok-web";
  state.usuario = { uid: "ana" };
  state.llamadas = [];
  state.borradoNativo = 0;
  state.borradoWeb = 0;
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = "clave-vapid";
  vi.stubGlobal("Notification", {
    permission: "granted",
    requestPermission: async () => "granted",
  });
  vi.stubGlobal("navigator", {
    serviceWorker: { ready: Promise.resolve({}) },
  });
  vi.stubGlobal("fetch", async (url: string, init: { body: string; headers: unknown }) => {
    state.llamadas.push({
      url,
      cuerpo: JSON.parse(init.body),
      cabeceras: init.headers,
    });
    return new Response("{}");
  });
});

/* ── Apuntar el aparato ───────────────────────────────────────────────── */

it("en el APK apunta el aparato con el token nativo", async () => {
  expect(await registrar()).toBe("ok");
  expect(state.llamadas[0].url).toBe("/api/push/registro/");
  expect(state.llamadas[0].cuerpo).toEqual({
    token: "tok-nativo",
    platform: "android",
  });
});

it("en el navegador lo apunta con el token web", async () => {
  state.nativo = false;
  expect(await registrar()).toBe("ok");
  expect(state.llamadas[0].cuerpo).toEqual({
    token: "tok-web",
    platform: "web",
  });
});

/* La petición va firmada. Sin la cabecera de sesión el servidor la rechaza, y
   el aparato se quedaría sin apuntar sin que nadie viera un error. */
it("la petición lleva la sesión", async () => {
  await registrar();
  expect(state.llamadas[0].cabeceras).toMatchObject({
    Authorization: "Bearer token-de-sesion",
  });
});

/* ── Lo que pasa cuando falta algo ────────────────────────────────────── */

/* Sin clave pública el navegador no puede pedir token. No se rompe: se dice
   que no está disponible. */
it("sin clave VAPID el navegador no ofrece avisos", async () => {
  state.nativo = false;
  delete process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  expect(await disponible()).toBe(false);
  expect(await registrar()).toBe("no-disponible");
  expect(state.llamadas).toEqual([]);
});

/* La pieza que sostiene todo el despliegue: que falte la clave del navegador
   no puede tocar a la aplicación instalada, que es donde está la gente. */
it("el APK sigue disponible aunque falte la clave VAPID", async () => {
  delete process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  expect(await disponible()).toBe(true);
  expect(await registrar()).toBe("ok");
});

it("un navegador sin soporte tampoco ofrece avisos", async () => {
  state.nativo = false;
  state.soportado = false;
  expect(await disponible()).toBe(false);
});

it("permiso denegado se dice, y no se apunta nada", async () => {
  state.permisoNativo = "denied";
  expect(await registrar()).toBe("denegado");
  expect(state.llamadas).toEqual([]);
});

/* Un aviso es de alguien. Sin sesión no hay a quién apuntar el aparato. */
it("sin sesión no se apunta nada", async () => {
  state.usuario = null;
  expect(await registrar()).toBe("no-disponible");
  expect(state.llamadas).toEqual([]);
});

/* ── Soltar el aparato ────────────────────────────────────────────────── */

it("la baja borra el token y se lo dice al servidor", async () => {
  await darDeBaja();
  expect(state.borradoNativo).toBe(1);
  expect(state.llamadas[0].url).toBe("/api/push/baja/");
  expect(state.llamadas[0].cuerpo).toEqual({ token: "tok-nativo" });
});

it("en el navegador la baja borra el token web", async () => {
  state.nativo = false;
  await darDeBaja();
  expect(state.borradoWeb).toBe(1);
  expect(state.llamadas[0].cuerpo).toEqual({ token: "tok-web" });
});

/* Cerrar sesión llama a esto. Si lanzara, quien cierra sesión vería un error
   por algo que no le importa, o peor, se quedaría sin cerrarla. */
it("la baja no lanza aunque todo falle", async () => {
  state.nativo = false;
  state.soportado = false;
  await expect(darDeBaja()).resolves.toBeUndefined();
});

/* ── Recoger las rotaciones ───────────────────────────────────────────── */

/* Los tokens de FCM rotan solos y uno viejo deja de recibir sin avisar. */
it("refrescar reapunta el aparato cuando ya hay permiso", async () => {
  state.nativo = false;
  await refrescar();
  expect(state.llamadas[0].cuerpo).toEqual({
    token: "tok-web",
    platform: "web",
  });
});

/* Y nunca pregunta: abrir la aplicación no es momento de pedir un permiso que
   la persona no ha decidido dar. Android 13 en adelante no da segundas
   oportunidades fáciles. */
it("refrescar no pregunta ni apunta si no hay permiso", async () => {
  state.nativo = false;
  vi.stubGlobal("Notification", {
    permission: "default",
    requestPermission: async () => {
      throw new Error("no debe preguntar");
    },
  });
  await refrescar();
  expect(state.llamadas).toEqual([]);
});

it("refrescar tampoco pregunta en el APK", async () => {
  state.permisoNativo = "prompt";
  await refrescar();
  expect(state.llamadas).toEqual([]);
});

it("refrescar sin sesión no hace nada", async () => {
  state.usuario = null;
  await refrescar();
  expect(state.llamadas).toEqual([]);
});
