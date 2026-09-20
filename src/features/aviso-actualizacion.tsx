"use client";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ClipboardCopy,
  Globe,
  PackageOpen,
  RotateCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { HojaPlatano } from "./leaf-fall";
import {
  abrirInstalador,
  hayActualizacion,
  instalarActualizacion,
  permitirInstalar,
  porElNavegador,
  type Actualizacion,
  type Avance,
  type Desenlace,
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
  const [desenlace, setDesenlace] = useState<Desenlace | null>(null);
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
        {desenlace?.fin === "sin-permiso" && (
          /* No es un fallo: es un permiso que Android pide una vez y que la
             persona puede conceder de un toque desde aquí. */
          <p className={styles.errores} role="status">
            Android tiene que dejar que esta aplicación instale. Es una sola
            vez.
          </p>
        )}
        {desenlace?.fin === "no-bajo" && (
          /**
           * La descarga no salió, y esta versión sí sabe descargar.
           *
           * **Se dice que se reintente y no se manda a nadie al navegador.**
           * La causa medida es que el servidor le contesta `403` al gestor de
           * descargas de Android cuando la protección automática de la
           * plataforma está levantada: no es el teléfono, no es la señal, y se
           * pasa sola. Reintentar dentro de un rato funciona, y es un botón
           * contra los cuatro pasos fuera de la aplicación que cuesta el
           * navegador.
           *
           * El navegador sigue estando, porque cuando alguien necesita la
           * versión nueva hoy no se le puede contestar «espera»: pero lo elige
           * quien lee esto, no lo elige el programa por su cuenta.
           */
          <div className={styles.errores} role="status">
            <p>
              El archivo no llegó a descargarse. No es tu teléfono: a veces el
              servidor no se lo entrega a la aplicación durante un rato.
              Reinténtalo y, si sigue igual, prueba más tarde.
            </p>
            <button
              className="btn"
              onClick={() => {
                setDesenlace(null);
                void porElNavegador(nueva).then(setDesenlace);
              }}
            >
              <Globe size={16} />
              Descargar con el navegador
            </button>
          </div>
        )}
        {desenlace?.fin === "bajada-sin-abrir" && (
          /**
           * Bajó entero y no se abrió el instalador.
           *
           * **Lo que no se puede ofrecer aquí es descargar otra vez.** El
           * archivo está en el teléfono: repetirlo son los mismos siete megas
           * del plan de datos de alguien para conseguir lo que ya tiene. El
           * botón abre lo que hay.
           */
          <div className={styles.errores} role="status">
            <p>
              La descarga terminó, pero Android no abrió el instalador. El
              archivo ya está en tu teléfono: no hay que volver a bajarlo.
            </p>
            <button
              className="btn"
              onClick={() => {
                setDesenlace(null);
                void abrirInstalador().then((fin) =>
                  setDesenlace(fin.fin === "instalando" ? null : fin),
                );
              }}
            >
              <PackageOpen size={16} />
              Abrir el instalador
            </button>
          </div>
        )}
        {desenlace?.detalle && (
          /* En letra pequeña y sin traducir: no es para leerlo, es para poder
             copiarlo y mandarlo cuando algo falla en un teléfono que no está
             aquí. Ver `Desenlace`. */
          <p className={styles.detalle}>{desenlace.detalle}</p>
        )}
        {desenlace?.fin === "navegador" && (
          <p className={styles.errores} role="status">
            La descarga sigue en el navegador del teléfono. Si te pide
            confirmarla, acéptala; cuando termine, ábrela desde ahí para
            instalarla.
          </p>
        )}
        {desenlace?.fin === "a-mano" && (
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
          {desenlace?.fin === "sin-permiso" ? (
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
                  setDesenlace(fin.fin === "instalando" ? null : fin);
                });
              }}
              disabled={yendo}
            >
              {/* Después de un intento fallido el botón dice lo que hace de
                  verdad. «Actualizar» otra vez, igual que la primera, se lee
                  como que no ha pasado nada y es lo que hace que alguien lo
                  pulse tres veces seguidas creyendo que no responde. */}
              {desenlace?.fin === "no-bajo" ? (
                <RotateCw size={16} />
              ) : (
                <ArrowDownToLine size={16} />
              )}
              {yendo
                ? "Descargando…"
                : desenlace?.fin === "no-bajo"
                  ? "Reintentar"
                  : "Actualizar"}
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
