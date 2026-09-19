"use client";
import { useRef, useState } from "react";
import {
  Inbox,
  Bell,
  Newspaper,
  Sparkles,
  ShieldCheck,
  MapPinned,
} from "lucide-react";
import type { Case } from "@/data/catalog";
import { CouncilInbox } from "./council-inbox";
import { AdminAnalysis } from "./admin-analysis";
import { NewsEditor } from "./news-editor";
import { Notifications, useCouncilUnread } from "./notifications";
import { CouncilRoles } from "./council-roles";
import { CouncilTerritory } from "./council-territory";

const tabs = [
  { id: "expedientes", label: "Expedientes", Icon: Inbox },
  { id: "novedades", label: "Novedades", Icon: Bell },
  { id: "comunicados", label: "Comunicados", Icon: Newspaper },
  { id: "analisis", label: "Análisis", Icon: Sparkles },
  { id: "territorio", label: "Territorio", Icon: MapPinned },
  { id: "roles", label: "Quién administra", Icon: ShieldCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];

/**
 * El puesto de trabajo del Consejo.
 *
 * Antes eran cinco paneles apilados en una sola columna: para llegar al
 * análisis había que pasar de largo el editor de comunicados entero. Son
 * oficios distintos, no apartados de uno solo, así que cada uno tiene su
 * pestaña y la pantalla empieza donde empieza el trabajo.
 *
 * Todas se montan a la vez y se ocultan con `hidden` en lugar de desmontarse:
 * cambiar de pestaña con un expediente a medio editar no puede costar la
 * edición, ni obligar a volver a pedir la bandeja al servidor.
 *
 * Hubo una sexta, «En este dispositivo», con lo guardado en este navegador.
 * Era otra lista de reportes con sus filtros y su estado, igual de aspecto a
 * la bandeja pero sin nada detrás: gestionar ahí no salía del aparato. Lo
 * único suyo que no estaba ya en la bandeja —lo que nunca llegó a enviarse—
 * vive ahora dentro de Expedientes, que es donde se mira el trabajo.
 */
export function CouncilPanel({ pending }: { pending: Case[] }) {
  const [active, setActive] = useState<TabId>("expedientes");
  /* El expediente que un aviso pidió abrir. Viaja a la bandeja como búsqueda:
     es lo que ya sabe hacer, y así el aviso lleva a algún sitio en vez de
     quedarse en anunciar que algo pasó. */
  const [focus, setFocus] = useState("");
  const unread = useCouncilUnread();
  const strip = useRef<HTMLDivElement>(null);

  /* Flechas para recorrer las pestañas: es lo que espera quien navega con el
     teclado y lo que pide el patrón de pestañas. */
  function travel(event: React.KeyboardEvent) {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const at = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(at + step + tabs.length) % tabs.length];
    setActive(next.id);
    strip.current
      ?.querySelector<HTMLButtonElement>(`#council-tab-${next.id}`)
      ?.focus();
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            CONSEJO COMUNITARIO · ACCESO RESTRINGIDO
          </span>
          <h1>
            Panel del <em>Consejo</em>
          </h1>
          <p>
            Lo que llegó al servidor. Cada cambio conserva su autor, su motivo y
            su versión.
          </p>
        </div>
      </div>
      <div
        className="tabs community-tabs council-tabs"
        role="tablist"
        aria-label="Secciones del panel del Consejo"
        ref={strip}
        onKeyDown={travel}
      >
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`council-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={active === id}
            aria-controls={`council-panel-${id}`}
            tabIndex={active === id ? 0 : -1}
            className={active === id ? "active" : ""}
            onClick={() => setActive(id)}
          >
            <Icon size={15} />
            {label}
            {id === "novedades" && unread > 0 && (
              <span className="nav-count">{unread}</span>
            )}
          </button>
        ))}
      </div>
      <div
        className="council-tabpanel"
        id="council-panel-expedientes"
        role="tabpanel"
        aria-labelledby="council-tab-expedientes"
        hidden={active !== "expedientes"}
      >
        <CouncilInbox pending={pending} focus={focus} />
      </div>
      <div
        className="council-tabpanel"
        id="council-panel-novedades"
        role="tabpanel"
        aria-labelledby="council-tab-novedades"
        hidden={active !== "novedades"}
      >
        <Notifications
          council
          onOpen={(incidentId) => {
            setFocus(incidentId);
            setActive("expedientes");
          }}
        />
      </div>
      <div
        className="council-tabpanel"
        id="council-panel-comunicados"
        role="tabpanel"
        aria-labelledby="council-tab-comunicados"
        hidden={active !== "comunicados"}
      >
        <NewsEditor />
      </div>
      <div
        className="council-tabpanel"
        id="council-panel-analisis"
        role="tabpanel"
        aria-labelledby="council-tab-analisis"
        hidden={active !== "analisis"}
      >
        <AdminAnalysis />
      </div>
      <div
        className="council-tabpanel"
        id="council-panel-territorio"
        role="tabpanel"
        aria-labelledby="council-tab-territorio"
        hidden={active !== "territorio"}
      >
        {/* Solo se monta al abrirla: trae propuestas y dibuja mapas, y eso no
            tiene por qué pesar en quien entra a mirar los expedientes. */}
        {active === "territorio" && <CouncilTerritory />}
      </div>
      <div
        className="council-tabpanel"
        id="council-panel-roles"
        role="tabpanel"
        aria-labelledby="council-tab-roles"
        hidden={active !== "roles"}
      >
        <CouncilRoles />
      </div>
    </>
  );
}
