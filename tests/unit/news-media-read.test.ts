import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  status: "published",
  unavailable: false,
  missing: false,
  queries: [] as string[],
}));
vi.mock("../../src/server/admin-auth", () => ({
  credentialsReady: async () => {},
  adminServices: () => ({
    db: {
      doc: () => ({
        get: async () => ({
          id: "prueba",
          data: () => ({
            status: state.status,
            title: "Prueba",
            body: "Texto",
            kind: "boletin",
            publishedAt: "2026-10-22",
          }),
        }),
      }),
    },
  }),
}));
vi.mock("../../src/server/evidence", () => ({
  newsMediaRequest: async (query: string) => {
    state.queries.push(query);
    if (state.unavailable) throw new Error("Archivo no disponible");
    if (state.missing) return Response.json([]);
    return Response.json(
      query.includes("select=id,caption")
        ? [{ id: "11111111-1111-4111-8111-111111111111", caption: "Imagen" }]
        : [{ content_base64: "YWJj", mime_type: "image/webp" }],
    );
  },
}));
import { GET as readArticle } from "../../src/app/api/news/[id]/route";
import { GET as readMedia } from "../../src/app/api/news/[id]/media/[mediaId]/route";
const mediaId = "11111111-1111-4111-8111-111111111111";
const request = new Request("http://localhost/api/news/prueba/");
const article = () =>
  readArticle(request, { params: Promise.resolve({ id: "prueba" }) });
const image = (id = mediaId) =>
  readMedia(request, {
    params: Promise.resolve({ id: "prueba", mediaId: id }),
  });
beforeEach(() => {
  state.status = "published";
  state.unavailable = false;
  state.missing = false;
  state.queries = [];
});
it("la API real entrega la lista de imágenes y los bytes del archivo publicado", async () => {
  expect((await (await article()).json()).images).toEqual([
    { id: mediaId, caption: "Imagen" },
  ]);
  const response = await image();
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/webp");
  expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from("abc"));
  expect(state.queries[1]).toContain(`id=eq.${mediaId}&news_id=eq.prueba`);
});
it.each(["draft", "archived"])(
  "no expone el texto ni las imágenes de un comunicado %s",
  async (status) => {
    state.status = status;
    expect((await article()).status).toBe(404);
    expect((await image()).status).toBe(404);
    expect(state.queries).toEqual([]);
  },
);
it("rechaza identificadores inválidos y archivos inexistentes", async () => {
  expect((await image("foto")).status).toBe(404);
  expect(state.queries).toEqual([]);
  state.missing = true;
  expect((await image()).status).toBe(404);
});
it("distingue una caída del archivo y permite seguir leyendo el texto", async () => {
  state.unavailable = true;
  const response = await article();
  expect(response.status).toBe(200);
  expect((await response.json()).images).toEqual([]);
  const media = await image();
  expect(media.status).toBe(503);
  expect(media.headers.get("Cache-Control")).toBe("no-store");
});
