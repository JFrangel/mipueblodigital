"use client";
import { memberHeaders } from "./remote-reports";
import { getSession, subscribeSession } from "./session";
import { toast } from "./toasts";

export type Notice = {
  id: string;
  title: string;
  note: string;
  type: string;
  at: string;
  incidentId: string | null;
  /** Comunicado con el que abre un aviso a la comunidad. */
  newsId: string | null;
  /** Quién lo hizo, en la bandeja del Consejo. Vacío en la personal. */
  actor: string;
  read: boolean;
};

export type NoticeState = {
  items: Notice[];
  unread: number;
  error: string;
  loading: boolean;
  /** Falso cuando no hay sesión: la bandeja es personal y no se consulta. */
  available: boolean;
};

type Scope = "personal" | "council";

const empty: NoticeState = {
  items: [],
  unread: 0,
  error: "",
  loading: false,
  available: false,
};

/**
 * La campana y el panel consultaban la misma ruta por separado y seguían
 * consultándola con la pestaña oculta. Este almacén mantiene un único ciclo por
 * ámbito, se detiene sin suscriptores y solo pide datos con la app visible.
 */
class NoticeStore {
  private state = empty;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private generation = 0;
  private inFlight = false;
  /* Lo que ya se había visto, para distinguir lo que acaba de llegar. */
  private known = new Set<string>();
  /* La primera consulta no anuncia nada: al abrir la aplicación, lo que hay ya
     estaba ahí, y recibir cinco avisos de golpe de cosas de ayer es ruido. */
  private primed = false;

