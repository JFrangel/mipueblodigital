"use client";
import { useEffect, useState } from "react";
import { HojaPlatano } from "./leaf-fall";
import styles from "./telon-hojas.module.css";

/** Cuánto dura el telón. El mismo número que la animación del CSS. */
const DURACION_MS = 1100;

/**
 * Si toca enseñarlo, decidido **una sola vez por carga de página**.
 *
 * Vive fuera de React porque dentro no funcionaba: en desarrollo los efectos
 * se montan dos veces, y la segunda vuelta leía la marca que acababa de
 * escribir la primera y concluía «esto ya se vio». El telón no llegaba a verse
 * nunca, y en producción funcionaba de milagro —por que allí el efecto corre
 * una sola vez—, que es la peor clase de código: el que solo aguanta mientras
 * nadie lo mire de cerca.
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
 * Seis hojas cerradas sobre el verde de la casa que se apartan y dejan ver lo
 * que hay detrás. Las hojas significan **paso** en esta aplicación, y no hay
 * paso más literal que el de entrar.
 *
 * **Va aquí y no en el APK a propósito.** Lo primero que se ve al abrir es la
 * pantalla de arranque de Android, que dibuja el icono y no se puede animar sin
 * meter mano al archivo instalado: cambiarla obliga a que toda la comunidad
 * reinstale. Esto es web, así que se cambia desde el servidor cuantas veces
 * haga falta y llega sola a los teléfonos que ya la tienen.
 *
 * **Se quita solo, pase lo que pase.** Un telón que puede quedarse puesto es
 * peor que no tenerlo: deja a alguien mirando una pantalla bonita sin manera de
 * salir. El temporizador no depende de que nada cargue, de que haya red ni de
 * que la animación llegue a terminar, y mientras está puesto no intercepta
 * toques —`pointer-events: none`—, así que aunque se quedara, la aplicación de
 * debajo se sigue pudiendo usar.
 *
 * **Y solo una vez por arranque.** Se marca en `sessionStorage`, que se borra
 * al cerrar la ventana: al abrir la aplicación se ve, y al moverse por dentro
 * no vuelve a aparecer. Si el navegador no deja guardar —ventana privada,
 * datos bloqueados— se cae al lado bueno: se enseña, que es lo que menos
 * estorba.
 */
export function TelonHojas() {
  /* Empieza **puesto**, y por eso se pinta ya en el HTML del servidor: si
     esperara a decidirse en el navegador, se vería un instante la aplicación
     antes de que cayera el telón, que es exactamente al revés. */
  const [puesto, setPuesto] = useState(true);

  useEffect(() => {
    /* Si ya se vio en este arranque se retira en el acto; si no, cuando la
       animación termina. El reloj no depende de que nada cargue, de que haya
       red ni de que la animación llegue a su final. */
    const reloj = setTimeout(
      () => setPuesto(false),
      tocaEnsenarlo() ? DURACION_MS : 0,
    );
    return () => clearTimeout(reloj);
  }, []);

  if (!puesto) return null;
  return (
    <div className={styles.telon} aria-hidden="true">
      {[
        styles.uno,
        styles.dos,
        styles.tres,
        styles.cuatro,
        styles.cinco,
        styles.seis,
      ].map((donde) => (
        <div className={`${styles.hoja} ${donde}`} key={donde}>
          <HojaPlatano />
        </div>
      ))}
    </div>
  );
}
