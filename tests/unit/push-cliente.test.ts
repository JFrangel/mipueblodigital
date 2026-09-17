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
  /* Cuántas veces se abrió el diálogo del permiso. Comprobar que el aparato no
     se apunta no basta: registrar() se traga los errores, así que preguntar a
     destiempo y fallar se ve exactamente igual que no preguntar. Y preguntar a
     destiempo es el fallo que hay que evitar: en Android 13 en adelante un «no»
     obliga a entrar en los ajustes del sistema para deshacerlo. */
  preguntas: 0,
  canales: [] as Array<{ id: string; name: string }>,
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


/**
 * Un doble que se comporta como un complemento de Capacitor de verdad.
 *
 * Los complementos son proxies que contestan a **cualquier** propiedad, `then`
 * incluida. Eso los hace parecer «thenables»: devolver uno desde una función
 * `async` hace que el motor le llame `.then()` al resolver el valor de retorno,
 * y el puente nativo no lo implementa —la promesa no se resuelve nunca y el
 * `await` de quien llamó se queda colgado para siempre, sin nada roto a la
 * vista—.
 *
 * Eso pasó de verdad, y ningún doble de objeto plano lo veía. Aquí `then` es
 * una función que no resuelve nada, igual que el puente: si alguien vuelve a
 * escribir ese patrón, la prueba se queda colgada y falla por tiempo.
 */
function comoCapacitor<T extends object>(impl: T): T {
  return new Proxy(impl, {
    get: (obj, prop) =>
      prop in obj
        ? obj[prop as keyof T]
        : () => new Promise(() => {}),
    has: () => true,
  });
}

vi.mock("@capacitor-firebase/messaging", () => ({
  FirebaseMessaging: comoCapacitor({
    requestPermissions: async () => {
      state.preguntas += 1;
      return { receive: state.permisoNativo };
    },
    checkPermissions: async () => ({ receive: state.permisoNativo }),
    getToken: async () => ({ token: state.tokenNativo }),
    deleteToken: async () => {
      state.borradoNativo += 1;
    },
    createChannel: async (c: { id: string; name: string }) => {
      state.canales.push(c);
    },
  }),
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
  activado,
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
  state.preguntas = 0;
  state.canales = [];
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = "clave-vapid";
  vi.stubGlobal("Notification", {
    permission: "granted",
    requestPermission: async () => {
      state.preguntas += 1;
      return "granted";
    },
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
it("sin sesión no se apunta nada, y no se pregunta nada", async () => {
  state.usuario = null;
  vi.stubGlobal("Notification", {
    permission: "default",
    requestPermission: async () => {
      state.preguntas += 1;
      return "granted";
    },
  });
  expect(await registrar()).toBe("no-disponible");
  expect(state.llamadas).toEqual([]);
  /* Sin esto, quien abre la aplicación sin sesión vería el diálogo del permiso
     antes de que nadie descubra que no hay a quién apuntar el aparato. */
  expect(state.preguntas).toBe(0);
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
   por algo que no le importa, o peor, se quedaría sin cerrarla.

   Se prueba con la sesión ya caída, que es el caso real: `memberHeaders` revienta
   al firmar la petición, después de haber borrado el token del aparato. La
   versión anterior de esta prueba apagaba el soporte del navegador, y así la
   función salía antes de llegar al `catch`: no probaba nada. */
it("la baja no lanza aunque falle avisar al servidor", async () => {
  state.usuario = null;
  await expect(darDeBaja()).resolves.toBeUndefined();
  expect(state.borradoNativo).toBe(1);
  expect(state.llamadas).toEqual([]);
});

/* Y tampoco lanza cuando el aparato no puede recibir avisos en absoluto. */
it("la baja no lanza en un navegador sin soporte", async () => {
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
      state.preguntas += 1;
      return "granted";
    },
  });
  await refrescar();
  expect(state.preguntas).toBe(0);
  expect(state.llamadas).toEqual([]);
});

it("refrescar tampoco pregunta en el APK", async () => {
  state.permisoNativo = "prompt";
  await refrescar();
  expect(state.preguntas).toBe(0);
  expect(state.llamadas).toEqual([]);
});

it("refrescar sin sesión no hace nada", async () => {
  state.usuario = null;
  await refrescar();
  expect(state.preguntas).toBe(0);
  expect(state.llamadas).toEqual([]);
});

/* ── El canal de Android ──────────────────────────────────────────────── */

/* Sin canal propio, Android mete los avisos en uno que la gente ve en los
   ajustes del teléfono como «Miscellaneous»: en inglés, en una aplicación que
   es toda en español, y sin decir de qué son. El identificador tiene que ser el
   mismo que declara el manifiesto. */
it("el APK crea el canal con su nombre en español", async () => {
  await registrar();
  expect(state.canales).toHaveLength(1);
  expect(state.canales[0].id).toBe("consejo");
  expect(state.canales[0].name).toBe("Avisos del Consejo");
});

/* En el navegador no hay canales que crear, y pedirlo revienta. */
it("en el navegador no se crea ningún canal", async () => {
  state.nativo = false;
  await registrar();
  expect(state.canales).toEqual([]);
});

/* ── El WebView de Android no trae la API `Notification` ──────────────── */

/**
 * Y eso no es un detalle teórico: es el fallo que se vio en el emulador.
 *
 * La fila de Mi cuenta preguntaba `Notification.permission` sin mirar dónde
 * corría. En el navegador salía bien; dentro del APK reventaba, la promesa se
 * tragaba el error y la fila sencillamente no aparecía. Ninguna prueba lo veía
 * porque todas simulan ese objeto: por eso estas tres lo quitan.
 */
it("el APK sabe si están activados sin la API del navegador", async () => {
  vi.stubGlobal("Notification", undefined);
  state.permisoNativo = "granted";
  expect(await activado()).toBe(true);
});

it("el APK sabe que están apagados sin la API del navegador", async () => {
  vi.stubGlobal("Notification", undefined);
  state.permisoNativo = "denied";
  expect(await activado()).toBe(false);
});

it("refrescar funciona en el APK sin la API del navegador", async () => {
  vi.stubGlobal("Notification", undefined);
  await refrescar();
  expect(state.llamadas[0].cuerpo).toEqual({
    token: "tok-nativo",
    platform: "android",
  });
});

/* En el navegador sigue leyéndose de donde se lee siempre. */
it("en el navegador pregunta a la API del navegador", async () => {
  state.nativo = false;
  vi.stubGlobal("Notification", { permission: "denied" });
  expect(await activado()).toBe(false);
});
