"use client";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/ui";
import { memberHeaders } from "@/data/remote-reports";

/**
 * La fotografía del expediente, en su fila de la bandeja del Consejo.
 *
 * En una bandeja, la fotografía dice de un vistazo lo que el título tarda un
 * renglón en decir: un derrumbe se reconoce antes por la foto que por «En la
 * zona de Cerca al hipódromo se ha…». El icono de categoría decía el tipo, que
 * ya está escrito debajo.
 *
 * **Solo aquí.** La fotografía de un reporte no sale del Consejo —en el
 * listado de la comunidad estas mismas filas siguen llevando su icono—, y por
 * eso esto vive en su propio archivo y no en la ficha compartida: para que
 * añadirlo a una lista pública tenga que ser una decisión, no un descuido.
 *
 * Llega **solo cuando la fila se acerca a la pantalla**. El servidor sirve una
 * copia del tamaño de una pantalla, que para un recuadro de 46 px es mucho más
 * de lo que hace falta; cargarlas todas de golpe sería pagar diez de esas por
 * página, y en el río eso se nota. Así se paga solo lo que se mira.
 *
 * Y si no hay fotografía —o no se puede traer— la fila se queda con su icono
 * sin decir nada: una bandeja de expedientes no es el sitio para anunciar que
 * una imagen no cargó.
 */
export function MiniaturaExpediente({
  id,
  category,
}: {
  id: string;
  category: string;
}) {
  const marco = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const nodo = marco.current;
    if (!nodo) return;
    let vivo = true;
    let objeto: string | null = null;

    const traer = async () => {
      try {
        const { headers } = await memberHeaders();
        const respuesta = await fetch(
          `/api/incidents/${id}/evidence/?vista=copia`,
          { headers, signal: AbortSignal.timeout(20000) },
        );
        /* 404 es un reporte sin fotografía, que es normal. */
        if (!respuesta.ok) return;
        const blob = await respuesta.blob();
        if (!vivo) return;
        objeto = URL.createObjectURL(blob);
        setUrl(objeto);
      } catch {
        /* La fila se queda con su icono. */
      }
    };

    const ojo = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        ojo.disconnect();
        void traer();
      },
      { rootMargin: "150px" },
    );
    ojo.observe(nodo);

    return () => {
      vivo = false;
      ojo.disconnect();
      /* Sin esto, cada página de la bandeja deja diez imágenes retenidas en
         memoria hasta que se recargue la aplicación. */
      if (objeto) URL.revokeObjectURL(objeto);
    };
  }, [id]);

  return (
    <span
      ref={marco}
      className={`case-art ${category}${url ? " con-foto" : ""}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <CategoryIcon category={category} size={25} />
      )}
    </span>
  );
}
