/* Public shell only. Authenticated APIs, photographs and tokens are never cached. */
const CACHE = "mi-pueblo-shell-v6";
/* Los comunicados del Consejo, guardados aparte del armazón.
   Es lo único de la API que se conserva, y por tres razones: no llevan sesión
   —la regla de abajo descarta cualquier petición con token—, no contienen
   datos de nadie, y son justo lo que hace falta poder leer cuando no hay
   señal. El resto de la API sigue sin tocar el disco. */
const NEWS = "mi-pueblo-news-v1";
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
const EXTRA = ["/mapa/", "/comunidad/", "/estadisticas/", "/cuenta/", "/documentacion/"];
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
  for (const name of await caches.keys()) if ((name.startsWith("mi-pueblo-shell-") && name !== CACHE) || (name.startsWith("mi-pueblo-news-") && name !== NEWS)) await caches.delete(name);
  await self.clients.claim();
})()));
/* El worker nunca recibe el token de sesión: al volver la señal pide a una
   pestaña abierta que vacíe la cola de reportes. Si no hay ninguna, el
   navegador reintentará la sincronización más tarde. */
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
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => { const cache = await caches.open(CACHE), cached = await cache.match(request); if(cached) return cached; const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response; })()); return;
  }
  if (request.mode === "navigate") event.respondWith((async () => {
    try { return await fetch(request); }
    catch { const cache=await caches.open(CACHE); return await cache.match(url.pathname) || await cache.match("/offline.html"); }
  })());
});
