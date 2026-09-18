import { beforeEach, expect, it, vi } from "vitest";

/**
 * El borrador de quien todavía no ha entrado.
 *
 * Quien llena el formulario sin sesión y le da a enviar no puede perder lo
 * escrito: se guarda como borrador y se le manda a entrar. Pero los borradores
 * van por cuenta —`owner:{uid}`— y este todavía no tiene dueño, así que queda
 * suelto y hay que adoptarlo al entrar.
 *
 * Lo que estas pruebas sostienen es que **adoptar no sea un agujero**. En el río
 * los teléfonos se prestan: si cualquier borrador suelto se adoptara al entrar,
 * la siguiente persona se encontraría el reporte a medias de la anterior, con lo
 * que hubiera escrito dentro. Por eso solo se adopta dentro del mismo flujo que
 * lo guardó, y nunca por encima de un borrador propio.
 */
const state = vi.hoisted(() => ({
  marca: null as string | null,
  /* Los borradores guardados, por clave: `undefined` es el suelto. */
  borradores: new Map<string, { description: string }>(),
  escrituras: [] as Array<[string, unknown]>,
}));

vi.mock("../../src/data/local-store", () => ({
  readDraft: async (owner?: string) => state.borradores.get(owner ?? "suelto"),
  writeDraft: async (draft: unknown, owner?: string) => {
    const clave = owner ?? "suelto";
    state.escrituras.push([clave, draft]);
    if (draft) state.borradores.set(clave, draft as { description: string });
    else state.borradores.delete(clave);
  },
}));

import {
  adoptar,
  hayMarca,
  marcar,
  olvidarMarca,
} from "../../src/data/borrador-huerfano";

beforeEach(() => {
  state.marca = null;
  state.borradores.clear();
  state.escrituras = [];
  vi.stubGlobal("sessionStorage", {
    getItem: () => state.marca,
    setItem: (_k: string, v: string) => {
      state.marca = v;
    },
    removeItem: () => {
      state.marca = null;
    },
  });
});

it("marcar y olvidar dejan constancia del flujo", () => {
  expect(hayMarca()).toBe(false);
  marcar();
  expect(hayMarca()).toBe(true);
  olvidarMarca();
  expect(hayMarca()).toBe(false);
});

it("adopta el borrador suelto cuando viene de este flujo", async () => {
  marcar();
  state.borradores.set("suelto", { description: "Derrumbe en la vía" });
  expect(await adoptar("ana")).toBe(true);
  expect(state.borradores.get("ana")).toEqual({
    description: "Derrumbe en la vía",
  });
  /* Y deja de estar suelto: si se quedara, lo heredaría el siguiente. */
  expect(state.borradores.has("suelto")).toBe(false);
  expect(hayMarca()).toBe(false);
});

/* El caso del teléfono prestado. Sin la marca, un borrador suelto de otra
   persona se le aparecería a quien entre después, con lo que hubiera escrito. */
it("sin la marca no adopta nada, aunque haya un borrador suelto", async () => {
  state.borradores.set("suelto", { description: "Algo privado de otra persona" });
  expect(await adoptar("ana")).toBe(false);
  expect(state.borradores.has("ana")).toBe(false);
  /* Y no lo borra: no es suyo para borrarlo. */
  expect(state.borradores.has("suelto")).toBe(true);
});

/* Adoptar no puede costarle a nadie su propio trabajo a medias. */
it("nunca pisa un borrador que esa persona ya tenía", async () => {
  marcar();
  state.borradores.set("suelto", { description: "El que acaba de escribir" });
  state.borradores.set("ana", { description: "El que tenía de antes" });
  expect(await adoptar("ana")).toBe(false);
  expect(state.borradores.get("ana")).toEqual({
    description: "El que tenía de antes",
  });
  /* La marca se gasta igual: no queda esperando a la siguiente sesión. */
  expect(hayMarca()).toBe(false);
});

it("con la marca pero sin borrador suelto no hace nada", async () => {
  marcar();
  expect(await adoptar("ana")).toBe(false);
  expect(state.escrituras).toEqual([]);
  expect(hayMarca()).toBe(false);
});

/* Un navegador sin `sessionStorage` —o con las cookies bloqueadas— no puede
   tumbar la pantalla de reportar. */
it("sin sessionStorage no revienta", async () => {
  vi.stubGlobal("sessionStorage", undefined);
  expect(hayMarca()).toBe(false);
  expect(() => marcar()).not.toThrow();
  expect(await adoptar("ana")).toBe(false);
});
