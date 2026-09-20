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
  /** Que `start()` tarde en resolver, como tarda en el teléfono. */
  arranqueLento: false,
  paradas: 0,
  oyentes: {} as Record<string, Array<(datos: never) => void>>,
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
    addListener: async (evento: string, fn: (datos: never) => void) => {
      (state.oyentes[evento] ??= []).push(fn);
      return { remove: async () => void (state.quitados += 1) };
    },
    /**
     * **Resuelve en cuanto está escuchando, sin traer nada.**
     *
     * Es lo que hace el complemento con `partialResults: true` —lo dice su
     * `.d.ts`: «the function respond directly without result»— y es justo lo
     * que el doble de antes no hacía: devolvía la frase en la promesa, así que
     * las pruebas pasaban sobre un contrato que el teléfono no cumple y el
     * dictado se apagaba solo en la mano de la gente.
     *
     * Lo que se oiga llega **después**, por los oyentes: los parciales y
     * también el final. Y el fin de cada frase lo dice `listeningState`.
     */
    start: async (opciones: unknown) => {
      state.arranques.push(opciones);
      /* En el teléfono el complemento encola `startListening` en el hilo de la
         ventana, así que entre pedirlo y estar escuchando pasa un rato. */
      if (state.arranqueLento)
        await new Promise((listo) => setTimeout(listo, 40));
      const guion = state.vueltas[state.vueltaActual++];
      /* Lo que falla antes de empezar a escuchar sí se ve desde la promesa. */
      if (guion && typeof guion === "object" && "error" in guion)
        throw new Error(guion.error);
      const emitir = (evento: string, datos: unknown) => {
        for (const oyente of state.oyentes[evento] ?? [])
          (oyente as (d: unknown) => void)(datos);
      };
      /* Un turno de reloj, no un microturno: en el teléfono esto tarda, y así
         el `.then()` de quien llamó corre antes, como allí. */
      setTimeout(() => {
        const hablo =
          guion &&
          typeof guion === "object" &&
          ((guion.parciales?.length ?? 0) > 0 || Boolean(guion.final));
        if (guion && typeof guion === "object") {
          /* Android avisa de que empezó a oír voz antes de transcribir nada. */
          if (hablo) emitir("listeningState", { status: "started" });
          for (const parcial of guion.parciales ?? [])
            emitir("partialResults", { matches: [parcial] });
        }
        /**
         * **Y avisa de que la frase acabó ANTES de entregarla.**
         *
         * Este orden es el del teléfono y es el que destapa la carrera:
         * `onEndOfSpeech` llega cuando la persona deja de hablar, y
         * `onResults` después, cuando el reconocedor termina de procesar.
         * Quien cierre la vuelta al oír «stopped» destruye el reconocedor justo
         * antes de que entregue lo dicho. El doble de antes emitía el final
         * primero, así que no podía ver este fallo; el emulador tampoco, porque
         * sin micrófono «stopped» no llega nunca.
         */
        emitir("listeningState", { status: "stopped" });
        if (guion && typeof guion === "object" && guion.final)
          setTimeout(
            () =>
              emitir("partialResults", { matches: [guion.final as string] }),
            30,
          );
      }, 0);
      return {};
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
  state.arranqueLento = false;
  state.paradas = 0;
  state.oyentes = {};
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
 * **El micrófono no se reinicia antes de haber oído nada.**
 *
 * Esta es la prueba del fallo que apagaba el dictado en la mano de la gente.
 * Con `partialResults: true` el complemento resuelve `start()` en cuanto
 * empieza a escuchar, sin traer nada; el código leía esa resolución vacía como
 * «esta vuelta no oyó», reintentaba, y cada reintento destruye el reconocedor
 * que acababa de arrancar. Se pulsaba «Activar micrófono» y la tarjeta se
 * apagaba sola pidiendo hablar más cerca, sin que el micrófono hubiera llegado
 * a abrirse.
 *
 * Se mide por lo único que lo delata: cuántas veces se arrancó el reconocedor
 * antes de que llegara la primera palabra. Tiene que ser una.
 */
it("no se reinicia el reconocedor antes de haber oído nada", async () => {
  state.vueltas = [{ parciales: ["hubo"], final: "hubo un derrumbe" }];
  let arranquesAlOir = -1;
  await new Promise<void>((listo) => {
    void escuchar({
      alTexto: () => {
        if (arranquesAlOir < 0) arranquesAlOir = state.arranques.length;
      },
      alTerminar: () => listo(),
    });
  });
  expect(arranquesAlOir).toBe(1);
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

/**
 * **Habiendo dicho algo, el micrófono no se reabre tres veces más.**
 *
 * Reabrir entre frases es lo que permite dictar con pausas y no se toca. Lo que
 * sí se toca es cuánto se insiste después: tres vueltas más son veintiún
 * segundos de micrófono abriéndose solo delante de alguien que ya terminó, con
 * su aviso y su luz cada vez. Dos es el suelo —una deja sitio a la pausa y la
 * siguiente cierra— y por debajo la primera pausa terminaría el dictado.
 */
it("después de dictar algo, se reabre dos veces y no tres", async () => {
  state.vueltas = [{ final: "Hubo un derrumbe." }];
  const { ultimo, motivo } = await dictar();
  expect(ultimo).toBe("Hubo un derrumbe.");
  expect(motivo).toBeNull();
  /* El que oyó, más las dos vueltas en silencio que cierran. */
  expect(state.arranques).toHaveLength(3);
});

/* Y antes de la primera palabra se sigue siendo paciente: quien nunca ha
   dictado tarda en arrancar, y cortarle enseguida es decirle que no funciona. */
it("antes de la primera palabra se aguanta más", async () => {
  state.vueltas = [];
  expect((await dictar()).motivo).toBe("sin-voz");
  expect(state.arranques).toHaveLength(3);
});

/**
 * **Parar para, aunque el arranque venga de camino.**
 *
 * El complemento encola `startListening` en el hilo de la ventana, así que al
 * pulsar «Detener dictado» el `stop()` puede llegar antes de que el micrófono
 * se haya abierto: no para nada, y el micrófono se enciende **después** de
 * haberlo apagado. Eso es lo que se veía como una reapertura suelta al final.
 */
it("al parar no queda un micrófono abriéndose por detrás", async () => {
  state.arranqueLento = true;
  state.vueltas = [{ final: "Algo." }];
  const abierta = await escuchar({ alTexto: () => {}, alTerminar: () => {} });
  if (typeof abierta === "string") throw new Error("no abrió: " + abierta);
  abierta.parar();
  /* Se deja resolver el arranque que iba de camino. */
  await new Promise((listo) => setTimeout(listo, 80));
  /* Dos paradas: la del cierre y la del arranque que llegó tarde. */
  expect(state.paradas).toBeGreaterThanOrEqual(2);
});

/* Al terminar se suelta el oyente y se para el reconocedor. Sin esto, salir del
   formulario deja el micrófono del teléfono encendido. */
it("al terminar suelta el micrófono", async () => {
  state.vueltas = [{ final: "Algo." }, "falla", "falla", "falla"];
  await dictar();
  /* Dos oyentes: el de las transcripciones y el del fin de frase. */
  expect(state.quitados).toBe(2);
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
