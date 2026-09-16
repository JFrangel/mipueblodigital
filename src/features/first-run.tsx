"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { Logo } from "@/components/ui";
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
  if (visited) return <Workspace section="inicio" />;
  return (
    <div className="splash">
      <Logo />
      <p role="status">Preparando tu comunidad…</p>
    </div>
  );
}
