import { expect, it, vi } from "vitest";

/**
 * Los avisos a la comunidad.
 *
 * Venían marcados como leídos desde el servidor, y por eso publicar un
 * comunicado no encendía ninguna campana: el aviso aparecía en la lista sin
 * que nadie se enterara de que estaba. Y tampoco decían a qué comunicado
 * correspondían, así que no había manera de abrirlo desde el aviso.
 */
const state = vi.hoisted(() => ({
  personales: [] as Array<Record<string, unknown>>,
  avisos: [] as Array<Record<string, unknown>>,
  consejo: false,
  cuentas: [{ uid: "presidenta", displayName: "Rosa Angulo", email: "" }],
}));

const pagina = (filas: Array<Record<string, unknown>>) => ({
  docs: filas.map((fila) => ({ id: fila.id as string, data: () => fila })),
});

vi.mock("../../src/server/admin-auth", () => ({
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  adminServices: () => ({
    auth: {
      getUsers: async () => ({ users: state.cuentas }),
    },
  }),
  requireMember: async () => ({
    uid: "ana",
    identity: { admin: state.consejo },
    db: {
      collection: (path: string) => ({
        orderBy: () => ({
          limit: () => ({
            get: async () =>
              pagina(
                path === "communityAnnouncements"
                  ? state.avisos
                  : state.personales,
              ),
          }),
        }),
      }),
    },
  }),
}));

import { GET } from "../../src/app/api/notifications/route";

const consulta = (scope = "") =>
  GET(
    new Request(
      `http://localhost/api/notifications${scope ? `?scope=${scope}` : ""}`,
      { headers: { authorization: "Bearer sintetico" } },
    ),
  );

it("el aviso de un comunicado llega sin leer y con el comunicado que abre", async () => {
  state.personales = [];
  state.avisos = [
    {
      id: "jornada-de-limpieza",
      title: "Nuevo comunicado del Consejo",
      note: "Jornada de limpieza del río",
      at: "2026-09-15T10:00:00.000Z",
      newsId: "jornada-de-limpieza",
    },
  ];
  const { items } = await (await consulta()).json();
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({
    type: "announcement",
    read: false,
    newsId: "jornada-de-limpieza",
  });
});

it("lo personal conserva su propio leído y todo se ordena por fecha", async () => {
  state.personales = [
    {
      id: "uno",
      title: "Tu reporte cambió de estado",
      type: "status",
      at: "2026-09-15T12:00:00.000Z",
      read: true,
    },
  ];
  state.avisos = [
    {
      id: "dos",
      title: "Nuevo comunicado del Consejo",
      note: "",
      at: "2026-09-15T09:00:00.000Z",
      newsId: "dos",
    },
  ];
  const { items } = await (await consulta()).json();
  expect(items.map((n: { id: string }) => n.id)).toEqual([
    "uno",
    "announcement-dos",
  ]);
  expect(items[0].read).toBe(true);
  expect(items[0].newsId).toBeNull();
});

/**
 * Quién firmó el cambio, en la bandeja del Consejo.
 *
 * El aviso guarda el identificador de la cuenta, que es lo estable. Enseñarlo
 * tal cual —«FICS6YJABhhgN1GoWj8YD9JGMB82»— no le dice a nadie quién lo hizo,
 * y en una bandeja compartida por todo el Consejo eso es media noticia.
 */
it("el aviso del Consejo dice quién lo hizo, con su nombre", async () => {
  state.consejo = true;
  state.personales = [
    {
      id: "uno",
      title: "Caso actualizado por el Consejo",
      note: "Pasa a En proceso",
      type: "case_update",
      at: "2026-09-15T15:10:00.000Z",
      actor: "presidenta",
      read: false,
    },
  ];
  const { items } = await (await consulta("council")).json();
  expect(items[0].actor).toBe("Rosa Angulo");
  state.consejo = false;
});

it("una cuenta que ya no existe se dice, no se enseña su identificador", async () => {
  state.consejo = true;
  state.cuentas = [];
  state.personales = [
    {
      id: "uno",
      title: "Caso actualizado por el Consejo",
      type: "case_update",
      at: "2026-09-15T15:10:00.000Z",
      actor: "FICS6YJABhhgN1GoWj8YD9JGMB82",
      read: false,
    },
  ];
  const { items } = await (await consulta("council")).json();
  expect(items[0].actor).toBe("Cuenta retirada");
  expect(JSON.stringify(items)).not.toContain("FICS6YJABhhgN1GoWj8YD9JGMB82");
  state.consejo = false;
  state.cuentas = [{ uid: "presidenta", displayName: "Rosa Angulo", email: "" }];
});
