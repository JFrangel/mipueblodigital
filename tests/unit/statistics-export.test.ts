import { expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { ApiError } from "../../src/server/admin-auth";
import {
  consumeExportTicket,
  mintExportTicket,
} from "../../src/server/export-tickets";

/**
 * El billete de exportación de estadísticas.
 *
 * Lo que sostiene esta prueba no es que el archivo se guarde —eso lo hace
 * Firestore— sino las tres condiciones que hacen que un billete no sea una
 * puerta abierta: que sirve una sola vez, que caduca, y que nunca acepta un
 * contenido fuera de lo que este mecanismo existe para entregar. Sin la
 * tercera, cualquier ruta de la aplicación podría usarlo para colar cualquier
 * cosa al navegador del sistema con el pretexto de «exportar estadísticas».
 */

/** Un doble que solo entiende `doc().create()` y una transacción de
 *  lectura+borrado sobre el mismo mapa: es todo lo que usa este módulo. */
function firestore(ahora: number) {
  const store = new Map<string, Record<string, unknown>>();
  return {
    doc: (path: string) => ({
      path,
      create: async (data: Record<string, unknown>) => {
        store.set(path, data);
      },
    }),
    runTransaction: async (
      fn: (tx: {
        get: (ref: { path: string }) => Promise<{
          data: () => Record<string, unknown> | undefined;
        }>;
        delete: (ref: { path: string }) => void;
      }) => unknown,
    ) =>
      fn({
        get: async (ref) => ({ data: () => store.get(ref.path) }),
        delete: (ref) => store.delete(ref.path),
      }),
    _ahora: ahora,
  } as unknown as Firestore;
}

it("lo que se acuña se puede recoger una vez, y ya no una segunda", async () => {
  vi.setSystemTime(1_700_000_000_000);
  const db = firestore(Date.now());
  const ticket = await mintExportTicket(db, {
    uid: "ana",
    contentType: "text/csv;charset=utf-8",
    filename: "mi-pueblo-reportes.csv",
    body: "a;b\r\n1;2",
  });
  expect(await consumeExportTicket(db, ticket)).toEqual({
    contentType: "text/csv;charset=utf-8",
    filename: "mi-pueblo-reportes.csv",
    body: "a;b\r\n1;2",
  });
  expect(await consumeExportTicket(db, ticket)).toBeNull();
  vi.useRealTimers();
});

it("un billete de más de quince minutos ya no sirve", async () => {
  vi.setSystemTime(1_700_000_000_000);
  const db = firestore(Date.now());
  const ticket = await mintExportTicket(db, {
    uid: "ana",
    contentType: "text/html;charset=utf-8",
    filename: "informe.html",
    body: "<html></html>",
  });
  vi.setSystemTime(1_700_000_000_000 + 16 * 60 * 1000);
  expect(await consumeExportTicket(db, ticket)).toBeNull();
  vi.useRealTimers();
});

it("un formato de billete que no es el que se acuña no consulta nada", async () => {
  const db = firestore(Date.now());
  expect(await consumeExportTicket(db, "cualquier-cosa")).toBeNull();
});

it("un tipo de exportación fuera de la lista se rechaza al acuñar", async () => {
  const db = firestore(Date.now());
  await expect(
    mintExportTicket(db, {
      uid: "ana",
      contentType: "application/pdf",
      filename: "a.pdf",
      body: "x",
    }),
  ).rejects.toThrow(ApiError);
});

it("un nombre de archivo con caracteres fuera del patrón se rechaza", async () => {
  const db = firestore(Date.now());
  await expect(
    mintExportTicket(db, {
      uid: "ana",
      contentType: "text/csv;charset=utf-8",
      filename: "../../etc/passwd",
      body: "x",
    }),
  ).rejects.toThrow(ApiError);
});

it("un cuerpo que no cabe en un documento de Firestore se rechaza", async () => {
  const db = firestore(Date.now());
  await expect(
    mintExportTicket(db, {
      uid: "ana",
      contentType: "text/csv;charset=utf-8",
      filename: "grande.csv",
      body: "x".repeat(1_000_000),
    }),
  ).rejects.toThrow(ApiError);
});
