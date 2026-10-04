"use client";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { councilSources, type CouncilPeriod } from "@/content/council-history";
import { historyDate, type HistorySource } from "@/domain/council-history";
import { useCouncilHistory } from "@/data/council-history";
import styles from "./council-memory.module.css";

const periods: { id: CouncilPeriod | "all"; label: string }[] = [
  { id: "all", label: "Toda la historia" },
  { id: "origen", label: "Origen" },
  { id: "territorio", label: "Territorio" },
  { id: "memoria", label: "Memoria" },
];
const periodNames: Record<CouncilPeriod, string> = {
  origen: "Reconocimiento",
  territorio: "Territorio",
  memoria: "Vida comunitaria",
};

export function CouncilMemory() {
  const { items, notice } = useCouncilHistory();
  const [period, setPeriod] = useState<CouncilPeriod | "all">("all");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return items.filter(
      (item) =>
        (period === "all" || item.period === period) &&
        (!needle ||
          `${item.occurredOn} ${item.title} ${item.account}`
            .toLocaleLowerCase("es")
            .includes(needle)),
    );
  }, [period, query, items]);
  const sourceLink = (source: HistorySource, index: number) => {
    return (
      <a
        key={`${source.url}-${index}`}
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir ${source.label} de ${source.issuer} en otra pestaña`}
      >
        {source.issuer || source.label}{" "}
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    );
  };
  return (
    <div className={styles.memory}>
      <header className={styles.intro}>
        <span className="eyebrow">ARCHIVO DE CONSULTA · RÍO SATINGA</span>
        <h1>El Consejo y la memoria del río.</h1>
        <p>
          Una ruta por los documentos que explican el reconocimiento del
          territorio, la organización comunitaria y algunas de sus actuaciones.
          Cada fecha lleva a su fuente.
        </p>
        <div
          className={styles.introFacts}
          aria-label="Contenido de la consulta"
        >
          <span>
            <strong>{items.length}</strong> hitos documentados
          </span>
          <span>
            <strong>
              {
                new Set(
                  items.flatMap((item) =>
                    item.sources.map((source) => source.url),
                  ),
                ).size
              }
            </strong>{" "}
            fuentes enlazadas
          </span>
        </div>
        <div className={styles.introFoot}>
          <span>Gran Consejo Comunitario del Río Satinga · Olaya Herrera</span>
          <span>Fuentes públicas · validación comunitaria pendiente</span>
        </div>
      </header>
      <p className="muted" role="status">
        {notice}
      </p>

      <section className={styles.context} aria-labelledby="why-council">
        <div>
          <span className="eyebrow">POR QUÉ EXISTE</span>
          <h2 id="why-council">La comunidad decide sobre su territorio.</h2>
        </div>
        <p>
          El Consejo Comunitario representa una forma de autoridad colectiva de
          las comunidades negras. La Constitución de 1991 y la Ley 70 de 1993
          reconocieron derechos sobre las tierras ocupadas tradicionalmente; el
          Decreto 1745 de 1995 reguló la Asamblea, la Junta y el título
          colectivo. La historia de la gente del río comenzó antes de esas
          normas. Este Consejo no es el Concejo Municipal.
        </p>
      </section>

      <aside className={styles.territoryNote} aria-label="Vida junto al río">
        <span className="eyebrow">VIDA JUNTO AL RÍO</span>
        <p>
          Una guía del Ministerio de Educación publicada en 2020 sitúa a Las
          Marías en la parte media del río Satinga y dice que su única vía de
          comunicación es fluvial. Es un testimonio de esa fecha: las
          condiciones de transporte y servicios deben consultarse de nuevo con
          la comunidad.
        </p>
        <a
          href={councilSources.educationTerritory.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Consultar la fuente <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </aside>

      <section className={styles.chronology} aria-labelledby="history-title">
        <div className={styles.sectionHead}>
          <div>
            <span className="eyebrow">HITOS DOCUMENTADOS</span>
            <h2 id="history-title">Línea de tiempo</h2>
          </div>
          <p>
            Selecciona un período o busca un hecho. Las fuentes permanecen junto
            a cada hito.
          </p>
        </div>
        <div className={styles.controls}>
          <div
            className={styles.filters}
            role="group"
            aria-label="Período histórico"
          >
            {periods.map((choice) => (
              <button
                type="button"
                key={choice.id}
                className={period === choice.id ? styles.selected : ""}
                aria-pressed={period === choice.id}
                onClick={() => setPeriod(choice.id)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <label className={styles.search}>
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Buscar en la historia del Consejo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en la historia…"
            />
          </label>
        </div>
        <ol className={styles.timeline}>
          {visible.map((item) => (
            <li key={item.id} className={styles.milestone}>
              <div className={styles.timeMark}>
                <span className={styles.date}>{historyDate(item)}</span>
                <span className={styles.periodBadge}>
                  {periodNames[item.period]}
                </span>
              </div>
              <div className={styles.story}>
                <h3>{item.title}</h3>
                <p>{item.account}</p>
                {item.qualification && (
                  <p className={styles.qualification}>{item.qualification}</p>
                )}
                <div className={styles.sourceRow}>
                  <span>Fuentes</span>
                  {item.sources.map(sourceLink)}
                </div>
              </div>
            </li>
          ))}
        </ol>
        {!visible.length && (
          <p className={styles.empty} role="status">
            No hay hitos con esa búsqueda. Prueba otra palabra o período.
          </p>
        )}
      </section>

      <section className={styles.governance} aria-labelledby="governance-title">
        <span className="eyebrow">CÓMO SE ORGANIZA</span>
        <h2 id="governance-title">
          Dos espacios, responsabilidades distintas.
        </h2>
        <div className={styles.governanceGrid}>
          <article>
            <span>01</span>
            <h3>Asamblea General</h3>
            <p>
              Es la máxima autoridad. Elige la Junta, debate asuntos comunes y
              aprueba decisiones que la norma y el derecho propio le reservan.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Junta del Consejo</h3>
            <p>
              Dirige y administra internamente. Protege el territorio, prepara
              planes y conserva el archivo comunitario y los libros de actas.
            </p>
          </article>
        </div>
        <p className={styles.legalNote}>
          Funciones generales del{" "}
          <a
            href={councilSources.decree1745.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Decreto 1745 de 1995 <ArrowUpRight size={13} aria-hidden="true" />
          </a>
          . La composición y el reglamento vigentes del Consejo requieren
          validación de su Asamblea.
        </p>
      </section>

      <section className={styles.library} aria-labelledby="sources-title">
        <div className={styles.sectionHead}>
          <div>
            <span className="eyebrow">BIBLIOTECA DE FUENTES</span>
            <h2 id="sources-title">Consulta los documentos</h2>
          </div>
          <BookOpen size={25} aria-hidden="true" />
        </div>
        <ul>
          {Object.entries(councilSources).map(([id, source]) => (
            <li key={id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                <span>
                  <strong>{source.label}</strong>
                  <small>{source.issuer}</small>
                </span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <p className={styles.libraryNote}>
          Los enlaces son documentos públicos. La reproducción de la resolución
          y el anexo de la Asamblea deben cotejarse con el archivo del Consejo
          antes de tratarlos como copia auténtica. Si un enlace no abre, el
          documento pudo moverse o el sitio estar caído: avisa al Consejo para
          reverificarlo. Esta consulta no publica actas privadas, censos ni
          datos personales.
        </p>
      </section>
    </div>
  );
}
