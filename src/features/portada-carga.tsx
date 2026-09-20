"use client";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { TRAZOS_PALAFITO } from "@/components/palafito";
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
 * La portada de arranque: el agua, el rótulo y una frase.
 *
 * **Se levanta la casa, llega el agua, y entonces habla.** El palafito se traza
 * solo, en el orden en que se construye —el techo, las paredes, la plataforma,
 * los pilotes— y el agua entra la última, que es como llega el río. Es el mismo
 * dibujo del icono del teléfono, así que quien lo toca en el cajón encuentra lo
 * mismo al abrir.
 *
 * Y se mueve por un motivo, no por vistosidad: una pantalla completamente
 * quieta durante diez segundos parece una aplicación colgada, y con señal de
 * río esos diez segundos pasan a menudo. El recorrido dura menos de dos; lo que
 * queda después es el rótulo puesto y la frase cambiando.
 */
export function PortadaCarga() {
  const [frase, setFrase] = useState<string>(FRASES[0].dice);
  useEffect(() => {
    const relojes = FRASES.slice(1).map((f) =>
      setTimeout(() => setFrase(f.dice), f.alSegundo * 1000),
    );
    return () => relojes.forEach(clearTimeout);
  }, []);

  /* Sin marca de tema: el fondo del arranque es uno solo en los dos temas
     —ver `--arranque` en `globals.css`—, así que esta pantalla ya no tiene que
     averiguar qué tema hay puesto antes de pintarse. */
  return (
    <div className={styles.portada}>
      {/* `pathLength` normaliza cada curva a uno: así el mismo retardo vale
          para las tres aunque midan distinto, y sigue valiendo el día que
          alguien retoque el dibujo. */}
      <svg
        className={`${styles.marcaDibujo} ${styles.marcaCentro}`}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        {TRAZOS_PALAFITO.map(([d, cual, opacidad], i) => (
          <path
            key={i}
            d={d}
            pathLength={1}
            data-parte={cual}
            /* El retardo va aquí y no en la hoja de estilo: son diez trazos y
               escribir diez reglas `nth-child` es pedir que un día alguien
               añada un trazo y se desordene la entrada sin que nadie lo note. */
            style={{
              opacity: opacidad,
              animationDelay: `${i * 95}ms`,
            }}
          />
        ))}
      </svg>
      <div className={styles.pie}>
        <div className={styles.marca}>
          <Logo />
        </div>
      {/* `key` para que al cambiar la frase entre de nuevo en vez de sustituirse
          de golpe: el cambio de texto es la única señal de que algo avanza. */}
        <p className={styles.frase} role="status" key={frase}>
          {frase}
        </p>
      </div>
    </div>
  );
}
