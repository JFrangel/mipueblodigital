import { beforeEach, expect, it, vi } from "vitest";

/**
 * Cuándo se traspasan los reportes preparados sin cuenta, y cuándo no.
 *
 * Lo que estas pruebas sostienen no es el traspaso —eso lo fija
 * `outbox-traspaso`— sino **que traspasar no sea un agujero**. En el río los
 * teléfonos se prestan: si al entrar se recogiera cualquier cosa que estuviera
 * esperando en la bandeja, alguien podría acabar enviando a su nombre el
 * reporte que escribió otra persona en el mismo aparato.
 */
const state = vi.hoisted(() => ({
  marca: null as string | null,
  traspasos: [] as Array<[string, string]>,
  movidos: 2,
  revienta: false,
}));

vi.mock("../../src/data/outbox", () => ({
  SIN_CUENTA: "sin-cuenta",
  traspasar: async (de: string, a: string) => {
    if (state.revienta) throw new Error("la base falló");
    state.traspasos.push([de, a]);
    return state.movidos;
  },
}));

import {
  adoptar,
  hayMarca,
  marcar,
  olvidarMarca,
} from "../../src/data/sin-cuenta";

beforeEach(() => {
  state.marca = null;
  state.traspasos = [];
  state.movidos = 2;
  state.revienta = false;
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

it("traspasa lo que esperaba cuando viene de este flujo", async () => {
  marcar();
  expect(await adoptar("ana")).toBe(2);
  expect(state.traspasos).toEqual([["sin-cuenta", "ana"]]);
  /* La marca se gasta: dejarla puesta la haría esperar a la siguiente sesión. */
  expect(hayMarca()).toBe(false);
});

/* El caso del teléfono prestado, que es el que justifica todo esto. */
it("sin la marca no traspasa nada", async () => {
  expect(await adoptar("ana")).toBe(0);
  expect(state.traspasos).toEqual([]);
});

/* Y no se pierde nada si la base falla: siguen esperando sin dueño. */
it("si el traspaso falla se dice con un cero, no con un error", async () => {
  marcar();
  state.revienta = true;
  await expect(adoptar("ana")).resolves.toBe(0);
});

/* Un navegador sin `sessionStorage` —o con las cookies bloqueadas— no puede
   tumbar la pantalla de reportar. */
it("sin sessionStorage no revienta", async () => {
  vi.stubGlobal("sessionStorage", undefined);
  expect(hayMarca()).toBe(false);
  expect(() => marcar()).not.toThrow();
  expect(await adoptar("ana")).toBe(0);
});
