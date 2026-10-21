import { beforeEach, expect, it, vi } from "vitest";
import { copiaDelRelato } from "../../src/domain/publication";

/**
 * El resumen que ve la comunidad no puede ser el relato.
 *
 * La política es una sola: la comunidad ve un resumen que escribe el Consejo,
 * nunca el relato de quien reportó. El editor parte del relato para no obligar a
 * teclear lo que ya está delante, y por eso hay dos cosas que vigilar: que
 * guardar sin tocarlo no lo publique, y que reabrir un caso ya publicado no
 * reinicie el plazo de 24 horas ni sustituya lo aprobado.
 */
const id = "d".repeat(64);
const RELATO =
  "Mi nombre es Ana Ruiz y vivo junto al muelle de Bocas. El alumbrado lleva dos semanas apagado y los niños cruzan de noche.";
const estado = vi.hoisted(() => ({
  publico: undefined as Record<string, unknown> | undefined,
  escrito: [] as Array<{ op: string; path: string; data?: unknown }>,
}));

vi.mock("../../src/server/push", () => ({ avisar: async () => undefined }));
vi.mock("../../src/server/admin-auth", () => ({
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  requireAdmin: async () => ({
    uid: "consejo",
    db: {
      doc: (path: string) => ({
        path,
        get: async () => ({ data: () => estado.publico }),
        collection: () => ({ doc: (d: string) => ({ path: `${path}/${d}` }) }),
      }),
      runTransaction: async (fn: (t: unknown) => unknown) => {
        const w: Array<() => void> = [];
        const r = await fn({
          get: async (ref: { path: string }) => {
            if (ref.path === `incidents/${id}`)
              return {
                data: () => ({
                  owner: "ana",
                  version: 0,
                  category: "infraestructura",
                  date: "2026-10-01",
                  description: RELATO,
                  title: RELATO.slice(0, 70),
                  sensitivity: "safe",
                  publication: "private",
                }),
              };
            if (ref.path === `publicIncidents/${id}`)
              return { exists: !!estado.publico, data: () => estado.publico };
            return { exists: false, data: () => undefined };
          },
          set: (ref: { path: string }, data: unknown) =>
            w.push(() =>
              estado.escrito.push({ op: "set", path: ref.path, data }),
            ),
          update: (ref: { path: string }, data: unknown) =>
            w.push(() =>
              estado.escrito.push({ op: "update", path: ref.path, data }),
            ),
          create: () => undefined,
          delete: () => undefined,
        });
        w.forEach((x) => x());
        return r;
      },
    },
  }),
}));

import { GET, PATCH } from "../../src/app/api/admin/incidents/[id]/route";

const guardar = (extra: Record<string, unknown>) =>
  PATCH(
    new Request("http://x/api/admin/incidents/" + id, {
      method: "PATCH",
      body: JSON.stringify({
        mutationId: "11111111-1111-4111-8111-111111111111",
        version: 0,
        status: "en_proceso",
        publicNote: "",
        internalNote: "Revisado.",
        sensitivity: "safe",
        publication: "public",
        priority: "media",
        publicTitle: "Alumbrado apagado en Bocas",
        publicSummary: "Hace dos semanas el alumbrado del muelle no enciende.",
        publicVereda: "Bocas de Satinga",
        ...extra,
      }),
    }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  estado.publico = undefined;
  estado.escrito = [];
});

it("reconoce el principio del relato como copia, y una versión reescrita no", () => {
  expect(copiaDelRelato(RELATO, RELATO)).toBe(true);
  expect(copiaDelRelato(RELATO, RELATO.slice(0, 60) + "…")).toBe(true);
  expect(
    copiaDelRelato(RELATO, "  MI NOMBRE es ana ruiz y vivo junto al muelle  "),
  ).toBe(true);
  expect(
    copiaDelRelato(RELATO, "Alumbrado apagado en el muelle de Bocas"),
  ).toBe(false);
  expect(copiaDelRelato(RELATO, "")).toBe(false);
  // Un texto muy corto que casualmente empieza igual no es una copia.
  expect(copiaDelRelato(RELATO, "Mi")).toBe(false);
});

it("guardar sin tocar el relato precargado no lo publica", async () => {
  const response = await guardar({
    publicTitle: RELATO.slice(0, 70),
    publicSummary: RELATO,
  });
  expect(response.status).toBe(409);
  expect((await response.json()).error).toMatch(/relato tal cual/);
  expect(
    estado.escrito.find((e) => e.path.startsWith("publicIncidents")),
  ).toBeUndefined();
});

it("un resumen escrito por el Consejo se guarda y estrena su plazo", async () => {
  expect((await guardar({})).status).toBe(200);
  const escrito = estado.escrito.find(
    (e) => e.path === `publicIncidents/${id}`,
  );
  expect(escrito?.op).toBe("set");
  expect((escrito?.data as { publishedAt: string }).publishedAt).toBeTruthy();
});

it("guardar un caso ya publicado con el mismo texto no reinicia las 24 horas", async () => {
  estado.publico = {
    published: true,
    title: "Alumbrado apagado en Bocas",
    summary: "Hace dos semanas el alumbrado del muelle no enciende.",
    vereda: "Bocas de Satinga",
    publishedAt: "2026-10-02T10:00:00.000Z",
  };
  expect((await guardar({})).status).toBe(200);
  const escrito = estado.escrito.filter(
    (e) => e.path === `publicIncidents/${id}`,
  );
  expect(escrito).toHaveLength(1);
  // Solo el estado: la fecha de publicación y el texto aprobado quedan como están.
  expect(escrito[0]).toMatchObject({
    op: "update",
    data: { status: "en_proceso" },
  });
});

it("el editor puede pedir lo aprobado para partir de ello y no del relato", async () => {
  estado.publico = { title: "T", summary: "S", vereda: "V" };
  const respuesta = await GET(new Request("http://x"), {
    params: Promise.resolve({ id }),
  });
  expect(await respuesta.json()).toEqual({
    publicTitle: "T",
    publicSummary: "S",
    publicVereda: "V",
  });
});
