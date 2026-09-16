import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esta dirección no existe · Mi Pueblo Digital",
  robots: { index: false, follow: false },
};

/**
 * Una dirección que no existe.
 *
 * Caía en la pantalla de serie de Next: en inglés a medias, sin la aplicación
 * alrededor y sin ninguna salida. Quien llega aquí casi siempre viene de un
 * enlace viejo o de un expediente que ya no está, así que lo que hace falta no
 * es una disculpa: son las dos puertas por las que se sigue.
 */
export default function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">MI PUEBLO DIGITAL</span>
      <h1>Esta dirección no lleva a ninguna parte.</h1>
      <p>
        Puede que el enlace esté viejo, que el comunicado se haya archivado o
        que el expediente ya no esté a la vista. Nada de lo que hayas reportado
        se pierde por esto: sigue en su sitio.
      </p>
      <div className="account-actions">
        <Link className="btn primary" href="/inicio/">
          Ir al inicio
        </Link>
        <Link className="btn" href="/mis-reportes/">
          Ver mis reportes
        </Link>
      </div>
    </main>
  );
}
