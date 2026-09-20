import { expect, it, vi } from "vitest";

/**
 * Lo que la comunidad ve de un reporte ajeno.
 *
 * Es la proyección con más que perder de toda la aplicación: el documento del
 * expediente lleva al lado el teléfono de quien reportó, su identificador de
 * cuenta y el de la evidencia. Se arma campo a campo justamente por eso, y
 * esta prueba está para que siga siendo así aunque un día alguien encuentre
 * más cómodo esparcir el documento entero.
 */
const state = vi.hoisted(() => ({
  incidentes: [] as Array<Record<string, unknown>>,
  publicos: [] as Array<Record<string, unknown> | undefined>,
}));

const consulta = () => {
  const chain = {
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    startAfter: () => chain,
    get: async () => ({
      docs: state.incidentes.map((fila) => ({
        id: fila.id as string,
        data: () => fila,
      })),
    }),
  };
  return chain;
};

vi.mock("../../src/server/admin-auth", () => ({
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  requireMember: async () => ({
    uid: "ana",
    db: {
      collection: consulta,
      doc: (path: string) => ({ path }),
      getAll: async () => state.publicos.map((fila) => ({ data: () => fila })),
    },
  }),
}));

import { GET } from "../../src/app/api/community/reports/route";

const viejo = "2026-09-01T00:00:00.000Z";
const expediente = (cambios: Record<string, unknown> = {}) => ({
  id: "uno",
  title: "Creciente en la quebrada",
  description: "El río se desbordó y se llevó el paso de tablas.",
  category: "infraestructura",
  vereda: "Bellavista",
  status: "en_proceso",
  date: viejo,
  sensitivity: "unreviewed",
  /* Lo que nunca puede salir. */
  phone: "3001234567",
  owner: "uid-de-quien-reporto",
  evidenceId: "7a1f0c22-0000-4000-8000-000000000000",
  ...cambios,
});

const pedir = () =>
  GET(
    new Request("http://localhost/api/community/reports", {
      headers: { authorization: "Bearer sintetico" },
    }),
  );

it("pasado el plazo consta el reporte tal como lo escribieron", async () => {
  state.incidentes = [expediente()];
  state.publicos = [undefined];
  const { items } = await (await pedir()).json();
  expect(items[0]).toEqual({
    id: "uno",
    scope: "automatico",
    title: "Creciente en la quebrada",
    summary: "El río se desbordó y se llevó el paso de tablas.",
    category: "infraestructura",
    vereda: "Bellavista",
    status: "en_proceso",
    date: viejo,
  });
});

it("nunca salen el teléfono, el dueño ni la evidencia", async () => {
  state.incidentes = [expediente()];
  state.publicos = [undefined];
  const cuerpo = JSON.stringify((await (await pedir()).json()).items);
  for (const secreto of [
    "3001234567",
    "uid-de-quien-reporto",
    "7a1f0c22-0000-4000-8000-000000000000",
  ])
    expect(cuerpo).not.toContain(secreto);
});

it("lo marcado como delicado no consta de ninguna manera", async () => {
  state.incidentes = [expediente({ sensitivity: "sensitive" })];
  state.publicos = [undefined];
  const { items } = await (await pedir()).json();
  expect(items).toHaveLength(0);
});

it("el resumen del Consejo reemplaza al automático", async () => {
  state.incidentes = [expediente()];
  state.publicos = [
    {
      published: true,
      title: "Paso de tablas en Bellavista",
      summary: "El Consejo acordó una visita técnica esta semana.",
      vereda: "Bellavista",
      category: "infraestructura",
      status: "en_proceso",
      createdAt: viejo,
    },
  ];
  const { items } = await (await pedir()).json();
  expect(items[0].scope).toBe("revisado");
  expect(items[0].summary).toBe(
    "El Consejo acordó una visita técnica esta semana.",
  );
});

/**
 * El resumen revisado no espera plazo.
 *
 * La consulta recortaba por fecha antes de mirar nada más, así que un caso que
 * el Consejo acababa de revisar y publicar no constaba ante la comunidad hasta
 * que pasaban las horas de gracia. El plazo protege lo que consta **sin que
 * nadie lo mire**; una revisión es exactamente lo contrario.
 */
const reciente = new Date(Date.now() - 3600000).toISOString();

