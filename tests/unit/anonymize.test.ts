import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ evidence: [] as string[], fail: false }));
vi.mock("../../src/server/evidence", () => ({
  evidenceRequest: async (query: string) => {
    if (calls.fail) throw new Error("storage unavailable");
    calls.evidence.push(query);
    return new Response(null, { status: 204 });
  },
}));

import { anonymizeAccount, REDACTED } from "../../src/server/anonymize";

type Doc = Record<string, unknown>;
const store = new Map<string, Doc>();

/** Firestore mínimo: consultas por igualdad, lotes y borrados sobre un mapa. */
function collection(prefix: string, filters: [string, unknown][] = []) {
  const query = {
    doc: (id: string) => doc(`${prefix}/${id}`),
    where: (field: string, _op: string, value: unknown) =>
      collection(prefix, [...filters, [field, value]]),
    limit: (max: number) => ({
      get: async () => {
        const docs = [...store.entries()]
          .filter(
            ([path, data]) =>
              path.startsWith(`${prefix}/`) &&
              !path.slice(prefix.length + 1).includes("/") &&
              filters.every(([field, value]) => data[field] === value),
          )
          .slice(0, max)
          .map(([path, data]) => ({ ref: doc(path), data: () => data }));
        return { docs, size: docs.length, empty: !docs.length };
      },
    }),
  };
  return query as unknown as FirebaseFirestore.Query;
}

function doc(path: string) {
  return {
    path,
    collection: (name: string) => collection(`${path}/${name}`),
    delete: async () => void store.delete(path),
    set: async (data: Doc, options?: { merge?: boolean }) =>
      void store.set(path, options?.merge ? { ...store.get(path), ...data } : data),
  };
}

const db = {
  doc,
  collection: (path: string) => collection(path),
  batch: () => {
    const writes: (() => void)[] = [];
    return {
      update: (ref: { path: string }, data: Doc) =>
        writes.push(() =>
          store.set(ref.path, { ...store.get(ref.path), ...data }),
        ),
      set: (ref: { path: string }, data: Doc) =>
        writes.push(() =>
          store.set(ref.path, { ...store.get(ref.path), ...data }),
        ),
      delete: (ref: { path: string }) => writes.push(() => store.delete(ref.path)),
      commit: async () => writes.forEach((write) => write()),
    };
  },
} as unknown as FirebaseFirestore.Firestore;

beforeEach(() => {
  store.clear();
  calls.evidence = [];
  calls.fail = false;
  store.set("accounts/ana", { active: true, avatar: "river" });
  store.set("incidents/uno", {
    owner: "ana",
    phone: "3001234567",
    description: "Mi nombre es Ana y vivo junto al muelle",
    title: "Mi nombre es Ana",
    category: "infraestructura",
    vereda: "Bellavista",
    status: "en_proceso",
    evidenceId: "foto-1",
  });
  store.set("incidents/uno/events/received", { type: "received", actor: "ana" });
  store.set("incidents/ajeno", { owner: "beto", phone: "3007654321" });
  store.set("notifications/ana/items/uno-received", { read: false });
  store.set("incidentIntake/uno", { owner: "ana", hash: "abc" });
  store.set("incidentLimits/ana", { day: "2026-09-14", count: 3 });
  store.set("pushTokens/ana/devices/tok-1", { platform: "android", agent: "Pixel" });
  store.set("pushTokens/ana/devices/tok-2", { platform: "web", agent: "Chrome" });
  store.set("pushTokens/beto/devices/tok-3", { platform: "android", agent: "Moto" });
});

describe("anonimización de cuenta", () => {
  it("retira los datos personales y conserva la trazabilidad comunitaria", async () => {
    const result = await anonymizeAccount(db, "ana", "anon-1");
    expect(result).toMatchObject({
      incidents: 1,
      notifications: 1,
      devices: 2,
      complete: true,
    });
    const incident = store.get("incidents/uno")!;
    expect(incident.owner).toBe("anon-1");
    expect(incident.phone).toBe("");
    expect(incident.description).toBe(REDACTED);
    expect(incident.evidenceId).toBeNull();
    // La trazabilidad del Consejo sobrevive a la eliminación.
    expect(incident).toMatchObject({
      category: "infraestructura",
      vereda: "Bellavista",
      status: "en_proceso",
    });
    expect(store.get("incidents/uno/events/received")!.actor).toBe("anon-1");
    expect(store.has("notifications/ana/items/uno-received")).toBe(false);
    expect(store.has("incidentIntake/uno")).toBe(false);
    expect(store.has("incidentLimits/ana")).toBe(false);
    /* El token de un aparato y su user-agent son un identificador que dura
       tanto como el teléfono: se van con lo demás, o el aviso de cada reporte
       nuevo seguiría llegando a quien pidió que se le borrara. */
    expect(store.has("pushTokens/ana/devices/tok-1")).toBe(false);
    expect(store.has("pushTokens/ana/devices/tok-2")).toBe(false);
    expect(store.get("accounts/ana")).toMatchObject({ active: false, deleted: true, avatar: null });
    expect(calls.evidence[0]).toContain("owner_uid=eq.ana");
  });

  it("no toca los expedientes de otras personas", async () => {
    await anonymizeAccount(db, "ana", "anon-1");
    expect(store.get("incidents/ajeno")).toMatchObject({
      owner: "beto",
      phone: "3007654321",
    });
    expect(store.has("pushTokens/beto/devices/tok-3")).toBe(true);
  });

  it("repetirla no cambia el resultado", async () => {
    await anonymizeAccount(db, "ana", "anon-1");
    const again = await anonymizeAccount(db, "ana", "anon-1");
    expect(again.incidents).toBe(0);
    expect(store.get("incidents/uno")!.description).toBe(REDACTED);
  });

  it("marca incompleta la eliminación si el archivo privado falla", async () => {
    calls.fail = true;
    const result = await anonymizeAccount(db, "ana", "anon-1");
    expect(result.evidence).toBe(false);
    expect(result.complete).toBe(false);
  });
});
