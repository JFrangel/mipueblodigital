"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import { Crosshair, MapPin, WifiOff, Undo2 } from "lucide-react";
import { veredaReference } from "@/domain/territory";
import { useOnline } from "@/data/network";
import {
  disponible as ubicacionDisponible,
  dondeEstoy,
  motivos,
} from "@/platform/ubicacion";
import "leaflet/dist/leaflet.css";

/**
 * El punto de un reporte, con de dónde salió.
 *
 * El origen viaja con el punto y no aparte porque **son inseparables**: un par
 * de coordenadas sin saber si lo puso un GPS o un dedo sobre un mapa no se
 * puede usar para deducir dónde queda una vereda, y separarlos es la manera de
 * que algún día se pierda por el camino. Los nombres son los del servidor
 * porque este objeto se extiende tal cual dentro del envío.
 */
export type Point = {
  lat: number;
  lng: number;
  pointSource: "aparato" | "mano";
  /** Metros que declaró el aparato, o nulo si lo puso un dedo. */
  pointAccuracy: number | null;
};

/**
 * De dónde sale el punto que se propone. No es un detalle de créditos: quien
 * reporta decide si mueve el marcador según lo fiable que sea el de partida, y
 * un punto deducido de la escuela merece menos confianza que uno del DANE.
 */
const origin = {
  oficial:
    "Punto oficial del DANE para esta localidad. Es la referencia de la vereda, no la ubicación exacta del caso.",
  abierta:
    "Punto de cartografía abierta, sin validar por el Consejo. Es la referencia de la vereda, no la ubicación exacta del caso.",
  escuela:
    "Punto deducido de la escuela rural que lleva el nombre de la vereda. Sitúa el sector; si el caso está lejos de la escuela, muévelo.",
} as const;

/**
 * Ubicación del reporte.
 *
 * Al elegir vereda se muestra su punto documentado. Quien reporta puede
 * arrastrar el mapa y tocar para corregirlo: nadie conoce el sitio mejor que
 * quien está allí. El punto ajustado viaja con el expediente y llega al Consejo
 * marcado como no verificado, porque lo puso la comunidad y no el catálogo.
 *
 * **Y las veredas que el catálogo no sitúa.** Seis de las diecinueve no tienen
 * punto documentado, y hasta ahora eso las dejaba sin mapa y sin manera ninguna
 * de darles una coordenada: el reporte viajaba solo con el nombre y el caso no
 * aparecía en el mapa del territorio. Con «Usar mi ubicación», quien está
 * parado allí le pone el punto que el catálogo no tiene. No es inventar
 * coordenadas —que es lo que esta pantalla se negaba a hacer, y con razón—: es
 * que la persona que está en el sitio diga dónde está el sitio.
 *
 * El mapa se carga bajo demanda y solo con conexión: abrir el formulario en el
 * río no debe costar la descarga de una biblioteca de mapas.
 */
