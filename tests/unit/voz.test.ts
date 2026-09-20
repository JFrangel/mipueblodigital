import { beforeEach, expect, it, vi } from "vitest";

/**
 * El dictado, en los dos mundos.
 *
 * La deuda de estas pruebas es vieja y concreta. El dictado en el teléfono se
 * rompió **tres veces** y siempre de la misma manera: el texto se repetía o se
 * perdía porque el reconocedor no entrega frases cerradas una detrás de otra,
 * sino la misma frase creciendo. Lo que se sostiene aquí es que esa cicatriz no
 * se vuelva a abrir por el lado nuevo, que es el reconocedor de Android.
 *
 * Y una segunda, que es la que hizo falta arreglar antes de escribirlas: **el
 * reconocedor de Android no escucha un minuto seguido, reconoce una frase y se
 * detiene.** Quien dicta hace pausas. Si cada vuelta escribiera en la misma
 * posición, la segunda frase borraría la primera.
 */
const state = vi.hoisted(() => ({
  nativo: true,
  disponibleNativo: true,
  permisoNativo: "granted" as string,
  pedidos: 0,
  /** Lo que cada vuelta del reconocedor nativo va a entregar, en orden. */
  vueltas: [] as Array<
    { parciales?: string[]; final?: string } | "falla" | { error: string }
  >,
  vueltaActual: 0,
  arranques: [] as unknown[],
  paradas: 0,
  oyentes: [] as Array<(datos: { matches: string[] }) => void>,
  quitados: 0,
  /** El navegador. */
  hayConstructor: true,
  instancia: null as ReconocedorFalso | null,
}));

type ReconocedorFalso = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
  arrancado: boolean;
};

vi.mock("../../src/platform/native", () => ({ esNativo: () => state.nativo }));

/* Proxy, no objeto plano: los complementos de Capacitor contestan a cualquier
   propiedad, `then` incluida, y devolver uno desde una función `async` cuelga
   la promesa para siempre. Ya pasó con el acceso de Google, y un doble de
   objeto plano no lo ve. */
function comoCapacitor<T extends object>(impl: T): T {
  return new Proxy(impl, {
    get: (obj, prop) =>
      prop in obj ? obj[prop as keyof T] : () => new Promise(() => {}),
    has: () => true,
  });
}

vi.mock("@capacitor-community/speech-recognition", () => ({
  SpeechRecognition: comoCapacitor({
    available: async () => ({ available: state.disponibleNativo }),
    checkPermissions: async () => ({ speechRecognition: state.permisoNativo }),
    requestPermissions: async () => {
      state.pedidos += 1;
      return { speechRecognition: state.permisoNativo };
    },
    addListener: async (
      _evento: string,
      fn: (datos: { matches: string[] }) => void,
    ) => {
      state.oyentes.push(fn);
      return { remove: async () => void (state.quitados += 1) };
    },
    start: async (opciones: unknown) => {
      state.arranques.push(opciones);
      const guion = state.vueltas[state.vueltaActual++];
      if (guion === undefined) return { matches: [] };
      if (guion === "falla") throw new Error("No match");
      if ("error" in guion) throw new Error(guion.error);
      /* Los parciales llegan por el oyente, como en el teléfono. */
      for (const parcial of guion.parciales ?? [])
        for (const oyente of state.oyentes) oyente({ matches: [parcial] });
      return { matches: guion.final ? [guion.final] : [] };
    },
    stop: async () => void (state.paradas += 1),
  }),
}));

import { disponible, escuchar, TOPE_MS } from "../../src/platform/voz";

/** Escucha hasta el final y devuelve lo que se pintó y por qué terminó. */
async function dictar() {
  const pintado: string[] = [];
  let motivo: unknown = "todavía-no";
  const fin = new Promise<void>((listo) => {
    void escuchar({
      alTexto: (t) => pintado.push(t),
      alTerminar: (m) => {
        motivo = m;
        listo();
      },
    }).then((abierta) => {
      if (typeof abierta === "string") {
        motivo = abierta;
        listo();
      }
    });
  });
  await fin;
  return { pintado, ultimo: pintado.at(-1) ?? "", motivo };
}

