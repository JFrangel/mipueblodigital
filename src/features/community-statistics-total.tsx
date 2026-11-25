"use client";

import { useEffect, useState } from "react";
import { memberHeaders } from "@/data/remote-reports";
import { onReportUpdate } from "@/data/report-updates";

export function CommunityStatisticsTotal() {
  const [total, setTotal] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => onReportUpdate(() => setRevision((n) => n + 1)), []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { headers } = await memberHeaders();
        const response = await fetch("/api/community/statistics/", {
          headers,
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!Number.isSafeInteger(data.total) || data.total < 0)
          throw new Error();
        if (controller.signal.aborted) return;
        setTotal(data.total);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  return (
    <section
      className="panel management-metrics"
      aria-label="Total general de reportes"
    >
      <h2>Total general del territorio</h2>
      <p role="status">
        {failed ? (
          "El total general no está disponible."
        ) : total === null ? (
          "Consultando el total general…"
        ) : (
          <>
            <strong>{total.toLocaleString("es-CO")}</strong> reportes
            registrados
          </>
        )}
      </p>
      <p>
        Incluye reportes publicados y privados. Los filtros, gráficos y
        exportaciones de abajo usan los reportes publicados.
      </p>
      {failed && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setFailed(false);
            setRevision((n) => n + 1);
          }}
        >
          Reintentar
        </button>
      )}
    </section>
  );
}
