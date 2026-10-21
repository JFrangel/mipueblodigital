import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  docs: [] as {
    id: string;
    date: string;
    title: string;
    vereda: string;
    status: string;
  }[],
}));
function query(after: string[] = [], count = 100) {
  return {
    orderBy: () => query(after, count),
    where: () => query(after, count),
    startAfter: (...values: unknown[]) =>
      query(
        typeof values[0] === "object"
          ? [
              (values[0] as { data: () => { date: string }; id: string }).data()
                .date,
              (values[0] as { id: string }).id,
            ]
          : (values as string[]),
        count,
      ),
    limit: (n: number) => query(after, n),
    get: async () => {
      const all = [...state.docs].sort(
        (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
      );
      const start = after.length
        ? all.findIndex((d) => d.date === after[0] && d.id === after[1]) + 1
        : 0;
      const docs = all
        .slice(start, start + count)
        .map((d) => ({ id: d.id, data: () => d }));
      return { docs, size: docs.length, empty: !docs.length };
    },
  };
}
vi.mock("../../src/server/admin-auth", () => ({
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  requireAdmin: async () => ({ uid: "ana", db: { collection: () => query() } }),
}));
vi.mock("../../src/server/vereda-catalogue", () => ({
  readCatalogue: async () => ({
    version: 1,
    items: [
      {
        id: "bellavista",
        name: "Nueva Bellavista",
        aliases: ["Bellavista"],
        active: true,
      },
    ],
  }),
}));
import { GET } from "../../src/app/api/admin/incidents/route";
import { GET as exportInbox } from "../../src/app/api/admin/incidents/export/route";
beforeEach(() => {
  state.docs = Array.from({ length: 501 }, (_, i) => ({
    id: i.toString(16).padStart(64, "0"),
    date: "2026-10-20T12:00:00.000Z",
    title: `Caso ${i}`,
    vereda: "Bellavista",
    status: i === 0 ? "solucionado" : "pendiente",
  }));
});
it("pagina 501 expedientes con hora idéntica sin perder ni duplicar", async () => {
  const ids: string[] = [];
  let after = "";
  do {
    const r = await GET(
      new Request(
        `http://localhost/api/admin/incidents/?after=${encodeURIComponent(after)}`,
      ),
    );
    expect(r.status).toBe(200);
    const data = await r.json();
    ids.push(...data.items.map((v: { id: string }) => v.id));
    after = data.next;
  } while (after);
  expect(ids).toHaveLength(501);
  expect(new Set(ids).size).toBe(501);
  expect(ids[0]).toBe(state.docs[500].id);
});
it("un filtro encuentra el expediente más allá de las primeras ocho páginas", async () => {
  const r = await GET(
    new Request("http://localhost/api/admin/incidents/?status=solucionado"),
  );
  const data = await r.json();
  expect(data.items.map((v: { id: string }) => v.id)).toEqual([
    state.docs[0].id,
  ]);
  expect(data.next).toBeNull();
});
it("el CSV contiene la bandeja entera, aun si no se cargó en pantalla", async () => {
  const r = await exportInbox(
    new Request("http://localhost/api/admin/incidents/export/"),
  );
  expect(r.status).toBe(200);
  expect((await r.text()).split("\r\n")).toHaveLength(502);
});

it("un nombre corregido encuentra expedientes guardados con su alias anterior", async () => {
  const r = await GET(
    new Request(
      "http://localhost/api/admin/incidents/?vereda=Nueva%20Bellavista",
    ),
  );
  const data = await r.json();
  expect(data.items).toHaveLength(25);
  expect(data.items[0].vereda).toBe("Nueva Bellavista");
});
