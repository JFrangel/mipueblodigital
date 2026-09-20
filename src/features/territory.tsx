"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type { Map as LeafletMap } from "leaflet";
import { MapPin, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { type Case, statuses, categories, shortDate } from "@/data/catalog";
import { clusterPoints, pageItems } from "@/domain/logic";
import { veredaLoad } from "@/domain/vereda-load";
import { territoryCentre, veredaCatalogue } from "@/domain/territory";
import { CaseList } from "@/components/case-list";
import "leaflet/dist/leaflet.css";
export function Territory({
  items,
  onSelect,
}: {
  /**
   * Todo lo que va al mapa, ya reunido por quien lo dibuja.
   *
   * Pedía por su cuenta los reportes de la comunidad y volvía a mezclarlos,
   * encima de la mezcla que ya le llegaba hecha: dos peticiones idénticas al
   * abrir el mapa para el mismo resultado. La consulta vive ahora arriba, una
   * sola vez, y de ahí baja al mapa, al historial y a las cifras del inicio.
   */
  items: Case[];
  onSelect: (c: Case) => void;
}) {
  const everything = items;
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<LeafletMap | null>(null);
  const [category, setCategory] = useState("all"),
    [query, setQuery] = useState(""),
    [mapReady, setMapReady] = useState(false),
    [mapError, setMapError] = useState(""),
    [zoom, setZoom] = useState(13),
    [groupIds, setGroupIds] = useState<string[] | null>(null),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState("all");
  const filtered = useMemo(
    () =>
      everything.filter(
        (c) =>
          /**
           * Lo descartado no se pinta.
           *
           * «Descartado» es el Consejo diciendo que eso **no era una
           * incidencia**: un duplicado, una equivocación, algo que al mirarlo
           * no resultó ser lo que parecía. Dejarlo aquí pinta un problema
           * donde no lo hay y le carga a una vereda algo que no le
           * corresponde.
           *
           * **Se quita aquí y no de la proyección de la comunidad.** Ahí se
           * decide lo que *consta*, que es cuestión de privacidad; esto es
           * cuestión de qué dibuja el mapa. Quitarlo en el origen lo borraba
           * también del historial, que es justo donde tiene que seguir para
           * que se vea qué se descartó y por qué.
           *
           * Los otros finales sí se pintan: «no solucionado», «bloqueado por
           * conflicto» y «escalado a otra entidad» son problemas de verdad que
           * siguen ahí, y esconderlos sería esconder lo que hay que ver.
           */
          c.status !== "descartado" &&
          (filter === "all" || c.status === filter) &&
          (category === "all" || c.category === category) &&
          (c.title + " " + c.id + " " + c.vereda)
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [everything, filter, category, query],
  );
  /* Respeta los filtros de arriba: la tabla habla del conjunto que se está
     mirando, no de todo el archivo. */
  const load = useMemo(() => veredaLoad(filtered), [filtered]);
  /* Cinco veredas no tienen punto documentado. Sus reportes existen, están en
     la lista y cuentan en las cifras, pero no se pueden dibujar. Callarlo haría
     creer que el mapa muestra todo. */
  const sinPunto = filtered.filter(
    (c) => typeof c.lat !== "number" || typeof c.lng !== "number",
  ).length;
  const groups = useMemo(() => clusterPoints(filtered, zoom), [filtered, zoom]);
  const selected = groupIds
    ? filtered.filter((c) => groupIds.includes(c.id))
    : filtered;
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        const map = L.map(container.current, { zoomControl: false }).setView(
          [territoryCentre.lat, territoryCentre.lng],
          territoryCentre.zoom,
        );
        /* Capa propia para los rótulos, por debajo de los marcadores. Los
           globos de Leaflet viven en un plano que va por encima de todo, así
           que el nombre de una vereda tapaba el número de incidencias del
           grupo que tenía al lado. Aquí la cifra siempre queda delante. */
        map.createPane("veredas");
        const pane = map.getPane("veredas");
        if (pane) {
          pane.style.zIndex = "450";
          pane.style.pointerEvents = "none";
        }
        const documentadas = veredaCatalogue.filter(
          (v) => v.lat !== undefined && v.lng !== undefined,
        );
        /* El encuadre espera a que el contenedor tenga medidas: calculado antes,
           Leaflet parte de un tamaño cero y acaba en cualquier sitio. */
        map.whenReady(() => {
          map.invalidateSize();
          if (documentadas.length > 1)
            map.fitBounds(
              L.latLngBounds(
                documentadas.map((v) => [v.lat as number, v.lng as number]),
              ),
              { padding: [34, 34] },
            );
          setZoom(map.getZoom());
        });
        mapRef.current = map;
        setMapReady(true);
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
          .on("tileerror", () => {
            if (!disposed)
              setMapError(
                "No se pudo cargar parte del mapa. Puedes seguir consultando la lista.",
              );
          })
          .addTo(map);
        map.on("zoomend", () => setZoom(map.getZoom()));
        cleanup = () => {
          map.remove();
          mapRef.current = null;
        };
      })
      .catch(() => {
        if (!disposed)
          setMapError(
            "El mapa no está disponible. La lista conserva los reportes.",
          );
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  /* Las veredas documentadas, rotuladas sobre el mapa. Sin ellas el territorio
     es una mancha verde: quien mira no sabe dónde queda nada, y menos aún si
     todavía no hay reportes. Van por debajo de los grupos y sin interacción,
     porque son referencia, no incidencias. */
  useEffect(() => {
    let disposed = false;
    let clean = () => {};
    import("leaflet").then((L) => {
      if (disposed || !mapRef.current) return;
      const layer = L.layerGroup().addTo(mapRef.current);
      for (const vereda of veredaCatalogue) {
        if (vereda.lat === undefined || vereda.lng === undefined) continue;
        L.circleMarker([vereda.lat, vereda.lng], {
          radius: 4,
          weight: 1.5,
          color: "#2f7150",
          fillColor: "#ffffff",
          fillOpacity: 1,
          interactive: false,
          pane: "veredas",
        })
          .bindTooltip(vereda.name, {
            permanent: true,
            /* A la derecha del punto y fuera del alcance del marcador de
               grupo, que mide 44 píxeles centrados en la misma coordenada.
               Encima lo tapaba el número; debajo, el nombre quedaba por
               detrás del círculo y cortado. Al costado caben los dos, y es
               además como se rotula en cualquier mapa. */
            direction: "right",
            offset: [24, 0],
            className: "vereda-label",
            pane: "veredas",
          })
          .addTo(layer);
      }
      clean = () => layer.remove();
    });
    return () => {
      disposed = true;
      clean();
    };
  }, [mapReady]);
  /**
   * Lo que hay en un punto, al tocarlo.
   *
   * Tocar un marcador acotaba la lista **de más abajo** y nada más. En un
   * teléfono esa lista queda fuera de pantalla, así que tocar un punto no hacía
   * nada visible: había que adivinar que algo había cambiado y bajar a mirar.
   *
   * Ahora el punto cuenta lo que tiene encima del propio mapa, y desde ahí se
   * abre el expediente. Con varios reportes se enseñan los primeros y queda el
   * paso a la lista completa, que es lo que hacía antes.
   *
   * Se arma con nodos, no pegando HTML: el título lo escribe quien reporta, y
   * `textContent` es lo que impide que un reporte pueda meter etiquetas en el
   * mapa de todos.
   */
  const vistaPrevia = useCallback(
    (casos: Case[]) => {
      const caja = document.createElement("div");
      caja.className = "map-preview";

      const titulo = document.createElement("p");
      titulo.className = "map-preview-head";
      titulo.textContent =
        casos.length === 1
          ? casos[0].vereda || "En el territorio"
          : `${casos.length} reportes · ${casos[0].vereda || "el territorio"}`;
      caja.append(titulo);

      const lista = document.createElement("ul");
      /* Cinco caben sin que el globo tape el mapa que se está mirando. */
      for (const caso of casos.slice(0, 5)) {
        const fila = document.createElement("li");
        const boton = document.createElement("button");
        boton.type = "button";

        const estado = document.createElement("span");
        estado.className = `badge ${caso.status}`;
        estado.textContent = statuses[caso.status] ?? caso.status;

        const nombre = document.createElement("strong");
        nombre.textContent = caso.title;

        const pie = document.createElement("small");
        pie.textContent = `${
          categories.find((c) => c.id === caso.category)?.name ??
          "Otra situación"
        } · ${shortDate(caso.date)}`;

        boton.append(estado, nombre, pie);
        boton.addEventListener("click", () => onSelect(caso));
        fila.append(boton);
        lista.append(fila);
      }
      caja.append(lista);

      /* Lo que no cupo, y la salida a la lista de abajo: es lo que hacía este
       marcador antes, y sigue haciendo falta cuando hay más de cinco. */
      if (casos.length > 1) {
        const todos = document.createElement("button");
        todos.type = "button";
        todos.className = "text-button";
        todos.textContent =
          casos.length > 5
            ? `Ver los ${casos.length} en la lista`
            : "Ver estos en la lista";
        todos.addEventListener("click", () => {
          setGroupIds(casos.map((i) => i.id));
          setPage(1);
          mapRef.current?.closePopup();
        });
        caja.append(todos);
      }
      return caja;
    },
    [onSelect],
  );
  useEffect(() => {
    let disposed = false;
    let clean = () => {};
    import("leaflet").then((L) => {
      if (disposed || !mapRef.current) return;
      const layer = L.layerGroup().addTo(mapRef.current);
      groups.forEach((g) => {
        const marker = L.marker([g.lat, g.lng], {
          icon: L.divIcon({
            className: "cluster-marker",
            html: `<span>${g.items.length}</span>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          }),
          title:
            g.items.length === 1
              ? g.items[0].title
              : `${g.items.length} reportes aquí`,
        }).addTo(layer);
        marker.bindPopup(() => vistaPrevia(g.items), {
          className: "map-preview-popup",
          maxWidth: 268,
          minWidth: 238,
          closeButton: true,
          autoPanPadding: [16, 16],
        });
      });
      clean = () => layer.remove();
    });
    return () => {
      disposed = true;
      clean();
    };
  }, [groups, mapReady, vistaPrevia]);
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">NUESTRO TERRITORIO</span>
          <h1>
            Cada punto tiene una <em>historia.</em>
          </h1>
          {/* Qué hay en este mapa, dicho antes de mirarlo. Mezcla dos cosas
              con reglas distintas y callarlo hacía creer que enseña todo, o
              que enseña de más: el reporte de otra persona que no es público
              no llega aquí, y el propio sale aunque no lo sea. */}
          <p>Tus reportes y los que la comunidad puede ver.</p>
        </div>
      </div>
      <div className="filters">
        <label className="search">
          <input
            aria-label="Buscar en el mapa"
            placeholder="Buscar lugar, reporte o código…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
              setGroupIds(null);
            }}
          />
        </label>
        <select
          aria-label="Categoría del mapa"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
            setGroupIds(null);
          }}
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="btn"
          disabled={!mapReady || !filtered.length}
          onClick={() => {
            const valid = filtered.filter(
              (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng),
            );
            if (valid.length)
              mapRef.current?.fitBounds(
                valid.map((c) => [c.lat as number, c.lng as number]),
                { padding: [40, 40], maxZoom: 16 },
              );
          }}
        >
          Encuadrar resultados
        </button>
      </div>
      {mapError && (
        <p role="status" className="notice">
          {mapError}
        </p>
      )}
      <div className="map-layout">
        <div className="map-panel">
          <div className="map-top">
            <span>
              <MapPin size={16} /> Río Satinga
            </span>
            <span className="tag">
              {filtered.length === 1
                ? "1 reporte"
                : `${filtered.length} reportes`}
            </span>
          </div>
          <div
            ref={container}
            /* Muy lejos los rótulos se amontonan y tapan el río. */
            /* Apretados unos contra otros no se lee ninguno: por debajo de
               este acercamiento el territorio se sostiene con los puntos. */
            className={`leaflet-map ${zoom < 11 ? "sin-rotulos" : ""}`}
            aria-label="Mapa de los reportes del territorio"
          />
          <div className="map-caption">
            {groups.length} grupos · {filtered.length} reportes
            {sinPunto > 0 && (
              <>
                {" · "}
                <strong>
                  {sinPunto} sin ubicación en el mapa
                  {sinPunto === 1 ? "" : ""}
                </strong>
              </>
            )}{" "}
            · Mapa base requiere conexión
          </div>
        </div>
        <section className="panel map-results">
          <div className="panel-heading">
            <h2>
              {groupIds ? "Reportes del grupo" : "Reportes del territorio"}
            </h2>
            {groupIds && (
              <button
                className="icon-button"
                aria-label="Ver todo el territorio"
                onClick={() => {
                  setGroupIds(null);
                  setPage(1);
                }}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
          <p className="muted">
            Agrupamos desde 5 reportes cercanos. Las coordenadas idénticas
            comparten marcador incluso con menos casos. Cada reporte conserva su
            seguimiento.
          </p>
          <label className="field-label">
            Estado
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Todos los estados</option>
              {/* Sin «Descartado»: el mapa no los pinta, y un filtro que
                  siempre devuelve la lista vacía es una trampa. */}
              {Object.entries(statuses)
                .filter(([id]) => id !== "descartado")
                .map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <div className="map-list-scroll">
            <CaseList
              items={pageItems(selected, page, 25)}
              onSelect={onSelect}
            />
          </div>
          <div className="pagination">
            <span>
              Página {page} de {Math.max(1, Math.ceil(selected.length / 25))}
            </span>
            <button
              className="icon-button"
              disabled={page === 1}
              aria-label="Página anterior"
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              disabled={page * 25 >= selected.length}
              aria-label="Página siguiente"
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      </div>
      {/* El mapa dice dónde ocurren las cosas; esta tabla dice dónde se están
          resolviendo. La segunda pregunta es la que decide a dónde va el
          Consejo la semana entrante. */}
      {load.length > 0 && (
        <section className="panel vereda-load">
          <div className="panel-heading">
            <h2>Cómo va cada vereda</h2>
            <span className="tag">Ordenado por casos abiertos</span>
          </div>
          <table>
            <thead>
              <tr>
                <th scope="col">Vereda</th>
                <th scope="col">Abiertos</th>
                <th scope="col">Reportes</th>
                <th scope="col">Resueltos de los cerrados</th>
              </tr>
            </thead>
            <tbody>
              {load.map((v) => (
                <tr key={v.vereda}>
                  <th scope="row">
                    {v.vereda}
                    {v.escalated > 0 && (
                      <small>
                        {v.escalated} escalado
                        {v.escalated === 1 ? "" : "s"} a otra entidad
                      </small>
                    )}
                  </th>
                  <td className={v.open ? "open" : ""}>{v.open}</td>
                  <td>{v.total}</td>
                  <td>
                    {v.rate === null ? (
                      /* Cero resueltos de cero decididos no es 0 %: todavía no
                         se sabe, y decir 0 % sería acusar sin datos. */
                      <span className="muted">Sin casos cerrados</span>
                    ) : (
                      <span className="rate">
                        <i
                          style={{ "--parte": v.rate } as React.CSSProperties}
                        />
                        {Math.round(v.rate * 100)} %
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <small className="subtle-note">
            «Abiertos» son los que siguen en la cola del Consejo: pendientes, en
            proceso, bloqueados y escalados. La tasa se calcula solo sobre los
            casos ya decididos, así que una vereda recién incorporada no aparece
            con cero por no haber cerrado nada todavía. Respeta los filtros de
            arriba.
          </small>
        </section>
      )}
    </>
  );
}
