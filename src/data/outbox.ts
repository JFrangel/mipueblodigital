import type { ReportPayload } from "./remote-reports";
export const OUTBOX_LIMIT = 10;
export const OUTBOX_BYTES = 50 * 1024 * 1024;
/**
 * Los metadatos viven separados de la fotografía. Listar la bandeja recorría
 * antes hasta 50 MB de Base64 cada vez que se refrescaba el indicador; ahora
 * `reports` guarda decenas de bytes por envío y `payloads` solo se abre al
 * reclamar un reporte para transmitirlo.
 */
export type Outgoing = {
  key: string;
  owner: string;
  requestId: string;
  title: string;
  createdAt: string;
  bytes: number;
  state: "queued" | "sending" | "attention" | "confirmed";
  attempts: number;
  nextAt: number;
  leaseUntil: number;
  lease?: string;
  error?: string;
  receipt?: { id: string; receivedAt: string };
  /**
   * Si quien reportó ya sabe que este envío salió. Un reporte hecho sin señal
   * se transmite solo cuando vuelve la red, y puede ocurrir con la aplicación
   * en segundo plano: sin esta marca, la entrega pasaba sin que nadie se
   * enterara. Ausente en los envíos anteriores a esta marca, que no se
   * anuncian porque ya son historia.
   */
  seen?: boolean;
};
export type ClaimedOutgoing = Outgoing & { payload: ReportPayload };
type LegacyOutgoing = Outgoing & { payload?: ReportPayload };
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("mi-pueblo-outbox", 2);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const reports = db.objectStoreNames.contains("reports")
        ? req.transaction!.objectStore("reports")
        : db.createObjectStore("reports", { keyPath: "key" });
      if (!reports.indexNames.contains("owner"))
        reports.createIndex("owner", "owner");
      if (db.objectStoreNames.contains("payloads")) return;
      const payloads = db.createObjectStore("payloads");
      if (event.oldVersion < 1) return;
      // Mover las fotografías ya guardadas sin perder ningún envío pendiente.
      reports.openCursor().onsuccess = (cursor) => {
        const position = (cursor.target as IDBRequest<IDBCursorWithValue>)
          .result;
        if (!position) return;
        const item = position.value as LegacyOutgoing;
        if (item.payload) {
          payloads.put(item.payload, item.key);
          delete item.payload;
          position.update(item);
        }
        position.continue();
      };
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function changed() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("outbox-change"));
}
export async function outgoingFor(owner: string): Promise<Outgoing[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reports"),
      req = tx.objectStore("reports").index("owner").getAll(owner);
    req.onsuccess = () =>
      resolve(
        req.result.sort((a: Outgoing, b: Outgoing) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      );
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
/** La fotografía original conservada para un envío que aún no tiene recibo. */
export async function readPayload(
  key: string,
): Promise<ReportPayload | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("payloads"),
      req = tx.objectStore("payloads").get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
export async function enqueue(owner: string, payload: ReportPayload) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const key = `${owner}:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  const db = await openDb();
  return new Promise<Outgoing>((resolve, reject) => {
    const tx = db.transaction(["reports", "payloads"], "readwrite"),
      store = tx.objectStore("reports"),
      req = store.index("owner").getAll(owner);
    let item: Outgoing, failure: Error | undefined;
    req.onsuccess = () => {
      const entries: Outgoing[] = req.result,
        previous = entries.find((e) => e.key === key);
      if (previous) {
        item = previous;
        return;
      }
      const pending = entries.filter((e) => e.state !== "confirmed");
      if (
        pending.length >= OUTBOX_LIMIT ||
        pending.reduce((n, e) => n + e.bytes, 0) + encoded.length > OUTBOX_BYTES
      ) {
        failure = new Error(
          "La bandeja admite 10 reportes o 50 MB. Envía los pendientes antes de añadir otro.",
        );
        tx.abort();
        return;
      }
      item = {
        key,
        owner,
        requestId: crypto.randomUUID(),
        title: payload.description.slice(0, 70),
        createdAt: new Date().toISOString(),
        bytes: encoded.length,
        state: "queued",
        attempts: 0,
        nextAt: 0,
        leaseUntil: 0,
      };
      store.add(item);
      tx.objectStore("payloads").put(payload, key);
    };
    tx.oncomplete = () => {
      db.close();
      changed();
      resolve(item);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        failure ??
          new Error(
            "No hay espacio disponible para conservar el reporte. No se ha enviado.",
          ),
      );
    };
  });
}
export function retryDelay(attempt: number) {
  return Math.min(
    15 * 60_000,
    5_000 * 2 ** Math.min(8, Math.max(0, attempt - 1)),
  );
}
export async function claimOutgoing(
  key: string,
  owner: string,
): Promise<ClaimedOutgoing | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["reports", "payloads"], "readwrite"),
      store = tx.objectStore("reports"),
      req = store.get(key);
    let result: ClaimedOutgoing | null = null;
    req.onsuccess = () => {
      const item: Outgoing | undefined = req.result;
      if (
        !item ||
        item.owner !== owner ||
        item.state === "confirmed" ||
        item.state === "attention" ||
        item.nextAt > Date.now() ||
        item.leaseUntil > Date.now()
      )
        return;
      const load = tx.objectStore("payloads").get(key);
      load.onsuccess = () => {
        const payload: ReportPayload | undefined = load.result;
        if (!payload) return;
        const claimed = {
          ...item,
          state: "sending" as const,
          attempts: item.attempts + 1,
          lease: crypto.randomUUID(),
          leaseUntil: Date.now() + 90000,
        };
        store.put(claimed);
        result = { ...claimed, payload };
      };
    };
    tx.oncomplete = () => {
      db.close();
      changed();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function settleOutgoing(
  item: Outgoing,
  result:
    | { receipt: NonNullable<Outgoing["receipt"]> }
    | { error: string; permanent: boolean },
  /** Cierto cuando quien reportó está mirando la entrega: no hay que anunciarla. */
  seen = false,
) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["reports", "payloads"], "readwrite"),
      store = tx.objectStore("reports"),
      req = store.get(item.key);
    req.onsuccess = () => {
      const latest: Outgoing | undefined = req.result;
      if (!latest || latest.lease !== item.lease) return;
      if ("receipt" in result) {
        const updated = {
          ...latest,
          state: "confirmed" as const,
          receipt: result.receipt,
          bytes: 0,
          leaseUntil: 0,
          seen,
        };
        delete updated.error;
        store.put(updated);
        tx.objectStore("payloads").delete(item.key);
      } else
        store.put({
          ...latest,
          state:
            result.permanent || latest.attempts >= 8 ? "attention" : "queued",
          error: result.error,
          leaseUntil: 0,
          nextAt:
            Date.now() +
            retryDelay(latest.attempts) +
            Math.floor(Math.random() * 1000),
        });
    };
    tx.oncomplete = () => {
      db.close();
      changed();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
/**
 * Las entregas que aún no se han anunciado. Solo cuentan las marcadas
 * expresamente como no vistas: lo guardado antes de existir la marca es
 * historia, no novedad.
 */
export const pendingAnnouncements = (items: Outgoing[]) =>
  items.filter((item) => item.state === "confirmed" && item.seen === false);

/** Da por sabidas las entregas del dueño: la novedad ya se mostró. */
export async function markDeliveriesSeen(owner: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("reports", "readwrite"),
      store = tx.objectStore("reports"),
      req = store.index("owner").getAll(owner);
    req.onsuccess = () => {
      for (const item of pendingAnnouncements(req.result))
        store.put({ ...item, seen: true });
    };
    tx.oncomplete = () => {
      db.close();
      changed();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function retryOutgoing(key: string, owner: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("reports", "readwrite"),
      store = tx.objectStore("reports"),
      req = store.get(key);
    req.onsuccess = () => {
      const item: Outgoing = req.result;
      if (
        item?.owner === owner &&
        item.state !== "confirmed" &&
        item.leaseUntil <= Date.now()
      )
        store.put({
          ...item,
          state: "queued",
          nextAt: 0,
          attempts: 0,
          error: "",
        });
    };
    tx.oncomplete = () => {
      db.close();
      changed();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * El dueño de mentira que lleva lo preparado sin haber entrado.
 *
 * Un reporte hecho sin cuenta no se puede enviar —el servidor exige sesión— y
 * tampoco se puede perder. Va a la bandeja a nombre de nadie, con este dueño,
 * y espera ahí a que la persona entre. La bandeja ya sabe listar por dueño,
 * deduplicar por contenido y respetar sus límites, así que no hace falta otro
 * almacén: hace falta un nombre que no pueda chocar con un identificador de
 * Firebase, que son cadenas de veintitantos caracteres alfanuméricos.
 */
export const SIN_CUENTA = "sin-cuenta";

/**
 * Pasa a otro dueño lo que estaba esperando.
 *
 * Se llama cuando alguien entra después de haber preparado reportes sin cuenta.
 * Devuelve cuántos se traspasaron, para que la pantalla pueda decirlo.
 *
 * **La clave lleva el dueño dentro** (`${owner}:${hash}`), así que traspasar no
 * es cambiar un campo: es escribir la entrada nueva, mover su fotografía y
 * borrar la vieja. Todo en una transacción, porque es el único momento en que
 * un reporte cambia de manos: si se rompiera a medias, el reporte no daría un
 * error, desaparecería.
 *
 * Lo que ya tuviera esa persona se queda: traspasar es añadir, no reemplazar. Y
 * si el mismo contenido ya estaba a su nombre, la clave coincide y se escribe
 * encima, que es la misma deduplicación que hace `enqueue`.
 */
export async function traspasar(de: string, a: string): Promise<number> {
  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(["reports", "payloads"], "readwrite"),
      store = tx.objectStore("reports"),
      cargas = tx.objectStore("payloads"),
      req = store.index("owner").getAll(de);
    let movidos = 0;
    req.onsuccess = () => {
      const entradas: Outgoing[] = req.result;
      movidos = entradas.length;
      for (const entrada of entradas) {
        const clave = `${a}:${entrada.key.slice(de.length + 1)}`;
        const carga = cargas.get(entrada.key);
        carga.onsuccess = () => {
          if (carga.result !== undefined) cargas.put(carga.result, clave);
          cargas.delete(entrada.key);
        };
        store.put({ ...entrada, key: clave, owner: a });
        store.delete(entrada.key);
      }
    };
    tx.oncomplete = () => {
      db.close();
      changed();
      resolve(movidos);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
