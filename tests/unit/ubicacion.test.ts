import { beforeEach, expect, it, vi } from "vitest";

/**
 * Dónde está quien reporta, si decide decirlo.
 *
 * Lo que se sostiene aquí no es que se llame a la API correcta —eso se ve
 * leyendo— sino las tres reglas que hacen que un punto **no** se use, que son
 * las que evitan mentir con una cifra delante:
 *
 * 1. Un margen de error grande es peor que el punto documentado de la vereda.
 * 2. Un punto fuera de la cuenca del Satinga no es de este río.
 * 3. Y cada motivo se dice distinto, porque llevan a sitios distintos: un
 *    permiso se arregla en los ajustes, la señal se arregla saliendo al claro,
 *    y un aparato sin GPS no se arregla.
 */
const state = vi.hoisted(() => ({
  nativo: false,
  /** Lo que contesta el navegador. */
  coords: {
    latitude: 2.2,
    longitude: -78.2,
    accuracy: 12,
  } as { latitude: number; longitude: number; accuracy: number | null },
  fallo: null as { code: number } | null,
  /** Lo que contesta el complemento nativo. */
  permisoNativo: "granted" as string,
  pedidos: 0,
  opciones: [] as unknown[],
}));

vi.mock("../../src/platform/native", () => ({ esNativo: () => state.nativo }));

/* Un doble que se comporta como un complemento de Capacitor: un proxy que
   contesta a cualquier propiedad, `then` incluida. Devolverlo desde una función
   `async` cuelga la promesa para siempre en el teléfono y ningún doble de
   objeto plano lo ve. Ya pasó con el acceso de Google. */
function comoCapacitor<T extends object>(impl: T): T {
  return new Proxy(impl, {
    get: (obj, prop) =>
      prop in obj ? obj[prop as keyof T] : () => new Promise(() => {}),
    has: () => true,
  });
}

vi.mock("@capacitor/geolocation", () => ({
  Geolocation: comoCapacitor({
    checkPermissions: async () => ({
      location: state.permisoNativo,
      coarseLocation: state.permisoNativo,
    }),
    requestPermissions: async () => {
      state.pedidos += 1;
      return {
        location: state.permisoNativo,
        coarseLocation: state.permisoNativo,
      };
    },
    getCurrentPosition: async (opciones: unknown) => {
      state.opciones.push(opciones);
      return { coords: state.coords };
    },
  }),
}));

import {
  dondeEstoy,
  motivos,
  MARGEN_MAXIMO,
  ESPERA_MS,
} from "../../src/platform/ubicacion";

beforeEach(() => {
  state.nativo = false;
  state.coords = { latitude: 2.2, longitude: -78.2, accuracy: 12 };
  state.fallo = null;
  state.permisoNativo = "granted";
  state.pedidos = 0;
  state.opciones = [];
  vi.stubGlobal("navigator", {
    onLine: true,
    geolocation: {
      getCurrentPosition: (
        ok: (p: { coords: typeof state.coords }) => void,
        mal: (e: { code: number; PERMISSION_DENIED: number; TIMEOUT: number }) => void,
        opciones: unknown,
      ) => {
        state.opciones.push(opciones);
        if (state.fallo)
          mal({ ...state.fallo, PERMISSION_DENIED: 1, TIMEOUT: 3 });
        else ok({ coords: state.coords });
      },
    },
  });
});

/* ── Lo que sí ────────────────────────────────────────────────────────── */

it("un punto bueno dentro del territorio se acepta, con su margen", async () => {
  expect(await dondeEstoy()).toEqual({
    lat: 2.2,
    lng: -78.2,
    exactitud: 12,
  });
});

it("en el APK lo pide al complemento, no al navegador", async () => {
  state.nativo = true;
  expect(await dondeEstoy()).toMatchObject({ lat: 2.2, lng: -78.2 });
  /* Y con el permiso ya concedido no vuelve a preguntar: en Android 13 en
     adelante un diálogo de más es un «no» de más esperando a ocurrir. */
  expect(state.pedidos).toBe(0);
});

it("en el APK pide el permiso solo si falta", async () => {
  state.nativo = true;
  state.permisoNativo = "prompt";
  await dondeEstoy();
  expect(state.pedidos).toBe(1);
});

