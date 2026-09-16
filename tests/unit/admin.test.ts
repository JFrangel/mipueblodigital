import { expect, test } from "vitest";
import { sampleCase } from "../fixtures/cases";
import { applyCaseChange } from "../../src/domain/admin";
const command = {
  mutationId: "change-1",
  expectedVersion: 0,
  status: "en_proceso",
  assignee: "Equipo técnico",
  note: "Visita acordada con la comunidad.",
  actor: "Administrador de demo",
  at: "2026-09-07T12:00:00Z",
};
test("registra cambio y repetir operación no duplica historial", () => {
  const result = applyCaseChange(sampleCase(), command);
  expect(result.version).toBe(1);
  expect(result.events).toHaveLength(1);
  expect(applyCaseChange(result, command)).toEqual(result);
});
test("rechaza versión antigua y notas de más de 30 palabras", () => {
  const result = applyCaseChange(sampleCase(), command);
  expect(() =>
    applyCaseChange(result, { ...command, mutationId: "change-2" }),
  ).toThrow(/actualizado/);
  expect(() =>
    applyCaseChange(sampleCase(), {
      ...command,
      note: Array(31).fill("palabra").join(" "),
    }),
  ).toThrow(/30/);
});
