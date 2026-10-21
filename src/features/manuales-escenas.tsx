import { Home, Map, Plus, Settings, Users } from "lucide-react";
import { Badge } from "@/components/ui";
import type { EscenaId } from "@/content/manuales";
import styles from "./manuales.module.css";

/**
 * Las pantallas dibujadas de los manuales.
 *
 * **No son capturas.** Una captura envejece el día que cambia un color o un
 * rótulo, y en un manual que se imprime a PDF queda fijada para siempre. Estas
 * se arman con las mismas clases y los mismos componentes que la aplicación
 * —la insignia de estado, la cápsula de conexión, los iconos de la barra—, así
 * que se redibujan solas cuando la aplicación cambia, y en cada versión del
 * PDF salen como la aplicación se ve ese día.
 *
 * Los reportes de ejemplo son inventados y el manual lo dice en el pie de cada
 * pantalla: ninguno es de nadie.
 */

const EJEMPLOS = [
  {
    titulo: "Alumbrado en el malecón",
    vereda: "Bocas de Satinga",
    estado: "pendiente",
  },
  {
    titulo: "Residuos en la ribera",
    vereda: "Bajo Satinga",
    estado: "en_proceso",
  },
  {
    titulo: "Deterioro del muelle comunitario",
    vereda: "Alto Satinga",
    estado: "solucionado",
  },
  {
    titulo: "Afectación del bosque",
    vereda: "Bocas de Satinga",
    estado: "escalado",
  },
];

const BARRA = [
  { id: "inicio", rotulo: "Inicio", Icono: Home },
  { id: "mapa", rotulo: "Mapa", Icono: Map },
  { id: "reportar", rotulo: "Reportar", Icono: Plus },
  { id: "comunidad", rotulo: "Comunidad", Icono: Users },
  { id: "cuenta", rotulo: "Cuenta", Icono: Settings },
];

export function Escena({ id }: { id: EscenaId }) {
  if (id === "estados")
    return (
      <div className={styles.escena}>
        <p className={styles.escenaTitulo}>Mis reportes</p>
        <ul className={styles.escenaLista}>
          {EJEMPLOS.map((r) => (
            <li key={r.titulo}>
              <span>
                <strong>{r.titulo}</strong>
                <small>{r.vereda}</small>
              </span>
              <Badge status={r.estado} />
            </li>
          ))}
        </ul>
      </div>
    );

  if (id === "nuevo-reporte")
    return (
      <div className={styles.escena}>
        <p className={styles.escenaTitulo}>Inicio</p>
        <div className={styles.escenaHueco} aria-hidden="true" />
        <nav
          className={styles.barraMovil}
          aria-label="Ejemplo de la barra del teléfono"
        >
          {BARRA.map(({ id: clave, rotulo, Icono }) => (
            <span
              key={clave}
              className={clave === "reportar" ? styles.barraAgregar : undefined}
            >
              <Icono size={clave === "reportar" ? 22 : 20} />
              <small>{rotulo}</small>
            </span>
          ))}
        </nav>
      </div>
    );

  return (
    <div className={styles.escena}>
      <p className={styles.escenaTitulo}>Nuevo reporte</p>
      <span className="net-pill off">
        <i />
        <span>
          <strong>Sin conexión</strong>
          <small>Tus reportes se guardan</small>
        </span>
      </span>
      <div className={`notice ${styles.escenaAviso}`}>
        <p>
          ¿Sin señal? El reporte espera en tu bandeja de salida y{" "}
          <strong>sale solo</strong> en cuanto haya red.
        </p>
      </div>
    </div>
  );
}
