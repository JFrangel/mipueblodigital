import { describe, expect, it, test } from "vitest";
import { bogotaDay, spokenDay, weekdayLoad, monthDays } from "../../src/domain/calendar";
test("el día se calcula en Bogotá, no UTC", () =>
  expect(bogotaDay("2026-09-07T02:00:00Z")).toBe("2026-09-06"));
test("febrero bisiesto tiene 29 días", () =>
  expect(monthDays(2024, 1).filter(Boolean)).toHaveLength(29));

describe("cuándo reporta la comunidad", () => {
  it("reparte por día de la semana empezando el lunes", () => {
    // 2026-09-07 fue lunes; 2026-09-13, domingo.
    const semana = weekdayLoad([
      "2026-09-07",
      "2026-09-07",
      "2026-09-13",
      "2026-09-09",
    ]);
    expect(semana.map((d) => d.short)).toEqual(["L", "M", "X", "J", "V", "S", "D"]);
    expect(semana[0].total).toBe(2);
    expect(semana[2].total).toBe(1);
    expect(semana[6].total).toBe(1);
  });

  it("mide cada día contra el más movido, no contra el total", () => {
    const [lunes, , miercoles] = weekdayLoad([
      "2026-09-07",
      "2026-09-07",
      "2026-09-09",
    ]);
    expect(lunes.share).toBe(1);
    expect(miercoles.share).toBe(0.5);
  });

  it("sin reportes no divide por cero", () => {
    expect(weekdayLoad([]).every((d) => d.share === 0)).toBe(true);
  });

  it("descarta fechas que no lo son en vez de contarlas mal", () => {
    expect(weekdayLoad(["", "no-es-fecha"]).every((d) => !d.total)).toBe(true);
  });
});

describe("la fecha como se dice en voz alta", () => {
  it("escribe el día con su nombre y no el formato de la base", () => {
    // Mayúscula solo en la primera letra: en español el resto va en minúscula.
    expect(spokenDay("2026-09-06")).toBe("Domingo, 6 de septiembre");
  });

  it("devuelve lo recibido si no es una fecha", () => {
    expect(spokenDay("mañana")).toBe("mañana");
  });
});