beforeEach(() => {
  state.nativo = true;
  state.disponibleNativo = true;
  state.permisoNativo = "granted";
  state.pedidos = 0;
  state.vueltas = [];
  state.vueltaActual = 0;
  state.arranques = [];
  state.paradas = 0;
  state.oyentes = [];
  state.quitados = 0;
  state.hayConstructor = true;
  state.instancia = null;
  class Constructor {
    onresult: ((e: unknown) => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    lang = "";
    continuous = false;
    interimResults = false;
    arrancado = false;
    constructor() {
      state.instancia = this as unknown as ReconocedorFalso;
    }
    start() {
      this.arrancado = true;
    }
    stop() {
      this.onend?.();
    }
    abort() {
      this.onend?.();
    }
  }
  vi.stubGlobal("window", {
    ...(state.hayConstructor ? { webkitSpeechRecognition: Constructor } : {}),
  });
  vi.stubGlobal("navigator", { onLine: true });
});

/* ── El APK ───────────────────────────────────────────────────────────── */

it("en el APK usa el reconocedor del teléfono y no el del navegador", async () => {
  state.vueltas = [{ final: "hubo un derrumbe" }];
  const { ultimo } = await dictar();
  expect(ultimo).toBe("hubo un derrumbe");
  expect(state.arranques.length).toBeGreaterThan(0);
  /* Y no tocó la API del navegador: si la tocara, en el APK reventaría sin que
     se viera nada, que es exactamente el fallo que se está arreglando. */
  expect(state.instancia).toBeNull();
});

it("pide el permiso solo si falta, y si lo niegan lo dice", async () => {
  state.vueltas = [{ final: "algo" }];
  await dictar();
  expect(state.pedidos).toBe(0);

  state.vueltaActual = 0;
  state.permisoNativo = "denied";
  expect((await dictar()).motivo).toBe("sin-permiso");
  expect(state.pedidos).toBe(1);
});

/**
 * La cicatriz, por el lado nuevo.
 *
 * El reconocedor reemite la misma frase creciendo. Acumular multiplica:
 *
 *     hubohubohubohubo derrumbéhubo derrumbé enhubo derrumbé en la vía
 */
it("una frase que crece no se multiplica", async () => {
  state.vueltas = [
    {
      parciales: ["hubo", "hubo un", "hubo un derrumbe"],
      final: "Hubo un derrumbe en la vía.",
    },
  ];
  const { ultimo } = await dictar();
  expect(ultimo).toBe("Hubo un derrumbe en la vía.");
});

/**
 * Y la trampa propia del APK: el reconocedor se detiene en cada pausa. Si cada
 * vuelta escribiera en la misma posición, la segunda frase borraría la primera
 * y el dictado se iría perdiendo por detrás mientras alguien habla.
 */
it("dos frases seguidas se suman, no se pisan", async () => {
  state.vueltas = [
    { parciales: ["hubo un"], final: "Hubo un derrumbe." },
    { parciales: ["y se llevó"], final: "Y se llevó el puente." },
  ];
  const { ultimo } = await dictar();
  expect(ultimo).toBe("Hubo un derrumbe. Y se llevó el puente.");
});

/* La transcripción buena es la que llega al cerrar la vuelta, ya con sus
   tildes y su puntuación, no el último trozo provisional. Se guarda encima. */
it("la versión final reemplaza a la provisional", async () => {
  state.vueltas = [
    { parciales: ["hubo un derrumbe"], final: "Hubo un derrumbe." },
  ];
  const { ultimo, pintado } = await dictar();
  expect(pintado).toContain("hubo un derrumbe");
  expect(ultimo).toBe("Hubo un derrumbe.");
});

/* Una vuelta vacía es alguien pensando; tres seguidas es alguien que dejó de
   hablar. Parar en la primera cortaría el dictado en cada pausa. */
it("aguanta una pausa y termina tras varios silencios", async () => {
  state.vueltas = [
    { final: "Primera frase." },
    "falla",
    { final: "Segunda frase." },
  ];
  const { ultimo, motivo } = await dictar();
  expect(ultimo).toBe("Primera frase. Segunda frase.");
  expect(motivo).toBeNull();
});

/* Sin una sola palabra en toda la escucha, el problema es el micrófono y se
   dice. Con algo dicho, el silencio es el final normal y no se avisa de nada. */
it("sin haber oído nada lo dice; habiendo oído algo, no", async () => {
  state.vueltas = ["falla", "falla", "falla"];
  expect((await dictar()).motivo).toBe("sin-voz");

  state.vueltaActual = 0;
  state.vueltas = [{ final: "Algo." }, "falla", "falla", "falla"];
  expect((await dictar()).motivo).toBeNull();
});

/**
 * «Ocupado» no es «no se detectó voz».
 *
 * Esto sale de un fallo real en el APK: se pulsaba «Activar micrófono» y la
 * tarjeta se apagaba sola al instante diciendo que hablaras más cerca. El
 * reconocedor de Android contestaba «RecognitionService busy» —tarda un momento
 * en soltarse cuando viene de otra escucha—, el bucle contaba eso como una
 * vuelta sin palabras y reintentaba **sin pausa**, así que los tres silencios
 * se gastaban en milisegundos antes de que el micrófono llegara a abrirse.
 */
it("si el reconocedor está ocupado se espera y se reintenta", async () => {
  state.vueltas = [
    { error: "RecognitionService busy" },
    { error: "RecognitionService busy" },
    { final: "hubo un derrumbe" },
  ];
  const { ultimo, motivo } = await dictar();
  expect(ultimo).toBe("hubo un derrumbe");
  expect(motivo).toBeNull();
  /* Y arrancó más de una vez: con el bucle viejo los dos «ocupado» habrían
     cerrado la escucha sin llegar nunca a la tercera. */
  expect(state.arranques.length).toBeGreaterThanOrEqual(3);
});

/* Y un fallo que no se arregla esperando se dice por su nombre, en vez de
   mandar a alguien a hablar más cerca de un micrófono que no era el problema. */
it("un fallo de red se dice como fallo de red", async () => {
  state.vueltas = [{ error: "Network error" }];
  expect((await dictar()).motivo).toBe("sin-conexion");
  expect(state.arranques).toHaveLength(1);
});

/* Al terminar se suelta el oyente y se para el reconocedor. Sin esto, salir del
   formulario deja el micrófono del teléfono encendido. */
it("al terminar suelta el micrófono", async () => {
  state.vueltas = [{ final: "Algo." }, "falla", "falla", "falla"];
  await dictar();
  expect(state.quitados).toBe(1);
  expect(state.paradas).toBeGreaterThan(0);
});

it("un teléfono sin reconocedor lo dice en vez de fallar callado", async () => {
  state.disponibleNativo = false;
  expect(await disponible()).toBe(false);
  expect((await dictar()).motivo).toBe("no-disponible");
});

/* ── El navegador ─────────────────────────────────────────────────────── */

it("en el navegador usa la API del navegador y no el complemento", async () => {
  state.nativo = false;
  const marcha = escuchar({ alTexto: () => {}, alTerminar: () => {} });
  await marcha;
  expect(state.instancia?.arrancado).toBe(true);
  expect(state.arranques).toEqual([]);
});

it("sin conexión no arranca, y lo dice antes de esperar en blanco", async () => {
  state.nativo = false;
  vi.stubGlobal("navigator", { onLine: false });
  expect(await escuchar({ alTexto: () => {}, alTerminar: () => {} })).toBe(
    "sin-conexion",
  );
});

/**
 * «No se autorizó» y «no hay servicio de voz» decían lo mismo, y son cosas
 * distintas: la primera se arregla dando un permiso y la segunda no se arregla
 * de ninguna manera. Mandar a revisar unos permisos que ya están bien es
 * mandar a alguien a buscar donde no es.
 */
it("el permiso negado y la falta de servicio se distinguen", async () => {
  state.nativo = false;
  for (const [error, esperado] of [
    ["not-allowed", "sin-permiso"],
    ["service-not-allowed", "no-disponible"],
    ["network", "sin-conexion"],
    ["no-speech", "sin-voz"],
  ] as const) {
    let motivo: unknown = "todavía-no";
    await escuchar({
      alTexto: () => {},
      alTerminar: (m) => void (motivo = m),
    });
    state.instancia?.onerror?.({ error });
    state.instancia?.onend?.();
    expect(motivo).toBe(esperado);
  }
});

it("el tope de un minuto es el mismo en los dos mundos", () => {
  expect(TOPE_MS).toBe(60000);
});
