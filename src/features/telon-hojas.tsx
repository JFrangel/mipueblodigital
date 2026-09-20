"use client";
import { useEffect, useState } from "react";
import { HojaPlatano } from "./leaf-fall";
import styles from "./telon-hojas.module.css";

/**
 * Los tiempos del telón. **Los mismos números que el CSS**, que es quien mueve
 * las hojas: aquí solo se cuenta para saber cuándo pasar de un acto al otro.
 *
 * Duraban 2,48 s entre los tres y ahora duran 1,43. No es que la coreografía
 * fuera larga de más mirándola sola: es que va **al final** del arranque, detrás
 * de la pantalla de Android, de la portada y de la espera de la red, y a esas
 * alturas quien mira ya ha esperado lo suyo. Cada acto conserva su proporción
 * con los otros, así que el gesto es el mismo, contado más rápido.
 *
 * Entrada y salida llevan sumado el retardo de la última hoja —las que entran
 * escalonadas—, porque el acto no acaba cuando termina la primera.
 */
const ENTRADA_MS = 590;
/** Lo que se quedan tapando antes de abrirse. */
const QUIETA_MS = 140;
const SALIDA_MS = 700;

/**
 * Si toca enseñarlo. Se marca **al terminar**, no al decidir.
 *
 * Esta variable vive en el módulo, así que nace de nuevo cada vez que el
 * navegador vuelve a ejecutar el paquete: al abrir la aplicación y al recargar.
 * Dentro, moviéndose por la aplicación, no vuelve a cero y el telón no
 * reaparece, que es lo que se quiere: es el gesto de entrar, no una cortinilla
 * entre pantallas.
 *
 * Y se marca cuando el telón acaba porque marcándolo al decidir volvía un fallo
 * que este archivo ya había tenido: React monta los efectos dos veces en
 * desarrollo, la primera vuelta decía «sí» y dejaba la marca, y la segunda leía
 * esa marca y concluía «esto ya se vio». Marcándolo al final, un montaje que se
 * deshace sin haber llegado allí no deja rastro.
 */
let yaSeVio = false;

/**
 * El telón de hojas: entran por los costados, tapan un instante, y se apartan.
 *
 * **Entra al final, no al principio, y eso es lo que hace.** Antes cubría desde
 * que cargaba la página y se abría cuando había algo detrás, o sea que hacía de
 * pantalla de espera; y como en la ventana del APK la web tarda casi un segundo
 * en pintar, la animación se gastaba entera a oscuras y lo que llegaba a verse
 * era su último fotograma. Ahora la espera la cubre la portada de carga, que
 * para eso está, y las hojas son lo que pasa **entre** esa portada y la
 * aplicación: tapan lo que había y se abren sobre lo que viene.
 *
 * Por eso tampoco lleva fondo propio. Cuando tapaba la carga hacía falta un
 * verde detrás para que no se colara la pantalla a medio hacer por las
 * rendijas; ahora detrás hay siempre algo terminado, y un verde de más sería un
 * parpadeo de color entre dos pantallas que ya combinan.
 *
 * **Se quita solo, pase lo que pase**, y mientras está puesto no intercepta
 * toques —`pointer-events: none`—, así que aunque algo fallara, la aplicación
 * de debajo se sigue pudiendo usar.
 */
export function TelonHojas({
  listo,
  alTapar,
}: {
  listo: boolean;
  /**
   * Avisa cuando las hojas ya tapan del todo.
   *
   * **Es lo que permite que el telón cubra un cambio en vez de esconder algo
   * que ya se veía.** Sin esto, la aplicación y el telón arrancaban en el mismo
   * instante —los dos cuelgan de `visited`—, así que en pantalla se veía el
   * inicio entero, las hojas cerrándose encima de él y abriéndose sobre lo
   * mismo. Medido fotograma a fotograma: aparecía en el 39 y volvía a taparse
   * en el 41.
   *
   * Quien recibe esto cambia lo que hay debajo mientras está tapado, y lo que
   * las hojas descubren al abrirse es algo que no estaba antes, que es lo único
   * que justifica un telón.
   */
  alTapar: () => void;
}) {
  const [fase, setFase] = useState<"fuera" | "entrando" | "abriendo">("fuera");

  useEffect(() => {
    if (!listo) return;
    /* El telón ya se vio en esta carga y no va a volver: no hay nada que
       esperar, así que se descubre en el acto. Sin esto, quien se mueve por la
       aplicación se quedaría mirando la portada para siempre. */
    if (yaSeVio) {
      alTapar();
      return;
    }
    if (fase !== "fuera") return;
    /* La entrada arranca en el primer fotograma que se pinta de verdad, no al
       aplicar los estilos: en la ventana del APK entre una cosa y otra pasa
       casi un segundo, y una animación empezada a oscuras no se ve. */
    let segundo = 0;
    const primero = requestAnimationFrame(() => {
      segundo = requestAnimationFrame(() => setFase("entrando"));
    });
    return () => {
      cancelAnimationFrame(primero);
      cancelAnimationFrame(segundo);
    };
  }, [listo, fase, alTapar]);

  useEffect(() => {
    if (fase !== "entrando") return;
    /* Se avisa al cerrarse del todo y no al empezar a abrir: deja el rato
       quieto entero —y la salida por delante— para que lo que entra debajo
       tenga tiempo de pintarse antes de que nadie lo vea. */
    const tapa = setTimeout(alTapar, ENTRADA_MS);
    const abre = setTimeout(() => setFase("abriendo"), ENTRADA_MS + QUIETA_MS);
    return () => {
      clearTimeout(tapa);
      clearTimeout(abre);
    };
  }, [fase, alTapar]);

  useEffect(() => {
    if (fase !== "abriendo") return;
    const fin = setTimeout(() => {
      /* Aquí, y no antes: el telón llegó al final, así que ya se vio. */
      yaSeVio = true;
      setFase("fuera");
    }, SALIDA_MS);
    return () => clearTimeout(fin);
  }, [fase]);

  if (fase === "fuera") return null;
  return (
    <div className={styles.telon} aria-hidden="true">
      {/* El verde detrás: entra con las hojas y se va con ellas, para que el
          momento de estar tapado sea opaco de verdad. */}
      <div
        className={[
          styles.fondo,
          styles.entrando,
          fase === "abriendo" ? styles.abriendo : "",
        ].join(" ")}
      />
      {/* Las últimas: silueta plana del verde de la casa. Entran detrás de las
          demás y son las que cierran del todo. */}
      {[styles.primera, styles.segunda, styles.tercera, styles.cuarta].map(
        (donde) => (
          <div
            className={[
              styles.ancla,
              styles.oscura,
              donde,
              styles.entrando,
              fase === "abriendo" ? styles.abriendo : "",
            ].join(" ")}
            key={donde}
          >
            <div className={styles.hoja}>
              <HojaPlatano />
            </div>
          </div>
        ),
      )}
      {[
        styles.uno,
        styles.dos,
        styles.tres,
        styles.cuatro,
        styles.cinco,
        styles.seis,
      ].map((donde) => (
        /* El ancla en el borde y la hoja colgando de ella: así el giro sale del
           peciolo y no del centro de la lámina. */
        <div
          className={[
            styles.ancla,
            donde,
            styles.entrando,
            fase === "abriendo" ? styles.abriendo : "",
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
