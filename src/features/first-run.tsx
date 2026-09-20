"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { Logo } from "@/components/ui";
import { TelonHojas } from "./telon-hojas";
import {
  getServerVisited,
  hasVisited,
  subscribeVisit,
} from "@/data/first-visit";

/**
 * Puerta de la raíz: la primera vez lleva a la bienvenida; después abre el
 * inicio. La decisión se toma en el navegador, así que el servidor pinta una
 * portada breve en lugar de adivinar.
 */
export function FirstRun() {
  const router = useRouter();
  const visited = useSyncExternalStore(
    subscribeVisit,
    hasVisited,
    getServerVisited,
  );
  useEffect(() => {
    if (visited === false) router.replace("/bienvenida/");
  }, [visited, router]);
  /* El telón va por encima de las dos salidas, y no dentro de la portada.
     Esa portada solo se pinta mientras se decide si es la primera visita, y
     cuando la respuesta ya está guardada se resuelve en el mismo fotograma:
     por eso se veía unas veces sí y otras no. El arranque no puede depender
     de una carrera. */
  return (
    <>
      {/* El telón no se aparta hasta que hay algo detrás. `visited` es null
          mientras se lee el almacenamiento, y ese rato es justo el de la
          portada de carga: abriendo a ciegas, las hojas descubrían un
          «Preparando tu comunidad…». */}
      <TelonHojas listo={visited !== null} />
      {visited ? (
        <Workspace section="inicio" />
      ) : (
        <div className="splash">
          <Logo />
          <p role="status">Preparando tu comunidad…</p>
        </div>
      )}
    </>
  );
}
