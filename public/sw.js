/* Public shell only. Authenticated APIs, photographs and tokens are never cached. */
const CACHE = "mi-pueblo-shell-v8";
/* Los comunicados del Consejo, guardados aparte del armazón.
   Es lo único de la API que se conserva, y por tres razones: no llevan sesión
   —la regla de abajo descarta cualquier petición con token—, no contienen
   datos de nadie, y son justo lo que hace falta poder leer cuando no hay
   señal. El resto de la API sigue sin tocar el disco. */
const NEWS = "mi-pueblo-news-v1";
/* Las pantallas de dirección variable: el expediente de un reporte y un
   comunicado concreto. No se pueden precachear —no se sabe cuáles hasta que
   existen—, así que la aplicación guarda las que hacen falta mientras hay
   señal y aquí se sirven cuando no la hay. Sin esto, abrir sin red un reporte
   que este mismo teléfono tiene guardado caía en la página de respaldo: el
   caso estaba, y la pantalla para leerlo no. */
const PAGES = "mi-pueblo-pages-v1";
const esComunicado = pathname =>
  pathname === "/api/news/" || /^\/api\/news\/[^/]+\/$/.test(pathname);
/* Lo imprescindible sin red: reportar, consultar lo propio y la página de
   respaldo. La fotografía entra aquí porque la usa /offline.html y pedirla en
   ese momento sería justo cuando no hay señal. */
const SHELL = ["/inicio/", "/reportar/", "/mis-reportes/", "/offline.html", "/brand/river-welcome.webp", "/brand/pwa-192.png", "/brand/pwa-512.png", "/brand/pwa-maskable-512.png"];
/* El resto de pantallas: sin ellas, navegar sin señal a cualquier otra parte
   caía en la página de respaldo aunque la aplicación pudiera dibujarlas. Van
   aparte y una por una porque addAll es todo o nada: que falte el mapa no debe
   dejar sin instalar el formulario de reportes. */
const EXTRA = ["/mapa/", "/comunidad/", "/historial/", "/estadisticas/", "/memoria/", "/cuenta/", "/documentacion/"];
async function fill(cache, routes) {
  await Promise.all(routes.map(async route => {
    try { await cache.add(route); } catch { /* Se intentará de nuevo en la próxima visita con red. */ }
  }));
}
/* Los fragmentos de JavaScript y CSS que cita cada documento. Sin ellos la
   página llega del caché pero se queda en blanco. */
async function assetsOf(cache, route) {
  const response = await cache.match(route);
  if (!response) return [];
  const html = await response.text();
  return [...new Set([...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(m => m[1]))];
}
self.addEventListener("install", event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  await fill(cache, EXTRA);
  const routes = [...SHELL, ...EXTRA].filter(route => route.endsWith("/"));
  const assets = new Set();
  for (const route of routes) for (const asset of await assetsOf(cache, route)) assets.add(asset);
  await fill(cache, [...assets]);
})()));
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if ((name.startsWith("mi-pueblo-shell-") && name !== CACHE) || (name.startsWith("mi-pueblo-news-") && name !== NEWS) || (name.startsWith("mi-pueblo-pages-") && name !== PAGES)) await caches.delete(name);
  await self.clients.claim();
})()));
/* El worker nunca recibe el token de sesión: al volver la señal pide a una
   pestaña abierta que vacíe la cola de reportes. Sin pestañas abiertas,
   el siguiente inicio de la aplicación reanuda la cola. */
self.addEventListener("sync", event => {
  if (event.tag !== "mpd-outbox") return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) client.postMessage({ type: "flush-outbox" });
  })());
});
/* Tocar el aviso de entrega lleva a la bandeja, no a una pestaña en blanco:
   si hay una ventana abierta se le da el foco y si no, se abre en «Mis
   reportes», que es donde está el recibo. */
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) if ("focus" in client) return client.focus();
    return self.clients.openWindow("/mis-reportes/");
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.headers.has("authorization")) return;
  if (url.pathname.startsWith("/api/")) {
    /* Solo los comunicados públicos. Cualquier otra ruta de la API sale de
       aquí sin tocarse: ahí viajan expedientes, fotografías y cuentas. */
    if (!esComunicado(url.pathname)) return;
    event.respondWith((async () => {
      const cache = await caches.open(NEWS);
      try {
        /* La red manda: una copia vieja solo sirve cuando no hay otra cosa. */
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (!cached) throw error;
        /* Se marca de cuándo es la copia: leer un boletín sin saber que es de
           hace tres días es peor que no leerlo. La pantalla lo dice con esto. */
        const headers = new Headers(cached.headers);
        headers.set("X-Guardado", cached.headers.get("date") || "sí");
        return new Response(await cached.blob(), { status: 200, headers });
      }
    })());
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    event.respondWith((async () => { const cache = await caches.open(CACHE), cached = await cache.match(request); if(cached) return cached; const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response; })()); return;
  }
  if (request.mode === "navigate") event.respondWith((async () => {
    try { return await fetch(request); }
    catch {
      /* Primero el armazón precacheado. Si la dirección es de las variables
         —un expediente, un comunicado— la guardó la aplicación con señal. Se
         busca por la ruta sin la consulta: `/reporte/abc/?desde=mapa` y
         `/reporte/abc/` son la misma pantalla. */
      const cache = await caches.open(CACHE);
      const armazon = await cache.match(url.pathname);
      if (armazon) return armazon;
      const paginas = await caches.open(PAGES);
      return await paginas.match(url.pathname) || await cache.match("/offline.html");
    }
  })());
});
/* Los avisos que llegan con la aplicación cerrada.
   La carga la manda src/server/push.ts y llega como JSON. No se importan los
   scripts de Firebase a propósito: chocarían con la política de contenido que
   la aplicación ya tiene puesta, y añadirían ochenta kilobytes a un archivo
   que hoy se puede leer entero. Leerla a mano son diez líneas.
   Si la carga viene rota se avisa igual, con el nombre de la aplicación: algo
   llegó, y callarse es peor que decirlo sin detalle. Lo que no puede pasar es
   que este oyente reviente, porque se llevaría por delante el modo sin
   conexión, que es lo que más falta hace aquí. */
self.addEventListener("push", event => {
  let carga = {};
  try { carga = event.data ? event.data.json() : {}; } catch { carga = {}; }
  const aviso = carga.notification || {};
  const url = (carga.data && carga.data.url) || "/inicio/";
  event.waitUntil(self.registration.showNotification(aviso.title || "Mi Pueblo Digital", {
    body: aviso.body || "",
    icon: "/brand/pwa-192.png",
    badge: "/brand/pwa-192.png",
    data: { url },
    /* Un aviso por pantalla: si llegan tres cambios del mismo expediente, el
       último sustituye a los anteriores en vez de apilar tres avisos. */
    tag: url,
  }));
});
/* Tocar el aviso lleva al expediente, no a la portada. Si ya hay una pestaña de
   la aplicación abierta se reutiliza —abrir una segunda igual es lo que hace
   que la gente acabe con seis pestañas de lo mismo—: si ya está en esa
   pantalla se enfoca, y si está en otra se lleva. */
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/inicio/";
  event.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const cliente of abiertas) {
      if (new URL(cliente.url).pathname === destino) return cliente.focus();
    }
    const alguna = abiertas[0];
    if (alguna && alguna.navigate) { await alguna.focus(); return alguna.navigate(destino); }
    return self.clients.openWindow(destino);
  })());
});
