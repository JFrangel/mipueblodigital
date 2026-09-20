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
 * Si toca enseñarlo. Se decide **una vez por carga de página**.
 *
 * Esta variable vive en el módulo, así que nace de nuevo cada vez que el
 * navegador vuelve a ejecutar el paquete: al abrir la aplicación y **al
 * recargar**. Dentro, moviéndose por la aplicación, no vuelve a cero y el
 * telón no reaparece, que es lo que se quiere: es el gesto de entrar, no una
 * cortinilla entre pantallas.
 *
 * Antes esto miraba , y esa marca sobrevive a las recargas:
 * recargando la página no se veía nada. Aquí sobra almacenamiento —la pregunta
 * es «¿es la primera vez en esta ejecución?» y eso ya lo contesta el módulo—,
 * y de paso desaparece el caso de la ventana privada, donde escribir falla.
 *
 * Y vive fuera de React porque dentro no funcionaba: en desarrollo los efectos
 * se montan dos veces, y la segunda leía la marca que acababa de escribir la
 * primera y concluía «esto ya se vio». El telón no se veía nunca, y en
 * producción funcionaba de milagro —porque allí el efecto corre una sola vez—,
 * que es la peor clase de código: el que aguanta mientras nadie lo mire.
 */
let yaSeVio = false;

/**
 * **Se marca al terminar, no al decidir.**
 *
 * Marcándolo al decidir volvía el fallo de siempre: React monta los efectos
 * dos veces en desarrollo, la primera vuelta decía «sí» y dejaba la marca, y
 * la segunda leía esa marca y concluía «esto ya se vio». El telón se retiraba
 * en el acto. En producción habría funcionado igual —allí el efecto corre una
 * sola vez—, que es justo el código que aguanta mientras nadie lo mire.
 *
 * Marcándolo cuando el telón **acaba**, un montaje que se deshace sin haber
 * llegado al final no deja rastro, y el siguiente vuelve a enseñarlo.
 */
function tocaEnsenarlo(): boolean {
  return !yaSeVio;
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
 * **Se ve al abrir y al recargar**, no al moverse por dentro: es el gesto de
 * entrar, no una cortinilla entre pantallas.
 */
export function TelonHojas({ listo }: { listo: boolean }) {
  /* Empieza **puesto**, y por eso se pinta ya en el HTML del servidor: si
     esperara a decidirse en el navegador, se vería un instante la aplicación
     antes de que cayera el telón, que es exactamente al revés. */
  const [puesto, setPuesto] = useState(true);
  const [entrando, setEntrando] = useState(false);
  const [abriendo, setAbriendo] = useState(false);

  /**
   * La entrada arranca **en el primer fotograma que se pinta**, no al aplicar
   * los estilos.
   *
   * En la ventana del APK entre una cosa y otra pasa casi un segundo, y la
   * animación se gastaba entera con la pantalla todavía en blanco: al pintar,
   * las hojas ya estaban puestas y quietas. Se comprobó grabando un arranque
   * en el teléfono —trece fotogramas seguidos, todos iguales—.
   *
   * Dos vueltas de requestAnimationFrame y no una: la primera se programa
   * antes de que el navegador dibuje, así que dentro de ella todavía no ha
   * pintado nada. La segunda corre ya con el fotograma en pantalla.
   */
  useEffect(() => {
    let segundo = 0;
    const primero = requestAnimationFrame(() => {
      segundo = requestAnimationFrame(() => setEntrando(true));
    });
    return () => {
      cancelAnimationFrame(primero);
      cancelAnimationFrame(segundo);
    };
  }, []);

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
    const fin = setTimeout(() => {
      /* Aquí, y no antes: el telón llegó al final, así que ya se vio. */
      yaSeVio = true;
      setPuesto(false);
    }, SALIDA_MS);
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
          className={[
            styles.ancla,
            donde,
            entrando ? styles.entrando : "",
            abriendo ? styles.abriendo : "",
          ].join(" ")}
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
