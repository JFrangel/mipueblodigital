"use client";
import { useEffect, useState } from "react";
import { HojaPlatano } from "./leaf-fall";
import styles from "./telon-hojas.module.css";

/** Lo que tardan las hojas en entrar y cerrarse, contando el retardo de las
 *  últimas, que son las que cierran. */
const ENTRADA_MS = 1200;
/** Lo que se quedan tapando antes de abrirse. */
const QUIETA_MS = 250;
/** Y lo que tardan en apartarse, contando el retardo de las de color, que
 *  ahora salen detrás de las oscuras. Los mismos números que el CSS. */
const SALIDA_MS = 1300;

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
export function TelonHojas({ listo }: { listo: boolean }) {
  const [fase, setFase] = useState<"fuera" | "entrando" | "abriendo">("fuera");

  useEffect(() => {
    if (!listo || yaSeVio || fase !== "fuera") return;
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
  }, [listo, fase]);

  useEffect(() => {
    if (fase !== "entrando") return;
    const abre = setTimeout(() => setFase("abriendo"), ENTRADA_MS + QUIETA_MS);
    return () => clearTimeout(abre);
  }, [fase]);

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