/* ── Lo que no ────────────────────────────────────────────────────────── */

/**
 * El margen no es adorno. Bajo el dosel, o con el GPS recién encendido, un
 * teléfono entrega tranquilamente un punto con dos kilómetros de error. Eso es
 * peor que el punto documentado de la vereda, y ofrecerlo como «tu ubicación»
 * sería mentir con una cifra delante.
 */
it("un punto con demasiado margen se rechaza", async () => {
  state.coords = { latitude: 2.2, longitude: -78.2, accuracy: MARGEN_MAXIMO + 1 };
  expect(await dondeEstoy()).toBe("sin-señal");
});

it("y justo en el límite todavía vale", async () => {
  state.coords = { latitude: 2.2, longitude: -78.2, accuracy: MARGEN_MAXIMO };
  expect(await dondeEstoy()).toMatchObject({ exactitud: MARGEN_MAXIMO });
});

/* Un aparato que no declara margen no está diciendo «cero»: está diciendo que
   no sabe. Tratarlo como bueno es la manera más silenciosa de meter basura. */
it("sin margen declarado se rechaza", async () => {
  state.coords = { latitude: 2.2, longitude: -78.2, accuracy: null };
  expect(await dondeEstoy()).toBe("sin-señal");
});

/**
 * El mismo marco que ya filtra un punto marcado a mano. Un aparato con la
 * ubicación simulada, o un navegador detrás de una red que la deduce de la IP,
 * puede situar a alguien en otro departamento; eso no es un reporte de este río.
 */
it("un punto fuera de la cuenca se rechaza aunque sea exacto", async () => {
  state.coords = { latitude: 4.65, longitude: -74.05, accuracy: 5 }; // Bogotá
  expect(await dondeEstoy()).toBe("fuera-del-territorio");
});

it("el permiso negado se distingue del plazo agotado", async () => {
  state.fallo = { code: 1 };
  expect(await dondeEstoy()).toBe("sin-permiso");
  state.fallo = { code: 3 };
  expect(await dondeEstoy()).toBe("tarde");
});

it("en el APK, el permiso negado se dice y no se pide la posición", async () => {
  state.nativo = true;
  state.permisoNativo = "denied";
  expect(await dondeEstoy()).toBe("sin-permiso");
  expect(state.opciones).toEqual([]);
});

it("un aparato sin geolocalización lo dice", async () => {
  vi.stubGlobal("navigator", { onLine: true });
  expect(await dondeEstoy()).toBe("no-disponible");
});

/* ── Lo que no se guarda ──────────────────────────────────────────────── */

/**
 * `maximumAge: 0`, y no es una optimización: un punto guardado de hace una hora
 * es de otro sitio, y aquí la gente se mueve en canoa. Pintar como «tu
 * ubicación» un punto de donde alguien estuvo es peor que no dar ninguno.
 */
it("nunca acepta un punto guardado, ni en el navegador ni en el APK", async () => {
  await dondeEstoy();
  state.nativo = true;
  await dondeEstoy();
  expect(state.opciones).toHaveLength(2);
  for (const o of state.opciones)
    expect(o).toMatchObject({
      maximumAge: 0,
      enableHighAccuracy: true,
      timeout: ESPERA_MS,
    });
});

/* ── Y que cada motivo diga algo distinto ─────────────────────────────── */

it("los cinco motivos dicen cosas distintas y ninguno queda mudo", () => {
  const dichos = Object.values(motivos);
  expect(dichos).toHaveLength(5);
  expect(new Set(dichos).size).toBe(5);
  for (const dicho of dichos) expect(dicho.length).toBeGreaterThan(30);
});

/* El permiso es el único que se arregla en los ajustes del sistema, y es el
   único que tiene que mandar allí: los demás mandan al mapa, que es lo que sí
   se puede hacer ahí mismo. */
it("solo el permiso manda a los ajustes; los demás, al mapa", () => {
  expect(motivos["sin-permiso"]).toMatch(/ajustes/i);
  for (const clave of ["sin-señal", "tarde", "no-disponible"] as const)
    expect(motivos[clave]).toMatch(/mapa/i);
});
