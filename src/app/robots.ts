import type { MetadataRoute } from "next";

/**
 * Qué puede recorrer un buscador.
 *
 * Sin este archivo se indexaba todo, y «todo» incluye direcciones de
 * expedientes y del panel del Consejo. Esas pantallas ya exigen sesión y rol
 * —un buscador no vería su contenido—, pero la dirección misma delata que un
 * expediente existe, y eso en un territorio pequeño ya dice demasiado.
 *
 * Se deja abierto lo que es una invitación pública: la bienvenida, el acceso y
 * la guía del proyecto.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/bienvenida/", "/acceso/", "/documentacion/"],
      disallow: [
        "/api/",
        "/admin/",
        "/reporte/",
        "/noticia/",
        "/mis-reportes/",
        "/cuenta/",
        "/comunidad/",
        "/estadisticas/",
        "/mapa/",
        "/inicio/",
        "/reportar/",
      ],
    },
  };
}
