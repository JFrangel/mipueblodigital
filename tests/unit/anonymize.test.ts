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
function collection(
  prefix: string,
  filters: [string, unknown][] = [],
  after = "",
  max = Infinity,
): FirebaseFirestore.Query {
  return {
    doc: (id: string) => doc(`${prefix}/${id}`),
    where: (field: string, _op: string, value: unknown) =>
      collection(prefix, [...filters, [field, value]], after, max),
    orderBy: () => collection(prefix, filters, after, max),
    startAfter: (snapshot: { ref: { path: string } }) =>
      collection(prefix, filters, snapshot.ref.path, max),
    limit: (limit: number) => collection(prefix, filters, after, limit),
    get: async () => {
      const docs = [...store.entries()]
        .filter(
          ([path, data]) =>
            path.startsWith(`${prefix}/`) &&
            !path.slice(prefix.length + 1).includes("/") &&
            path > after &&
            filters.every(([field, value]) => data[field] === value),
        )
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, max)
        .map(([path, data]) => ({ ref: doc(path), data: () => data }));
      return { docs, size: docs.length, empty: !docs.length };
    },
  } as unknown as FirebaseFirestore.Query;
}

function doc(path: string) {
  return {
    path,
    collection: (name: string) => collection(`${path}/${name}`),
    delete: async () => void store.delete(path),
    set: async (data: Doc, options?: { merge?: boolean }) =>
      void store.set(
        path,
        options?.merge ? { ...store.get(path), ...data } : data,
      ),
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
      delete: (ref: { path: string }) =>
        writes.push(() => store.delete(ref.path)),
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
    lat: 2.3471,
    lng: -78.3252,
    pointSource: "aparato",
    pointAccuracy: 12,
  });
  store.set("incidents/uno/events/cambio-1", {
    status: "en_proceso",
    actor: "consejo-1",
    at: "2026-09-02",
    publicNote: "Hablé con doña Ana, vive junto al muelle",
    internalNote: "Su teléfono es el 300...",
  });
  store.set("veredaProposals/bellavista", {
    nombre: "Bellavista",
    estado: "propuesta",
    aportes: [
      { lat: 2.3, lng: -78.3, exactitud: 10, origen: "aparato", cuenta: "ana" },
      {
        lat: 2.31,
        lng: -78.31,
        exactitud: 10,
        origen: "aparato",
        cuenta: "beto",
      },
    ],
  });
  store.set("incidents/uno/events/received", {
    type: "received",
    actor: "ana",
  });
  store.set("incidents/ajeno", { owner: "beto", phone: "3007654321" });
  store.set("notifications/ana/items/uno-received", { read: false });
  store.set("incidentIntake/uno", { owner: "ana", hash: "abc" });
  store.set("incidentLimits/ana", { day: "2026-09-14", count: 3 });
  store.set("pushTokens/ana/devices/tok-1", {
    platform: "android",
    agent: "Pixel",
  });
  store.set("pushTokens/ana/devices/tok-2", {
    platform: "web",
    agent: "Chrome",
  });
  store.set("pushTokens/beto/devices/tok-3", {
    platform: "android",
    agent: "Moto",
  });
});

describe("anonimización de cuenta", () => {
  it("retoma las notas si falla su limpieza después de retirar los datos del expediente", async () => {
    const original = db.batch.bind(db);
    let count = 0;
    const spy = vi.spyOn(db, "batch").mockImplementation(() => {
      const batch = original();
      count++;
      if (count === 2)
        vi.spyOn(batch, "commit").mockRejectedValueOnce(
          new Error("corte de red"),
        );
      return batch;
    });
    let first;
    try {
      first = await anonymizeAccount(db, "ana", "anon-1");
    } finally {
      spy.mockRestore();
    }
    expect(first.complete).toBe(false);
    const second = await anonymizeAccount(db, "ana", "anon-1");
    expect(second.complete).toBe(true);
    expect(store.get("incidents/uno/events/cambio-1")!.internalNote).toBe("");
  });
  it("limpia más de quinientas actuaciones y expedientes parciales anteriores", async () => {
    store.set("incidents/uno", {
      ...store.get("incidents/uno"),
      owner: "anon-1",
      anonymizedAt: "ayer",
    });
    for (let i = 0; i < 510; i++)
      store.set(`incidents/uno/events/nota-${i.toString().padStart(4, "0")}`, {
        internalNote: "dato personal",
      });
    expect((await anonymizeAccount(db, "ana", "anon-1")).complete).toBe(true);
    expect(
      [...store.entries()]
        .filter(([p]) => p.startsWith("incidents/uno/events/"))
        .every(([, v]) => v.internalNote === ""),
    ).toBe(true);
  });
  it("no declara terminada la limpieza si quedan copias de las fotografías", async () => {
    for (let i = 0; i < 1005; i++)
      store.set(`incidentEvidence/copia-${i}`, {
        owner: "ana",
        content_base64: "foto",
      });
    const first = await anonymizeAccount(db, "ana", "anon-1");
    expect(first.complete).toBe(false);
    expect(
      [...store.keys()].filter((k) => k.startsWith("incidentEvidence/")),
    ).toHaveLength(5);
    const second = await anonymizeAccount(db, "ana", "anon-1");
    expect(second.complete).toBe(true);
    expect(
      [...store.keys()].filter((k) => k.startsWith("incidentEvidence/")),
    ).toHaveLength(0);
  });
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
    expect(store.get("accounts/ana")).toMatchObject({
      active: false,
      deleted: true,
      avatar: null,
    });
    expect(calls.evidence[0]).toContain("owner_uid=eq.ana");
  });

  it("quita el punto exacto, las notas del historial y los aportes de ubicación", async () => {
    await anonymizeAccount(db, "ana", "anon-1");
    // El punto puede ser la puerta de su casa: los términos prometen que solo
    // quedan categoría, vereda, estado y fechas.
    expect(store.get("incidents/uno")).toMatchObject({
      lat: null,
      lng: null,
      pointSource: null,
      pointAccuracy: null,
    });
    const cambio = store.get("incidents/uno/events/cambio-1")!;
    expect(cambio).toMatchObject({
      status: "en_proceso",
      actor: "consejo-1",
      at: "2026-09-02",
      publicNote: "",
      internalNote: "",
    });
    // La coordenada del aparato atada a su cuenta se va; la de otra persona no.
    const aportes = store.get("veredaProposals/bellavista")!.aportes as Array<{
      cuenta: string;
    }>;
    expect(aportes.map((a) => a.cuenta)).toEqual(["beto"]);
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
