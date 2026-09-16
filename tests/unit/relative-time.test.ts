import { describe, expect, it } from "vitest";
import { exactTime, relativeTime } from "../../src/domain/relative-time";

const ahora = Date.parse("2026-09-14T15:00:00Z");
const hace = (ms: number) => new Date(ahora - ms).toISOString();

describe("antigüedad de un aviso", () => {
  it("dice los tramos cortos en palabras", () => {
    expect(relativeTime(hace(20_000), ahora)).toBe("hace un momento");
    expect(relativeTime(hace(60_000), ahora)).toBe("hace 1 minuto");
    expect(relativeTime(hace(25 * 60_000), ahora)).toBe("hace 25 minutos");
    expect(relativeTime(hace(3 * 3_600_000), ahora)).toBe("hace 3 horas");
    expect(relativeTime(hace(24 * 3_600_000), ahora)).toBe("ayer");
    expect(relativeTime(hace(3 * 24 * 3_600_000), ahora)).toBe("hace 3 días");
  });

  it("pasada una semana vuelve al calendario", () => {
    // «Hace 43 días» no ayuda a nadie a situar un aviso.
    const viejo = relativeTime(hace(43 * 24 * 3_600_000), ahora);
    expect(viejo).toMatch(/2026/);
    expect(viejo).not.toContain("hace");
  });

  it("una fecha del futuro no produce «hace -2 minutos»", () => {
    expect(relativeTime(new Date(ahora + 120_000).toISOString(), ahora)).toBe(
      "ahora",
    );
  });

  it("una fecha ilegible no rompe la lista", () => {
    expect(relativeTime("mañana", ahora)).toBe("");
    expect(exactTime("mañana")).toBe("");
  });

  it("la fecha exacta se conserva para el título", () => {
    expect(exactTime("2026-09-14T15:00:00Z")).toContain("2026");
  });
});
