import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Empaquetado Android de Mi Pueblo Digital.
 *
 * **Por qué el APK no lleva la aplicación dentro.** Mi Pueblo Digital no es un
 * sitio estático: las rutas de `/api/` comprueban quién pregunta, hablan con
 * Firestore y con el archivo de fotografías, y eso no puede vivir dentro de un
 * teléfono. Una exportación estática dejaría fuera el envío de reportes, la
 * bandeja del Consejo y la publicación comunitaria, que son la aplicación.
 *
 * Así que el APK es una ventana a la aplicación servida por HTTPS
 * (`server.url`). Lo que no se pierde con eso es lo que más importa en el río:
 * el *service worker* se instala igual dentro de la ventana, así que **todo el
 * trabajo sin conexión sigue funcionando** —reportar sin señal, la cola de
 * envío, los expedientes guardados, los comunicados— exactamente como en el
 * navegador. Ver `docs/arquitectura.md §9`.
 *
 * **La dirección no está escrita aquí a propósito.** Se lee de `MPD_APP_URL`,
 * porque un dominio inventado en un archivo de configuración es la clase de
 * cosa que llega a producción sin que nadie lo mire. Sin esa variable, `npx cap
 * sync` se detiene y lo dice.
 */
const url = process.env.MPD_APP_URL;

if (!url)
  throw new Error(
    "Falta MPD_APP_URL: la dirección HTTPS donde está publicada la aplicación. " +
      "Por ejemplo: MPD_APP_URL=https://mipueblodigital.example npx cap sync",
  );

if (!url.startsWith("https://"))
  throw new Error(
    "MPD_APP_URL tiene que ser HTTPS. Android bloquea el tráfico en claro, y " +
      "por aquí viajan sesiones y fotografías de la comunidad.",
  );

const config: CapacitorConfig = {
  /**
   * Identificador permanente en Google Play: **no se puede cambiar después de
   * publicar**. Confírmalo con el Consejo antes de la primera subida.
   */
  appId: "co.riosatinga.mipueblodigital",
  appName: "Mi Pueblo Digital",
  /* Capacitor exige una carpeta web aunque se cargue lo remoto. La nuestra
     lleva una sola página, la que se ve si la ventana no alcanza el servidor
     en el primer arranque —cuando todavía no hay nada guardado—. */
  webDir: "capacitor/www",
  server: {
    url,
    /* Nunca HTTP en claro: por aquí viajan sesiones y fotografías. */
    cleartext: false,
  },
  android: {
    /* La ventana no guarda contraseñas ni rellena formularios por su cuenta:
       el teléfono se presta, y ese es justamente el riesgo del territorio. */
    webContentsDebuggingEnabled: false,
  },
};

export default config;
