import type { Page } from "@playwright/test";
import type { Case } from "../../src/data/catalog";
import { sampleCases } from "../fixtures/cases";

/**
 * Siembra expedientes en el almacén local del navegador.
 *
 * La aplicación ya no trae reportes fabricados: lo que muestra es lo que la
 * comunidad guardó en el dispositivo. Por eso las pruebas que necesitan datos
 * los plantan por ese mismo camino en lugar de depender de un conjunto que
 * viaje dentro del producto; de paso, así ejercitan el trayecto real.
 *
 * Se escribe después de abrir una página y antes de navegar a la que se va a
 * probar: la escritura es asíncrona, y hacerlo en un guion de arranque dejaría
 * una carrera contra la primera lectura de la aplicación.
 */
export async function seedCases(page: Page, cases: Case[] = sampleCases()) {
  await page.goto("/inicio/");
  await page.evaluate(
    (items) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("mi-pueblo", 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("cases"))
            db.createObjectStore("cases", { keyPath: "id" });
          if (!db.objectStoreNames.contains("drafts"))
            db.createObjectStore("drafts");
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("cases", "readwrite");
          const store = tx.objectStore("cases");
          for (const item of items) store.put(item);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        request.onerror = () => reject(request.error);
      }),
    cases,
  );
}
