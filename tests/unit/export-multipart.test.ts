import { expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import {
  mintLargeExportTicket,
  consumeExportTicket,
} from "../../src/server/export-tickets";
it("la descarga grande conserva Unicode, cabe por documento y se consume una sola vez", async () => {
  const store = new Map<string, Record<string, unknown>>();
  const ref = (path: string) => ({
    path,
    collection: (name: string) => ({
      doc: (id: string) => ref(`${path}/${name}/${id}`),
      orderBy: () => ({ prefix: `${path}/${name}/` }),
    }),
  });
  const db = {
    doc: ref,
    batch: () => {
      const writes: (() => void)[] = [];
      return {
        create: (r: { path: string }, data: Record<string, unknown>) =>
          writes.push(() => store.set(r.path, data)),
        commit: async () => {
          writes.forEach((w) => w());
        },
      };
    },
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: async (r: { path?: string; prefix?: string }) =>
          r.prefix
            ? {
                size: [...store.keys()].filter((k) => k.startsWith(r.prefix!))
                  .length,
                docs: [...store.entries()]
                  .filter(([k]) => k.startsWith(r.prefix!))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([path, data]) => ({
                    ref: ref(path),
                    data: () => data,
                  })),
              }
            : { data: () => store.get(r.path!) },
        delete: (r: { path: string }) => store.delete(r.path),
      }),
  } as unknown as Firestore;
  const body = "x".repeat(199999) + "🌿" + "Texto Río Satinga\n".repeat(60000);
  const ticket = await mintLargeExportTicket(db, "ana", body);
  expect(store.size).toBeGreaterThan(2);
  for (const data of store.values())
    expect(Buffer.byteLength(JSON.stringify(data), "utf8")).toBeLessThan(
      900000,
    );
  expect((await consumeExportTicket(db, ticket))?.body).toBe(body);
  expect(store.size).toBe(0);
  expect(await consumeExportTicket(db, ticket)).toBeNull();
});
