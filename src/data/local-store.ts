import type { Case } from "./catalog";
import { applyCaseChange, type CaseChange } from "../domain/admin";
export async function changeLocalCase(
  fallback: Case,
  command: CaseChange,
): Promise<Case> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cases", "readwrite");
    const store = tx.objectStore("cases");
    const request = store.get(fallback.id);
    let result: Case;
    let failure: unknown;
    request.onsuccess = () => {
      try {
        result = applyCaseChange(request.result ?? fallback, command);
        store.put(result);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = () => {
      db.close();
      reject(failure ?? tx.error ?? new Error("No se pudo guardar el cambio."));
    };
  });
}
const ALMACEN = "mi-pueblo";
/** Como se llamó mientras la aplicación guardaba reportes fabricados. */
const ANTERIOR = "mi-pueblo-demo";

function abrir(nombre: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(nombre, version);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("cases"))
        req.result.createObjectStore("cases", { keyPath: "id" });
      if (!req.result.objectStoreNames.contains("drafts"))
        req.result.createObjectStore("drafts");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const leerTodo = (db: IDBDatabase, almacen: string) =>
  new Promise<Array<{ clave: IDBValidKey; valor: unknown }>>(
    (resolve, reject) => {
      const tx = db.transaction(almacen, "readonly");
      const store = tx.objectStore(almacen);
      const claves = store.getAllKeys();
      const valores = store.getAll();
      tx.oncomplete = () =>
        resolve(
          claves.result.map((clave, i) => ({
            clave,
            valor: valores.result[i],
          })),
        );
      tx.onerror = () => reject(tx.error);
    },
  );

/**
 * El traslado desde el nombre viejo.
 *
 * La base se llamaba `mi-pueblo-demo`, y ese nombre se lee en el inspector del
 * navegador: la aplicación va a producción y no puede seguir diciendo de sí
 * misma que es una demostración.
 *
 * Se **copia** y luego se borra la vieja, en ese orden. Aquí vive lo único
 * irrecuperable de todo el sistema: los borradores y los reportes que todavía
 * no han salido de este teléfono. Un cambio de nombre a secas los perdería, y
 * son justamente los de quien reportó sin señal.
 *
 * Corre una vez por aparato. Si el borrado no puede —otra pestaña la tiene
 * abierta— no pasa nada: lo copiado ya está, y se reintenta en la próxima
 * visita.
 */
