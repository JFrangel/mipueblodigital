import { beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sampleCase } from "../fixtures/cases";

const state = vi.hoisted(() => ({
  account: [] as Record<string, unknown>[],
  community: [] as Record<string, unknown>[],
  error: "",
  loading: false,
  ownError: "",
  ownLoading: false,
  queried: [] as unknown[],
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("../../src/data/session", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSession: () => ({
    uid: "alice",
    ready: true,
    configured: true,
    name: "Alice",
    email: "",
    admin: false,
    avatar: "person",
  }),
}));
vi.mock("../../src/data/account-reports", () => ({
  useAccountReports: (...args: unknown[]) => {
    state.queried = args;
    return {
      items: state.account,
      complete: !state.ownLoading && !state.ownError,
      error: state.ownError,
      loading: state.ownLoading,
      reload: vi.fn(),
    };
  },
}));
vi.mock("../../src/data/community-map", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCommunityReports: () => ({
    items: state.community,
    complete: !state.error && !state.loading,
    error: state.error,
    loading: state.loading,
    reload: vi.fn(),
  }),
}));
import { Workspace } from "../../src/components/workspace";

beforeEach(() => {
  state.account = [
    "pendiente",
    "en_proceso",
    "solucionado",
    "no_solucionado",
  ].map((status, i) => sampleCase({ id: `propio-${i}`, status }));
  state.community = [
    sampleCase({
      id: "publicado",
      title: "Resumen aprobado por el Consejo",
      owner: "community",
    }),
  ];
  state.error = "";
  state.loading = false;
  state.ownError = "";
  state.ownLoading = false;
  state.queried = [];
});
it("el inicio consulta la cuenta sin depender de copias en el dispositivo y cuenta sus cuatro reportes", () => {
  const html = renderToStaticMarkup(
    createElement(Workspace, { section: "inicio" }),
  );
  expect(state.queried[0]).toBe(true);
  expect(html).toMatch(/<small>Mis reportes<\/small><strong>4<\/strong>/);
  expect(html).toMatch(/<small>En proceso<\/small><strong>1<\/strong>/);
  expect(html).toMatch(/<small>Solucionados<\/small><strong>1<\/strong>/);
});
it("el resumen del historial usa los mismos cuatro casos que su lista", () => {
  const html = renderToStaticMarkup(
    createElement(Workspace, { section: "mis-reportes" }),
  );
  expect(html).toMatch(/<dd>4<\/dd><dt>Registrados<\/dt>/);
  expect(html).toContain("4 reportes");
});
it("reportes recientes enseña resúmenes comunitarios y no relatos privados", () => {
  state.account[0].title = "Relato privado que solo ve su autor";
  const html = renderToStaticMarkup(
    createElement(Workspace, { section: "inicio" }),
  );
  expect(html).toContain("Resumen aprobado por el Consejo");
  expect(html).not.toContain("Relato privado que solo ve su autor");
});
it("una consulta comunitaria fallida no se presenta como una lista vacía", () => {
  state.community = [];
  state.error = "No se pudo consultar los reportes de la comunidad.";
  const html = renderToStaticMarkup(
    createElement(Workspace, { section: "inicio" }),
  );
  expect(html).toContain(state.error);
  expect(html).not.toContain("Un espacio por completar");
});

it("mientras se consulta la cuenta no inventa un cero ni muestra una lista vacía", () => {
  state.account = [];
  state.ownLoading = true;
  const home = renderToStaticMarkup(
    createElement(Workspace, { section: "inicio" }),
  );
  expect(home).toMatch(/<small>Mis reportes<\/small><strong>—<\/strong>/);
  const history = renderToStaticMarkup(
    createElement(Workspace, { section: "mis-reportes" }),
  );
  expect(history).toContain("Consultando tus reportes");
  expect(history).not.toContain("Un espacio por completar");
});
it("el historial comunitario informa el error y permite reintentar", () => {
  state.community = [];
  state.error = "No se pudo consultar la comunidad.";
  const html = renderToStaticMarkup(
    createElement(Workspace, { section: "historial" }),
  );
  expect(html).toContain(state.error);
  expect(html).toContain("Actualizar");
  expect(html).not.toContain("Un espacio por completar");
});
it("una respuesta comunitaria vacía confirmada se explica como tal", () => {
  state.community = [];
  const html = renderToStaticMarkup(
    createElement(Workspace, { section: "inicio" }),
  );
  expect(html).toContain("Todavía no hay reportes comunitarios publicados.");
});
