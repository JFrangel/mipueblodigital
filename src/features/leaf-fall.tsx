import { Leaf } from "lucide-react";

/**
 * Lluvia de hojas para el momento de enviar un reporte.
 *
 * Cada hoja son dos capas: la exterior cae en línea recta y la interior se
 * balancea y gira. Separarlas es lo que evita la caída rígida de una sola
 * transformación y hace que el movimiento parezca arrastrado por el aire.
 *
 * Las variaciones se derivan del índice, no del azar, para que el servidor y el
 * navegador pinten lo mismo.
 */
export function LeafFall({
  count = 14,
  drifting = false,
}: {
  /** Número de hojas; menos y más lentas mientras el envío está en curso. */
  count?: number;
  /** Repite el ciclo en vez de caer una sola vez. */
  drifting?: boolean;
}) {
  return (
    <div
      className={drifting ? "report-leaves drifting" : "report-leaves"}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => {
        const lane = ((i * 37) % 100) / 100;
        return (
          <span
            key={i}
            style={{
              left: `${4 + lane * 92}%`,
              animationDelay: `${(i % 7) * 0.22}s`,
              animationDuration: `${(drifting ? 5.2 : 3) + ((i * 3) % 7) * 0.32}s`,
            }}
          >
            <i
              style={{
                animationDelay: `${(i % 5) * 0.18}s`,
                animationDuration: `${1.4 + ((i * 5) % 6) * 0.22}s`,
              }}
            >
              <Leaf size={17 + ((i * 11) % 4) * 6} />
            </i>
          </span>
        );
      })}
    </div>
  );
}
