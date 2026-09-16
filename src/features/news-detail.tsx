"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, Check, X } from "lucide-react";
import { NewsArt, coverSource } from "@/components/news-art";
import { NewsBody } from "@/components/news-body";
import { newsOutline } from "@/domain/news-format";
import { sayingFor } from "@/domain/signature";
import { CouncilSign } from "@/components/council-sign";

type Bulletin = {
  id: string;
  title: string;
  body: string;
  kind: string;
  art: string | null;
  /** Marca de la portada fotográfica; nula si el comunicado no lleva. */
  cover?: string | null;
  pinned: boolean;
  publishedAt: string | null;
  saying?: string | null;
  images: { id: string; caption: string }[];
};

/**
 * Índice del comunicado.
 *
 * Solo aparece cuando hay suficientes apartados para que valga la pena: en un
 * aviso de tres líneas un índice es ruido. Marca el apartado que se está
 * leyendo, así que la columna dice a la vez qué hay y dónde va uno.
 */
function Outline({ body, here }: { body: string; here: string }) {
  const sections = newsOutline(body);
  if (sections.length < 3) return null;
  return (
    <nav className="rail-outline" aria-label="Apartados del comunicado">
      <span className="eyebrow">En este comunicado</span>
      <ol>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={section.id === here ? "true" : undefined}
            >
              {section.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const longDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "long",
        timeZone: "America/Bogota",
      }).format(new Date(value))
    : "Fecha no disponible";

/**
 * Lectura completa de un comunicado (HU-08).
 *
 * Vive en su propia dirección para que un enlace compartido abra el comunicado
 * y no el listado. Se pide solo el que se va a leer, no los cien del feed.
 */
export function NewsDetail({ id }: { id: string }) {
  const [item, setItem] = useState<Bulletin | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  /* Imagen abierta a pantalla completa: el archivo se guarda sin recomprimir,
     así que ampliarla es lo único que hace visible ese detalle. */
  const [opened, setOpened] = useState<{ id: string; caption: string } | null>(
    null,
  );
  /* Apartado que se está leyendo, para marcarlo en el índice. */
  const [here, setHere] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    fetch(`/api/news/${encodeURIComponent(id)}/`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (alive) setItem(data);
      })
      .catch(() => {
        if (alive)
          setError(
            "No pudimos abrir este comunicado. Puede que ya no esté publicado o que falte conexión.",
          );
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [id]);

  /* El apartado vigente es el último cuyo título ya pasó bajo la cabecera. Se
     mide sobre los títulos ya dibujados en vez de calcular alturas: es lo único
     que sigue siendo cierto cuando una imagen tarda en cargar. */
  useEffect(() => {
    if (!item) return;
    const heads = Array.from(
      document.querySelectorAll<HTMLElement>(".bulletin-body h2[id]"),
    );
    if (heads.length < 2) return;
    let waiting = false;
    const mark = () => {
      waiting = false;
      let current = heads[0];
      for (const head of heads)
        if (head.getBoundingClientRect().top <= 140) current = head;
      setHere(current.id);
    };
    const onScroll = () => {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(mark);
    };
    mark();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [item]);

  /* Escape cierra la imagen ampliada: es lo que espera quien no usa el ratón. */
  useEffect(() => {
    if (!opened) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpened(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [opened]);

  async function share() {
    const url = window.location.href;
    try {
      /* Compartir nativo donde exista; si no, el enlace al portapapeles. */
      if (navigator.share) await navigator.share({ title: item?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="panel bulletin">
      <Link href="/comunidad/" className="text-link bulletin-back">
        <ArrowLeft size={16} /> Volver a la comunidad
      </Link>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {!item && !error && <p role="status">Abriendo el comunicado…</p>}
      {item && (
        <>
          <NewsArt
            art={item.art ?? undefined}
            size={72}
            cover={coverSource(item.id, item.cover)}
          />
          <h1>{item.title}</h1>
          {/* En escritorio el relato y su ficha van en columnas; en el teléfono
              la ficha se coloca antes del texto, como en cualquier noticia. */}
          <div className="bulletin-columns">
            <aside className="bulletin-meta">
              {/* La ficha acompaña la lectura pegada a lo alto de la pantalla;
                  la firma se queda abajo, donde termina el documento. */}
              <div className="meta-card">
                <span className="eyebrow">{item.kind}</span>
                {item.pinned && <span className="tag">Anclado</span>}
                <time>{longDate(item.publishedAt)}</time>
                <button className="btn" onClick={() => void share()}>
                  {copied ? <Check size={16} /> : <Link2 size={16} />}
                  {copied ? "Enlace copiado" : "Compartir"}
                </button>
              {/* Al pie de la ficha, en pantallas anchas: qué trae el
                  comunicado, cuánto queda por leer y el territorio del que
                  habla. La columna deja de ser un hueco blanco junto al
                  texto. */}
                <div className="bulletin-rail">
                  <Outline body={item.body} here={here} />
                  <span className="rail-gauge" aria-hidden="true">
                    <i />
                  </span>
                </div>
              </div>
              {/* Cierra la columna como cierra una carta: la frase que el
                  Consejo eligió para este comunicado y quién la sostiene. */}
              <div className="rail-sign">
                <CouncilSign
                  saying={item.saying?.trim() || sayingFor(item.id)}
                />
              </div>
            </aside>
            <div className="bulletin-read">
              <div className="bulletin-body">
                <NewsBody body={item.body} />
              </div>
              {item.images?.length > 0 && (
                <div className="bulletin-gallery">
                  {item.images.map((image, i) => (
                    <figure key={image.id}>
                      <button
                        type="button"
                        aria-label={`Ampliar ${image.caption || `imagen ${i + 1}`}`}
                        onClick={() => setOpened(image)}
                      >
                        {/* Se sirve por la aplicación; el optimizador no aporta aquí. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/news/${encodeURIComponent(item.id)}/media/${image.id}/`}
                          alt={image.caption || `Imagen ${i + 1} del comunicado`}
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                      {image.caption && (
                        <figcaption>{image.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
              <p className="bulletin-foot">
                Publicado por el Gran Consejo Comunitario Río Satinga. Si algo
                no coincide con lo que ves en el territorio, repórtalo.
              </p>
            </div>
          </div>
        </>
      )}
      {item && opened && (
        <div
          className="photo-view"
          role="dialog"
          aria-modal="true"
          aria-label={opened.caption || "Imagen del comunicado"}
          onClick={() => setOpened(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/news/${encodeURIComponent(item.id)}/media/${opened.id}/`}
            alt={opened.caption || "Imagen del comunicado"}
          />
          {opened.caption && <p>{opened.caption}</p>}
          <button
            type="button"
            className="icon-button"
            aria-label="Cerrar la imagen"
            autoFocus
            onClick={() => setOpened(null)}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </article>
  );
}
