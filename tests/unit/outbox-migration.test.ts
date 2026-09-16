import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { outgoingFor, readPayload, claimOutgoing } from "../../src/data/outbox";

const payload = {
  category: "recursos_naturales",
  vereda: "Barro Caliente",
  description: "Derrame en la quebrada",
  phone: "",
  photo: "data:image/png;base64,YWJj",
  sensitive: false,
};

/** Esquema de la versión 1: la fotografía vivía dentro del propio registro. */
function seedVersionOne(owner: string, key: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("mi-pueblo-outbox", 1);
    request.onupgradeneeded = () =>
      request.result
        .createObjectStore("reports", { keyPath: "key" })
        .createIndex("owner", "owner");
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("reports", "readwrite");
      tx.objectStore("reports").add({
        key,
        owner,
        requestId: crypto.randomUUID(),
        title: payload.description,
        createdAt: new Date().toISOString(),
        payload,
        bytes: 1024,
        state: "queued",
        attempts: 0,
        nextAt: 0,
        leaseUntil: 0,
      });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}

describe("migración de la bandeja", () => {
  it("conserva los envíos pendientes al separar metadatos y fotografía", async () => {
    const owner = crypto.randomUUID(),
      key = `${owner}:pendiente`;
    await seedVersionOne(owner, key);
    const listed = await outgoingFor(owner);
    expect(listed).toHaveLength(1);
    expect(listed[0].state).toBe("queued");
    expect(Object.hasOwn(listed[0] as object, "payload")).toBe(false);
    expect(await readPayload(key)).toEqual(payload);
    const claimed = await claimOutgoing(key, owner);
    expect(claimed?.payload).toEqual(payload);
  });
});