export function VeredaPreview({
  vereda,
  point,
  onPoint,
}: {
  vereda: string;
  point: Point | null;
  onPoint: (point: Point | null) => void;
}) {
  const online = useOnline();
  const reference = vereda ? veredaReference(vereda) : null;
  const lat = point?.lat ?? reference?.lat;
  const lng = point?.lng ?? reference?.lng;

  /**
   * Dónde abre el mapa.
   *
   * Empieza en el punto de la vereda, si lo hay. Si no lo hay, queda en nulo y
   * **no hay mapa hasta que alguien diga dónde está**: dibujar el río entero
   * centrado en cualquier parte no ayuda a nadie a marcar un derrumbe. Al usar
   * la ubicación, ese punto se vuelve el centro y el mapa aparece.
   *
   * Se guarda aparte del punto elegido porque el mapa se construye una sola vez
   * y no puede recentrarse cada vez que alguien toca: se le iría de las manos
   * mientras lo arrastra.
   */
  const [centro, setCentro] = useState<{ lat: number; lng: number } | null>(
    reference?.lat !== undefined && reference.lng !== undefined
      ? { lat: reference.lat, lng: reference.lng }
      : null,
  );
  /** De dónde salió el punto que hay ahora. */
  const [origen, setOrigen] = useState<"mapa" | "aparato" | null>(null);
  const [margen, setMargen] = useState<number | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState("");

  const mapped = centro !== null;
  const container = useRef<HTMLDivElement>(null);
  const marker = useRef<CircleMarker | null>(null);
  /* El manejador vive en una referencia para no reconstruir el mapa al cambiar. */
  const report = useRef(onPoint);
  useEffect(() => {
    report.current = onPoint;
  }, [onPoint]);
  const [failed, setFailed] = useState(false);

  const baseLat = centro?.lat;
  const baseLng = centro?.lng;
  useEffect(() => {
    if (baseLat === undefined || baseLng === undefined || !online) return;
    const centre = { lat: baseLat, lng: baseLng };
    let disposed = false;
    let map: LeafletMap | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        map = L.map(container.current, {
          zoomControl: true,
          // La rueda desplaza la página, no el mapa: en un formulario largo es
          // peor perder el sitio que tener que pellizcar para acercar.
          scrollWheelZoom: false,
        }).setView([centre.lat, centre.lng], 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
          .on("tileerror", () => {
            if (!disposed) setFailed(true);
          })
          .addTo(map);
        marker.current = L.circleMarker([centre.lat, centre.lng], {
          radius: 10,
          weight: 3,
          color: "#2f7150",
          fillColor: "#7cc98c",
          fillOpacity: 0.9,
        }).addTo(map);
        map.on("click", (event) => {
          const { lat: y, lng: x } = event.latlng;
          marker.current?.setLatLng([y, x]);
          /* Tocar el mapa es un punto puesto a mano: pierde el margen del
             aparato, que ya no describe lo que hay en pantalla. */
          setOrigen("mapa");
          setMargen(null);
          setAvisoUbicacion("");
          report.current({
            lat: y,
            lng: x,
            pointSource: "mano",
            pointAccuracy: null,
          });
        });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      marker.current = null;
      map?.remove();
    };
  }, [baseLat, baseLng, online]);

  async function usarMiUbicacion() {
    setBuscando(true);
    setAvisoUbicacion("");
    const resultado = await dondeEstoy();
    setBuscando(false);
    if (typeof resultado === "string") {
      setAvisoUbicacion(motivos[resultado]);
      return;
    }
    const { lat: y, lng: x, exactitud } = resultado;
    setOrigen("aparato");
    setMargen(Math.round(exactitud));
    report.current({
      lat: y,
      lng: x,
      pointSource: "aparato",
      pointAccuracy: Math.round(exactitud),
    });
    /* Si la vereda no tenía punto, este es el primero: el mapa nace aquí.
       Si ya lo tenía, el mapa existe y basta mover el marcador; recentrar
       reconstruiría el mapa entero por debajo de quien lo está mirando. */
    if (!centro) setCentro({ lat: y, lng: x });
    else marker.current?.setLatLng([y, x]);
  }

  if (!vereda)
    return (
      <div className="location-preview">
        <MapPin size={36} />
        <strong>Tu ubicación importa</strong>
        <p>
          El Consejo usa la vereda para ubicar el caso y asignar responsables.
        </p>
      </div>
    );

  const adjusted = point !== null;
  const puedeUbicar = ubicacionDisponible();
  return (
    <div className="location-preview located">
      <div className="located-head">
        <MapPin size={20} />
        <div>
          <strong>{vereda}</strong>
          <small>
            {lat !== undefined && lng !== undefined
              ? `${lat.toFixed(4)}° N · ${Math.abs(lng).toFixed(4)}° O`
              : "Sin punto de referencia documentado"}
          </small>
        </div>
        {adjusted && reference && (
          <button
            type="button"
            className="text-button located-reset"
            onClick={() => {
              if (reference.lat !== undefined && reference.lng !== undefined)
                marker.current?.setLatLng([reference.lat, reference.lng]);
              setOrigen(null);
              setMargen(null);
              setAvisoUbicacion("");
              onPoint(null);
            }}
          >
            <Undo2 size={14} /> Volver al punto de la vereda
          </button>
        )}
      </div>
      {/* El botón se pulsa a propósito, cada vez. En un territorio de casas
          dispersas una coordenada es una persona parada en un sitio a una hora:
          no se pide sola al abrir el formulario, ni se recuerda de una vez para
          la siguiente. */}
      {puedeUbicar && (
        <div className="located-actions">
          <button
            type="button"
            className="btn"
            disabled={buscando}
            onClick={() => void usarMiUbicacion()}
          >
            <Crosshair size={16} />
            {buscando ? "Buscando tu ubicación…" : "Usar mi ubicación"}
          </button>
          {buscando && (
            <small className="muted" role="status">
              Puede tardar medio minuto bajo los árboles.
            </small>
          )}
        </div>
      )}
      {avisoUbicacion && (
        <p className="located-note" role="alert">
          {avisoUbicacion}
        </p>
      )}
      {mapped && online && !failed && (
        <>
          <div
            ref={container}
            className="located-map"
            aria-label={`Mapa de ${vereda}. Toca el mapa para ajustar la ubicación del caso.`}
          />
          <p className="located-note">
            Arrastra el mapa y toca el sitio exacto si el punto no corresponde.
          </p>
        </>
      )}
      {mapped && !online && (
        <p className="located-note">
          <WifiOff size={15} /> Sin conexión no se puede dibujar el mapa. El
          reporte no lo necesita: viaja con el nombre de la vereda.
        </p>
      )}
      {mapped && online && failed && (
        <p className="located-note">
          No se pudo cargar el mapa. Puedes continuar: el reporte viaja con el
          nombre de la vereda.
        </p>
      )}
      <p className="located-note">
        {origen === "aparato"
          ? `Tu ubicación, con ${margen ?? "?"} m de margen. El Consejo la recibe sin verificar y la contrasta en campo.`
          : origen === "mapa"
            ? "Ubicación marcada por ti. El Consejo la recibe sin verificar y la contrasta en campo."
            : !reference
              ? "Todavía no hay un punto documentado para esta vereda. No se inventan coordenadas: usa tu ubicación si estás en el sitio, o envía el reporte con el nombre de la vereda."
              : origin[reference.kind ?? "abierta"]}
      </p>
    </div>
  );
}
