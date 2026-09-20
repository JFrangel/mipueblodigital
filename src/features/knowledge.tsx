"use client";
import { useState } from "react";
import { Search, ArrowUpRight, BookOpen } from "lucide-react";
import { knowledgeSections } from "@/content/knowledge";
export function Knowledge() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("all");
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">CONOCIMIENTO COMPARTIDO</span>
          <h1>Una app que se puede explicar.</h1>
          <p>
            Cómo funciona, dónde están sus límites y cómo darle continuidad.
          </p>
        </div>
        <span className="icon-tile">
          <BookOpen />
        </span>
      </div>
      {/* Decía «versión en preparación para el piloto», y eso dejó de ser
          cierto: la aplicación está en uso. Lo que sigue pendiente no es el
          software sino los acuerdos, y conviene no mezclar las dos cosas.

          Y la lista de pendientes se quedó vieja **por el lado bueno**: decía
          que faltaban el empaquetado móvil y las notificaciones del sistema, y
          las dos cosas están hechas y en manos de la gente. Una lista de
          pendientes que no se corrige cuando algo se termina deja de ser un
          aviso honesto y pasa a ser un descuido: quien la lee no puede saber
          qué parte sigue siendo verdad. */}
      <div className="notice">
        Esta guía describe la aplicación tal como funciona hoy. El empaquetado
        para Android y los avisos del sistema ya están hechos: la aplicación se
        instala en el teléfono, avisa por su cuenta y se actualiza desde dentro.
        Lo que sigue pendiente lo está de verdad, y es el piloto con la
        comunidad. Las responsabilidades, el presupuesto y los criterios de
        publicación se acuerdan con el Consejo y se dejan en acta.
      </div>
      <div className="search wide">
        <Search size={18} />
        <input
          placeholder="Buscar en la guía…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="knowledge-layout">
        <aside className="knowledge-nav">
          <button
            className={active === "all" ? "selected" : ""}
            onClick={() => setActive("all")}
          >
            Toda la guía <ArrowUpRight size={15} />
          </button>
          {knowledgeSections.map((s) => (
            <button
              className={active === s.id ? "selected" : ""}
              key={s.id}
              onClick={() => setActive(s.id)}
            >
              {s.title}
            </button>
          ))}
        </aside>
        <div>
          {knowledgeSections
            .filter((s) => active === "all" || s.id === active)
            .map((s) => {
              const entries = s.entries.filter((e) =>
                (e.question + " " + e.answer)
                  .toLocaleLowerCase()
                  .includes(query.toLocaleLowerCase()),
              );
              if (!entries.length) return null;
              return (
                <section className="knowledge-section" key={s.id}>
                  <span className="eyebrow">{s.id}</span>
                  <h2>{s.title}</h2>
                  <p>{s.summary}</p>
                  {entries.map((e) => (
                    <details key={e.question} open={query ? true : undefined}>
                      <summary>{e.question}</summary>
                      <p>{e.answer}</p>
                    </details>
                  ))}
                </section>
              );
            })}
        </div>
      </div>
    </>
  );
}
