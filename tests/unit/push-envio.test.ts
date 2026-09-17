import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  aparatos: {} as Record<string, { uid: string; token: string }[]>,
  consejo: [] as { uid: string; token: string }[],
  olvidados: [] as { uid: string; token: string }[],
  enviados: [] as unknown[],
  /* Qué contesta FCM por cada token, en orden. */
  respuestas: [] as { success: boolean; error?: { code: string } }[],
}));

vi.mock("../../src/server/push-tokens", () => ({
  aparatosDe: async (_db: unknown, uid: string) => state.aparatos[uid] ?? [],
  aparatosDelConsejo: async () => state.consejo,
  olvidar: async (_db: unknown, lista: { uid: string; token: string }[]) => {
    state.olvidados.push(...lista);
  },
}));

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: vi.fn(() => ({
    sendEachForMulticast: async (m: { tokens: string[] }) => {
      state.enviados.push(m);
      return {
        responses: state.respuestas.length
          ? state.respuestas.splice(0, m.tokens.length)
          : m.tokens.map(() => ({ success: true })),
      };
    },
  })),
}));

import { avisar } from "../../src/server/push";

beforeEach(() => {
  state.aparatos = {};
  state.consejo = [];
  state.olvidados = [];
  state.enviados = [];
  state.respuestas = [];
});

const aviso = {
  title: "Tu reporte cambió",
  body: "Ahora está en proceso",
  url: "/reporte/abc/",
};

it("manda a los aparatos de esa persona, con la dirección que abre", async () => {
  state.aparatos.ana = [
    { uid: "ana", token: "a1" },
    { uid: "ana", token: "a2" },
  ];
  await avisar({} as never, { uid: "ana" }, aviso);
  expect(state.enviados).toHaveLength(1);
  const m = state.enviados[0] as {
    tokens: string[];
    notification: unknown;
    data: unknown;
  };
  expect(m.tokens).toEqual(["a1", "a2"]);
  expect(m.notification).toEqual({ title: aviso.title, body: aviso.body });
  expect(m.data).toEqual({ url: "/reporte/abc/" });
});

it("al Consejo manda a todos sus aparatos", async () => {
  state.consejo = [
    { uid: "ana", token: "a1" },
    { uid: "beto", token: "b1" },
  ];
  await avisar({} as never, { consejo: true }, aviso);
  expect((state.enviados[0] as { tokens: string[] }).tokens).toEqual([
    "a1",
    "b1",
  ]);
});

/* Sin aparatos no se llama a FCM. Es lo normal hasta que alguien concede el
   permiso, y una llamada vacía sería un error de FCM en los registros. */
it("sin aparatos no llama a FCM", async () => {
  await avisar({} as never, { uid: "ana" }, aviso);
  expect(state.enviados).toEqual([]);
});

/* Un token muerto es alguien que desinstaló o formateó. Si no se borra, el
   registro se llena de fantasmas que se arrastran en cada envío. */
it("borra los tokens que FCM dice que ya no existen", async () => {
  state.aparatos.ana = [
    { uid: "ana", token: "vivo" },
    { uid: "ana", token: "muerto" },
  ];
  state.respuestas = [
    { success: true },
    {
      success: false,
      error: { code: "messaging/registration-token-not-registered" },
    },
  ];
  await avisar({} as never, { uid: "ana" }, aviso);
  expect(state.olvidados).toEqual([{ uid: "ana", token: "muerto" }]);
});

/* Un fallo pasajero no es un token muerto: si se borrara, la persona dejaría
   de recibir avisos para siempre por una caída de un minuto. */
it("un fallo pasajero no borra el token", async () => {
  state.aparatos.ana = [{ uid: "ana", token: "a1" }];
  state.respuestas = [
    { success: false, error: { code: "messaging/server-unavailable" } },
  ];
  await avisar({} as never, { uid: "ana" }, aviso);
  expect(state.olvidados).toEqual([]);
});

it("trocea por encima de 500 aparatos", async () => {
  state.aparatos.ana = Array.from({ length: 501 }, (_, i) => ({
    uid: "ana",
    token: `t${i}`,
  }));
  await avisar({} as never, { uid: "ana" }, aviso);
  expect(state.enviados).toHaveLength(2);
  expect((state.enviados[0] as { tokens: string[] }).tokens).toHaveLength(500);
  expect((state.enviados[1] as { tokens: string[] }).tokens).toHaveLength(1);
});

/* Que FCM esté caído no puede convertirse en un error de la ruta que llamó:
   el aviso ya está en la bandeja de dentro, que es la red de seguridad. */
it("si FCM revienta, avisar no lanza", async () => {
  state.aparatos.ana = [{ uid: "ana", token: "a1" }];
  const { getMessaging } = await import("firebase-admin/messaging");
  vi.mocked(getMessaging).mockReturnValueOnce({
    sendEachForMulticast: async () => {
      throw new Error("caído");
    },
  } as never);
  await expect(
    avisar({} as never, { uid: "ana" }, aviso),
  ).resolves.toBeUndefined();
});
