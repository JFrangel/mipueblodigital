import { describe, expect, it } from "vitest";
import { summarize } from "../../src/domain/aggregate";
import {
  managementMetrics,
  waitingCases,
} from "../../src/domain/management-metrics";
import { sampleCase } from "../fixtures/cases";
it("no inventa tiempos de solución sin eventos y excluye cerrados de carga abierta", () => {
  const result = managementMetrics([
    { ...sampleCase(), status: "solucionado", events: [] },
    { ...sampleCase(), status: "escalado", assignee: "" },
  ]);
  expect(result).toEqual({
    open: 1,
    unassigned: 1,
    escalated: 1,
    timedSolutions: 0,
    medianHours: null,
    // Sin el día del navegador no hay espera que calcular.
    medianWait: null,
    longestWait: null,
  });
});
it("calcula mediana usando fechas de solución verificables", () => {
  const items = [2, 8].map((hours) => ({
    ...sampleCase(),
    date: "2026-09-01T00:00:00Z",
    status: "solucionado",
    events: [
      {
        id: String(hours),
        status: "solucionado",
        assignee: "equipo",
        note: "revisado",
        actor: "admin",
        at: `2026-09-01T0${hours}:00:00Z`,
      },
    ],
  }));
  expect(managementMetrics(items).medianHours).toBe(5);
});

const caso = (id: string, status: string, date: string) => ({
  ...sampleCase(),
  id,
  status,
  date,
  events: [],
});

describe("cuánto lleva esperando lo que sigue abierto", () => {
  it("ordena de más a menos espera y cuenta días enteros", () => {
    const espera = waitingCases(
      [
        caso("B", "pendiente", "2026-09-10T15:00:00Z"),
        caso("A", "en_proceso", "2026-09-01T15:00:00Z"),
      ],
      "2026-09-14",
    );
    expect(espera.map((w) => [w.item.id, w.days])).toEqual([
      ["A", 13],
      ["B", 4],
    ]);
  });

  it("deja fuera lo ya decidido, que no espera a nadie", () => {
    const espera = waitingCases(
      [
        caso("A", "solucionado", "2026-09-01T15:00:00Z"),
        caso("B", "descartado", "2026-09-01T15:00:00Z"),
        caso("C", "no_solucionado", "2026-09-01T15:00:00Z"),
        caso("D", "bloqueado_conflicto", "2026-09-01T15:00:00Z"),
      ],
      "2026-09-14",
    );
    // Bloqueado por conflicto sigue esperando: nadie le ha dado respuesta.
    expect(espera.map((w) => w.item.id)).toEqual(["D"]);
  });

  it("un escalado sigue contando: cambió de escritorio, no de espera", () => {
    const espera = waitingCases(
      [caso("A", "escalado", "2026-09-01T15:00:00Z")],
      "2026-09-14",
    );
    expect(espera).toHaveLength(1);
  });

  it("sin el día del navegador no inventa una espera", () => {
    expect(waitingCases([caso("A", "pendiente", "2026-09-01T15:00:00Z")], ""))
      .toEqual([]);
    const sinDia = managementMetrics([
      caso("A", "pendiente", "2026-09-01T15:00:00Z"),
    ]);
    expect(sinDia.medianWait).toBeNull();
    expect(sinDia.longestWait).toBeNull();
  });

  it("la mediana de espera resume la cola sin depender de un caso extremo", () => {
    const metricas = managementMetrics(
      [
        caso("A", "pendiente", "2026-09-13T15:00:00Z"),
        caso("B", "pendiente", "2026-09-11T15:00:00Z"),
        caso("C", "pendiente", "2026-06-01T15:00:00Z"),
      ],
      "2026-09-14",
    );
    expect(metricas.medianWait).toBe(3);
    expect(metricas.longestWait).toBe(105);
  });

  it("una fecha futura no produce una espera negativa", () => {
    const [espera] = waitingCases(
      [caso("A", "pendiente", "2026-09-20T15:00:00Z")],
      "2026-09-14",
    );
    expect(espera.days).toBe(0);
  });
});

/**
 * Las cifras cruzadas del Consejo.
 *
 * Un conteo por dimensión dice cuánto hay; cruzarlas dice dónde se atasca, que
 * es la pregunta de una reunión. Y donde el dato no sostiene una medida —cinco
 * cierres para una media— se dice que no la hay en vez de inventarla.
 */
it("cruza vereda, categoría y plazo, y calla la media cuando no hay con qué", () => {
  const hoy = Date.parse("2026-09-15T12:00:00Z");
  const caso = (over: Record<string, unknown>) => ({
    status: "pendiente",
    category: "infraestructura",
    vereda: "Bellavista",
    priority: "media",
    date: "2026-09-14T12:00:00Z",
    ...over,
  });
  const a = summarize(
    [
      caso({ priority: "critica", date: "2026-09-10T12:00:00Z" }),
      caso({ vereda: "Codemaco", status: "solucionado" }),
      caso({ vereda: "Codemaco" }),
    ],
    hoy,
  );
  /* Bellavista tiene el urgente; Codemaco, más volumen pero menos riesgo. */
  const bellavista = a.veredaPerformance.find((v) => v.vereda === "Bellavista");
  expect(bellavista).toMatchObject({ total: 1, open: 1, urgent: 1, rate: 0 });
  const codemaco = a.veredaPerformance.find((v) => v.vereda === "Codemaco");
  expect(codemaco).toMatchObject({ total: 2, open: 1, urgent: 0, rate: 50 });
  /* Una crítica de cinco días pasó su plazo de un día. */
  const critica = a.sla.find((row) => row.priority === "Crítica");
  expect(critica).toMatchObject({ target: 1, open: 1, late: 1 });
  /* Un solo cierre no da una media. */
  expect(a.resolution).toBeNull();
  expect(a.categoryStates[0]).toMatchObject({
    category: "Infraestructura",
    total: 3,
    pending: 2,
    solved: 1,
  });
});
