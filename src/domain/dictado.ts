/**
 * Lo que el dictado necesita saber y no depende de dónde corra.
 *
 * Vive aparte de `src/platform/voz.ts` y de la pantalla porque **los dos
 * reconocedores —el del navegador y el de Android— se comportan igual de mal**,
 * así que la regla que los desenreda es una sola y es del dominio, no de la
 * plataforma.
 */
/**
 * Juntar los trozos del dictado sin repetirlos.
 *
 * Es el tercer intento, y los dos anteriores fallaron por suponer cómo entrega
 * Android el reconocimiento. Lo que llegó del teléfono:
 *
 *     hubohubohubohubo derrumbéhubo derrumbé enhubo derrumbé en la vía
 *     hubohubohubohubohubo unhubo unhubo un derrumbé yhubo un derrumbé y ocurrió
 *
 * Los dos son la misma frase creciendo. A veces la reemite en la misma
 * posición, a veces en posiciones nuevas —por eso ni juntarlas todas ni
 * guardarlas por posición bastaba—, pero en los dos casos **lo nuevo empieza
 * por lo viejo**.
 *
 * Así que la regla no mira posiciones ni banderas: mira el texto. Si un trozo
 * empieza por lo que ya se lleva, es la misma frase más larga y reemplaza; si
 * no, es frase nueva y se añade. Un ordenador, que entrega trozos distintos,
 * cae siempre por el segundo camino y se comporta igual que siempre.
 *
 * **La comparación no puede ser literal.** Al crecer, el reconocimiento
 * reescribe lo que ya había dicho: pone la mayúscula inicial, corrige tildes,
 * añade o quita comas. Comparando tal cual, «esto es» y «Esto es una» son dos
 * frases distintas y se suman:
 *
 *     esto es Esto es Esto es una Esto es una prueba
 *
 * Por eso se comparan normalizados —sin mayúsculas, sin tildes, sin signos— y
 * se conserva el texto tal como llegó, que es el que está mejor escrito.
 */
const normaliza = (texto: string) =>
  texto
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

export function unir(partes: readonly string[]): string {
  let texto = "";
  let clave = "";
  for (const parte of partes) {
    const trozo = (parte ?? "").trim();
    if (!trozo) continue;
    const suya = normaliza(trozo);
    if (!suya) continue;
    if (!clave) {
      texto = trozo;
      clave = suya;
    } else if (suya.startsWith(clave)) {
      /* La misma frase, más larga y mejor escrita: reemplaza. */
      texto = trozo;
      clave = suya;
    } else if (clave.startsWith(suya)) {
      /* Una versión más corta de lo que ya se lleva: se ignora. */
      continue;
    } else {
      texto = `${texto} ${trozo}`;
      clave = `${clave} ${suya}`;
    }
  }
  return texto;
}
