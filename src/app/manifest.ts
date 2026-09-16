import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi Pueblo Digital",
    short_name: "Mi Pueblo",
    description: "Reportes y seguimiento de nuestro territorio",
    start_url: "/inicio/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7f2",
    theme_color: "#104734",
    lang: "es-CO",
    icons: [
      { src: "/brand/pwa-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/brand/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      /* Android recorta el icono a la forma que tenga el lanzador —círculo,
         cuadrado redondeado, gota— y solo garantiza el 80 % central. Sin una
         versión con ese margen, la máscara se lleva el palafito. */
      {
        src: "/brand/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
