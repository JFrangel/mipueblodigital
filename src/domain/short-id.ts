/**
 * El identificador que se enseña.
 *
 * El del servidor es un sha256 de 64 caracteres. Sirve para lo suyo —que un
 * reenvío no cree dos expedientes— pero nadie lo lee, nadie lo apunta y desde
 * luego nadie lo dicta por radio. En pantalla ocupaba más que el título del
 * reporte.
 *
 * Se muestran los primeros ocho en mayúsculas: siguen siendo cuatro mil
 * millones de combinaciones, de sobra para un río. El buscador compara por
 * coincidencia parcial, así que buscar el corto encuentra el expediente, y el
 * completo sigue estando a un toque en el atributo `title`.
 *
 * Los identificadores que ya eran legibles —los que trae un expediente con
 * código propio— se dejan tal cual: acortarlos sería estropearlos.
 */
export function shortId(id: string) {
  const core = id.replace(/^LOCAL-/, "").split(":").pop() ?? id;
  return /^[0-9a-f]{16,}$/i.test(core) ? core.slice(0, 8).toUpperCase() : core;
}
