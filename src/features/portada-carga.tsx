"use client";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import styles from "./portada-carga.module.css";

/**
 * Lo que se dice mientras la aplicación arranca.
 *
 * **No son frases de relleno que se turnan para entretener.** Cada una aparece
 * cuando su momento significa algo distinto: la primera es el arranque normal;
 * la segunda reconoce que ya está tardando más de la cuenta, que en el río casi
 * siempre quiere decir poca señal; la tercera dice lo único que hace falta
 * saber a los quince segundos, que es que no hay que cerrar nada.
 *
 * Inventar pasos —«conectando con el servidor», «cargando tus reportes»— sería
 * más vistoso y sería mentira: aquí no se sabe en cuál de esas está.
 */
const FRASES = [
  { alSegundo: 0, dice: "Preparando tu comunidad…" },
  { alSegundo: 5, dice: "Con poca señal esto tarda un poco más." },
  { alSegundo: 14, dice: "Sigue intentándolo. No hace falta cerrar la app." },
] as const;

/**
 * La portada de carga: el rótulo y una frase, mientras la aplicación arranca.
 *
 * **Va con el tema del teléfono**, claro u oscuro, y no con un color propio: es
 * la primera pantalla de la aplicación, no un cartel, y una portada que ignora
 * el tema se lee como algo que todavía no ha terminado de cargar.
 *
 * La hoja del rótulo respira despacio. Es lo único que se mueve, y se mueve por
 * un motivo: una pantalla completamente quieta durante diez segundos parece una
 * aplicación colgada, y con señal de río esos diez segundos pasan a menudo.
 */
export function PortadaCarga() {
  const [frase, setFrase] = useState<string>(FRASES[0].dice);

  useEffect(() => {
    const relojes = FRASES.slice(1).map((f) =>
      setTimeout(() => setFrase(f.dice), f.alSegundo * 1000),
    );
    return () => relojes.forEach(clearTimeout);
  }, []);

  return (
    <div className={styles.portada}>
      <div className={styles.marca}>
        <Logo />
      </div>
      {/* `key` para que al cambiar la frase entre de nuevo en vez de sustituirse
          de golpe: el cambio de texto es la única señal de que algo avanza. */}
      <p className={styles.frase} role="status" key={frase}>
        {frase}
      </p>
    </div>
  );
}
