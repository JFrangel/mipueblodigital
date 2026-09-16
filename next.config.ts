import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad.
 *
 * No había ninguna. En una aplicación que guarda reportes con fotografías y
 * teléfonos eso no es un detalle de configuración: es la diferencia entre que
 * un navegador defienda a quien reporta o no lo haga.
 *
 * La política de contenido se declara por origen, y cada permiso está aquí
 * porque algo concreto lo necesita —las baldosas del mapa, la identidad de
 * Firebase—, no por si acaso. Lo que no está, no se puede cargar.
 */
const csp = [
  "default-src 'self'",
  /* Next inserta sus propios guiones en línea para hidratar. Sin nonce por
     petición no hay forma de permitirlos de otro modo.
     `unsafe-eval` solo en desarrollo: React lo usa para reconstruir pilas de
     llamada y depurar, y sin él la consola local queda coja. En producción
     React no lo usa, y ahí es donde esta política tiene que apretar. */
  `script-src 'self' 'unsafe-inline' https://apis.google.com${
    process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"
  }`,
  /* Leaflet escribe estilos en línea al colocar cada capa y cada marcador. */
  "style-src 'self' 'unsafe-inline'",
  /* Las baldosas del mapa base y las fotografías que sirve la propia
     aplicación; `blob:` es la fotografía que se acaba de elegir, antes de
     enviarla, y `data:` la evidencia que viaja en Base64. */
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "font-src 'self'",
  /* Identidad y datos de Firebase. Supabase y OpenRouter no están: sus claves
     no salen del servidor y el navegador nunca habla con ellos. */
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://accounts.google.com",
  /* Entrar con Google abre una ventana del propio Google y, por debajo, un
     marco oculto en el dominio de autenticación de Firebase que es donde
     viaja la respuesta. Sin declararlos, la política los bloqueaba y el
     acceso fallaba con un mensaje que hablaba de la contraseña. */
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://apis.google.com",
  /* Nadie enmarca esta aplicación dentro de otra: es cómo se roba una sesión
     haciendo pulsar sobre algo que no se ve. */
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const config: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          /* El dictado necesita el micrófono y la evidencia la cámara; el
             resto se cierra. La ubicación no: el punto del mapa se marca a
             mano, y pedir la del aparato sería recoger algo que nadie ofreció. */
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          /* Solo tiene efecto sobre HTTPS, que es como se sirve en producción. */
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};
export default config;
