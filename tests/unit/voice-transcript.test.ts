import { describe, expect, it } from "vitest";
import { unir } from "../../src/features/voice-input";

/**
 * El dictado repetía las palabras en el teléfono. Tres versiones hicieron falta.
 *
 * La primera juntaba todos los resultados de cada evento. La segunda acumulaba
 * lo marcado como cerrado. La tercera los guardaba por posición. Las tres
 * suponían **cómo** entrega Android el reconocimiento, y las tres se
 * equivocaron de una manera distinta.
 *
 * Estas pruebas no suponen nada: usan las dos secuencias que llegaron de un
 * teléfono de verdad. Con una transcripción de escritorio las tres versiones
 * anteriores pasaban tan campantes, y por eso el fallo llegó a producción dos
 * veces.
 */
describe("unir los trozos del dictado", () => {
  it("un ordenador entrega trozos distintos y se suman", () => {
    expect(unir(["uno", "dos", "tres"])).toBe("uno dos tres");
  });

  /** Primera secuencia del teléfono: la frase crece en la misma posición. */
  it("una frase reemitida creciendo no se multiplica", () => {
    expect(
      unir([
        "hubo",
        "hubo derrumbe",
        "hubo derrumbe en",
        "hubo derrumbe en la",
        "hubo derrumbe en la vía",
      ]),
    ).toBe("hubo derrumbe en la vía");
  });

  /** Segunda secuencia: la misma frase, pero repartida en posiciones nuevas. */
  it("y tampoco cuando cada versión llega en su propia posición", () => {
    const texto = unir([
      "hubo",
      "hubo",
      "hubo",
      "hubo un",
      "hubo un",
      "hubo un derrumbe y",
      "hubo un derrumbe y ocurrió",
    ]);
    expect(texto).toBe("hubo un derrumbe y ocurrió");
    expect(texto).not.toMatch(/hubohubo|hubo un hubo/);
  });

  /**
   * Tercera secuencia del teléfono. Aquí el reconocimiento **reescribe** lo que
   * ya había dicho al crecer: pone la mayúscula inicial. Comparando literal,
   * «esto es» y «Esto es una» son frases distintas y se suman.
   */
  it("la mayúscula que añade al crecer no crea una frase nueva", () => {
    expect(
      unir(["esto es", "Esto es", "Esto es una", "Esto es una prueba"]),
    ).toBe("Esto es una prueba");
  });

  /** Y lo mismo con las tildes: «derrumbé» pasó a «derrumbe» al cerrarse. */
  it("una tilde corregida tampoco", () => {
    expect(
      unir(["hubo derrumbé en la vía", "hubo derrumbe en la vía ayer"]),
    ).toBe("hubo derrumbe en la vía ayer");
  });

  it("ni una coma añadida", () => {
    expect(unir(["hubo derrumbe", "Hubo derrumbe, en la vía"])).toBe(
      "Hubo derrumbe, en la vía",
    );
  });

  it("lo provisional más corto no borra lo que ya se llevaba", () => {
    expect(unir(["el muelle está roto", "el muelle"])).toBe(
      "el muelle está roto",
    );
  });

  it("dos frases de verdad distintas sí se suman", () => {
    expect(unir(["el muelle está roto", "desde la creciente"])).toBe(
      "el muelle está roto desde la creciente",
    );
  });

  it("los huecos no dejan espacios sueltos", () => {
    expect(unir(["", "  ", "una cosa", ""])).toBe("una cosa");
  });
});
