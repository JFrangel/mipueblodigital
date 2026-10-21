import { afterEach, expect, it, vi } from "vitest";
vi.mock("../../src/data/remote-reports", () => ({
  memberHeaders: async () => ({ headers: {}, uid: "ana" }),
}));
vi.mock("../../src/data/territorio-vivo", () => ({ referencia: () => null }));
import { fetchAccountReports } from "../../src/data/account-reports";
import { fetchCommunityReports } from "../../src/data/community-map";
afterEach(() => vi.unstubAllGlobals());
it("consulta 501 reportes personales sin detenerse en 200", async () => {
  let calls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const start = calls++ * 25;
      return Response.json({
        items: Array.from({ length: Math.min(25, 501 - start) }, (_, i) => ({
          id: String(start + i),
        })),
        next: start + 25 < 501 ? `cursor-${calls}` : null,
      });
    }),
  );
  const result = await fetchAccountReports(new AbortController().signal);
  expect(result.complete).toBe(true);
  expect(result.items).toHaveLength(501);
  expect(calls).toBe(21);
});
it("continúa tras páginas comunitarias vacías con cursor y alcanza el resto", async () => {
  let calls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      calls++;
      return Response.json({
        items:
          calls === 10
            ? [
                {
                  id: "visible",
                  vereda: "Bellavista",
                  date: "2026-10-21T00:00:00Z",
                },
              ]
            : [],
        next: calls < 10 ? `cursor-${calls}` : null,
      });
    }),
  );
  expect(await fetchCommunityReports()).toHaveLength(1);
  expect(calls).toBe(10);
});
it("una página repetida falla y no declara completa una lista parcial", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ items: [], next: "repetido" })),
  );
  await expect(
    fetchAccountReports(new AbortController().signal),
  ).rejects.toThrow("repitió");
});
