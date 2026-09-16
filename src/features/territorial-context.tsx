import {
  historicalVeredas,
  territorialSources,
} from "@/data/territorial-sources";
import { MapPin, ExternalLink, BookOpen, FileText, Compass, ChevronDown } from "lucide-react";

export function TerritorialContext() {
  return (
    <section className="panel territorial-context-card">
      <div className="territory-header">
        <span className="eyebrow">
          <Compass size={15} /> MEMORIA Y TERRITORIO
        </span>
        <h2>Conocer de dónde somos</h2>
        <p className="territory-intro">
          La historia del río Satinga se teje a través de sus comunidades y veredas.
          Registros como <strong>“Territorios Narrados”</strong> de Colombia Aprende destacan a
          <strong className="accent-text"> Las Marías</strong> como una comunidad emblemática de la cuenca media,
          simbolo de memoria e identidad del Gran Consejo Comunitario.
        </p>
      </div>

      <a
        className="territorial-link-card"
        href={territorialSources.culture}
        target="_blank"
        rel="noreferrer"
      >
        <div className="link-card-info">
          <span className="link-card-icon">
            <BookOpen size={20} />
          </span>
          <div>
            <strong>Leer “Las Marías” en Colombia Aprende</strong>
            <small>Recurso de memoria territorial · Título 28</small>
          </div>
        </div>
        <ExternalLink size={16} className="link-arrow" />
      </a>

      <details className="territory-details">
        <summary className="territory-summary">
          <div className="summary-title">
            <MapPin size={18} />
            <span>Localidades documentadas en la zona del Río Satinga</span>
          </div>
          <ChevronDown size={18} className="details-chevron" />
        </summary>
        
        <div className="details-content">
          <p className="territory-note">
            Referencias históricas extraídas del Esquema de Ordenamiento Territorial (EOT 2007).
            La vigencia, denominación y límites del catálogo operativo se validan continuamente con las autoridades del Consejo Comunitario.
          </p>

          <div className="territory-grid">
            {historicalVeredas.map((v) => (
              <span className="territory-chip" key={v}>
                <span className="chip-dot" />
                {v}
              </span>
            ))}
          </div>

          <a
            className="territorial-link-card secondary-card"
            href={territorialSources.eot}
            target="_blank"
            rel="noreferrer"
          >
            <div className="link-card-info">
              <span className="link-card-icon">
                <FileText size={20} />
              </span>
              <div>
                <strong>Consultar documento municipal (EOT 2007)</strong>
                <small>Repositorio CDIM · ESAP</small>
              </div>
            </div>
            <ExternalLink size={16} className="link-arrow" />
          </a>
        </div>
      </details>
    </section>
  );
}