  constructor(private readonly scope: Scope) {}

  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    if (this.listeners.size === 1) this.attach();
    return () => {
      this.listeners.delete(callback);
      if (!this.listeners.size) this.detach();
    };
  };

  get = () => this.state;

  private publish(patch: Partial<NoticeState>) {
    const items = patch.items ?? this.state.items;
    this.state = {
      ...this.state,
      ...patch,
      items,
      unread: items.filter((n) => !n.read).length,
    };
    for (const listener of this.listeners) listener();
  }

  /** Descarta la bandeja al cambiar de cuenta para no mostrar novedades ajenas. */
  reset() {
    this.generation++;
    this.state = empty;
    this.known = new Set();
    this.primed = false;
    for (const listener of this.listeners) listener();
    if (this.listeners.size) void this.refresh();
  }

  private account = getSession().uid;
  private unsubscribe = () => {};

  private attach() {
    this.unsubscribe = subscribeSession(() => {
      const uid = getSession().uid;
      if (uid === this.account) return;
      this.account = uid;
      this.reset();
    });
    this.tick();
    this.timer = setInterval(this.tick, 45000);
    window.addEventListener("online", this.tick);
    document.addEventListener("visibilitychange", this.tick);
  }

  private detach() {
    this.unsubscribe();
    this.unsubscribe = () => {};
    clearInterval(this.timer);
    this.timer = undefined;
    window.removeEventListener("online", this.tick);
    document.removeEventListener("visibilitychange", this.tick);
  }

  private tick = () => {
    if (
      document.visibilityState === "hidden" ||
      !navigator.onLine ||
      !getSession().uid ||
      (this.scope === "council" && !getSession().admin)
    )
      return;
    void this.refresh();
  };

  /**
   * Hasta dónde llegó esta persona en los avisos que no son suyos.
   *
   * Son de dos clases y comparten el problema: los avisos a la comunidad son
   * un documento único para todo el territorio, y la bandeja del Consejo es
   * una sola para todo el Consejo. En los dos casos el «leído» no puede
   * guardarse junto al aviso, porque sería el mismo para todo el mundo. Se
   * guarda aquí, en el aparato: es lo que enciende una campana, y no vale una
   * consulta más al servidor cada cuarenta y cinco segundos por cabeza.
   *
   * La primera vez se marca el momento actual. Quien acaba de entrar no debe
   * encontrarse veinte avisos viejos sin leer el primer día.
   */
  private get mark() {
    return `mpd-avisos:${this.scope}:${getSession().uid}`;
  }

  private watermark() {
    const key = this.mark;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return stored;
      const now = new Date().toISOString();
      localStorage.setItem(key, now);
      return now;
    } catch {
      /* Sin almacenamiento —ventana privada, permisos— nada queda pendiente. */
      return new Date().toISOString();
    }
  }

  private seeAll() {
    try {
      localStorage.setItem(this.mark, new Date().toISOString());
    } catch {
      /* Si no se puede recordar, el aviso vuelve a aparecer. Mejor eso que
         perderlo. */
    }
  }

  async refresh() {
    // Sin sesión no hay bandeja personal que consultar ni error que mostrar.
    if (!getSession().uid) {
      this.publish({ items: [], error: "", available: false });
      return;
    }
    /* Y la del Consejo solo con el rol. Sin esto, pedir su cifra desde la barra
       superior haría que cada cuenta ciudadana golpeara una ruta cerrada cada
       cuarenta y cinco segundos y se trajera un error que no puede resolver. */
    if (this.scope === "council" && !getSession().admin) {
      this.publish({ items: [], error: "", available: false });
      return;
    }
    if (this.inFlight) return;
    const mine = this.generation;
    this.inFlight = true;
    this.publish({ loading: true });
    try {
      const { headers } = await memberHeaders();
      const response = await fetch(
        `/api/notifications/${this.scope === "council" ? "?scope=council" : ""}`,
        { headers, cache: "no-store", signal: AbortSignal.timeout(15000) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const seen = this.watermark();
      const items = (data.items as Notice[]).map((n) =>
        this.scope === "council" || n.type === "announcement"
          ? { ...n, read: String(n.at) <= seen }
          : n,
      );
      /**
       * Lo que acaba de llegar sale a la vista.
       *
       * La campana ya lo contaba, pero contarlo en un número de la barra
       * superior es contarlo solo para quien mire ahí. Si el Consejo actualiza
       * un reporte mientras su autora tiene la aplicación abierta, tiene que
       * enterarse sin buscarlo.
       *
       * Se consulta cada cuarenta y cinco segundos, así que este aviso llega
       * en menos de un minuto. Con la aplicación cerrada no llega: eso sería
       * una notificación del sistema, y esa todavía no existe.
       */
      const fresh = items.filter((n) => !n.read && !this.known.has(n.id));
      for (const n of items) this.known.add(n.id);
      if (this.primed)
        /* Dos como mucho: si llegaron ocho de una vez, lo que hace falta es
           abrir la bandeja, no apilar ocho avisos encima de la pantalla. */
        for (const n of fresh.slice(0, 2))
          toast(n.note ? `${n.title}. ${n.note}` : n.title);
      this.primed = true;
      if (mine === this.generation)
        this.publish({ items, error: "", available: true });
    } catch (error) {
      if (mine === this.generation)
        this.publish({
          error:
            error instanceof Error
              ? error.message
              : "No se pudieron consultar las novedades.",
        });
    } finally {
      this.inFlight = false;
      if (mine === this.generation) this.publish({ loading: false });
    }
  }

  async markRead(id: string) {
    const mine = this.generation;
    const { headers } = await memberHeaders();
    const response = await fetch("/api/notifications/", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("No se pudo marcar como leída.");
    if (mine === this.generation)
      this.publish({
        items: this.state.items.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      });
  }

  /** Vaciar la campana de una vez, en lugar de aviso por aviso. */
  async markAllRead() {
    const mine = this.generation;
    /* La bandeja del Consejo es compartida y no guarda un «leído» por persona
       en el servidor: ahí no hay nada que pedirle. La personal sí. */
    if (this.scope === "personal") {
      const { headers } = await memberHeaders();
      const response = await fetch("/api/notifications/", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ all: true }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("No se pudieron marcar como leídas.");
    }
    this.seeAll();
    if (mine === this.generation)
      this.publish({
        items: this.state.items.map((n) => ({ ...n, read: true })),
      });
  }
}

const stores: Record<Scope, NoticeStore> = {
  personal: new NoticeStore("personal"),
  council: new NoticeStore("council"),
};

export const noticeStore = (scope: Scope) => stores[scope];
export const getServerNotices = () => empty;
