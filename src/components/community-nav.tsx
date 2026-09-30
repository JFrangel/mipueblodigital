import Link from "next/link";

export function CommunityNav({ section }: { section: string }) {
  return (
    <nav className="tabs community-tabs" aria-label="Secciones de comunidad">
      {[
        ["comunidad", "Noticias"],
        /* «Historial» a secas se confundía con el de uno mismo, que vive en Mis
           reportes: son dos listas distintas y con reglas distintas. Aquí está
           lo que la comunidad puede ver de los reportes de los demás. */
        ["historial", "Reportes"],
        ["estadisticas", "Estadísticas"],
        ["memoria", "El Consejo"],
      ].map(([id, label]) => (
        <Link
          key={id}
          href={`/${id}/`}
          className={section === id ? "active" : ""}
          aria-current={section === id ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
