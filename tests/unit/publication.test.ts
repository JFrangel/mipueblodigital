import { it, expect } from "vitest";
import {
  autoPublicationReady,
  publicationReady,
  publicationDelayHours,
} from "../../src/domain/publication";

/**
 * Las dos puertas por las que un reporte llega a la comunidad, y en qué se
 * diferencian. Lo que se juega aquí es privacidad: si una de las dos se abre
 * de más, consta ante los vecinos un reporte que su autora quiso reservado.
 */
it("el resumen revisado se comparte en cuanto se revisa, sin esperar plazo", () => {
  /* El plazo protege lo que consta sin que nadie lo lea. Un resumen escrito a
     mano por el Consejo ya pasó por una persona, así que no espera: hacerlo
     esperar era hacer esperar a la revisión. */
  expect(publicationReady("safe")).toBe(true);
  for (const kind of ["sensitive", "unreviewed", "", "SAFE"])
    expect(publicationReady(kind)).toBe(false);
});

it("la ficha automática sí espera el plazo y se detiene ante lo sensible", () => {
  const date = "2026-09-01T00:00:00Z",
    now = Date.parse(date);
  expect(autoPublicationReady(date, "unreviewed", now + 86399999, 24)).toBe(
    false,
  );
  expect(autoPublicationReady(date, "unreviewed", now + 86400000, 24)).toBe(
    true,
  );
  // Revisado y seguro también consta, claro.
  expect(autoPublicationReady(date, "safe", now + 86400000, 24)).toBe(true);
  // Marcado como sensible no consta nunca, pase el tiempo que pase.
  expect(autoPublicationReady(date, "sensitive", now + 8640000000, 24)).toBe(
    false,
  );
  // Una fecha corrupta no abre la puerta.
  expect(autoPublicationReady("ayer", "unreviewed", now, 24)).toBe(false);
});

it("sin revisión no hay resumen, aunque el plazo ya haya pasado", () => {
  const date = "2026-09-01T00:00:00Z",
    now = Date.parse(date) + 86400000;
  expect(autoPublicationReady(date, "unreviewed", now, 24)).toBe(true);
  expect(publicationReady("unreviewed")).toBe(false);
});

it("configuración inválida no acorta el plazo de la ficha automática", () => {
  for (const input of [undefined, "0", "-1", "oops", "Infinity"])
    expect(publicationDelayHours(input)).toBe(24);
});
