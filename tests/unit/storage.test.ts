import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import { sampleCase } from "../fixtures/cases";
import {
  writeDraft,
  readDraft,
  saveLocalCase,
  readLocalCases,
} from "../../src/data/local-store";
import { changeLocalCase } from "../../src/data/local-store";
test("dos escritores con la misma versión no sobrescriben cambios", async () => {
  const item = { ...sampleCase(), id: "LOCAL-race" };
  const command = {
    mutationId: "a",
    expectedVersion: 0,
    status: "en_proceso",
    assignee: "Equipo",
    note: "Revisión de prueba.",
    actor: "Admin demo",
    at: "2026-09-07T12:00:00Z",
  };
  const results = await Promise.allSettled([
    changeLocalCase(item, command),
    changeLocalCase(item, { ...command, mutationId: "b" }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
});

test("confirmar un reporte limpia el borrador y repetir el mismo identificador no duplica", async () => {
  await writeDraft({
    category: "otro",
    vereda: "Prueba",
    description: "Prueba",
    phone: "",
    photos: [],
  });
  const item = { ...sampleCase(), id: "LOCAL-test" };
  await saveLocalCase(item);
  await saveLocalCase(item);
  expect(await readDraft()).toBeUndefined();
  expect((await readLocalCases()).filter((c) => c.id === item.id)).toHaveLength(
    1,
  );
});
