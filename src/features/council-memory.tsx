"use client";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import {
  councilSources,
  type CouncilPeriod,
  type CouncilSourceId,
} from "@/content/council-history";
import {
  councilGlossary,
  councilOrganization,
  councilPending,
  councilRights,
  titledCouncils,
  type GuideCard,
} from "@/content/council-guide";
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
const sectionIndex: [string, string][] = [
  ["por-que-existe", "Por qué existe"],
  ["linea-de-tiempo", "Línea de tiempo"],
  ["organizacion", "Organización"],
  ["derechos", "Derechos"],
  ["territorio", "Territorio"],
  ["palabras", "Palabras clave"],
  ["por-completar", "Por completar"],
  ["fuentes", "Fuentes"],
];

/** Enlaces a documentos de la biblioteca de fuentes, por su identificador. */
function SourceLinks({ ids }: { ids: readonly CouncilSourceId[] }) {
  return ids.map((id) => (
    <a
      key={id}
      href={councilSources[id].url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir ${councilSources[id].label} de ${councilSources[id].issuer} en otra pestaña`}
    >
      {councilSources[id].label} <ArrowUpRight size={13} aria-hidden="true" />
    </a>
  ));
}

function GuideCards({ cards }: { cards: readonly GuideCard[] }) {
  return (
    <div className={styles.cardGrid}>
      {cards.map((card) => (
        <article key={card.title} className={styles.guideCard}>
          <span className={styles.kicker}>{card.reference}</span>
          <h3>{card.title}</h3>
          <p>{card.text}</p>
          <div className={styles.sourceRow}>
            <span>Fuentes</span>
            <SourceLinks ids={card.sources} />
          </div>
        </article>
      ))}
    </div>
  );
}

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
          territorio, la organización comunitaria y algunas de sus actuaciones,
          con lo que dice la ley, los derechos que respaldan al Consejo y los
          datos de su municipio. Cada hecho lleva a su fuente.
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
      <nav className={styles.toc} aria-label="En esta página">
        {sectionIndex.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <p className="muted" role="status">
        {notice}
      </p>

      <section
        id="por-que-existe"
        className={styles.context}
        aria-labelledby="why-council"
      >
        <div>
          <span className="eyebrow">POR QUÉ EXISTE</span>
          <h2 id="why-council">La comunidad decide sobre su territorio.</h2>
        </div>
        <div className={styles.contextText}>
          <p>
            La gente del río vive aquí desde mucho antes de las leyes. Según el
            historiador Óscar Almario García, entre 1729 y 1818 la minería de
            oro del Pacífico se trabajaba sobre todo con cuadrillas de personas
            esclavizadas, con Barbacoas como gran centro urbano de la región; ya
            había negros libres, que habían comprado su libertad o se habían
            manumitido. La Ley 2 de 1851 puso fin legal a la esclavitud desde el
            1 de enero de 1852.
          </p>
          <p>
            En 1991 la Constitución ordenó, en su artículo transitorio 55, una
            ley que reconociera la propiedad colectiva de las comunidades negras
            de las zonas ribereñas del Pacífico. La Ley 70 de 1993 lo hizo y
            previó el Consejo Comunitario como forma de administración interna
            de cada comunidad. El Decreto 1745 de 1995 reguló la Asamblea, la
            Junta y el título colectivo.
          </p>
          <p>
            Este Consejo no es el Concejo Municipal. Los documentos consultados
            explican las normas y los actos oficiales; no recogen las
            negociaciones de 1991 a 1993 ni la memoria oral de la comunidad, que
            el Consejo puede aportar.
          </p>
        </div>
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

      <section
        id="linea-de-tiempo"
        className={styles.chronology}
        aria-labelledby="history-title"
      >
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

      <section
        id="organizacion"
        className={styles.governance}
        aria-labelledby="governance-title"
      >
        <span className="eyebrow">CÓMO SE ORGANIZA</span>
        <h2 id="governance-title">Quién decide y quién ejecuta.</h2>
        <div className={styles.governanceGrid}>
          {councilOrganization.map((card) => (
            <article key={card.title}>
              <span>{card.reference}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
        <p className={styles.legalNote}>
          Funciones generales según el texto del{" "}
          <a
            href={councilSources.decree1745.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Decreto 1745 de 1995 <ArrowUpRight size={13} aria-hidden="true" />
          </a>{" "}
          que publica Función Pública, sin notas de modificación: confirma su
          vigencia antes de usarlo en una decisión. La composición y el
          reglamento vigentes del Consejo requieren validación de su Asamblea.
        </p>
      </section>

      <section
        id="derechos"
        className={styles.rights}
        aria-labelledby="rights-title"
      >
        <span className="eyebrow">DERECHOS</span>
        <h2 id="rights-title">Lo que respalda al Consejo.</h2>
        <p className={styles.lead}>
          Normas y sentencias que un Consejo Comunitario puede invocar. Cada
          tarjeta dice dónde se lee el texto completo.
        </p>
        <GuideCards cards={councilRights} />
        <p className={styles.legalNote}>
          Es un resumen informativo, no asesoría jurídica. Lee el texto completo
          y, si hace falta, consulta con un abogado.
        </p>
      </section>

      <section
        id="territorio"
        className={styles.territory}
        aria-labelledby="territory-title"
      >
        <span className="eyebrow">EL TERRITORIO</span>
        <h2 id="territory-title">Un municipio, tres consejos.</h2>
        <p className={styles.lead}>
          Olaya Herrera está en el litoral Pacífico de Nariño. El municipio se
          creó en 1975 y su cabecera, Bocas de Satinga, queda a 538 kilómetros
          de Pasto. En 2024 la Defensoría del Pueblo contaba en él 68 veredas y
          20 barrios, tres consejos comunitarios y tres resguardos indígenas: La
          Floresta, Bacao Turbio y Sanquianguita.
        </p>
        <div className={styles.titleGrid}>
          {titledCouncils.map((council) => (
            <article
              key={council.name}
              className={`${styles.titleCard} ${council.current ? styles.current : ""}`}
            >
              {council.current && (
                <span className={styles.badge}>Este Consejo</span>
              )}
              <h3>{council.name}</h3>
              {council.registeredAs && (
                <p className={styles.alias}>
                  En el Ministerio del Interior: {council.registeredAs}
                </p>
              )}
              <dl>
                <div>
                  <dt>Título</dt>
                  <dd>
                    {council.act} · {council.date}
                  </dd>
                </div>
                <div>
                  <dt>Extensión</dt>
                  <dd>{council.hectares} hectáreas</dd>
                </div>
                <div>
                  <dt>Ministerio del Interior, 2019</dt>
                  <dd>Inscrito</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <p className={styles.legalNote}>
          Los títulos son los del registro de la ANT, que advierte que el área
          calculada sobre la cartografía puede variar mientras se valida;
          «último acto» puede incluir ampliaciones posteriores. Río Satinga, Río
          Sanquianga y Gualmar son consejos vecinos con territorio propio: no se
          deben confundir.
        </p>
        <div className={styles.sourceRow}>
          <span>Fuentes</span>
          <SourceLinks
            ids={["titleRegistry", "registry", "municipalPlan", "defensoria"]}
          />
        </div>
      </section>

      <section
        id="palabras"
        className={styles.glossary}
        aria-labelledby="glossary-title"
      >
        <span className="eyebrow">PALABRAS CLAVE</span>
        <h2 id="glossary-title">Cómo se llama cada cosa.</h2>
        <dl className={styles.glossaryList}>
          {councilGlossary.map((entry) => (
            <div key={entry.term}>
              <dt>{entry.term}</dt>
              <dd>
                {entry.definition}
                <small className={styles.inlineSources}>
                  Fuente: <SourceLinks ids={entry.sources} />
                </small>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        id="por-completar"
        className={styles.pending}
        aria-labelledby="pending-title"
      >
        <span className="eyebrow">POR COMPLETAR</span>
        <h2 id="pending-title">Lo que solo el Consejo puede aportar.</h2>
        <p className={styles.lead}>
          Ninguna fuente pública resuelve estos puntos. Mientras no estén, este
          banco no afirma quién representa hoy al Consejo ni cuántas familias lo
          componen.
        </p>
        <ul className={styles.pendingList}>
          {councilPending.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section
        id="fuentes"
        className={styles.library}
        aria-labelledby="sources-title"
      >
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
