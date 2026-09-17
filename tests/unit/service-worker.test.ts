import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const cached = new Response("illustration", {
    headers: { "content-type": "image/svg+xml" },
  });
  const match = vi.fn(async () => cached);
  const fetch = vi.fn(async () => {
    throw new Error("offline");
  });
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://app.example" },
      addEventListener: (name: string, fn: (event: unknown) => void) => {
        handlers[name] = fn;
      },
    },
    caches: { open: async () => ({ match }) },
    fetch,
    URL,
    Headers,
    Response,
  });
  return { handlers, fetch, match };
}

describe("caché pública sin conexión", () => {
  it("sirve el emblema guardado sin intentar descargarlo", async () => {
    const w = worker();
    let response: Promise<Response> | undefined;
    w.handlers.fetch({
      request: new Request("https://app.example/brand/emblem.svg"),
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
    });
    expect(await (await response)!.text()).toBe("illustration");
    expect(w.fetch).not.toHaveBeenCalled();
  });
  it.each([
    "/api/incidents/",
    "/api/incidents/private/evidence/",
    "/api/account/avatar/",
  ])("nunca intercepta datos privados: %s", (path) => {
    const w = worker();
    const respondWith = vi.fn();
    w.handlers.fetch({
      request: new Request(`https://app.example${path}`),
      respondWith,
    });
    expect(respondWith).not.toHaveBeenCalled();
    expect(w.match).not.toHaveBeenCalled();
  });
  it("no guarda peticiones autenticadas ni siquiera de imágenes públicas", () => {
    const w = worker();
    const respondWith = vi.fn();
    w.handlers.fetch({
      request: new Request("https://app.example/brand/emblem.svg", {
        headers: { authorization: "Bearer fixture" },
      }),
      respondWith,
    });
    expect(respondWith).not.toHaveBeenCalled();
  });
});

/**
 * El mismo truco que `worker()`, con las dos piezas que los avisos necesitan:
 * `registration.showNotification` para dibujarlos y `clients` para decidir a
 * dónde lleva el toque.
 */
function workerDeAvisos(
  abiertas: Array<{
    url: string;
    focus: () => unknown;
    navigate?: (u: string) => unknown;
  }> = [],
) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const mostradas: Array<[string, Record<string, unknown>]> = [];
  const abiertasNuevas: string[] = [];
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://app.example" },
      addEventListener: (name: string, fn: (event: unknown) => void) => {
        handlers[name] = fn;
      },
      registration: {
        showNotification: async (t: string, o: Record<string, unknown>) => {
          mostradas.push([t, o]);
        },
      },
      clients: {
        matchAll: async () => abiertas,
        openWindow: async (u: string) => {
          abiertasNuevas.push(u);
        },
      },
    },
    caches: { open: async () => ({ match: async () => undefined }) },
    fetch: async () => {
      throw new Error("offline");
    },
    URL,
    Headers,
    Response,
  });
  const disparar = async (nombre: string, evento: Record<string, unknown>) => {
    const esperas: Array<Promise<unknown>> = [];
    handlers[nombre]({
      ...evento,
      waitUntil: (p: Promise<unknown>) => esperas.push(p),
    });
    await Promise.all(esperas);
  };
  return { disparar, mostradas, abiertasNuevas };
}

describe("avisos que llegan con la aplicación cerrada", () => {
  /* El aviso lo dibuja el propio service worker. No se importan los scripts de
     Firebase: chocarían con la política de contenido que la aplicación ya tiene
     puesta, y añadirían ochenta kilobytes a un archivo que hoy se lee entero de
     arriba abajo. La carga llega como JSON y se lee a mano. */
  it("un push dibuja la notificación con su dirección", async () => {
    const w = workerDeAvisos();
    await w.disparar("push", {
      data: {
        json: () => ({
          notification: {
            title: "El Consejo actualizó tu reporte",
            body: "Ahora está en «En proceso»",
          },
          data: { url: "/reporte/abc/" },
        }),
      },
    });
    expect(w.mostradas[0][0]).toBe("El Consejo actualizó tu reporte");
    expect(w.mostradas[0][1]).toMatchObject({
      body: "Ahora está en «En proceso»",
      data: { url: "/reporte/abc/" },
      /* Un aviso por pantalla: tres cambios del mismo expediente dejan uno, no
         tres apilados. La etiqueta es lo que lo consigue. */
      tag: "/reporte/abc/",
    });
  });

  /* Una carga rota no puede tumbar el service worker: si se cae, la aplicación
     se queda sin modo sin conexión, que es lo que más falta hace en el río.
     Y se avisa igual: algo llegó, aunque no se entienda qué. */
  it("un push con carga ilegible no revienta y avisa igual", async () => {
    const w = workerDeAvisos();
    await w.disparar("push", {
      data: {
        json: () => {
          throw new Error("carga rota");
        },
      },
    });
    expect(w.mostradas[0][0]).toBe("Mi Pueblo Digital");
  });

  /* Un push sin cuerpo tampoco. */
  it("un push vacío tampoco revienta", async () => {
    const w = workerDeAvisos();
    await w.disparar("push", {});
    expect(w.mostradas).toHaveLength(1);
  });

  it("tocar el aviso abre el expediente cuando no hay pestaña", async () => {
    const w = workerDeAvisos();
    await w.disparar("notificationclick", {
      notification: { close: () => undefined, data: { url: "/reporte/abc/" } },
    });
    expect(w.abiertasNuevas).toEqual(["/reporte/abc/"]);
  });

  /* Abrir una segunda pestaña igual es lo que hace que la gente acabe con seis
     pestañas de la misma aplicación. */
  it("reutiliza la pestaña que ya está en ese expediente", async () => {
    const enfocada: string[] = [];
    const w = workerDeAvisos([
      {
        url: "https://app.example/reporte/abc/",
        focus: () => enfocada.push("abc"),
      },
    ]);
    await w.disparar("notificationclick", {
      notification: { close: () => undefined, data: { url: "/reporte/abc/" } },
    });
    expect(enfocada).toEqual(["abc"]);
    expect(w.abiertasNuevas).toEqual([]);
  });

  /* Si hay una pestaña abierta pero en otra pantalla, se lleva ahí en vez de
     abrir otra. */
  it("lleva a la dirección la pestaña que ya estaba abierta", async () => {
    const llevada: string[] = [];
    const w = workerDeAvisos([
      {
        url: "https://app.example/inicio/",
        focus: () => undefined,
        navigate: (u: string) => llevada.push(u),
      },
    ]);
    await w.disparar("notificationclick", {
      notification: { close: () => undefined, data: { url: "/reporte/abc/" } },
    });
    expect(llevada).toEqual(["/reporte/abc/"]);
    expect(w.abiertasNuevas).toEqual([]);
  });

  /* Un aviso sin dirección lleva a la portada en vez de a ninguna parte. */
  it("un aviso sin dirección lleva al inicio", async () => {
    const w = workerDeAvisos();
    await w.disparar("notificationclick", {
      notification: { close: () => undefined },
    });
    expect(w.abiertasNuevas).toEqual(["/inicio/"]);
  });
});
