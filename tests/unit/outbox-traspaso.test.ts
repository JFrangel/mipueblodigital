import { beforeEach, expect, it } from "vitest";
import "fake-indexeddb/auto";

/**
 * Pasar a tu nombre lo que preparaste sin cuenta.
 *
 * Quien llena un reporte sin haber entrado no lo pierde: queda en la bandeja a
 * nombre de nadie, esperando. Al entrar, esas entradas tienen que pasar a ser
 * suyas —con su clave nueva, porque la clave lleva el dueño dentro— y salir con
 * la siguiente sincronización.
 *
 * Lo que estas pruebas sostienen es que ese traspaso **no pierda ni duplique**.
 * Es el único momento en que un reporte cambia de dueño, y si se rompe aquí el
 * reporte no se cae con un error: desaparece.
 */
import {
  SIN_CUENTA,
  enqueue,
  outgoingFor,
  readPayload,
  traspasar,
} from "../../src/data/outbox";

const reporte = (description: string) => ({
  requestId: `11111111-1111-4111-8111-${description.length}`.padEnd(36, "0"),
  category: "infraestructura",
  vereda: "Bellavista",
  description,
  phone: "",
  photo: "Zm90bw==",
  sensitive: false,
});

beforeEach(async () => {
  /* Cada prueba con su base: fake-indexeddb conserva lo escrito entre una y
     otra, y una bandeja heredada haría pasar pruebas que no deberían. */
  await new Promise<void>((listo) => {
    const req = indexedDB.deleteDatabase("mi-pueblo-outbox");
    req.onsuccess = () => listo();
    req.onerror = () => listo();
    req.onblocked = () => listo();
  });
});

it("lo preparado sin cuenta pasa a nombre de quien entra", async () => {
  await enqueue(SIN_CUENTA, reporte("El muelle está partido"));
  await enqueue(SIN_CUENTA, reporte("Se cayó el poste de la esquina"));

  expect(await traspasar(SIN_CUENTA, "ana")).toBe(2);

  const suyos = await outgoingFor("ana");
  expect(suyos).toHaveLength(2);
  expect(await outgoingFor(SIN_CUENTA)).toEqual([]);
  /* La clave lleva el dueño dentro: si no se reescribiera, el envío saldría a
     nombre equivocado o no saldría. */
  expect(suyos.every((e) => e.key.startsWith("ana:"))).toBe(true);
  expect(suyos.every((e) => e.owner === "ana")).toBe(true);
});

/* La fotografía vive aparte de los metadatos. Mover uno y olvidar la otra deja
   un envío que no se puede transmitir: lo peor de las dos opciones. */
it("la fotografía viaja con su reporte", async () => {
  await enqueue(SIN_CUENTA, reporte("Derrumbe en la vía"));
  await traspasar(SIN_CUENTA, "ana");

  const [suyo] = await outgoingFor("ana");
  const carga = await readPayload(suyo.key);
  expect(carga?.description).toBe("Derrumbe en la vía");
  expect(carga?.photo).toBe("Zm90bw==");
});

/* Sin nada que traspasar no se toca nada, y se dice con un cero. */
it("sin nada esperando devuelve cero", async () => {
  expect(await traspasar(SIN_CUENTA, "ana")).toBe(0);
  expect(await outgoingFor("ana")).toEqual([]);
});

/* Lo que esa persona ya tenía en su bandeja sigue ahí. Traspasar es añadir, no
   reemplazar. */
it("no se lleva por delante lo que ya tenía", async () => {
  await enqueue("ana", reporte("Lo que ya tenía preparado"));
  await enqueue(SIN_CUENTA, reporte("Lo que preparó sin entrar"));

  await traspasar(SIN_CUENTA, "ana");

  const suyos = await outgoingFor("ana");
  expect(suyos).toHaveLength(2);
  const relatos = new Set(
    await Promise.all(
      suyos.map(async (e) => (await readPayload(e.key))?.description),
    ),
  );
  expect(relatos).toEqual(
    new Set(["Lo que ya tenía preparado", "Lo que preparó sin entrar"]),
  );
});

/* El mismo reporte preparado dos veces sin cuenta es uno solo: la bandeja
   deduplica por el contenido, y eso tiene que seguir valiendo tras el
   traspaso. */
it("un reporte repetido no se duplica al traspasar", async () => {
  await enqueue(SIN_CUENTA, reporte("El mismo relato"));
  await enqueue(SIN_CUENTA, reporte("El mismo relato"));
  expect(await outgoingFor(SIN_CUENTA)).toHaveLength(1);

  await traspasar(SIN_CUENTA, "ana");
  expect(await outgoingFor("ana")).toHaveLength(1);
});
