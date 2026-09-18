"use client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * La tarjeta que aparece donde algo es tuyo y todavía no has entrado.
 *
 * Nace de una regla que este proyecto ya tenía escrita y que varias pantallas
 * no cumplían: **una cifra que el sistema no puede saber va en blanco, no en
 * cero.** Sin sesión, «Mis reportes: 0» no dice que tengas cero reportes; dice
 * que la aplicación no sabe quién eres, y son cosas distintas. Quien las
 * confunde se va creyendo que su reporte se perdió.
 *
 * Va **dentro** del apartado y no en lugar de él. El mapa sigue enseñando el
 * territorio, la portada sus comunicados y Comunidad sus boletines: solo se
 * reemplaza la parte que sin sesión no puede decir la verdad.
 *
 * El texto dice **qué verías** si entraras, no «inicia sesión» a secas: quien
 * no sabe lo que hay detrás no tiene motivo para entrar, y en el río pedir una
 * cuenta sin decir para qué es pedir mucho.
 *
 * Y las cifras que faltan se enseñan en blanco, con la raya que esta aplicación
 * ya usa para lo que no puede saber. La tarjeta no dice que hay algo detrás:
 * **lo enseña**, con los rótulos de siempre y el hueco donde irá el número.
 */
export function AccesoNecesario({
  icono: Icono,
  titulo,
  cifras,
  children,
}: {
  icono: LucideIcon;
  titulo: string;
  /** Los rótulos de lo que se vería. Se pintan con la raya de «no se sabe». */
  cifras?: readonly string[];
  /** Qué vería esta persona si entrara. No «inicia sesión»: eso lo dice el botón. */
  children: ReactNode;
}) {
  /* Rótulo primero y raya después, que es el orden correcto de una lista de
     definiciones; el estilo las da la vuelta para que el hueco quede encima,
     donde iría el número. Van ocultas a los lectores de pantalla: a quien no ve
     la tarjeta, una hilera de rayas no le dice nada que el texto no diga ya. */
  const huecos = cifras?.length ? (
    <dl className="acceso-cifras" aria-hidden="true">
      {cifras.map((label) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>—</dd>
        </div>
      ))}
    </dl>
  ) : null;

  return (
    <section className="panel acceso-necesario">
      <span className="acceso-icono">
        <Icono size={22} />
      </span>
      <h2>{titulo}</h2>
      <p>{children}</p>
      {huecos}
      <div className="acceso-acciones">
        <Link className="btn primary" href="/acceso/">
          Iniciar sesión
        </Link>
        <Link className="btn" href="/documentacion/">
          Cómo funciona
        </Link>
      </div>
    </section>
  );
}
