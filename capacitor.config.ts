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
  /**
   * El color de la ventana, y no es el mismo ajuste que el de la pantalla de
   * arranque.
   *
   * Se midió grabando un arranque en el emulador: entre que Android retira su
   * pantalla y la ventana web pinta algo, había **casi un segundo en blanco**
   * —un destello a contraluz cada vez que alguien abre la aplicación—. Esto
   * es el color de la ventana mientras no hay nada dibujado dentro.
   *
   * El mismo verde de `styles.xml`, del telón de hojas y del arranque: desde
   * que se toca el icono hasta que aparece la aplicación no hay un solo
   * cambio de color.
   */
  backgroundColor: "#0d3340",
  server: {
    url,
    /* Nunca HTTP en claro: por aquí viajan sesiones y fotografías. */
    cleartext: false,
    /**
     * Qué se ve cuando la ventana no alcanza el servidor.
     *
     * **Sin esta línea, la página que el APK lleva dentro no se carga nunca.**
     * Capacitor solo la pide si hay `errorPath` —su `BridgeWebViewClient` lo
     * comprueba antes de hacer nada— y si falta, deja el error del propio
     * navegador: «Webpage not available · net::ERR_INTERNET_DISCONNECTED», en
     * inglés, con el robot de Android y sin decir qué hacer. Comprobado en el
     * emulador con la aplicación recién instalada y el aparato en modo avión.
     *
     * Y ese es justamente el caso del territorio: aquí unas cuantas
     * instalaciones van a ser alguien pasando el archivo por Bluetooth o por
     * una memoria, y abriéndolo donde no hay señal.
     *
     * Solo se ve entonces: el primer arranque sin haber alcanzado el servidor
     * ni una vez. Después manda el service worker y no vuelve a aparecer.
     */
    errorPath: "index.html",
    /**
     * Arrancar en la página que va dentro del archivo, no en la web.
     *
     * **Es lo que pone la portada dentro del APK.** Hasta aquí la ventana
     * abría directa contra el servidor, así que su primera pantalla propia no
     * existía hasta que la página había viajado por la red: con la señal del
     * río, segundos en los que lo único que podía verse era el icono que
     * dibuja Android. Con esto el primer fotograma sale del teléfono y es
     * inmediato; la aplicación se carga por detrás y entra cuando llega.
     *
     * Y es **la misma página** que `errorPath` a propósito, no un descuido:
     * cuando hay `server.url`, Capacitor solo sirve del archivo la del error
     * —lo decide `isErrorUrl` en `WebViewLocalServer.shouldInterceptRequest`,
     * todo lo demás se va a la red—. Una página, dos momentos: empieza como
     * portada y, si la aplicación no se alcanza, se queda diciendo que no hay
     * señal. Ella misma los distingue.
     *
     * Tiene que ser `errorPath` **con una barra delante**, y la barra no es un
     * detalle de estilo. Capacitor pega esto a `server.url` tal cual y solo
     * añade la barra cuando no hay `server.url` —ver `Bridge.loadWebView`—, así
     * que sin ella la dirección sale `…vercel.appindex.html`: otro dominio.
     * Medido en el emulador, lo que pasaba entonces es lo peor que podía pasar:
     * como no es el suyo, la ventana **abría la aplicación en Chrome**.
     *
     * Y por lo demás tiene que coincidir con `errorPath`. Si se separan, esto
     * deja de servirse del archivo y se pide a la red: el arranque volvería a
     * depender de la señal, que es lo que esto viene a quitar.
     */
    appStartPath: "/index.html",
    /**
     * El nombre bajo el que se sirve lo que va dentro del APK.
     *
     * Por defecto es `localhost`, y eso deja la página de arranque en **otro
     * origen** que la aplicación: su almacén no es el mismo, así que un reporte
     * escrito ahí quedaría en un cajón que la aplicación no abre nunca.
     *
     * Poniéndolo al dominio de la aplicación, esa página comparte origen con
     * ella y lo que escriba lo recoge la bandeja de envíos. Es lo único que
     * cambia: el dominio ya estaba en las autoridades del servidor local —lo
     * añade `server.url`— así que la intermediación de peticiones es la misma
     * de siempre.
     */
    hostname: new URL(url).host,
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
    /**
     * Las barras del sistema.
     *
     * Capacitor decide si la ventana va a pantalla completa mirando el meta
     * `viewport-fit` de la página, y la página tarda en llegar. Esta pista dice
     * de antemano lo que va a encontrar, para que el arranque no dé el salto
     * de dibujar primero con barras y recolocarlo todo un instante después.
     * Lo que manda sigue siendo la página; esto solo evita el tirón.
     */
    SystemBars: {
      initialViewportFitValueHint: "cover",
    },
    SplashScreen: {
      /**
       * Cuánto puede quedarse puesta la pantalla de arranque como mucho.
       *
       * **No dibuja un segundo logotipo: sostiene el primero.** Esto es lo que
       * más fácil se entiende al revés. El complemento, en Android 12 en
       * adelante, no pinta nada suyo: coge la pantalla que ya está enseñando el
       * sistema —el palafito sobre el azul del río— y la **mantiene** puesta
       * hasta que la aplicación diga que ya hay algo que enseñar
       * (`showWithAndroid12API`, que bloquea el dibujado con un
       * `OnPreDrawListener`). El icono de antes y el de después son el mismo
       * píxel; no hay parpadeo porque no hay dos dibujos.
       *
       * **Con cero no se sostenía nada**, y ese era el agujero: `showOnLaunch`
       * empieza con `if (launchShowDuration == 0) return;`, así que el
       * complemento se iba sin poner el freno. Grabando un arranque se veía el
       * resultado —el icono, y después **dos segundos largos de azul liso** sin
       * nada encima mientras la ventana pedía la página por la red—. No era un
       * destello de color equivocado, que es lo que esto arreglaba antes: era
       * una pantalla vacía del color correcto, que se lee igual de mal.
       *
       * **Diez segundos es el tope, no la espera.** Quien la retira de verdad
       * es la aplicación, en cuanto pinta su primer fotograma
       * (`platform/arranque.ts`, llamado desde `NativeShell`, que está en todas
       * las rutas). Esto es la red de abajo, por si ese aviso no llegara nunca
       * —un fallo de JavaScript, una versión rara del complemento—. Se prefiere
       * holgado antes que corto: pasado el tope no aparece la aplicación, queda
       * el fondo liso de la ventana, así que cortar antes no adelanta nada y
       * solo devuelve el agujero.
       *
       * `launchAutoHide` tiene que seguir encendido para que ese tope exista.
       * Una pantalla de arranque que puede atrapar a alguien sin señal es peor
       * que no tenerla.
       */
      launchAutoHide: true,
      launchShowDuration: 10000,
      backgroundColor: "#0d3340",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
