"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Check, MapPinned, Users, X } from "lucide-react";
import { memberHeaders } from "@/data/remote-reports";
import { veredaNames } from "@/domain/territory";
import { toast } from "@/data/toasts";
import "leaflet/dist/leaflet.css";

type Propuesta = {
  clave: string;
  nombre: string;
  nueva: boolean;
  lat: number;
  lng: number;
  aportes: number;
  cuentas: number;
  dispersion: number;
  apartados: number;
  disperso: boolean;
  actualizado: string;
};

/**
 * El mapa de una propuesta: el punto, y un círculo del tamaño de la dispersión.
 *
 * **El círculo y no los puntos sueltos, a propósito.** Dice cuánto se reparten
 * los reportes sin dibujar dónde estuvo cada quien. El Consejo puede abrir los
 * expedientes uno a uno en su bandeja si le hacen falta; esta pantalla no tiene
 * por qué ser un mapa de por dónde anda la gente, y en este territorio esa
 * diferencia no es teórica.
 */
function MapaPropuesta({ propuesta }: { propuesta: Propuesta }) {
  const caja = useRef<HTMLDivElement>(null);
  const { lat, lng, dispersion } = propuesta;
  useEffect(() => {
    let muerto = false;
    let mapa: LeafletMap | undefined;
    void import("leaflet")
      .then((L) => {
        if (muerto || !caja.current) return;
        mapa = L.map(caja.current, {
          zoomControl: false,
          scrollWheelZoom: false,
          attributionControl: false,
        }).setView([lat, lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(mapa);
        /* El radio en metros, que es lo que mide la dispersión. Un mínimo para
           que un grupo muy apretado no dibuje un punto invisible. */
        L.circle([lat, lng], {
          radius: Math.max(dispersion, 120),
          weight: 1,
          color: "#2f7150",
          fillColor: "#7cc98c",
          fillOpacity: 0.18,
        }).addTo(mapa);
        L.circleMarker([lat, lng], {
          radius: 8,
          weight: 3,
          color: "#2f7150",
          fillColor: "#7cc98c",
          fillOpacity: 0.95,
        }).addTo(mapa);
      })
      .catch(() => undefined);
    return () => {
      muerto = true;
      mapa?.remove();
    };
  }, [lat, lng, dispersion]);
  return (
    <div
      ref={caja}
      className="territorio-mapa"
      aria-label={`Mapa de la propuesta para ${propuesta.nombre}`}
    />
  );
}

/**
 * Las veredas que el catálogo no sitúa, y lo que la comunidad propone.
 *
 * Seis de las dieciocho no tienen punto documentado, y sin punto no hay mapa:
 * ni en el formulario del reporte ni en el del territorio. Los reportes de quien
 * está allí van dejando su coordenada; cuando varias coinciden, la propuesta
 * llega aquí.
 *
 * **Aquí no se acepta nada solo.** El catálogo territorial de un consejo
 * comunitario no lo edita una media: la aritmética propone y el Consejo decide,
 * que es la misma frontera que esta aplicación pone en todo lo demás.
 */
export function CouncilTerritory() {
  const [items, setItems] = useState<Propuesta[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  /** La clave de la propuesta cuyo descarte se está escribiendo. */
  const [descartando, setDescartando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  /** La que se está fundiendo, y con cuál. */
  const [fundiendo, setFundiendo] = useState<string | null>(null);
  const [destino, setDestino] = useState("");

  const traer = useCallback(async () => {
    const { headers } = await memberHeaders();
    const response = await fetch("/api/admin/territorio/", {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.items as Propuesta[];
  }, []);

  useEffect(() => {
    let vivo = true;
    traer()
      .then((lista) => vivo && setItems(lista))
      .catch((e: unknown) =>
        vivo && setError(e instanceof Error ? e.message : "No se pudo consultar."),
      )
      .finally(() => vivo && setBusy(false));
    return () => {
      vivo = false;
    };
  }, [traer]);

  function decidir(
    propuesta: Propuesta,
    cuerpo: Record<string, unknown>,
    dicho: string,
  ) {
    setBusy(true);
    setError("");
    setMensaje("");
    (async () => {
      const { headers } = await memberHeaders();
      const response = await fetch("/api/admin/territorio/", {
        method: "POST",
        headers,
        body: JSON.stringify({ clave: propuesta.clave, ...cuerpo }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data as { movidos?: number };
    })()
      .then(async (data) => {
        setDescartando(null);
        setFundiendo(null);
        setMotivo("");
        setDestino("");
        toast(dicho);
        setMensaje(
          typeof data.movidos === "number"
            ? `${dicho} Se cambiaron ${data.movidos} reporte(s) de vereda.`
            : dicho,
        );
        setItems(await traer());
      })
      .catch((e: unknown) => {
        const mal = e instanceof Error ? e.message : "No se pudo guardar.";
        setError(mal);
        toast(mal, "error");
      })
      .finally(() => setBusy(false));
  }

  return (
    <section className="panel council-territory">
      <span className="eyebrow">CONSEJO COMUNITARIO</span>
      <h2>Veredas en el mapa</h2>
      <p>
        Seis veredas del catálogo no tienen punto documentado, y las que la
        comunidad nombra pueden no estar en él. Cuando varios reportes coinciden
        en un sitio, la propuesta aparece aquí. El punto que aceptes será el que
        vea toda la comunidad.
      </p>
      {error && (
        <p className="errors" role="alert">
          {error}
        </p>
      )}
      {mensaje && (
        <p className="notice done" role="status">
          <Check size={15} />
          {mensaje}
        </p>
      )}
      {busy && !items.length && <p>Consultando las propuestas…</p>}
      {!busy && !items.length && (
        <p className="subtle-note">
          Ninguna propuesta pendiente. Aparecen solas cuando al menos tres
          reportes de dos personas distintas sitúan una vereda desde el sitio.
        </p>
      )}
      {items.map((p) => (
        <article className="territorio-propuesta" key={p.clave}>
          <header>
            <MapPinned size={18} />
            <div>
              <strong>{p.nombre}</strong>
              <small>
                {p.nueva
                  ? "No está en el catálogo. La propone la comunidad."
                  : "Está en el catálogo, sin punto documentado."}
              </small>
            </div>
          </header>
          <MapaPropuesta propuesta={p} />
          {/* Las cifras de las que sale el punto. Sin esto, el Consejo estaría
              aceptando un punto porque una pantalla se lo pone delante. */}
          <ul className="territorio-cifras">
            <li>
              <Users size={15} />
              <span>
                {p.aportes} reporte{p.aportes === 1 ? "" : "s"} de {p.cuentas}{" "}
                persona{p.cuentas === 1 ? "" : "s"}
              </span>
            </li>
            <li className={p.disperso ? "error-text" : undefined}>
              <span>
                Repartidos en unos {p.dispersion} m
                {p.apartados > 0 &&
                  ` · ${p.apartados} lejos del resto`}
              </span>
            </li>
            <li>
              <span>
                {p.lat.toFixed(3)}° N · {Math.abs(p.lng).toFixed(3)}° O
              </span>
            </li>
          </ul>
          {p.disperso && (
            <p className="subtle-note">
              Estos reportes no están todos en el mismo sitio. Merece la pena
              abrirlos en la bandeja antes de aceptar el punto.
            </p>
          )}
          <div className="territorio-acciones">
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                decidir(p, { accion: "aceptar" }, `${p.nombre} ya está en el mapa.`)
              }
            >
              <Check size={16} /> Aceptar el punto
            </button>
            {p.nueva && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setFundiendo(fundiendo === p.clave ? null : p.clave);
                  setDescartando(null);
                }}
              >
                Es otra vereda con otro nombre
              </button>
            )}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setDescartando(descartando === p.clave ? null : p.clave);
                setFundiendo(null);
              }}
            >
              <X size={15} /> Descartar
            </button>
          </div>
          {fundiendo === p.clave && (
            <div className="territorio-decision">
              <p>
                Los reportes que dicen «{p.nombre}» pasan a la vereda que elijas,
                y esta deja de proponerse.
              </p>
              <div className="restore-actions">
                <select
                  aria-label="Vereda del catálogo"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                >
                  <option value="">Elegir del catálogo…</option>
                  {veredaNames.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <button
                  className="btn primary"
                  disabled={busy || !destino}
                  onClick={() =>
                    decidir(
                      p,
                      { accion: "fundir", nombre: destino },
                      `«${p.nombre}» pasó a ser ${destino}.`,
                    )
                  }
                >
                  Fundir
                </button>
              </div>
            </div>
          )}
          {descartando === p.clave && (
            <div className="territorio-decision">
              {/* Con motivo, y no por formalidad: descartar apaga esta vereda
                  para siempre —los reportes siguientes ya no la vuelven a
                  proponer— y dentro de un año alguien va a preguntar por qué. */}
              <label className="field-label">
                Por qué se descarta
                <input
                  type="text"
                  value={motivo}
                  maxLength={300}
                  placeholder="Queda fuera del territorio, el nombre no corresponde…"
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </label>
              <button
                className="btn danger"
                disabled={busy || motivo.trim().length < 3}
                onClick={() =>
                  decidir(
                    p,
                    { accion: "descartar", motivo: motivo.trim() },
                    `${p.nombre} queda descartada.`,
                  )
                }
              >
                Descartar
              </button>
            </div>
          )}
        </article>
      ))}
      <p className="subtle-note">
        Cada decisión queda registrada con quién la tomó. Un punto aceptado se
        puede volver a cambiar si más reportes lo sitúan en otro lugar.
      </p>
    </section>
  );
}
