"use client";
import { useEffect, useState } from "react";
import { HojaPlatano } from "./leaf-fall";
import styles from "./telon-hojas.module.css";

/** Lo que tardan las hojas en entrar y cerrarse. */
const ENTRADA_MS = 700;
/** Y lo que tardan en apartarse. Los mismos números que el CSS. */
const SALIDA_MS = 900;

/**
 * Hasta cuándo se aguanta tapando si la aplicación no termina de estar lista.
 *
 * **Sin este tope, un arranque lento dejaría a alguien mirando hojas.** Con
 * señal de río eso no es una hipótesis. Pasados cuatro segundos se abre igual:
 * lo que haya detrás —aunque sea «Preparando tu comunidad…»— es información, y
 * una pantalla bonita que no se va nunca no lo es.
 */
const TOPE_MS = 4000;

/**
 * Si toca enseñarlo, decidido **una sola vez por carga de página**.
 *
 * Vive fuera de React porque dentro no funcionaba: en desarrollo los efectos se
 * montan dos veces, y la segunda vuelta leía la marca que acababa de escribir
 * la primera y concluía «esto ya se vio». El telón no llegaba a verse nunca, y
 * en producción funcionaba de milagro —porque allí el efecto corre una sola
 * vez—, que es la peor clase de código: el que aguanta mientras nadie lo mire.
 */
let decidido: boolean | null = null;

function tocaEnsenarlo(): boolean {
  if (decidido !== null) return decidido;
  let yaFue = false;
  try {
    yaFue = sessionStorage.getItem("mpd-telon") === "1";
    sessionStorage.setItem("mpd-telon", "1");
  } catch {
    /* Sin almacenamiento se enseña: molesta menos que esconderlo. */
  }
  decidido = !yaFue;
  return decidido;
}

/**
 * El telón de hojas con el que abre la aplicación.
 *
 * Tres actos: las hojas entran por los costados, se cierran, y se apartan
 * dejando ver lo que hay detrás. Las hojas significan **paso** en esta
 * aplicación, y no hay paso más literal que el de entrar.
 *
 * **Y no se aparta hasta que hay algo que enseñar.** Ese es su trabajo de
 * verdad, no el adorno: mientras la aplicación decide si es la primera visita
 * se pinta una portada de carga —«Preparando tu comunidad…»— que con señal
 * lenta se queda un rato. Abriendo a ciegas a los mil seiscientos, las hojas se
 * apartaban para descubrir una pantalla de espera. Ahora se quedan cerradas
 * hasta que `listo` dice que detrás ya está la aplicación, con un tope de
 * cuatro segundos para que no puedan quedarse.
 *
 * **Va aquí y no en el APK a propósito.** Lo primero que se ve al abrir es la
 * pantalla de arranque de Android, que dibuja el icono y no se puede animar sin
 * meter mano al archivo instalado: cambiarla obliga a que toda la comunidad
 * reinstale. Esto es web, así que se cambia desde el servidor cuantas veces
 * haga falta y llega sola a los teléfonos que ya la tienen.
 *
 * **Se quita solo, pase lo que pase.** Mientras está puesto no intercepta
 * toques —`pointer-events: none`—, así que aunque se quedara, la aplicación de
 * debajo se sigue pudiendo usar.
 *
 * **Y solo una vez por arranque**, marcado en `sessionStorage`, que se borra al
 * cerrar la ventana: al abrir la aplicación se ve, y al moverse por dentro no
 * vuelve a aparecer.
 */
export function TelonHojas({ listo }: { listo: boolean }) {
  /* Empieza **puesto**, y por eso se pinta ya en el HTML del servidor: si
     esperara a decidirse en el navegador, se vería un instante la aplicación
     antes de que cayera el telón, que es exactamente al revés. */
  const [puesto, setPuesto] = useState(true);
  const [abriendo, setAbriendo] = useState(false);

  useEffect(() => {
    /* Ya visto en este arranque: se retira en el acto y sin animación. */
    if (!tocaEnsenarlo()) {
      const ya = setTimeout(() => setPuesto(false), 0);
      return () => clearTimeout(ya);
    }
    /* El tope corre desde el principio y no depende de nada más. */
    const tope = setTimeout(() => setAbriendo(true), TOPE_MS);
    return () => clearTimeout(tope);
  }, []);

  useEffect(() => {
    if (!listo) return;
    /* Se abre cuando hay algo detrás, pero nunca antes de haber acabado de
       entrar: cortar la entrada a la mitad se ve como un tropiezo. */
    const abre = setTimeout(() => setAbriendo(true), ENTRADA_MS);
    return () => clearTimeout(abre);
  }, [listo]);

  useEffect(() => {
    if (!abriendo) return;
    const fin = setTimeout(() => setPuesto(false), SALIDA_MS);
    return () => clearTimeout(fin);
  }, [abriendo]);

  if (!puesto) return null;
  return (
    <div className={styles.telon} aria-hidden="true">
      <div className={`${styles.fondo} ${abriendo ? styles.yendose : ""}`} />
      {[
        styles.uno,
        styles.dos,
        styles.tres,
        styles.cuatro,
        styles.cinco,
        styles.seis,
      ].map((donde) => (
        /* El ancla en el borde y la hoja colgando de ella: así el giro sale
           del peciolo y no del centro de la lámina. */
        <div
          className={`${styles.ancla} ${donde} ${abriendo ? styles.abriendo : ""}`}
          key={donde}
        >
          <div className={styles.hoja}>
            <HojaPlatano />
          </div>
        </div>
      ))}
    </div>
  );
}
