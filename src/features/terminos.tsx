import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui";
import styles from "./terminos.module.css";

/**
 * Términos y tratamiento de datos personales.
 *
 * **Por qué es una página propia y no una sección más de la guía.** Es el
 * único documento de la aplicación que alguien de fuera —quien evalúa
 * instalarla, quien redacta un acuerdo con el Consejo— puede necesitar leer
 * sin cuenta y sin pasar por `/inicio/`. La guía del proyecto exige sesión
 * para verse completa; esto no puede.
 *
 * Reparte el contenido con la sección «Calidad y seguridad» de la guía a
 * propósito: aquí se dice **qué** se recoge, para qué y con qué derechos;
 * allí, **cómo** se protege técnicamente. Repetirlo en los dos sitios los
 * dejaría desactualizándose por separado.
 */
export function Terminos() {
  return (
    <main className={styles.page}>
      <Link href="/bienvenida/" className={styles.back}>
        <ArrowLeft size={15} /> Mi Pueblo Digital
      </Link>
      <div className={styles.head}>
        <Logo />
        <h1>Términos y tratamiento de datos personales</h1>
      </div>
      <p className={styles.meta}>Última actualización: 3 de octubre de 2026.</p>
      <p>
        Este documento explica qué información pide Mi Pueblo Digital, para qué
        la usa el Gran Consejo Comunitario Río Satinga, y qué puedes hacer si
        quieres corregirla o retirarla. Está pensado para leerse antes de
        reportar, no después.
      </p>

      <section>
        <h2>Quién es responsable de tus datos</h2>
        <p>
          El Gran Consejo Comunitario Río Satinga es el responsable del
          tratamiento de la información que recoge esta aplicación: es a quien
          va dirigido cada reporte, y quien decide qué se hace con él. Mi Pueblo
          Digital es la herramienta que usa para recibirlos y gestionarlos, no
          una entidad aparte.
        </p>
      </section>

      <section>
        <h2>Qué información pide la aplicación</h2>
        <p>
          Para reportar hace falta una cuenta con correo, una categoría, la
          vereda, una descripción de lo que pasa y al menos una fotografía. El
          teléfono es opcional, y también lo es marcar un punto exacto en el
          mapa: sin ninguno de los dos, el reporte igual se sitúa en la vereda
          que elegiste. Puedes marcar tu reporte como delicado al enviarlo, y
          entonces no consta ante nadie más que el Consejo.
        </p>
      </section>

      <section>
        <h2>Para qué se usa</h2>
        <p>
          Para que el Consejo revise el caso, le asigne responsable, deje
          constancia de lo que hizo y te avise de cada cambio. También para
          calcular estadísticas del territorio —cuántos reportes hay, en qué
          veredas, en qué se tarda en resolverlos— y, solo si el Consejo revisa
          el caso, lo declara sin contenido sensible y redacta un resumen sin tu
          teléfono ni tu fotografía, para que ese resumen conste ante la
          comunidad pasadas 24 horas desde que lo aprueba.
        </p>
      </section>

      <section>
        <h2>Quién puede ver qué</h2>
        <p>
          Tu expediente completo lo ves tú y lo ve el Consejo. La comunidad, si
          acaso, ve un resumen que redacta el Consejo —su título, la categoría,
          la vereda, el estado y la fecha— y solo después de que lo apruebe y
          pasen 24 horas. Tu relato tal como lo escribiste, tu teléfono, tu
          identidad de cuenta y tu fotografía no salen nunca de ti y del
          Consejo: ni en ese resumen ni en ninguna estadística.
        </p>
      </section>

      <section>
        <h2>Cuánto tiempo se conserva</h2>
        <p>
          Mientras tu cuenta esté activa, tu expediente se conserva completo,
          con su historial. Si pides eliminar tu cuenta, el Consejo deja de
          tener forma de identificarte: se sustituye tu nombre por uno al azar,
          se borra tu teléfono y tu relato, y se conserva solo la categoría, la
          vereda, el estado y la fecha, para que las estadísticas del territorio
          sigan siendo ciertas.
        </p>
      </section>

      <section>
        <h2>Tus derechos</h2>
        <p>
          Puedes conocer qué consta de ti, pedir que se corrija si está mal, y
          pedir que tu cuenta se elimine con lo que eso implica. Eliminar tu
          cuenta lo puedes hacer tú mismo, en cualquier momento, desde Mi
          cuenta, sin tener que pedírselo a nadie.
        </p>
      </section>

      <section>
        <h2>Cómo ejercer estos derechos</h2>
        <p>
          Para eliminar tu cuenta: entra a Mi cuenta y sigue las instrucciones
          de ahí. Para cualquier otra cosa —corregir un dato, preguntar qué
          consta de ti, o cualquier duda sobre este documento— contacta al Gran
          Consejo Comunitario Río Satinga.
        </p>
      </section>

      <section>
        <h2>Marco legal</h2>
        <p>
          Este tratamiento sigue los principios de la Ley 1581 de 2012 y su
          Decreto reglamentario 1377 de 2013, que en Colombia regulan la
          protección de datos personales. La Superintendencia de Industria y
          Comercio es la entidad que vigila su cumplimiento.
        </p>
      </section>

      <section>
        <h2>Cómo se protege técnicamente</h2>
        <p>
          Este documento dice qué se recoge y para qué. Cómo se protege en la
          práctica —quién puede entrar a una cuenta, quién puede leer qué en la
          base de datos, qué pasa de verdad al eliminar una cuenta, qué viaja o
          se guarda cifrado— está explicado con detalle en{" "}
          <Link href="/documentacion/">
            la sección de calidad y seguridad de la guía del proyecto
          </Link>
          .
        </p>
      </section>

      <p className={styles.foot}>
        Si este documento cambia de forma que afecte lo que ya sabes, se avisará
        desde la propia aplicación. La fecha de arriba dice cuándo se actualizó
        por última vez. Puedes volver en cualquier momento a{" "}
        <Link href="/bienvenida/">la bienvenida</Link> o a{" "}
        <Link href="/documentacion/">la guía del proyecto</Link>.
      </p>
    </main>
  );
}
