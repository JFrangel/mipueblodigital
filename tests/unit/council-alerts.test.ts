import { expect, it } from "vitest";
import { summarize, type Countable } from "../../src/domain/aggregate";
import { alertsFor } from "../../src/domain/council-alerts";

/**
 * Los avisos de la bandeja.
 *
 * Vienen del proyecto anterior, con los umbrales bajados a la escala de este
 * río. Lo que se prueba aquí es sobre todo lo contrario de lo que suele
 * probarse: que **no** salten cuando el dato no los sostiene. Un aviso que
 * salta siempre deja de leerse a la semana, y entonces no salta ninguno.
 */
const hoy = Date.parse("2026-09-15T12:00:00Z");
const caso = (over: Partial<Countable> = {}): Countable => ({
  status: "pendiente",
  category: "infraestructura",
  vereda: "Bellavista",
  priority: "media",
  assignee: "Equipo",
  date: "2026-09-14T12:00:00Z",
  ...over,
});
const avisos = (items: Countable[]) =>
  alertsFor(summarize(items, hoy)).map((a) => a.id);

it("lo que no tiene dueño va primero y es lo único accionable hoy", () => {
  const lista = alertsFor(summarize([caso({ assignee: "" })], hoy));
  expect(lista[0].id).toBe("sin-responsable");
  expect(lista[0].text).toContain("se arregla hoy mismo");
});

it("un plazo vencido se señala con su prioridad", () => {
  const lista = avisos([
    caso({ priority: "critica", date: "2026-09-01T12:00:00Z" }),
  ]);
  expect(lista).toContain("plazo");
  expect(lista).toContain("vereda");
});

it("no habla de proporciones con un conjunto diminuto", () => {
  /* Tres casos abiertos de tres son el cien por cien, y no significan nada:
     el aviso de acumulación exige un conjunto que lo sostenga. */
  expect(avisos([caso(), caso(), caso()])).not.toContain("acumulacion");
  const nueve = Array.from({ length: 9 }, (_, i) =>
    caso({ status: i < 4 ? "pendiente" : "solucionado" }),
  );
  expect(avisos(nueve)).toContain("acumulacion");
});

it("cuando no hay nada que señalar, lo dice", () => {
  const lista = alertsFor(summarize([caso({ status: "solucionado" })], hoy));
  expect(lista[0].id).toBe("al-dia");
  expect(lista.every((a) => a.level === "bien")).toBe(true);
});

it("una categoría que se cierra bien se señala para copiarla", () => {
  const cinco = Array.from({ length: 5 }, () =>
    caso({ status: "solucionado" }),
  );
  const lista = alertsFor(summarize(cinco, hoy));
  expect(lista.map((a) => a.id)).toContain("destacada");
  /* Y con menos de cinco no: una racha de tres no es un proceso. */
  expect(avisos([caso({ status: "solucionado" })])).not.toContain("destacada");
});
