"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import { MapPin, WifiOff, Undo2 } from "lucide-react";
import { veredaReference } from "@/domain/territory";
import { useOnline } from "@/data/network";
import "leaflet/dist/leaflet.css";

export type Point = { lat: number; lng: number };

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
  /* El componente se remonta al cambiar de vereda, así que el punto de partida
     es constante durante toda su vida. */
  const baseLat = reference?.lat;
  const baseLng = reference?.lng;
  const mapped = baseLat !== undefined && baseLng !== undefined;
  const container = useRef<HTMLDivElement>(null);
  const marker = useRef<CircleMarker | null>(null);
  /* El manejador vive en una referencia para no reconstruir el mapa al cambiar. */
  const report = useRef(onPoint);
  useEffect(() => {
    report.current = onPoint;
  }, [onPoint]);
  const [failed, setFailed] = useState(false);

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
          report.current({ lat: y, lng: x });
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
        {adjusted && (
          <button
            type="button"
            className="text-button located-reset"
            onClick={() => {
              if (baseLat !== undefined && baseLng !== undefined)
                marker.current?.setLatLng([baseLat, baseLng]);
              onPoint(null);
            }}
          >
            <Undo2 size={14} /> Volver al punto de la vereda
          </button>
        )}
      </div>
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
        {!mapped
          ? "Todavía no hay un punto documentado para esta vereda. No se inventan coordenadas: el reporte viaja con su nombre."
          : adjusted
            ? "Ubicación marcada por ti. El Consejo la recibe sin verificar y la contrasta en campo."
            : origin[reference?.kind ?? "abierta"]}
      </p>
    </div>
  );
}
