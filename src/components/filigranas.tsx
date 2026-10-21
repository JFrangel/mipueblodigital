import type { ReactNode } from "react";
import type { Motivo } from "@/content/manuales";
import { HojaPlatano } from "@/features/leaf-fall";

/**
 * Los dibujos del territorio, como figuras sueltas.
 *
 * Son los mismos de la filigrana de las tarjetas —`--hoja`, `--ola`, `--monte`…
 * en `globals.css`—, que allí viven como máscaras CSS sobre un color de fondo.
 * Una máscara solo sirve donde el navegador pinta fondos; sobre el papel hay
 * que pedírselo y no siempre llega. Aquí son SVG de línea con `currentColor`,
 * que se imprimen igual que se ven y toman el color de quien los contiene.
 *
 * Si se retoca un trazo en `globals.css`, hay que retocarlo también aquí: son
 * el mismo dibujo en dos tecnologías, y de ahí que se citen por el mismo nombre.
 */
const TRAZOS: Record<Exclude<Motivo, "platano">, ReactNode> = {
  hoja: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </>
  ),
  ola: (
    <>
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </>
  ),
  monte: <path d="m8 3 4 8 5-5 5 15H2L8 3z" />,
  canoa: (
    <>
      <path d="M2 13h20c0 4-3.6 7-10 7S2 17 2 13z" />
      <path d="M6 13V7l11 6" />
      <path d="M2 21c1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0 1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0" />
    </>
  ),
  palma: (
    <>
      <path d="M12 22V7.6" />
      <path d="M12 7.6C10.8 4.2 8 2.4 3.6 2.2c.9 3.9 3.7 5.7 8.4 5.4Z" />
      <path d="M12 7.6c1.2-3.4 4-5.2 8.4-5.4-.9 3.9-3.7 5.7-8.4 5.4Z" />
      <path d="M12 13.4c-1.3-2.9-3.7-4.4-7.1-4.6.9 3.3 3.2 4.9 7.1 4.6Z" />
      <path d="M12 13.4c1.3-2.9 3.7-4.4 7.1-4.6-.9 3.3-3.2 4.9-7.1 4.6Z" />
    </>
  ),
  palafito: (
    <>
      <path d="m2.5 9.5 9.5-6 9.5 6" />
      <path d="M5.5 9.5v5h13v-5" />
      <path d="M7.5 14.5v4M12 14.5v4M16.5 14.5v4" />
      <path d="M10 14.5v-2.5h4v2.5" />
      <path d="M2 20.5c1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0 1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0" />
    </>
  ),
  manglar: (
    <>
      <path d="M12 3.6c-3.1 0-5.3 1.6-5.3 3.6s2.2 3.5 5.3 3.5 5.3-1.5 5.3-3.5S15.1 3.6 12 3.6Z" />
      <path d="M12 10.7v3.6" />
      <path d="M12 14.3c-1.9 0-3.2 1.7-3.7 4.5" />
      <path d="M12 14.3c1.9 0 3.2 1.7 3.7 4.5" />
      <path d="M12 14.3c-.7 1.7-.9 3.2-.8 4.5" />
      <path d="M12 14.3c.7 1.7.9 3.2.8 4.5" />
      <path d="M2 20.8c1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0 1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0" />
    </>
  ),
  canalete: (
    <>
      <path d="M9 3h6" />
      <path d="M12 3v9.2" />
      <path d="M12 12.2c-2.3 1.3-3.4 3.5-3.2 6.1.2 1.9 1.4 2.9 3.2 2.9s3-1 3.2-2.9c.2-2.6-.9-4.8-3.2-6.1Z" />
    </>
  ),
  brujula: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 3.6 2.1 6.3 6.3 2.1-6.3 2.1-2.1 6.3-2.1-6.3L3.6 12l6.3-2.1z" />
    </>
  ),
  atarraya: (
    <>
      <path d="M5 3.5h14l-2.6 17H7.6L5 3.5Z" />
      <path d="M7.4 9.2h9.2" />
      <path d="M8.3 14.8h7.4" />
      <path d="M10 3.5l1.2 17" />
      <path d="M14 3.5l-1.2 17" />
    </>
  ),
  brote: (
    <>
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
    </>
  ),
};

/** Todos los motivos, para repartirlos por turnos entre piezas seguidas. */
export const MOTIVOS = Object.keys(TRAZOS) as Exclude<Motivo, "platano">[];

/**
 * Un dibujo del territorio.
 *
 * Toma el color de `color` y el tamaño de su caja: quien lo usa decide los dos
 * con CSS. `platano` es la excepción: es la hoja de la animación de envío, que
 * lleva sus propios verdes.
 */
export function Filigrana({
  motivo,
  className,
}: {
  motivo: Motivo;
  className?: string;
}) {
  if (motivo === "platano")
    return (
      <span className={className} aria-hidden="true">
        <HojaPlatano />
      </span>
    );
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[motivo]}
    </svg>
  );
}
