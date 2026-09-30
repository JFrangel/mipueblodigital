import { it, expect } from "vitest";
import {
  reviewedPublicationReady,
  publicationReady,
  publicationDelayHours,
} from "../../src/domain/publication";

/**
 * Las dos puertas por las que un reporte llega a la comunidad, y en qué se
 * diferencian. Lo que se juega aquí es privacidad: si una de las dos se abre
 * de más, consta ante los vecinos un reporte que su autora quiso reservado.
 */
it("solo una clasificación segura permite aprobar un resumen", () => {
  expect(publicationReady("safe")).toBe(true);
  for (const kind of ["sensitive", "unreviewed", "", "SAFE"])
    expect(publicationReady(kind)).toBe(false);
});

it("el resumen revisado espera 24 horas y se detiene ante lo sensible", () => {
  const date = "2026-09-01T00:00:00Z",
    now = Date.parse(date);
  expect(reviewedPublicationReady(date, "safe", now + 86399999, 24)).toBe(
    false,
  );
  expect(reviewedPublicationReady(date, "safe", now + 86400000, 24)).toBe(true);
  expect(reviewedPublicationReady(date, "unreviewed", now + 86400000, 24)).toBe(
    false,
  );
  expect(
    reviewedPublicationReady(date, "sensitive", now + 8640000000, 24),
  ).toBe(false);
  // Una fecha corrupta no abre la puerta.
  expect(reviewedPublicationReady("ayer", "safe", now, 24)).toBe(false);
});

it("sin revisión no hay resumen, aunque el plazo ya haya pasado", () => {
  const date = "2026-09-01T00:00:00Z",
    now = Date.parse(date) + 86400000;
  expect(reviewedPublicationReady(date, "unreviewed", now, 24)).toBe(false);
  expect(publicationReady("unreviewed")).toBe(false);
});

it("configuración inválida no acorta el plazo de la ficha automática", () => {
  for (const input of [undefined, "0", "-1", "oops", "Infinity"])
    expect(publicationDelayHours(input)).toBe(24);
});