it("un caso revisado hoy consta hoy, sin esperar el plazo", async () => {
  state.incidentes = [expediente({ date: reciente })];
  state.publicos = [
    {
      published: true,
      title: "Paso de tablas en Bellavista",
      summary: "El Consejo acordó una visita técnica esta semana.",
      vereda: "Bellavista",
      category: "infraestructura",
      status: "en_proceso",
      createdAt: reciente,
    },
  ];
  const { items } = await (await pedir()).json();
  expect(items).toHaveLength(1);
  expect(items[0].scope).toBe("revisado");
});

it("sin revisar, lo recién llegado sigue esperando su plazo", async () => {
  state.incidentes = [expediente({ date: reciente })];
  state.publicos = [undefined];
  const { items } = await (await pedir()).json();
  expect(items).toHaveLength(0);
});

it("marcarlo como delicado lo retira aunque ya tuviera resumen publicado", async () => {
  state.incidentes = [expediente({ sensitivity: "sensitive" })];
  state.publicos = [
    {
      published: true,
      title: "Ya no debería verse",
      summary: "Se marcó como delicado después de publicarse.",
      vereda: "Bellavista",
      category: "infraestructura",
      status: "en_proceso",
      createdAt: viejo,
    },
  ];
  const { items } = await (await pedir()).json();
  expect(items).toHaveLength(0);
});

/**
 * El estado que ve la comunidad es el del expediente, no el del resumen.
 *
 * El resumen guarda una foto del día en que se publicó. Si el caso se resolvía
 * después, la comunidad seguía leyendo «en proceso» para siempre: el Consejo
 * cerraba el caso y nadie fuera se enteraba.
 */
it("un caso resuelto después de publicarse se lee resuelto", async () => {
  state.incidentes = [expediente({ status: "solucionado" })];
  state.publicos = [
    {
      published: true,
      title: "Paso de tablas en Bellavista",
      summary: "El Consejo acordó una visita técnica.",
      vereda: "Bellavista",
      category: "infraestructura",
      /* Lo que había cuando se redactó el resumen. */
      status: "en_proceso",
      createdAt: viejo,
    },
  ];
  const { items } = await (await pedir()).json();
  expect(items[0].status).toBe("solucionado");
  /* El texto sí es el que redactó el Consejo. */
  expect(items[0].title).toBe("Paso de tablas en Bellavista");
});

/**
 * Un caso descartado deja de constar ante la comunidad.
 *
 * «Descartado» es el Consejo diciendo que eso no era una incidencia. Si
 * siguiera saliendo, el mapa pintaría un problema donde no lo hay y le cargaría
 * a una vereda algo que no le corresponde.
 *
 * La prueba vigila las dos mitades, porque esconder de más sería peor que no
 * esconder: «no solucionado», «bloqueado por conflicto» y «escalado» son
 * problemas de verdad que siguen ahí, y esos tienen que verse.
 */
it("esconde lo descartado y deja ver los demás finales", async () => {
  const { sharedView } = await import("../../src/server/community-view");
  const base = {
    date: "2020-01-01T00:00:00.000Z",
    sensitivity: "safe",
    title: "Un derrumbe",
    description: "Se cayó el camino",
    category: "infraestructura",
    vereda: "Bellavista",
  };
  const ver = (status: string) =>
    sharedView(
      "c1",
      { ...base, status },
      undefined,
      Date.parse(base.date) + 1e9,
      24,
    );

  expect(ver("descartado")).toBeNull();
  for (const vivo of [
    "pendiente",
    "en_proceso",
    "solucionado",
    "no_solucionado",
    "bloqueado_conflicto",
    "escalado",
  ])
    expect(ver(vivo), `${vivo} tiene que seguir constando`).not.toBeNull();
});

/** Y tampoco consta el descartado que el Consejo había publicado a mano. */
it("retira el descartado aunque tuviera resumen publicado", async () => {
  const { sharedView } = await import("../../src/server/community-view");
  expect(
    sharedView(
      "c2",
      {
        date: "2020-01-01T00:00:00.000Z",
        sensitivity: "safe",
        status: "descartado",
      },
      { published: true, title: "Resumen del Consejo", vereda: "Bellavista" },
      Date.now(),
      24,
    ),
  ).toBeNull();
});
