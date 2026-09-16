import { describe, expect, it } from "vitest";

/**
 * El dictado se repetía en el móvil, «feo feo».
 *
 * El manejador juntaba **todos** los resultados del evento cada vez. En un
 * ordenador eso da el texto correcto, porque cada frase aparece una sola vez.
 * En un teléfono no: Android cierra y reabre la sesión de reconocimiento por su
 * cuenta mientras uno habla, y vuelve a entregar lo que ya había cerrado.
 *
 * Esta prueba reproduce esa secuencia de eventos —la del teléfono, no la del
 * ordenador— sobre la misma lógica que usa el componente.
 */

/** Lo que hace `onresult`, aislado de React y del navegador. */
function transcriptor() {
  let cerrado = "";
  return (evento: {
    resultIndex: number;
    results: { isFinal: boolean; 0: { transcript: string } }[];
  }) => {
    let provisional = "";
    for (let i = evento.resultIndex; i < evento.results.length; i++) {
      const trozo = evento.results[i][0].transcript;
      if (evento.results[i].isFinal) cerrado += trozo;
      else provisional += trozo;
    }
    return `${cerrado}${provisional}`.trim();
  };
}

const frase = (transcript: string, isFinal: boolean) => ({
  isFinal,
  0: { transcript },
});

describe("la transcripción del dictado", () => {
  it("enseña lo provisional y lo reemplaza al cerrarse", () => {
    const leer = transcriptor();
    expect(leer({ resultIndex: 0, results: [frase("el muelle", false)] })).toBe(
      "el muelle",
    );
    expect(
      leer({ resultIndex: 0, results: [frase("el muelle está roto", true)] }),
    ).toBe("el muelle está roto");
  });

  it("no repite lo ya cerrado cuando el teléfono lo reenvía", () => {
    const leer = transcriptor();
    /* Android entrega la primera frase y la cierra. */
    leer({ resultIndex: 0, results: [frase("el muelle está roto", true)] });
    /* Y en el evento siguiente vuelve a mandar la misma en la lista, con la
       nueva detrás. `resultIndex` dice que solo la segunda es nueva. */
    const texto = leer({
      resultIndex: 1,
      results: [
        frase("el muelle está roto", true),
        frase(" desde la creciente", true),
      ],
    });
    expect(texto).toBe("el muelle está roto desde la creciente");
    expect(texto).not.toContain("el muelle está roto el muelle está roto");
  });

  it("aguanta una sesión larga sin duplicar nada", () => {
    const leer = transcriptor();
    const partes = ["uno ", "dos ", "tres ", "cuatro"];
    let texto = "";
    const acumulado: { isFinal: boolean; 0: { transcript: string } }[] = [];
    partes.forEach((parte, i) => {
      acumulado.push(frase(parte, true));
      texto = leer({ resultIndex: i, results: [...acumulado] });
    });
    expect(texto).toBe("uno dos tres cuatro");
  });
});
