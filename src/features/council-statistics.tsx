"use client";
import { useCallback, useEffect, useState } from "react";
import {
  UserRoundX,
  Timer,
  CalendarClock,
  CheckCheck,
  EyeOff,
  TriangleAlert,
} from "lucide-react";
import { memberHeaders } from "@/data/remote-reports";
import type { Aggregate } from "@/domain/aggregate";
import { alertsFor } from "@/domain/council-alerts";

/**
 * Las cifras del territorio, para quien las gestiona.
 *
 * La página de estadísticas cuenta lo que hay en este dispositivo. Al Consejo
 * eso le sirve de poco: necesita lo que el servidor tiene de toda la comunidad,
 * y sobre todo lo que un conteo por estados no dice —cuánto trabajo no tiene
 * dueño, qué lleva más tiempo esperando y en qué vereda se está acumulando—.
 *
 * Solo cifras. Ni un relato, ni un nombre, ni un teléfono llega hasta aquí: se
 * cuentan en el servidor y lo que viaja ya son números.
 */
export function CouncilStatistics() {
  const [data, setData] = useState<Aggregate | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  const request = useCallback(async () => {
    const { headers } = await memberHeaders();
    const response = await fetch("/api/admin/statistics/", {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    return body as Aggregate;
  }, []);

  useEffect(() => {
    let alive = true;
    request()
      .then((body) => {
        if (alive) setData(body);
      })
      .catch((e: unknown) => {
        if (alive)
          setError(e instanceof Error ? e.message : "No se pudo consultar.");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [request]);

  if (busy && !data)
    return (
      <section className="panel council-stats">
        <p role="status">Consultando las cifras del territorio…</p>
      </section>
    );
  if (error)
    return (
      <section className="panel council-stats">
        <p className="errors" role="alert">
          {error}
        </p>
      </section>
    );
  if (!data) return null;

  const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
  const alerts = alertsFor(data);
  return (
    <section className="panel council-stats">
      <span className="eyebrow">CONSEJO COMUNITARIO · TODO EL TERRITORIO</span>
      <h2>Dónde está el trabajo.</h2>
      <p>
        Lo que el servidor tiene de toda la comunidad, no solo de este
        dispositivo. {data.total} expedientes contabilizados
        {data.sampled && " (muestra: hay más de los que caben en una consulta)"}
        .
      </p>
      {/* Lo que conviene mirar, antes que las cifras: un tablero contesta
          preguntas que alguien ya se hizo; esto señala las que todavía no. */}
      <ul className="council-alerts">
        {alerts.map((alert) => (
          <li key={alert.id} className={`alert-${alert.level}`}>
            {alert.level === "bien" ? (
              <CheckCheck size={15} />
            ) : (
              <TriangleAlert size={15} />
            )}
            <span>{alert.text}</span>
          </li>
        ))}
      </ul>
      <div className="metrics council-metrics">
        {/* Primero lo que no tiene dueño: es lo único de esta pantalla sobre lo
            que se puede actuar hoy mismo, y lo que se queda quieto si nadie
            mira. */}
        <article className="metric">
          <span className="metric-icon amber">
            <UserRoundX size={19} />
          </span>
          <strong>{data.unassigned}</strong>
          <small>Abiertos sin responsable</small>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <Timer size={19} />
          </span>
          <strong>{dias(data.oldestOpenDays)}</strong>
          <small>Lo que más lleva esperando</small>
        </article>
        <article className="metric">
          <span className="metric-icon blue">
            <CalendarClock size={19} />
          </span>
          <strong>{dias(data.medianOpenDays)}</strong>
          <small>Espera mediana de lo abierto</small>
        </article>
        <article className="metric">
          <span className="metric-icon">
            <CheckCheck size={19} />
          </span>
          <strong>{data.closed ? dias(data.medianClosedDays) : "—"}</strong>
          <small>
            {data.closed
              ? "Mediana hasta cerrar un caso"
              : "Todavía no se ha cerrado ninguno"}
          </small>
        </article>
      </div>
      {/* Cuánto se tarda en cerrar. La media sola engaña cuando un caso se
          eterniza; con la mediana al lado se ve si ese caso es la excepción o
          la regla, y la desviación dice si el Consejo responde parejo. */}
      {data.resolution ? (
        <div className="council-split">
          <div className="panel-heading">
            <h3>Cuánto se tarda en cerrar</h3>
            <small>Sobre {data.resolution.count} casos cerrados</small>
          </div>
          <ul className="council-figures">
            <li>
              <b>{dias(data.resolution.mean)}</b>
              <span>de media</span>
            </li>
            <li>
              <b>{dias(data.resolution.median)}</b>
              <span>la mitad tarda menos</span>
            </li>
            <li>
              <b>± {dias(data.resolution.deviation)}</b>
              <span>
                {data.resolution.deviation > data.resolution.mean
                  ? "muy desigual entre casos"
                  : "parejo entre casos"}
              </span>
            </li>
          </ul>
        </div>
      ) : (
        <p className="subtle-note">
          Todavía no hay cierres suficientes para medir cuánto se tarda. Con
          menos de cinco, una media es un accidente con aires de medida.
        </p>
      )}

      {/* El plazo no es una promesa al ciudadano: es la vara con la que el
          Consejo mira su propia bandeja y ve qué se está quedando atrás. */}
      {data.sla.length > 0 && (
        <div className="council-split">
          <div className="panel-heading">
            <h3>Lo abierto frente a su plazo</h3>
            <small>Plazos acordados por el Consejo</small>
          </div>
          <ul className="council-sla">
            {data.sla.map((row) => (
              <li key={row.priority} className={row.late ? "late" : ""}>
                <span>
                  {row.priority}
                  <small>hasta {dias(row.target)}</small>
                </span>
                <b>
                  {row.late} de {row.open}
                </b>
                <small>{row.late ? "pasados de plazo" : "dentro de plazo"}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="council-splits">
        {/* La vereda dice a dónde ir. Se ordena por lo que sigue abierto, no
            por lo que más ha reportado: son preguntas distintas. */}
        <div className="council-split wide">
          <div className="panel-heading">
            <h3>Por vereda</h3>
            <small>Ordenadas por lo que sigue abierto</small>
          </div>
          <table className="council-table">
            <thead>
              <tr>
                <th>Vereda</th>
                <th>Recibidos</th>
                <th>Abiertos</th>
                <th>Urgentes</th>
                <th>Resuelto</th>
              </tr>
            </thead>
            <tbody>
              {data.veredaPerformance.slice(0, 8).map((row) => (
                <tr key={row.vereda}>
                  <td>{row.vereda}</td>
                  <td>{row.total}</td>
                  <td>{row.open}</td>
                  <td className={row.urgent ? "urgent" : ""}>{row.urgent}</td>
                  <td>{row.rate} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* La categoría dice con quién hay que hablar, y su reparto de estados
            dice si el problema es que no se atiende o que no se cierra. */}
        <div className="council-split wide">
          <div className="panel-heading">
            <h3>Por categoría</h3>
            <small>Pendiente · en proceso · solucionado</small>
          </div>
          <ul className="council-stack">
            {data.categoryStates.map((row) => (
              <li key={row.category}>
                <span>
                  {row.category}
                  <small>{row.total}</small>
                </span>
                <i>
                  {(
                    [
                      ["pendiente", row.pending],
                      ["activo", row.active],
                      ["resuelto", row.solved],
                    ] as const
                  ).map(([name, count]) =>
                    count ? (
                      <em
                        key={name}
                        className={name}
                        style={{ flexGrow: count }}
                        title={`${count} ${name}`}
                      />
                    ) : null,
                  )}
                </i>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="subtle-note">
        <EyeOff size={14} /> {data.sensitive} marcados como delicados: no
        constan ante la comunidad, ni siquiera pasado el plazo. Llegaron{" "}
        {data.lastWeek} en los últimos siete días y {data.lastMonth} en los
        últimos treinta.
      </p>
      <p className="subtle-note">
        Los reportes reflejan participación, no un censo de todos los problemas
        del territorio: una vereda con pocos reportes puede ser una vereda a la
        que le cuesta reportar.
      </p>
    </section>
  );
}
