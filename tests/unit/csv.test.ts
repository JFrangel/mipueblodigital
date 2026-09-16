import { expect, test } from "vitest";
import { csvCell, csvRow, csvSeparator } from "../../src/domain/csv";
test("CSV conserva comillas y neutraliza fórmulas", () => {
  expect(csvCell('Río "Satinga"')).toBe('"Río ""Satinga"""');
  expect(csvCell(" =1+1")).toBe('"\' =1+1"');
  expect(csvCell("normal")).toBe('"normal"');
});

test("la fila usa punto y coma, que es lo que Excel en español espera", () => {
  expect(csvSeparator).toBe(";");
  expect(csvRow(["MPD-0248", "Alumbrado", 12])).toBe(
    '"MPD-0248";"Alumbrado";"12"',
  );
});
test("un punto y coma dentro del texto no parte la fila en dos", () => {
  // Va entrecomillado, así que la hoja de cálculo lo lee como una sola celda.
  expect(csvRow(["Muelle; orilla norte", "Bellavista"])).toBe(
    '"Muelle; orilla norte";"Bellavista"',
  );
});
test("una celda vacía se conserva como celda, no desaparece", () => {
  expect(csvRow(["A", "", "B"])).toBe('"A";"";"B"');
});
