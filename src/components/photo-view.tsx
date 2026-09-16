"use client";
import { useRef } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * Una fotografía que se ve entera y se abre a pantalla completa.
 *
 * Entera desde el primer momento: recortada a una altura fija, una foto de
 * teléfono en vertical perdía arriba y abajo justo lo que a veces decide —el
 * árbol del que se habla, o hasta dónde subió el agua—.
 *
 * Y a pantalla completa al pulsarla, porque en la fotografía de un muelle roto
 * el detalle está en un rincón y ese rincón no se ve en una tarjeta. Es un
 * `dialog` de verdad: la tecla de escape, el foco y el fondo los gestiona el
 * navegador, y son tres cosas que a mano se hacen mal.
 */
export function PhotoView({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const full = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={`photo-open ${className}`.trim()}
        onClick={() => full.current?.showModal()}
        aria-label={`${alt}. Ver a pantalla completa`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} />
        <span>
          <Maximize2 size={14} /> Ver completa
        </span>
      </button>
      <dialog
        className="photo-full"
        ref={full}
        onClick={(event) => {
          /* El fondo cierra; la fotografía no, para poder acercarse a mirarla
             sin que se cierre sola. */
          if (event.target === full.current) full.current?.close();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} />
        <button
          type="button"
          className="btn"
          onClick={() => full.current?.close()}
        >
          <X size={15} /> Cerrar
        </button>
      </dialog>
    </>
  );
}
