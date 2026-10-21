"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Check, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { useCatalogue, publishCatalogue } from "@/data/vereda-catalogue";
import type { CatalogueItem } from "@/domain/vereda-catalogue";
import { territoryCentre } from "@/domain/territory";
import { memberHeaders } from "@/data/remote-reports";
import "leaflet/dist/leaflet.css";

function LocationPicker({
  initial,
  onChange,
}: {
  initial?: { lat: number; lng: number };
  onChange: (p: { lat: number; lng: number }) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false,
      map: LeafletMap | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !box.current) return;
        const centre = initial ?? territoryCentre;
        map = L.map(box.current, { scrollWheelZoom: false }).setView(
          [centre.lat, centre.lng],
          12,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        let marker = initial
          ? L.circleMarker([initial.lat, initial.lng], {
              color: "#2f7150",
              radius: 9,
            }).addTo(map)
          : null;
        map.on("click", (e) => {
          if (!map) return;
          const point = { lat: e.latlng.lat, lng: e.latlng.lng };
          if (marker) marker.setLatLng(e.latlng);
          else
            marker = L.circleMarker(e.latlng, {
              color: "#2f7150",
              radius: 9,
            }).addTo(map);
          onChange(point);
        });
      })
      .catch(() =>
        setError(
          "No se pudo abrir el mapa. Puedes guardar la vereda sin ubicación.",
        ),
      );
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [initial, onChange]);
  return (
    <>
      {error && (
        <p className="errors" role="alert">
          {error}
        </p>
      )}
      <div
        ref={box}
        className="territorio-mapa"
        aria-label="Toca el mapa para señalar la vereda"
      />
      <p className="subtle-note">
        Toca el mapa para colocar el punto. Puedes volver a tocar para
        corregirlo.
      </p>
    </>
  );
}