let trasladado: Promise<void> | null = null;
function trasladar(): Promise<void> {
  trasladado ??= (async () => {
    const bases = await indexedDB.databases?.().catch(() => []);
    if (bases && !bases.some((b) => b.name === ANTERIOR)) return;
    const vieja = await abrir(ANTERIOR, 2);
    const cases = await leerTodo(vieja, "cases");
    const drafts = await leerTodo(vieja, "drafts");
    vieja.close();
    if (cases.length || drafts.length) {
      const nueva = await abrir(ALMACEN, 1);
      await new Promise<void>((resolve, reject) => {
        const tx = nueva.transaction(["cases", "drafts"], "readwrite");
        for (const { valor } of cases) tx.objectStore("cases").put(valor);
        for (const { clave, valor } of drafts)
          tx.objectStore("drafts").put(valor, clave);
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
      nueva.close();
    }
    indexedDB.deleteDatabase(ANTERIOR);
  })().catch(() => undefined);
  return trasladado;
}

async function openDb(): Promise<IDBDatabase> {
  await trasladar();
  return abrir(ALMACEN, 1);
}
/**
 * Lo guardado en este aparato, de quien está dentro.
 *
 * Devolvía todo a cualquiera: quien entrara después en el mismo teléfono veía
 * en «Mis reportes» los de quien estuvo antes, con su relato y su fotografía.
 * En un territorio donde el teléfono se presta, eso es una filtración.
 *
 * Cada cuenta ve lo que ella guardó, y nada más. Los registros de versiones
 * anteriores no llevan firma y **no se reclaman**: probé a dárselos a la
 * primera cuenta que entrara y eso es transferir en silencio los reportes de
 * alguien. Se ven sin sesión, que es el estado en el que se escribieron, y
 * quien los envió los recupera igual del servidor, que es donde está la copia
 * que cuenta.
 */
export async function readLocalCases(owner?: string | null): Promise<Case[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cases", "readonly");
    const req = tx.objectStore("cases").getAll();
    req.onsuccess = () =>
      resolve(
        (req.result as Case[]).filter((item) =>
          owner ? item.account === owner : !item.account,
        ),
      );
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
/**
 * Quitar un reporte del espejo local.
 *
 * El listado de este dispositivo es una copia de lo que uno envió, no el
 * expediente: borrar aquí no cancela un envío ni toca lo que el Consejo ya
 * recibió. Hacía falta porque hubo una versión que guardaba reportes de
 * demostración sin enviarlos, y esos quedaron contando en las cifras de quien
 * los creó sin forma ninguna de sacarlos.
 */
/**
 * Cerrar el viaje de un reporte que salió de la bandeja.
 *
 * El espejo local se escribía una vez, al reportar, y ahí se quedaba: un
 * reporte hecho sin señal seguía diciendo «esperando señal» meses después de
 * haber llegado al Consejo. Lo llama el vaciado de la bandeja, que es el único
 * que sabe cuándo llegó de verdad.
 */
export async function markCaseDelivered(
  id: string,
  receivedAt: string,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cases", "readwrite");
    const store = tx.objectStore("cases");
    const request = store.get(id);
    request.onsuccess = () => {
      const item: Case | undefined = request.result;
      if (!item) return;
      store.put({
        ...item,
        delivery: "enviado",
        notes: [
          ...item.notes.filter((note) => !note.startsWith("En la bandeja")),
          `Recibido por el Consejo el ${new Date(receivedAt).toLocaleString("es-CO")}.`,
        ],
      });
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function removeLocalCase(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cases", "readwrite");
    tx.objectStore("cases").delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function saveLocalCase(item: Case): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["cases", "drafts"], "readwrite");
    tx.objectStore("cases").put(item);
    /* El borrador que se va es el de quien guarda. Borraba «current» a secas,
       que es la clave de quien no ha entrado: desde que los borradores son por
       cuenta, a quien sí había entrado no le borraba el suyo. No se notaba
       porque el formulario lo limpia aparte al terminar de enviar, pero
       entonces esto no hacía nada y aquello era el único sitio que funcionaba. */
    tx.objectStore("drafts").delete(
      item.account ? `owner:${item.account}` : "current",
    );
    tx.oncomplete = () => {
      db.close();
      draftChanged();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export type LocalDraft = {
  category: string;
  vereda: string;
  description: string;
  phone: string;
  photos: string[];
  sensitive?: boolean;
  /* Punto marcado a mano sobre el mapa. Va con el borrador porque ubicarlo es
     el trabajo más difícil de rehacer: exige acordarse del sitio exacto. */
  lat?: number;
  lng?: number;
  /* De dónde salió el punto. Un borrador de una versión anterior no lo trae, y
     entonces vale «mano»: no saberlo **no puede** leerse como que lo puso un
     GPS, porque de ahí sale después dónde se sitúa una vereda entera. */
  pointSource?: "aparato" | "mano";
  pointAccuracy?: number | null;
};
/**
 * Un borrador guardado por cualquier versión anterior, leído sin confiar.
 *
 * Lo que hay aquí lo escribió una versión de la aplicación que puede no ser
 * esta: el borrador sobrevive a las actualizaciones y al cambio de nombre de la
 * base. Uno sin `photos` —que existió— hacía `photos.length` y se llevaba por
 * delante la pantalla entera, no solo la tarjeta del borrador. Un dato viejo no
 * puede tumbar una pantalla: se completa con lo que falte y se sigue.
 */
const comoBorrador = (valor: unknown): LocalDraft | undefined => {
  if (!valor || typeof valor !== "object") return undefined;
  const v = valor as Record<string, unknown>;
  const texto = (campo: unknown) => (typeof campo === "string" ? campo : "");
  const numero = (campo: unknown) =>
    typeof campo === "number" ? campo : undefined;
  return {
    category: texto(v.category),
    vereda: texto(v.vereda),
    description: texto(v.description),
    phone: texto(v.phone),
    photos: Array.isArray(v.photos)
      ? v.photos.filter((foto): foto is string => typeof foto === "string")
      : [],
    sensitive: v.sensitive === true,
    lat: numero(v.lat),
    lng: numero(v.lng),
    pointSource: v.pointSource === "aparato" ? "aparato" : "mano",
    pointAccuracy: numero(v.pointAccuracy),
  };
};

export async function readDraft(
  owner?: string,
): Promise<LocalDraft | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readonly");
    const req = tx
      .objectStore("drafts")
      .get(owner ? `owner:${owner}` : "current");
    req.onsuccess = () => resolve(comoBorrador(req.result));
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
/** El borrador dejó de estar escondido en el formulario: quien lo muestre en
    otra pantalla necesita enterarse de que cambió. */
function draftChanged() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("draft-change"));
}
export async function writeDraft(
  draft: LocalDraft | null,
  owner?: string,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    const key = owner ? `owner:${owner}` : "current";
    if (draft) tx.objectStore("drafts").put(draft, key);
    else tx.objectStore("drafts").delete(key);
    tx.oncomplete = () => {
      db.close();
      draftChanged();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
