/**
 * El palafito: la casa levantada sobre el agua.
 *
 * Es la marca de la aplicación en el teléfono —el icono del cajón, el de la
 * barra de estado, la pantalla de arranque— y el dibujo que recibe en la
 * portada. Se eligió por lo que es: en el Río Satinga se vive sobre el agua, y
 * ninguna otra aplicación del cajón de un teléfono tiene una casa sobre pilotes.
 *
 * Los trazos y el porqué de su orden están en `palafito-trazos.ts`, aparte, para
 * que los pueda leer también la portada que va dentro del APK, que es una
 * página suelta sin React.
 */
import { TRAZOS_PALAFITO } from "./palafito-trazos";

export { OPACIDAD_ATRAS, TRAZOS_PALAFITO } from "./palafito-trazos";

export function Palafito({
  size = 24,
  casa = "currentColor",
  agua = "currentColor",
  grosor = 1.8,
}: {
  size?: number;
  casa?: string;
  agua?: string;
  grosor?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS_PALAFITO.map(([d, cual, opacidad], i) => (
        <path
          key={i}
          d={d}
          stroke={cual === "agua" ? agua : casa}
          opacity={opacidad}
        />
      ))}
    </svg>
  );
}
