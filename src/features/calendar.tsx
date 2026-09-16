"use client";
import { useState } from "react";
import { shortId } from "@/domain/short-id";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { type Case } from "@/data/catalog";
import { Badge } from "@/components/ui";
import { useToday } from "@/data/today";
import {
  bogotaDay,
  monthDays,
  spokenDay,
  weekdayLoad,
} from "@/domain/calendar";
import styles from "./calendar.module.css";
export function CaseCalendar({ items }: { items: Case[] }) {
  /* La fecha del navegador: el servidor no puede saber qué día es en el río. */
  const today = useToday();
  const latest =
    items
      .map((i) => bogotaDay(i.date))
      .sort()
      .at(-1) ?? "2026-09-01";
  const [month, setMonth] = useState(latest.slice(0, 7)),
    [day, setDay] = useState(latest);
  const [year, index] = month.split("-").map(Number);
  const counts = new Map<string, number>();
  items.forEach((i) => {
    const d = bogotaDay(i.date);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  });
  const selected = items.filter((i) => bogotaDay(i.date) === day);
  /* Intensidad de cada casilla respecto al día más movido del mes: un mes se
     lee de un vistazo por el tono, no contando puntos casilla a casilla. */
  const inMonth = [...counts.entries()].filter(([d]) => d.startsWith(month));
  const busiest = Math.max(0, ...inMonth.map(([, n]) => n));
  const monthTotal = inMonth.reduce((sum, [, n]) => sum + n, 0);
  const week = weekdayLoad(items.map((i) => bogotaDay(i.date)));
  const showingToday = Boolean(today) && today.startsWith(month);
  function goToToday() {
    if (!today) return;
    setMonth(today.slice(0, 7));
    setDay(today);
  }
  function move(delta: number) {
    const d = new Date(Date.UTC(year, index - 1 + delta, 1));
    const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    setMonth(next);
    setDay(`${next}-01`);
  }
  return (
    <section className={`panel ${styles.container}`}>
      <div className="panel-heading">
        <h2>
          <CalendarDays size={19} /> Actividad por día
        </h2>
        <span className="tag">Hora de Bogotá</span>
      </div>
      <div className={`${styles.layout} calendar-layout`}>
        <div>
          <div className={styles.heading}>
            <button
              className="icon-button"
              aria-label="Mes anterior"
              onClick={() => move(-1)}
            >
              <ChevronLeft />
            </button>
            <strong>
              {new Intl.DateTimeFormat("es-CO", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(Date.UTC(year, index - 1, 1)))}
            </strong>
            <button
              className="icon-button"
              aria-label="Mes siguiente"
              onClick={() => move(1)}
            >
              <ChevronRight />
            </button>
          </div>
          {/* El conjunto suele abrirse en el mes del último reporte, que no
              tiene por qué ser este. Volver a hoy debe costar un toque. */}
          {today && !showingToday && (
            <button className={`text-button ${styles.toToday}`} onClick={goToToday}>
              Ir a hoy
            </button>
          )}
          <div className={styles.grid}>
            {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
              <span key={i} aria-hidden="true">
                {d}
              </span>
            ))}
            {monthDays(year, index - 1).map((n, i) => {
              if (!n) return <span key={`empty-${i}`} />;
              const key = `${month}-${String(n).padStart(2, "0")}`;
              const total = counts.get(key) ?? 0;
              return (
                <button
                  key={key}
                  aria-label={`${spokenDay(key)}${key === today ? ", hoy" : ""}: ${total} reportes`}
                  aria-pressed={day === key}
                  className={[
                    day === key ? styles.selected : "",
                    key === today ? styles.today : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  /* El tono no reemplaza a la cifra: quien no distingue matices
                     sigue leyendo el número y el lector de pantalla también. */
                  style={
                    total && busiest
                      ? ({ "--carga": total / busiest } as React.CSSProperties)
                      : undefined
                  }
                  onClick={() => setDay(key)}
                >
                  {n}
                  <small>{total || " "}</small>
                </button>
              );
            })}
          </div>
          {/* Cuándo reporta la comunidad no es cuándo ocurren las cosas: quien
              vive río arriba baja al pueblo ciertos días, y es entonces cuando
              hay señal. Saberlo le dice al Consejo cuándo estar. */}
          <div className={styles.week}>
            <h3>Qué días reporta la comunidad</h3>
            <dl>
              {week.map((d) => (
                <div key={d.name}>
                  <dt>
                    <abbr title={d.name}>{d.short}</abbr>
                  </dt>
                  <dd>
                    <span style={{ "--parte": d.share } as React.CSSProperties}>
                      <i />
                    </span>
                    {d.total}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className={`${styles.results} calendar-results`}>
          <h3>
            {spokenDay(day)}
            {day === today && <span className={styles.chip}>Hoy</span>}
          </h3>
          <p>
            {selected.length} registros del conjunto filtrado · {monthTotal} en
            el mes
          </p>
          {selected.length === 0 ? (
            <p className="notice">No hay incidencias para este día.</p>
          ) : (
            <ul>
              {selected.map((i) => (
                <li key={i.id}>
                  <strong>{i.title}</strong>
                  <small>
                    <span title={i.id}>{shortId(i.id)}</span> · {i.vereda}
                  </small>
                  <Badge status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
