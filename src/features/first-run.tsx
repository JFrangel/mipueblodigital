"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { PortadaCarga } from "./portada-carga";
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

  /* La pantalla de arranque la retira `NativeShell`, que está en el diseño
     raíz y por tanto en todas las rutas. Aquí había una segunda llamada de lo
     mismo —se veían las dos en el registro del arranque, una detrás de otra—
     y esta solo cubría la raíz: quien abre desde un aviso entra directo a su
     expediente y no pasaba por aquí. */
  /* El telón va por encima de las dos salidas, y no dentro de la portada.
     Esa portada solo se pinta mientras se decide si es la primera visita, y
     cuando la respuesta ya está guardada se resuelve en el mismo fotograma:
     por eso se veía unas veces sí y otras no. El arranque no puede depender
     de una carrera. */
  return (
    <>
      {/* El telón es lo que pasa **entre** la portada de carga y la
          aplicación: entra cuando ya hay algo que enseñar, tapa lo que había,
          y se abre sobre lo que viene. Mientras se decide, quien cubre la
          espera es la portada, que para eso está. */}
      <TelonHojas listo={visited !== null} />
      {visited ? <Workspace section="inicio" /> : <PortadaCarga />}
    </>
  );
}
