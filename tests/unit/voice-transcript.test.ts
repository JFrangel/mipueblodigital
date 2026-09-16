import { describe, expect, it } from "vitest";

/**
 * El dictado repetía las palabras en el teléfono. Dos veces.
 *
 * La primera versión juntaba todos los resultados de cada evento: bien en un
 * ordenador, repetido en el móvil. La segunda acumulaba lo que llegaba marcado
 * como cerrado, y el móvil lo repitió igual, de otra manera.
 *
 * Porque Android no cierra una frase y pasa a la siguiente: **reemite la misma
 * frase creciendo, en el mismo índice, marcada como cerrada cada vez**. Estas
 * pruebas reproducen esa secuencia, que es la que ninguna de las dos primeras
 * versiones aguantaba.
 */

/** Lo que hace `onresult`, aislado de React y del navegador. */
function transcriptor() {
  const partes: string[] = [];
  return (evento: {
    resultIndex: number;
    results: { isFinal: boolean; 0: { transcript: string } }[];
  }) => {
    const desde = evento.resultIndex ?? 0;
    for (let i = desde; i < evento.results.length; i++)
      partes[i] = evento.results[i][0].transcript;
    return partes.join("").trim();
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

  /**
   * El caso que llegó del teléfono, tal cual:
   *
   *     hubohubohubohubo derrumbéhubo derrumbé enhubo derrumbé en la vía
   */
  it("una frase que crece reemitida como cerrada no se multiplica", () => {
    const leer = transcriptor();
    let texto = "";
    for (const trozo of [
      "hubo",
      "hubo",
      "hubo derrumbe",
      "hubo derrumbe en",
      "hubo derrumbe en la",
      "hubo derrumbe en la vía",
    ])
      texto = leer({ resultIndex: 0, results: [frase(trozo, true)] });
    expect(texto).toBe("hubo derrumbe en la vía");
    expect(texto).not.toMatch(/hubohubo/);
  });

  it("no repite lo ya cerrado cuando el teléfono lo reenvía", () => {
    const leer = transcriptor();
    leer({ resultIndex: 0, results: [frase("el muelle está roto", true)] });
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
    let texto = "";
    const acumulado: { isFinal: boolean; 0: { transcript: string } }[] = [];
    ["uno ", "dos ", "tres ", "cuatro"].forEach((parte, i) => {
      acumulado.push(frase(parte, true));
      texto = leer({ resultIndex: i, results: [...acumulado] });
    });
    expect(texto).toBe("uno dos tres cuatro");
  });
});
