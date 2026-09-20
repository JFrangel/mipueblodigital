"use client";
import { useEffect, useState } from "react";

/**
 * El tono que le toca a «Digital» ahora mismo.
 *
 * **Va con el reloj, no con el momento en que se abrió la aplicación.** Es la
 * diferencia entre que esto exista y que no: quien entra a mandar un reporte
 * está dentro medio minuto, y un ciclo que arrancara en cada carga le enseñaría
 * siempre el primer color. Atado a la hora, dos personas que abren la
 * aplicación a la vez ven lo mismo, y la misma persona ve algo distinto por la
 * tarde que por la mañana.
 *
 * El cambio se programa **para el instante exacto** en que toca, no se pregunta
 * cada segundo: un temporizador que despierta ciento veinte veces por cada
 * cambio es batería regalada, y aquí la gente carga el teléfono con planta.
 */

/** Verde de la marca, verde de monte y azul de mar. El orden es el del ciclo. */
export const TONOS = ["verde", "bosque", "mar"] as const;
export type Tono = (typeof TONOS)[number];

/** Dos minutos en cada uno. */
const CADA_MS = 120_000;

const tocante = (): Tono =>
  TONOS[Math.floor(Date.now() / CADA_MS) % TONOS.length];

export function useTonoDeMarca(): Tono {
  /**
   * Arranca en el primero y el efecto lo corrige.
   *
   * Calcular la hora durante el renderizado daría un color en el servidor y
   * otro en el navegador, y React rehace el árbol entero cuando eso pasa. Lo
   * que se ve es el verde de siempre durante un fotograma.
   */
  const [tono, setTono] = useState<Tono>(TONOS[0]);

  useEffect(() => {
    let reloj: ReturnType<typeof setTimeout>;
    const marcar = () => {
      setTono(tocante());
      /* Al filo del siguiente cambio, no dos minutos desde ahora: así no se va
         desfasando una pizca en cada vuelta. */
      reloj = setTimeout(marcar, CADA_MS - (Date.now() % CADA_MS));
    };
    marcar();
    return () => clearTimeout(reloj);
  }, []);

  return tono;
}