export function CouncilCatalogue() {
  const catalogue = useCatalogue();
  const [query, setQuery] = useState(""),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [editing, setEditing] = useState<CatalogueItem | null>(null),
    [name, setName] = useState("");
  const [point, setPoint] = useState<
      { lat: number; lng: number } | undefined
    >(),
    [map, setMap] = useState(false),
    [removing, setRemoving] = useState<string | null>(null),
    [confirming, setConfirming] = useState(false);
  const [initial, setInitial] = useState<
    { lat: number; lng: number } | undefined
  >();
  const pointChanged = useCallback(
    (p: { lat: number; lng: number }) => setPoint(p),
    [],
  );
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { headers } = await memberHeaders();
        const r = await fetch("/api/admin/territorio/catalogo/", {
          headers,
          cache: "no-store",
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (alive) publishCatalogue(data);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  async function save(input: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { headers } = await memberHeaders();
      const r = await fetch("/api/admin/territorio/catalogo/", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...input, version: catalogue.version }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      publishCatalogue(data);
      setEditing(null);
      setRemoving(null);
      setConfirming(false);
      setMessage(
        input.action === "validate"
          ? "Validación registrada por el Consejo."
          : "Catálogo actualizado. Revisa y valida esta versión cuando esté completa.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(item?: CatalogueItem) {
    const value = item ?? {
      id: crypto.randomUUID(),
      name: "",
      aliases: [],
      active: true,
    };
    const p =
      value.lat !== undefined && value.lng !== undefined
        ? { lat: value.lat, lng: value.lng }
        : undefined;
    setEditing(value);
    setName(value.name);
    setPoint(p);
    setInitial(p);
    setMap(false);
    setError("");
  }
  const validated = catalogue.validated?.version === catalogue.version;
  return (
    <section
      className="panel council-territory catalogue-editor"
      aria-busy={busy}
    >
      <span className="eyebrow">TERRITORIO · CONSEJO COMUNITARIO</span>
      <h2>Catálogo de veredas</h2>
      <p>
        Revisa los nombres con la comunidad. Puedes añadir veredas y señalar su
        ubicación cuando la conozcas.
      </p>
      <p className={`notice ${validated ? "done" : ""}`}>
        <Check size={17} />
        {validated
          ? `Catálogo validado · ${new Date(catalogue.validated!.at).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}`
          : "Esta versión está pendiente de validación por el Consejo."}
      </p>
      {error && (
        <p className="errors" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice done" role="status">
          {message}
        </p>
      )}
      <div className="catalogue-toolbar">
        <input
          aria-label="Buscar vereda"
          placeholder="Buscar una vereda…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="btn primary"
          disabled={busy || !!editing}
          onClick={() => edit()}
        >
          <Plus size={16} />
          Añadir vereda
        </button>
      </div>
      {editing && (
        <form
          className="territorio-decision"
          onSubmit={(e) => {
            e.preventDefault();
            void save({
              action: "save",
              id: editing.id,
              name,
              lat: point?.lat ?? null,
              lng: point?.lng ?? null,
            });
          }}
        >
          <h3>{editing.name ? "Editar vereda" : "Nueva vereda"}</h3>
          <label className="field-label">
            Nombre de la vereda
            <input
              autoFocus
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p className="subtle-note">
            Ubicación opcional. Puedes guardar y señalar el punto después.
          </p>
          <div className="territorio-acciones">
            <button
              type="button"
              className="btn"
              onClick={() => setMap((v) => !v)}
            >
              <MapPin size={16} />
              {map ? "Cerrar mapa" : "Señalar ubicación"}
            </button>
            {point && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setPoint(undefined);
                  setInitial(undefined);
                  setMap(false);
                }}
              >
                Quitar ubicación
              </button>
            )}
          </div>
          {map && <LocationPicker initial={initial} onChange={pointChanged} />}
          {point && (
            <p className="subtle-note">
              Punto elegido: {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
            </p>
          )}
          <div className="territorio-acciones">
            <button className="btn primary" disabled={busy}>
              Guardar vereda
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <ul className="catalogue-list">
        {catalogue.items
          .filter((v) =>
            v.name
              .toLocaleLowerCase("es")
              .includes(query.toLocaleLowerCase("es")),
          )
          .map((v) => (
            <li key={v.id}>
              <div>
                <strong>{v.name}</strong>
                <small>
                  {!v.active
                    ? "Retirada · se conserva el historial"
                    : v.lat !== undefined
                      ? "Con ubicación de referencia"
                      : "Sin ubicación · puedes añadirla después"}
                </small>
              </div>
              <div className="territorio-acciones">
                <button
                  className="btn"
                  disabled={busy || !!editing}
                  onClick={() => edit(v)}
                  aria-label={`Editar ${v.name}`}
                >
                  <Pencil size={15} />
                  {v.active ? "Editar" : "Reactivar"}
                </button>
                {v.active && (
                  <button
                    className="text-button"
                    disabled={busy || !!editing}
                    onClick={() => setRemoving(v.id)}
                    aria-label={`Quitar ${v.name}`}
                  >
                    <Trash2 size={15} />
                    Quitar
                  </button>
                )}
              </div>
              {removing === v.id && (
                <div className="territorio-decision">
                  <p>
                    ¿Quitar «{v.name}» de los nuevos reportes? Los expedientes
                    anteriores se conservan.
                  </p>
                  <button
                    className="btn danger"
                    disabled={busy}
                    onClick={() => void save({ action: "remove", id: v.id })}
                  >
                    Confirmar retirada
                  </button>
                  <button className="btn" onClick={() => setRemoving(null)}>
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
      </ul>
      {!validated && !editing && (
        <div className="territorio-decision">
          {confirming ? (
            <>
              <p>
                Confirmo que el Consejo revisó los nombres de esta versión. La
                ubicación de cada vereda puede completarse después.
              </p>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void save({ action: "validate" })}
              >
                Confirmar validación
              </button>
              <button className="btn" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              <Check size={16} />
              Validar catálogo revisado
            </button>
          )}
        </div>
      )}
    </section>
  );
}
