/**
 * Exportación a hoja de cálculo.
 *
 * Dos decisiones que deciden si el archivo se abre bien o queda inservible:
 *
 * - El separador es punto y coma. Es lo que espera Excel en configuración
 *   regional española; con coma vuelca las cinco columnas dentro de una sola y
 *   el archivo parece roto aunque esté bien formado.
 * - Toda celda va entrecomillada y las que empiezan por «=», «+», «@» o «-» se
 *   prefijan con un apóstrofo. Sin eso, un título que empiece por «=» se
 *   ejecuta como fórmula al abrirlo: es la vía clásica para colar una orden en
 *   la máquina de quien recibe el archivo.
 */
export const csvSeparator = ";";

/** Quote cells and neutralize spreadsheet formulas in user-controlled fields. */
export function csvCell(value: string): string {
  const safe =
    /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value)
      ? "'" + value
      : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

/** Una fila completa, ya escapada y unida por el separador que Excel espera. */
export const csvRow = (cells: (string | number)[]) =>
  cells.map((cell) => csvCell(String(cell))).join(csvSeparator);
