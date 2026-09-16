"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, WifiOff } from "lucide-react";
import { newsKinds } from "@/domain/news";
import { NewsArt, coverSource } from "@/components/news-art";
import { plainNewsBody } from "@/domain/news-format";
import { TerritorialContext } from "./territorial-context";
type PublicNews = {
  id: string;
  title: string;
  body: string;
  kind: string;
  publishedAt: string | null;
  pinned?: boolean;
  art?: string | null;
  /** Marca de la portada fotográfica; nula si el comunicado no lleva. */
  cover?: string | null;
};
export function CommunityFeed() {
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [items, setItems] = useState<PublicNews[]>([]),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [attempt, setAttempt] = useState(0),
    /* De cuándo es lo que se está leyendo, si vino de la copia guardada. */
    [saved, setSaved] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    fetch("/api/news/", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (alive) {
          setItems(data.items);
          setError("");
          /* La marca la pone el service worker cuando sirve su copia porque la
             red no respondió. Leer un boletín sin saber que es de hace tres
             días es peor que no leerlo. */
          setSaved(r.headers.get("X-Guardado") ?? "");
        }
      })
      .catch(() => {
        if (alive)
          setError(
            navigator.onLine
              ? "No pudimos cargar las noticias del Consejo. Inténtalo de nuevo más tarde."
              : "Sin señal y sin copia guardada. Abre esta pantalla una vez con red y los comunicados quedarán aquí para leerlos sin conexión.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [attempt]);
  const filtered = items
    .filter(
      (n) =>
        (kind === "all" || n.kind === kind) &&
        (n.title + " " + n.body)
          .toLocaleLowerCase("es")
          .includes(query.toLocaleLowerCase("es")),
    )
    .sort(
      (a, b) =>
        Number(!!b.pinned) - Number(!!a.pinned) ||
        (b.publishedAt || "").localeCompare(a.publishedAt || ""),
    );
  return (
    <>
      <>
        <div className="page-intro">
          <div>
            <span className="eyebrow">NOS MANTENEMOS CERCA</span>
            <h1>
              La comunidad también <em>se escucha.</em>
            </h1>
            <p>Encuentros, anuncios y orientaciones de nuestro territorio.</p>
          </div>
        </div>
        <div className="filters">
          <label className="search">
            <input
              aria-label="Buscar noticias"
              placeholder="Buscar comunicado…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Tipo de noticia"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">Todos los tipos</option>
            {newsKinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        {/* Lo guardado se lee igual, pero diciendo de cuándo es. Un boletín
            sin fecha de copia parece de hoy, y puede ser de la semana pasada. */}
        {saved && !error && (
          <p className="notice offline-copy">
            <WifiOff size={15} />
            <span>
              Sin señal: estos comunicados son la copia guardada
              {Date.parse(saved)
                ? ` del ${new Intl.DateTimeFormat("es-CO", {
                    dateStyle: "long",
                    timeStyle: "short",
                    timeZone: "America/Bogota",
                  }).format(new Date(saved))}`
                : ""}
              . Se actualizan solos en cuanto vuelva la red.
            </span>
          </p>
        )}
        {loading ? (
          <p role="status" className="notice">
            Cargando comunicados…
          </p>
        ) : error ? (
          <div role="alert" className="notice">
            <p>{error}</p>
            <button
              className="btn"
              onClick={() => {
                setLoading(true);
                setAttempt((n) => n + 1);
              }}
            >
              Reintentar
            </button>
          </div>
        ) : filtered.length ? (
          <div className="news-grid">
            {filtered.map((n) => (
              <Link
                className="panel news-card"
                key={n.id}
                href={`/noticia/${encodeURIComponent(n.id)}/`}
              >
                <NewsArt
                  art={n.art ?? undefined}
                  cover={coverSource(n.id, n.cover)}
                />
                <span className="news-kind">
                  <span className="eyebrow">{n.kind}</span>
                  {n.pinned && <span className="tag">Anclado</span>}
                </span>
                <h2>{n.title}</h2>
                <time>
                  {n.publishedAt
                    ? new Intl.DateTimeFormat("es-CO", {
                        dateStyle: "long",
                        timeZone: "America/Bogota",
                      }).format(new Date(n.publishedAt))
                    : "Fecha no disponible"}
                </time>
                <p className="news-body">{plainNewsBody(n.body)}</p>
                <span className="text-link">
                  Leer comunicado <ArrowUpRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <section className="panel news-empty">
            <h2>
              {items.length
                ? "No hay coincidencias"
                : "Aún no hay comunicados publicados"}
            </h2>
            <p>
              {items.length
                ? "Prueba otra búsqueda o cambia el tipo de noticia."
                : "Cuando el Consejo publique una noticia, aparecerá aquí."}
            </p>
          </section>
        )}
        <TerritorialContext />
      </>
    </>
  );
}
