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
    /**
     * Que el *service worker* pueda contestar dentro de la ventana.
     *
     * Todo el trabajo sin conexión de esta aplicación lo sostiene el service
     * worker, y en una ventana de Android no gobierna las peticiones por su
     * cuenta: hay que decirlo. Sin esto, la aplicación instalada se queda sin
     * red aunque el navegador de ese mismo teléfono funcione perfectamente.
     */
    resolveServiceWorkerRequests: true,
  },
  plugins: {
    /**
     * Entrar con Google, de verdad.
     *
     * `signInWithPopup` abre una ventana del navegador, y Google **rechaza el
     * acceso desde vistas web incrustadas**: Android lo manda al navegador del
     * sistema, la sesión queda allí —en otras galletas, en otro sitio— y a la
     * aplicación no vuelve nunca. No es que se vea raro: no funciona.
     *
     * El acceso nativo usa la cuenta que ya está puesta en el teléfono, sin
     * salir de la aplicación, y devuelve una credencial con la que se firma en
     * Firebase. Es además lo que la gente espera: elegir su cuenta de una
     * lista, no teclear una contraseña.
     */
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
    SplashScreen: {
      /**
       * Lo que se ve mientras la ventana alcanza la aplicación.
       *
       * **Se retira sola pase lo que pase.** La puse para que la escondiera la
       * aplicación al estar lista, y sin conexión la aplicación no llegaba a
       * arrancar: el emblema se quedaba ahí para siempre, sin decir nada, y no
       * había manera de salir de él. Una pantalla de arranque que puede
       * atrapar a alguien es peor que no tenerla.
       *
       * Dos segundos: lo suficiente para tapar el arranque, poco para que
       * estorbe. La aplicación la esconde antes si termina antes.
       */
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#123f39",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
