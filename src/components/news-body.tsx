import { Fragment } from "react";
import { newsOutline, parseNewsBody, type Span } from "@/domain/news-format";

function Line({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, i) =>
        span.bold ? (
          <strong key={i}>{span.text}</strong>
        ) : span.italic ? (
          <em key={i}>{span.text}</em>
        ) : (
          <Fragment key={i}>{span.text}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * Cuerpo de un comunicado ya interpretado.
 *
 * Se comparte entre la lectura pública y la vista previa del editor: lo que el
 * Consejo ve antes de publicar es exactamente lo que verá la comunidad.
 */
export function NewsBody({ body }: { body: string }) {
  /* Las anclas se calculan con la misma función que dibuja el índice, así que
     un enlace del índice siempre encuentra su apartado. */
  const anchors = new Map(newsOutline(body).map((h) => [h.index, h.id]));
  return (
    <>
      {parseNewsBody(body).map((block, i) => {
        if (block.kind === "heading")
          return (
            <h2 key={i} id={anchors.get(i)}>
              <Line spans={block.spans} />
            </h2>
          );
        if (block.kind === "quote")
          return (
            <blockquote key={i}>
              <Line spans={block.spans} />
            </blockquote>
          );
        if (block.kind === "list")
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <Line spans={item} />
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i}>
            <Line spans={block.spans} />
          </p>
        );
      })}
    </>
  );
}
