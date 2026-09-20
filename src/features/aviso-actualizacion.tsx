"use client";
import { useEffect, useState } from "react";
import { ArrowDownToLine, ClipboardCopy, ShieldCheck, X } from "lucide-react";
import { HojaPlatano } from "./leaf-fall";
import {
  hayActualizacion,
  instalarActualizacion,
  permitirInstalar,
  type Actualizacion,
  type Avance,
  type Resultado,
} from "@/platform/actualizacion";
import styles from "./aviso-actualizacion.module.css";

/**
 * «Hay una versión nueva de la aplicación».
 *
 * **Solo sale cuando de verdad hay algo que reinstalar.** Casi todo lo que se
 * arregla en esta aplicación llega solo a los teléfonos, porque lo instalado es
 * una ventana a la web. Lo que no llega es lo que vive dentro del archivo —los
 * permisos declarados, los complementos nativos, el icono— y eso sí obliga a
 * descargar de nuevo. Avisar de lo otro sería pedirle a alguien treinta megas
 * de su plan de datos para nada.
 *
 * **Dice el peso antes de que nadie pulse.** Quien lee esto puede estar con la
 * señal del río y contando megas: «Actualizar» sin cifra al lado es pedir una
 * decisión a ciegas.
 *
 * **Y se puede quitar.** Se recuerda quitado para esa versión, no para siempre:
 * si más adelante sale otra, vuelve a aparecer. Un aviso que no se puede callar
 * termina siendo un aviso que nadie lee.
 */
export function AvisoActualizacion() {
  const [nueva, setNueva] = useState<Actualizacion | null>(null);
  const [yendo, setYendo] = useState(false);
  const [avance, setAvance] = useState<Avance | null>(null);
  const [desenlace, setDesenlace] = useState<Resultado | null>(null);
  const [copiada, setCopiada] = useState(false);

  useEffect(() => {
    let vivo = true;
    void hayActualizacion().then((encontrada) => {
      if (!vivo || !encontrada) return;
      try {
        if (
          localStorage.getItem("mpd-version-oculta") ===
          String(encontrada.versionCode)
        )
          return;
      } catch {
        /* Sin almacenamiento se enseña: molesta menos que esconderlo. */
      }
      setNueva(encontrada);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (!nueva) return null;

  const ocultar = () => {
    try {
      localStorage.setItem("mpd-version-oculta", String(nueva.versionCode));
    } catch {
      /* Volverá a salir la próxima vez. No es un fallo. */
    }
    setNueva(null);
  };

  return (
    <section className={styles.aviso}>
      {/* La hoja, como en todo lo que en esta aplicación significa paso. */}
      <span className={styles.hoja} aria-hidden="true">
        <HojaPlatano />
      </span>
      <div className={styles.texto}>
        <strong>Hay una versión nueva de la aplicación</strong>
        <p>
          {nueva.notas ? (
            nueva.notas
          ) : (
            <>Trae cambios que no llegan solos y hay que instalar a mano.</>
          )}
        </p>
        <p className={styles.detalle}>
          Versión {nueva.versionName} · {nueva.peso} · tienes la{" "}
          {nueva.instalada}
        </p>
        {desenlace === "sin-permiso" && (
          /* No es un fallo: es un permiso que Android pide una vez y que la
             persona puede conceder de un toque desde aquí. */
          <p className={styles.errores} role="status">
            Android tiene que dejar que esta aplicación instale. Es una sola
            vez.
          </p>
        )}
        {desenlace === "navegador" && (
          <p className={styles.errores} role="status">
            La descarga sigue en el navegador del teléfono. Cuando termine,
            ábrela desde ahí para instalarla.
          </p>
        )}
        {desenlace === "a-mano" && (
          /**
           * El camino de la versión 1.0, que no trae nada de esto dentro.
           *
           * Hay que decirlo sin rodeos: **esta versión no puede descargar por
           * sí sola**. La ventana de Capacitor no sabe bajar archivos y el
           * método nativo que lo resuelve se añadió después, así que lo único
           * que queda es abrir el navegador del teléfono a mano. No sirve
           * tocar la dirección aquí: el enlace lo intercepta la misma ventana
           * que no sabe descargar.
           *
           * Por eso hay un botón que la copia, que es lo que de verdad ahorra
           * trabajo: sesenta caracteres tecleados sin una errata, en un
           * teléfono, no los acierta nadie a la primera.
           */
          <div className={styles.errores} role="status">
            <p>
              Esta versión todavía no sabe descargar sola. Copia la dirección,
              ábrela en el navegador del teléfono e instala el archivo. A partir
              de la 1.5 el botón lo hace todo.
            </p>
            <code className={styles.direccion}>{nueva.donde}</code>
            <button
              className="btn"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(nueva.donde)
                  .then(() => setCopiada(true))
                  .catch(() => setCopiada(false));
              }}
            >
              <ClipboardCopy size={16} />
              {copiada ? "Dirección copiada" : "Copiar la dirección"}
            </button>
          </div>
        )}
        {avance && desenlace === null && (
          /* El aviso del sistema queda arriba y tapado. Alguien que no ve
             moverse nada en la pantalla que está mirando piensa que se colgó y
             vuelve a pulsar. */
          <p className={styles.avance} role="status">
            <span
              className={styles.barra}
              style={
                avance.porcentaje >= 0
                  ? { ["--parte" as string]: `${avance.porcentaje}%` }
                  : undefined
              }
              aria-hidden="true"
            />
            {avance.esperando
              ? "Esperando señal… se reanuda sola"
              : avance.porcentaje >= 0
                ? `Descargando… ${avance.porcentaje}%`
                : "Descargando…"}
          </p>
        )}
        <div className={styles.botones}>
          {desenlace === "sin-permiso" ? (
            <button
              className="btn primary"
              onClick={() => {
                void permitirInstalar();
                setDesenlace(null);
              }}
            >
              <ShieldCheck size={16} />
              Permitir e instalar
            </button>
          ) : (
            <button
              className="btn primary"
              onClick={() => {
                setYendo(true);
                setDesenlace(null);
                setAvance(null);
                void instalarActualizacion(nueva, setAvance).then((fin) => {
                  setYendo(false);
                  setAvance(null);
                  setDesenlace(fin === "instalando" ? null : fin);
                });
              }}
              disabled={yendo}
            >
              <ArrowDownToLine size={16} />
              {yendo ? "Descargando…" : "Actualizar"}
            </button>
          )}
          <button className="btn" onClick={ocultar} disabled={yendo}>
            <X size={16} />
            Ahora no
          </button>
        </div>
      </div>
    </section>
  );
}
