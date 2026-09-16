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
