"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getTheme,
  getServerTheme,
  subscribeTheme,
  toggleTheme,
} from "@/data/theme";
import Image from "next/image";
import {
  Home,
  Map,
  Plus,
  Files,
  FileText,
  Users,
  BarChart3,
  BookOpen,
  Settings,
  Search,
  Bell,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Leaf,
  Menu,
  Moon,
  RefreshCw,
  Trash2,
  Sun,
  MessageSquare,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { type Case, statuses, categories, veredas } from "@/data/catalog";
import {
  readLocalCases,
  removeLocalCase,
  saveLocalCase,
  writeDraft,
} from "@/data/local-store";
import { summarize, pageItems } from "@/domain/logic";
import { Logo, AvatarMark } from "./ui";
import { CaseList } from "./case-list";
import { AccesoNecesario } from "./acceso-necesario";
import { usePendientesSinCuenta } from "@/data/sin-cuenta";
import { NewsArt, coverSource } from "./news-art";
import { useLatestNews, voiceDate, voicePreview } from "@/data/latest-news";
import { mergeMapCases, useCommunityReports } from "@/data/community-map";
import { useReportLookup, type Removed } from "@/data/report-lookup";
import { useOfflinePages } from "@/data/offline-pages";
import { Toasts } from "./toasts";
import { Knowledge } from "@/features/knowledge";
import { Territory } from "@/features/territory";
import { Statistics } from "@/features/statistics";
import { Report } from "@/features/report";
import { Outbox } from "@/features/outbox";
import {
  Notifications,
  useCouncilUnread,
  useUnreadCount,
} from "@/features/notifications";
import { CouncilPanel } from "@/features/council-panel";
import { ReportDetail } from "@/features/report-detail";
import { CommunityNav } from "./community-nav";
import { useAccountReports } from "@/data/account-reports";
import { mergeAccountReports, orphanedReports } from "@/domain/account-reports";
import { deliveryOf } from "@/domain/delivery";
import { DraftCard } from "@/features/draft-card";
import { CuentaRestablecida } from "@/features/cuenta-restablecida";
import { Account } from "@/features/account";
import { CommunityFeed } from "@/features/community-feed";
import { NewsDetail } from "@/features/news-detail";
import { TerritoryPulse } from "./territory-pulse";
import { useSession } from "@/data/session";
import { useOnline } from "@/data/network";
import { cerrarSesion } from "@/platform/native";
const nav = [
  { id: "inicio", label: "Inicio", Icon: Home },
  { id: "mis-reportes", label: "Mis reportes", Icon: Files },
  { id: "mapa", label: "Mapa del territorio", Icon: Map },
  { id: "comunidad", label: "Comunidad", Icon: Users },
  { id: "estadisticas", label: "Estadísticas", Icon: BarChart3 },
];
export function Workspace({
  section,
  reportId,
  newsId,
  returnTo = "mis-reportes",
}: {
  section: string;
  reportId?: string;
  newsId?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  /* Arranca vacío: lo que se vea vendrá de lo que la comunidad haya reportado
     en este dispositivo, no de un conjunto fabricado. */
  const [items, setItems] = useState<Case[]>([]),
    [loaded, setLoaded] = useState(false),
    [menu, setMenu] = useState(false),
    [notifications, setNotifications] = useState(false),
    [storageError, setStorageError] = useState("");
  const dark = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  const session = useSession();
  /* Los que esperan a nombre de nadie: si la bandeja ya los está enseñando con
     su botón de entrar, la tarjeta de «esto es tuyo» sobra. Ver sin-cuenta.ts. */
  const esperandoSinCuenta = usePendientesSinCuenta();
  /* La campana de la barra contaba solo lo personal. Un miembro del Consejo que
     no estuviera dentro de su panel no se enteraba de que había llegado un
     reporte: la cifra vivía en la pestaña que justamente no estaba mirando. */
  const unread = useUnreadCount() + useCouncilUnread();
  const council = section === "admin" && session.admin;
  const online = useOnline();
  /* Cifras propias para la tarjeta de «Mis reportes». */
  const mine = summarize(items.filter((i) => i.owner !== "community"));
  /* El historial es de la cuenta, no del teléfono: lo que el servidor guarda a
     su nombre más lo que este dispositivo tiene y todavía no ha salido. Solo
     en «Mis reportes»: el mapa y las estadísticas hablan del territorio y leen
     lo que hay aquí. */
  /* Se pide en «Mis reportes», que es su pantalla, y además en cualquier otra
     mientras este aparato guarde copias de reportes que ya salieron: son las
     que pueden estar contando un expediente que el Consejo retiró, y el mapa y
     las cifras del inicio las leen igual que el historial. */
  const account = useAccountReports(
    section === "mis-reportes" ||
      items.some((item) => deliveryOf(item) === "enviado"),
    session.uid,
    online,
  );
  const mineItems = useMemo(
    () => mergeAccountReports(items, account.items),
    [items, account.items],
  );
  /**
   * Lo que el servidor ya no tiene, se va también de aquí.
   *
   * El Consejo puede retirar un reporte, y lo borra del servidor con su motivo.
   * La copia de este teléfono no se enteraba: seguía saliendo en «Mis
   * reportes», en el mapa y en las cifras del inicio, con su «Enviado» intacto,
   * como si el expediente siguiera abierto. Retirar dejaba de valer justo para
   * quien más falta le hacía que valiera.
   *
   * Se limpia solo cuando el servidor contestó **la lista entera**: con media
   * lista, lo que falta puede estar en la otra mitad, y borrar por eso sería
   * peor que no borrar nada.
   */
  useEffect(() => {
    if (!account.complete) return;
    const gone = orphanedReports(items, account.items);
    if (!gone.length) return;
    Promise.all(gone.map((id) => removeLocalCase(id).catch(() => undefined)))
      .then(() =>
        setItems((current) => current.filter((i) => !gone.includes(i.id))),
      )
      .catch(() => undefined);
  }, [account.complete, account.items, items]);
  /**
   * Lo que la comunidad puede ver, del servidor.
   *
   * Se pide una sola vez aquí y baja a quien lo necesita: el historial, el mapa
   * y las cifras del inicio hablan los tres del territorio, y hasta ahora los
   * tres leían el almacén de este navegador. Por eso el historial enseñaba «En
   * proceso» en un caso que el Consejo ya había cerrado: la copia de este
   * aparato es del día en que se envió.
   */
  const shared = useCommunityReports(!!session.uid);
  const community = shared.items;
  /**
   * Lo que se dibuja en el mapa del territorio.
   *
   * La regla es la que pidió la comunidad: **el tuyo sale siempre; el de otra
   * persona, solo si es público.** Por eso parte de `mineItems` —lo de este
   * aparato *más* lo que el servidor guarda a tu nombre— y no solo de lo de
   * este aparato: un reporte hecho desde otro teléfono, o antes de reinstalar,
   * es igual de tuyo y no salía en tu mapa mientras no fuera público.
   *
   * Lo de los demás entra por `community`, que es la proyección que ya decide
   * qué consta ante la comunidad. Lo que no consta no llega hasta aquí.
   */
  const territory = useMemo(
    () => mergeMapCases(mineItems, community),
    [mineItems, community],
  );
  /**
   * Lo que habrá que poder abrir cuando no haya señal.
   *
   * El expediente de cada reporte que este teléfono guarda. Es una dirección
   * que el service worker no puede precachear —no la conoce hasta que el
   * reporte existe— y dentro de la aplicación se navega sin recargar, así que
   * tampoco la ve pasar. Hay que pedirla a propósito, mientras hay red.
   *
   * Los comunicados hacen lo suyo donde vive su lista, sin pedirla dos veces.
   */
  const offlinePages = useMemo(
    () =>
      items.slice(0, 20).map((c) => `/reporte/${encodeURIComponent(c.id)}/`),
    [items],
  );
  useOfflinePages(offlinePages, online);
  /* Lo que este dispositivo guarda y nunca envió. Es lo único suyo que la
     bandeja del Consejo no tiene ya: lo enviado está allí como expediente, y
     enseñarlo dos veces era lo que hacía dudar de qué se estaba mirando. */
  const pending = useMemo(
    () => items.filter((item) => deliveryOf(item) !== "enviado"),
    [items],
  );
  /**
   * Las dos listas, cada una con lo suyo.
   *
   * «Mis reportes» es de la cuenta: lo que el servidor guarda a su nombre más
   * lo que este teléfono no ha enviado todavía. El de Comunidad es **lo que la
   * comunidad puede ver**, y nada más: llevaba encima lo guardado en este
   * navegador, así que enseñaba los reportes propios —incluidos los que aún no
   * son públicos y los que nunca salieron— revueltos con los de los demás. Son
   * dos listas con dos reglas, y mezclarlas quita el sentido a las dos.
   */
  const deviceCases = ["mis-reportes", "historial"].includes(section) ? (
    <CaseBrowser
      items={section === "mis-reportes" ? mineItems : community}
      onSelect={setSelected}
      mine={section === "mis-reportes"}
      /* Volver a pedir la lista de la comunidad. Lo propio no lo lleva: se
         reconsulta solo al entrar y al recuperar la señal. */
      onRefresh={section === "historial" ? shared.reload : undefined}
      /* Sin señal, «Mis reportes» enseña solo la copia de este aparato, pero
         el rótulo sigue prometiendo «lo que el Consejo tiene a tu nombre». Con
         un reporte hecho desde otro teléfono, la lista parecía completa y no lo
         era. Decirlo cuesta una línea; callarlo, la confianza en la lista. */
      notice={
        section === "mis-reportes"
          ? !online
            ? "Sin conexión: esto es lo que guarda este teléfono. Lo que el Consejo tiene a tu nombre se consulta al volver la señal."
            : account.error
          : !online
            ? "Sin conexión: los reportes de la comunidad se consultan al volver la señal."
            : session.uid
              ? ""
              : "Los reportes de la comunidad son de quienes la forman: hay que entrar para verlos."
      }
    />
  ) : null;
  /**
   * El expediente abierto: lo de aquí y lo del servidor, cada uno en lo suyo.
   *
   * La copia de este aparato trae la fotografía y el punto en el mapa, que solo
   * están aquí; **el estado lo lleva el Consejo**, y la copia es del día en que
   * se envió. Es la misma regla del historial propio y del mapa.
   *
   * Y cuando no hay copia —se entró con otra cuenta, se reinstaló, se abrió
   * desde el mapa un caso de otra persona— se pregunta al servidor en vez de
   * plantarse: el dispositivo no es la fuente.
   */
  const local = useMemo(
    () => items.find((item) => item.id === reportId),
    [items, reportId],
  );
  /* Se pregunta por lo que pudo llegar al servidor: si la copia de aquí nunca
     salió, no hay expediente que consultar y la respuesta sería siempre la
     misma. Y no antes de leer el almacén, para no gastar una consulta que al
     instante siguiente sobra. */
  const lookup = useReportLookup(
    section === "detalle" &&
      loaded &&
      (!local || deliveryOf(local) === "enviado")
      ? reportId
      : undefined,
    !!session.uid && online,
  );
  const selected = useMemo(
    () =>
      local
        ? lookup.item
          ? { ...local, status: lookup.item.status }
          : local
        : (lookup.item ?? undefined),
    [local, lookup.item],
  );
  /* Solo lo guardado aquí se puede retirar, retomar o gestionar en el aparato.
     Lo que llega del servidor es una consulta, no una copia. */
  const searching = !loaded || (!local && !lookup.ready);
  function setSelected(item: Case) {
    router.push(`/reporte/${encodeURIComponent(item.id)}/?desde=${section}`);
  }
  /* Se relee al cambiar de cuenta: si no, quien entra encuentra en pantalla lo
     que dejó cargado la sesión anterior. */
  useEffect(() => {
    readLocalCases(session.uid)
      /* El almacén devuelve por clave, no por fecha. Sin este orden, «Reportes
         recientes» mostraba los más antiguos y recortaba los de esta semana. */
      .then((saved) =>
        setItems(
          [...saved].sort(
            (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
          ),
        ),
      )
      .catch(() =>
        setStorageError("El almacenamiento local no está disponible."),
      )
      .finally(() => setLoaded(true));
  }, [session.uid]);
  function theme() {
    toggleTheme();
  }
  async function leave() {
    try {
      await cerrarSesion();
      router.push("/acceso/");
    } catch {
      setStorageError("No se pudo cerrar la sesión en este dispositivo.");
    }
  }
  async function save(item: Case) {
    /* Firmado con la cuenta que lo guardó: el almacén es de este aparato, pero
       cada reporte es de alguien. */
    await saveLocalCase({ ...item, account: session.uid ?? undefined });
    setItems((current) => [item, ...current]);
  }
  return (
    <div className={dark ? "workspace dark" : "workspace"}>
      <Link className="skip-link" href="#main">
        Saltar al contenido
      </Link>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link
          href="/inicio/"
          className="logo-link"
          aria-label="Mi Pueblo Digital, inicio"
        >
          <Logo />
        </Link>
        <span className="sidebar-caption">MI COMUNIDAD</span>
        <nav aria-label="Principal">
          {nav.map(({ id, label, Icon }) => (
            <Link
              key={id}
              href={`/${id}/`}
              className={
                section === id ||
                (id === "comunidad" && section === "historial")
                  ? "active"
                  : ""
              }
            >
              <Icon size={19} />
              {label}
              {id === "mis-reportes" && !session.uid && (
                <span className="nav-count">
                  {items.filter((i) => i.owner !== "community").length}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <Link className="btn primary sidebar-report" href="/reportar/">
          <Plus size={19} /> Nuevo reporte
        </Link>
        <div className="sidebar-bottom">
          <span className="sidebar-caption">HERRAMIENTAS</span>
          {/* HU-12: la gestión del Consejo solo aparece con la reivindicación de administrador. */}
          {session.admin && (
            <Link
              href="/admin/"
              className={section === "admin" ? "active" : ""}
            >
              <ShieldCheck size={19} />
              Panel del Consejo
            </Link>
          )}
          <Link
            href="/documentacion/"
            className={section === "documentacion" ? "active" : ""}
          >
            <BookOpen size={19} />
            Guía del proyecto
          </Link>
          {/* Aquí no va «Mi cuenta»: la ficha del final de esta misma columna
              ya es la entrada a la cuenta, y con más de lo que cabía en una
              fila —el nombre y en qué sesión se está—. */}
          <div className="territory-seal">
            <Leaf size={20} />
            <div>
              <strong>Hecho para nuestro territorio</strong>
              <small>Río Satinga · Nariño</small>
            </div>
          </div>
          <Link className="profile" href="/cuenta/">
            {/* El avatar elegido manda sobre las iniciales: si alguien se pone
                una fotografía o el árbol, es porque quiere verlo ahí. Antes
                ganaban las iniciales y el cambio no se notaba en ninguna
                parte. */}
            <span className="avatar">
              <AvatarMark avatar={session.avatar} size={18} />
            </span>
            <span>
              <strong>{session.name || "Mi cuenta"}</strong>
              <small>
                {!session.ready
                  ? "Comprobando sesión…"
                  : !session.uid
                    ? "Sin sesión iniciada"
                    : session.admin
                      ? "Consejo Comunitario"
                      : "Perfil ciudadano"}
              </small>
            </span>
            <ChevronRight size={16} />
          </Link>
          {session.uid && (
            <button className="account-row" onClick={() => void leave()}>
              <span>
                <LogOut size={18} /> Cerrar sesión
              </span>
            </button>
          )}
        </div>
      </aside>
      {menu && (
        <button
          className="menu-shade"
          aria-label="Cerrar menú"
          onClick={() => setMenu(false)}
        />
      )}
      {/* El detalle es una pantalla enfocada: en el teléfono cede la barra de la
          aplicación para que su cabecera verde ocupe el borde superior. */}
      <div
        className={section === "detalle" ? "main-shell focused" : "main-shell"}
      >
        <header className={online ? "topbar" : "topbar offline"}>
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menú"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={22} />
          </button>
          {/* Solo en móvil: sin barra lateral, la cabecera lleva la identidad.
              La sección la marcan la navegación inferior y el encabezado de
              cada pantalla. */}
          <div className="identity">
            <span className="identity-brand">
              Mi Pueblo <em>Digital</em>
            </span>
          </div>
          <div className="topbar-actions">
            {/* Estado de red real. En escritorio solo aparece si hay algo que
                advertir; en el teléfono acompaña siempre. */}
            <span
              className={online ? "net-pill" : "net-pill off"}
              role="status"
            >
              <i />
              <span>
                <strong>{online ? "En línea" : "Sin conexión"}</strong>
                <small>
                  {online ? "Tu voz conecta" : "Tus reportes se guardan"}
                </small>
              </span>
            </span>
            {/* Un solo grupo de controles lee más ordenado que tres iconos sueltos. */}
            <div className="control-cluster">
              {/* En el teléfono el tema se cambia desde Mi cuenta: la barra
                  necesita el ancho para la identidad y el estado de red. */}
              <button
                className="icon-button theme-toggle"
                onClick={theme}
                aria-label={dark ? "Activar tema claro" : "Activar tema oscuro"}
              >
                {dark ? <Sun size={19} /> : <Moon size={19} />}
              </button>
              <button
                className="icon-button bell"
                aria-label={
                  unread
                    ? `Notificaciones, ${unread} sin leer`
                    : "Notificaciones"
                }
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                {unread > 0 && <i />}
              </button>
              {/* Sin avatar: la cuenta ya se alcanza desde la ficha de la
                  columna en escritorio y desde la pestaña «Cuenta» en el
                  teléfono. Una tercera puerta a la misma pantalla solo le
                  quitaba ancho a la identidad y al estado de red. */}
            </div>
          </div>
        </header>
        {/* Fuera de la cabecera: su backdrop-filter crearía un bloque contenedor
            y el panel dejaría de posicionarse respecto a la ventana. */}
        {notifications && (
          <>
            <button
              className="pop-shade"
              aria-label="Cerrar novedades"
              onClick={() => setNotifications(false)}
            />
            <div
              className="notification-pop panel"
              role="dialog"
              aria-label="Novedades"
            >
              <Notifications />
              <button
                className="text-button"
                onClick={() => setNotifications(false)}
              >
                Cerrar
              </button>
            </div>
          </>
        )}
        <main id="main" className="main-content">
          {section === "detalle" && (
            <section className="report-page" aria-label="Detalle del reporte">
              <header>
                <Link href={`/${returnTo}/`} aria-label="Volver a los reportes">
                  <ArrowLeft size={20} />
                </Link>
                <span>Detalle del reporte</span>
                {/* Columna espejo del regreso: mantiene el título centrado. */}
                <span aria-hidden="true" />
              </header>
              {selected ? (
                <ReportDetail
                  item={selected}
                  /* La gestión local vive ahora dentro del panel del Consejo,
                     que es quien la usa para lo que este aparato no ha
                     enviado. Se decide por el rol, no por la dirección desde
                     la que se llegó: un parámetro en la barra no es permiso.
                     Y solo sobre lo que este aparato guarda: escribe en el
                     almacén del navegador, así que sobre un expediente traído
                     del servidor anotaría en una copia que no existe. */
                  admin={session.admin && !!local}
                  onChange={(updated) =>
                    setItems((current) =>
                      current.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    )
                  }
                  /* Todo lo que se abre aquí sale del almacén del dispositivo,
                     así que todo se puede retirar de él. Lo condicioné al dueño
                     «propio» y con eso dejé fuera justo a los que hacían falta:
                     los que escribió la versión del guardado de demostración,
                     que no llevan esa marca y son los que nadie puede sacar. */
                  onRemove={
                    local
                      ? () => {
                          const id = selected.id;
                          setItems((current) =>
                            current.filter((item) => item.id !== id),
                          );
                          /* El expediente abierto lo determina la dirección: se
                       vuelve al listado del que se vino. */
                          router.push(`/${returnTo}/`);
                          void removeLocalCase(id).catch(() =>
                            setStorageError(
                              "No se pudo quitar el reporte de este dispositivo.",
                            ),
                          );
                        }
                      : undefined
                  }
                  /* Un reporte que nunca salió vuelve al formulario tal como
                     se guardó: allí se revisa, se completa lo que falte
                     —contacto, si es delicado— y se envía de verdad. Enviarlo
                     a ciegas desde aquí sería mandar un expediente a medias. */
                  onResume={
                    local
                      ? () => {
                          void writeDraft(
                            {
                              category: selected.category,
                              vereda: selected.vereda,
                              description: selected.description,
                              phone: "",
                              photos: selected.photo ? [selected.photo] : [],
                              lat: selected.lat,
                              lng: selected.lng,
                            },
                            session.uid ?? undefined,
                          )
                            .then(() => router.push("/reportar/"))
                            .catch(() =>
                              setStorageError(
                                "No se pudo retomar el reporte en el formulario.",
                              ),
                            );
                        }
                      : undefined
                  }
                />
              ) : (
                <ReportMissing
                  searching={searching}
                  signed={!!session.uid}
                  online={online}
                  error={lookup.error}
                  removed={lookup.removed}
                  returnTo={returnTo}
                />
              )}
            </section>
          )}
          {["comunidad", "historial", "estadisticas"].includes(section) && (
            <CommunityNav section={section} />
          )}
          {storageError && (
            <p className="errors" role="alert">
              {storageError}
            </p>
          )}
          {/* Quien vuelve tras haber cerrado su cuenta entra a una cuenta
              vacía, y sin decirlo eso parece una avería. Va lo primero de la
              portada: es lo que explica todo lo demás que va a encontrar. */}
          {section === "inicio" && <CuentaRestablecida />}
          {/* El borrador se enseña donde uno mira: al entrar y en sus reportes. */}
          {(section === "inicio" || section === "mis-reportes") && (
            <DraftCard />
          )}
          {section === "inicio" && (
            <Dashboard
              items={items}
              community={community}
              onSelect={setSelected}
            />
          )}
          {/* La bandeja es por cuenta: remontar evita mostrar envíos de otra sesión. */}
          <Outbox
            key={session.uid ?? "anonimo"}
            compact={section !== "mis-reportes"}
          />
          {section === "mis-reportes" &&
            !session.uid &&
            esperandoSinCuenta === 0 && (
              <AccesoNecesario
                icono={Files}
                titulo="Tus reportes están a nombre de tu cuenta"
                cifras={["Registrados", "En proceso", "Solucionados"]}
              >
                Entra y aquí verás lo que el Consejo tiene a tu nombre, en qué
                estado va cada uno y lo que este dispositivo todavía no ha
                enviado.
              </AccesoNecesario>
            )}
          {section === "mis-reportes" && session.uid && (
            <TerritoryPulse
              title="Tus reportes"
              lead="Cada uno deja huella en el territorio."
              href="/estadisticas/"
              action="Ver estadísticas"
              scene="/brand/river-welcome.webp"
              figures={[
                {
                  Icon: Files,
                  value: String(mine.total),
                  label: "Registrados",
                },
                {
                  Icon: Clock,
                  value: String(mine.active),
                  label: "En proceso",
                },
                {
                  Icon: CheckCircle2,
                  value: String(mine.solved),
                  label: "Solucionados",
                },
              ]}
            />
          )}
          {/* HU-12: sin la reivindicación de administrador no se monta la
              gestión del Consejo. Y nada más: aquí había una tarjeta de acceso
              restringido con su propio título, encima de una página que ya
              trae el suyo —dos titulares seguidos diciendo cosas distintas—.
              Sin el rol esta dirección es sencillamente la gestión de lo
              guardado en el dispositivo, y eso es lo que se lee. */}
          {/* Remontar por cuenta descarta expedientes cargados por otra sesión. */}
          {/* La clave lleva prefijo: la bandeja de envíos usa el mismo
              identificador de cuenta unas líneas más arriba, y dos hermanos con
              la misma clave hacen que React confunda uno con otro. */}
          {council && (
            <CouncilPanel key={`consejo-${session.uid}`} pending={pending} />
          )}
          {/* Gestión sobre lo guardado en este dispositivo: no toca los
              expedientes del servidor, así que no depende del rol. Con el panel
              del Consejo montado vive dentro de su pestaña; sin él —en «Mis
              reportes», en el historial o en /admin/ sin el rol— sigue aquí. */}
          {deviceCases}
          {/* La dirección del Consejo exige el rol. Sin él caía en una consola
              de gestión sobre las copias de este aparato: estado, responsable
              y notas que no salen del navegador y que nadie más ve. A quien no
              administra eso no le sirve de nada, y llamarlo «espacio de
              gestión» bajo una dirección que dice «admin» hacía creer que se
              tenían permisos que no se tienen. */}
          {section === "admin" && !council && (
            <section className="panel account-empty">
              <ShieldCheck size={36} />
              <h2>Esta pantalla es del Consejo</h2>
              <p>
                Aquí se gestionan los expedientes que la comunidad envió, y para
                entrar hace falta el rol del Consejo Comunitario. Tu cuenta no
                lo tiene. Tus propios reportes están en «Mis reportes».
              </p>
              <div className="account-actions">
                <Link className="btn primary" href="/mis-reportes/">
                  Ver mis reportes
                </Link>
                <Link className="btn" href="/inicio/">
                  Ir al inicio
                </Link>
              </div>
            </section>
          )}
          {section === "mapa" && (
            <>
              {/* El mapa se queda: el territorio es de todos y se dibuja igual.
                  Lo que no se puede enseñar sin sesión son los puntos, que son
                  reportes de la comunidad y propios. */}
              {!session.uid && (
                <AccesoNecesario
                  compacta
                  icono={Map}
                  titulo="Los puntos son de la comunidad"
                >
                  El territorio se ve sin entrar; los puntos no. Entra y verás
                  los tuyos y los que la comunidad puede ver, cada uno donde
                  ocurrió.
                </AccesoNecesario>
              )}
              <Territory items={territory} onSelect={setSelected} />
            </>
          )}
          {/* El observatorio cuenta el territorio, así que lee el territorio:
              lo propio más lo que la comunidad puede ver. Contaba solo lo
              guardado en este navegador, y presentaba bajo «OBSERVATORIO
              COMUNITARIO» una tasa de solución calculada sobre los reportes de
              un teléfono. Es el mismo error que ya se había corregido en el
              mapa y en el historial, en la pantalla que faltaba. */}
          {section === "estadisticas" && (
            <Statistics
              items={territory}
              partial={!online}
              signed={!!session.uid}
            />
          )}
          {section === "documentacion" && <Knowledge />}
          {section === "reportar" && <Report onSave={save} />}
          {section === "comunidad" && <CommunityFeed />}
          {section === "noticia" && newsId && <NewsDetail id={newsId} />}
          {section === "cuenta" && <Account dark={dark} onTheme={theme} />}
        </main>
        {/* Fuera del contenido: es el pie de la pantalla, no una sección más.
            En el teléfono hace de zócalo de la barra inferior —se apoya en su
            canto en vez de flotar en el hueco de encima—, y al estar aquí cae
            al fondo aunque la pantalla no llegue a desplazarse. El enlace a la
            guía se fue a «Mi cuenta», apoyado en la palma. */}
        <footer className="footer">
          <Leaf size={13} /> Mi Pueblo Digital · Cuidamos lo que nos une.
        </footer>
      </div>
      {/* Encima de todo y fuera del contenido: un aviso de lo que acaba de
          pasar no pertenece a ninguna sección, y dentro de una se quedaba
          fuera de pantalla justo cuando había que leerlo. */}
      <Toasts />
      <nav className="mobile-bottom" aria-label="Navegación móvil">
        {[
          { id: "inicio", label: "Inicio", Icon: Home },
          { id: "mapa", label: "Mapa", Icon: Map },
          { id: "reportar", label: "Reportar", Icon: Plus },
          { id: "comunidad", label: "Comunidad", Icon: Users },
          { id: "cuenta", label: "Cuenta", Icon: Settings },
        ].map(({ id, label, Icon }) => (
          <Link
            key={id}
            className={`${section === id || (id === "comunidad" && ["historial", "estadisticas"].includes(section)) ? "active" : ""} ${id === "reportar" ? "add" : ""}`}
            href={`/${id}/`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
/** Ilustraciones del banner de inicio y su pie. */
const banners = [
  {
    src: "/brand/territorio.webp",
    alt: "Ilustración de un pueblo a orillas de un río del Pacífico",
    caption: "NUESTRO RÍO. NUESTRA GENTE.",
  },
  {
    src: "/brand/river-welcome.webp",
    alt: "Ilustración del árbol y la vegetación del territorio",
    caption: "LO QUE CUIDAMOS, NOS CUIDA.",
  },
];
function Dashboard({
  items,
  community,
  onSelect,
}: {
  items: Case[];
  community: Case[];
  onSelect: (c: Case) => void;
}) {
  const s = summarize(items.filter((i) => i.owner !== "community"));
  const month = new Date().toISOString().slice(0, 7);
  const session = useSession();
  const name = session.name.split(/\s+/)[0] ?? "";
  const [banner, setBanner] = useState(0);
  const [bannerHover, setBannerHover] = useState(false);
  const [activeVoice, setActiveVoice] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  /* «En tu comunidad» contaba lo guardado en este navegador: con un reporte
     publicado por el Consejo seguía diciendo cero, y el rótulo prometía otra
     cosa. Lo de la comunidad son los reportes que la comunidad puede ver. */
  const pulse = summarize(community);
  const monthlyCommunity = community.filter((item) =>
    item.date.startsWith(month),
  ).length;

  /* Los comunicados de verdad, no cuatro escritos dentro del código con sus
     fechas inventadas. Los más recientes primero. */
  const councilVoices = useLatestNews(4);
  useEffect(() => {
    if (isHovered || councilVoices.length < 2) return;
    const timer = setInterval(() => {
      setActiveVoice((prev) => (prev + 1) % councilVoices.length);
    }, 30000);
    return () => clearInterval(timer);
  }, [isHovered, councilVoices.length]);

  /* El banner alterna solo cada 15 s. Se detiene al pasar el cursor y no arranca
     si el sistema pide menos movimiento. */
  useEffect(() => {
    if (
      bannerHover ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(
      () => setBanner((current) => (current + 1) % banners.length),
      15000,
    );
    return () => clearInterval(timer);
  }, [bannerHover]);

  /* La rotación puede quedar apuntando fuera si llegan menos de los que había
     al montar; el resto se vuelve al primero. */
  const currentVoice = councilVoices[activeVoice] ?? councilVoices[0];

  return (
    <>
      <div className="greeting">
        <div>
          <span className="eyebrow">TU COMUNIDAD, MÁS CERCA</span>
          <h1>
            {name ? "Qué bueno verte, " : "Qué bueno "}
            {/* Espacio duro: la estrella viaja con la última palabra. Suelta,
                al plegarse el titular se quedaba sola en su propio renglón. */}
            <em>{name || "tenerte aquí"}</em>
            {"\u00a0"}
            <span className="greeting-dot">✦</span>
          </h1>
          <p>
            <MapPin size={15} /> Gran Consejo Comunitario Río Satinga
          </p>
        </div>
        <Link href="/bienvenida/" className="guide-link">
          Conoce tu plataforma <ArrowUpRight size={15} />
        </Link>
      </div>
      <section
        className="hero"
        onMouseEnter={() => setBannerHover(true)}
        onMouseLeave={() => setBannerHover(false)}
      >
        <Image
          src={banners[banner].src}
          alt={banners[banner].alt}
          fill
          priority
          sizes="(max-width: 800px) 100vw, 75vw"
        />
        <div className="hero-copy">
          <span className="hero-tag">
            <span /> JUNTOS HACEMOS COMUNIDAD
          </span>
          <h2>
            Tu voz hace
            <br />
            la diferencia.
          </h2>
          <p>
            Un reporte puede ser el comienzo
            <br />
            de un cambio en nuestro territorio.
          </p>
          <Link className="btn primary" href="/reportar/">
            <Plus size={18} /> Nuevo reporte <ArrowUpRight size={17} />
          </Link>
        </div>
        <span className="hero-caption">{banners[banner].caption}</span>
        {/* Mismos puntos que la rotación de comunicados: un solo lenguaje para
            «hay más de uno y este es el que ves». */}
        <div
          className="voice-indicators banner-dots"
          aria-label="Ilustración del banner"
        >
          {banners.map((item, i) => (
            <button
              key={item.src}
              className={banner === i ? "active" : ""}
              aria-label={item.alt}
              aria-pressed={banner === i}
              onClick={() => setBanner(i)}
            />
          ))}
        </div>
      </section>
      <div className="section-heading">
        <h2>Tu participación, en un vistazo</h2>
        <Link href="/mis-reportes/">
          Ver mis reportes <ArrowRight size={15} />
        </Link>
      </div>
      {!session.uid ? (
        <AccesoNecesario
          icono={Files}
          titulo="Tu participación vive en tu cuenta"
          cifras={["Mis reportes", "En proceso", "Solucionados", "Pendientes"]}
        >
          Entra y aquí verás cuántos reportes has hecho, cuáles sigue el Consejo
          y cuáles ya se resolvieron. Sin tu cuenta no podemos saberlo: estas
          cifras no son cero, son las de alguien a quien todavía no conocemos.
        </AccesoNecesario>
      ) : (
        <div className="metrics four">
          {[
            {
              label: "Mis reportes",
              value: s.total,
              Icon: Files,
              color: "mint",
              desc: "Tu aporte al territorio",
            },
            {
              label: "En proceso",
              value: s.active,
              Icon: Clock,
              color: "amber",
              desc: "Con seguimiento activo",
            },
            {
              label: "Solucionados",
              value: s.solved,
              Icon: CheckCircle2,
              color: "green",
              desc: "Un paso adelante",
            },
            {
              label: "Pendientes",
              value: s.pending,
              Icon: MessageSquare,
              color: "blue",
              desc: "Por revisar",
            },
          ].map((m) => (
            <Link href="/mis-reportes/" className="metric panel" key={m.label}>
              <span className={`metric-icon ${m.color}`}>
                <m.Icon size={20} />
              </span>
              <small>{m.label}</small>
              <strong>{m.value}</strong>
              <p>{m.desc}</p>
              <ArrowUpRight className="metric-arrow" size={15} />
            </Link>
          ))}
        </div>
      )}
      <div className="dashboard-grid">
        <section className="panel reports-panel">
          <div className="panel-heading">
            <div>
              <h2>Reportes recientes</h2>
              <p>Lo que está pasando cerca de ti.</p>
            </div>
            <Link href="/historial/" className="text-link">
              Ver todos <ArrowUpRight size={16} />
            </Link>
          </div>
          <CaseList items={items.slice(0, 4)} onSelect={onSelect} />
          <Link href="/mapa/" className="panel-foot">
            <Map size={16} /> Explorar el mapa del territorio{" "}
            <ArrowRight size={16} />
          </Link>
        </section>
        <section
          className="panel news-preview"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="panel-heading">
            <h2>Voces del Consejo</h2>
            <div
              className="voice-indicators"
              aria-label="Rotación de comunicados"
            >
              {councilVoices.map((_, idx) => (
                <button
                  key={idx}
                  className={idx === activeVoice ? "active" : ""}
                  aria-label={`Ver comunicado ${idx + 1}`}
                  onClick={() => setActiveVoice(idx)}
                />
              ))}
            </div>
          </div>
          {currentVoice ? (
            <>
              <NewsArt
                art={currentVoice.art ?? undefined}
                cover={coverSource(currentVoice.id, currentVoice.cover)}
              />
              <span className="eyebrow">
                {currentVoice.kind.toUpperCase()}
                {currentVoice.publishedAt &&
                  ` · ${voiceDate(currentVoice.publishedAt)}`}
              </span>
              <h3>{currentVoice.title}</h3>
              <p>{voicePreview(currentVoice.body)}</p>
              <Link
                href={`/noticia/${encodeURIComponent(currentVoice.id)}/`}
                className="text-link"
              >
                Leer comunicado <ArrowUpRight size={16} />
              </Link>
            </>
          ) : (
            /* Nunca uno inventado: si no hay comunicados, se dice. */
            <p className="subtle-note">
              El Consejo todavía no ha publicado comunicados. Cuando lo haga,
              los últimos aparecerán aquí.
            </p>
          )}
        </section>
      </div>
      {/* Pulso de la comunidad: cifras del conjunto visible con el paisaje
          detrás. Salen del mismo cálculo que las estadísticas. */}
      <TerritoryPulse
        title="En tu comunidad"
        /* Sin sesión no hay cifras que dar, y tres ceros se leen como «aquí no
           pasa nada», que es lo contrario de lo que ocurre. */
        lead={
          session.uid
            ? "Juntos construimos un mejor territorio."
            : "Entra para ver lo que está pasando en el territorio."
        }
        href="/estadisticas/"
        action="Ver estadísticas"
        figures={[
          {
            Icon: Users,
            value: session.uid ? String(monthlyCommunity) : "—",
            label: "Reportes este mes",
          },
          {
            Icon: CheckCircle2,
            value: session.uid ? String(pulse.solved) : "—",
            label: "Solucionados",
          },
          {
            Icon: TrendingUp,
            value: session.uid ? `${pulse.rate} %` : "—",
            label: "Tasa de resolución",
          },
        ]}
      />
      <Link className="bottom-callout" href="/documentacion/">
        <span className="icon-tile">
          <BookOpen size={23} />
        </span>
        <span>
          <strong>Transparente desde el primer reporte.</strong>
          <small>
            Conoce cómo funciona la app, sus límites y quién la mantendrá.
          </small>
        </span>
        <ArrowUpRight size={20} />
      </Link>
    </>
  );
}
/**
 * El listado de casos: «Mis reportes» y el historial de la comunidad.
 *
 * Tuvo un tercer modo, «admin», que era la dirección del Consejo sin el rol:
 * una consola de gestión sobre las copias de este aparato, con su «Espacio de
 * gestión» y su «Bandeja de incidencias». No le servía a nadie —lo que se
 * anotaba ahí no salía del navegador— y hacía creer que se tenían permisos que
 * no se tenían. Con él se fueron tres ramas de cada rótulo.
 */
/**
 * Un expediente que no aparece, dicho con su motivo.
 *
 * Había una sola frase para todo: «no encontramos este reporte en este
 * dispositivo». Era verdad y no servía —el dispositivo no es la fuente— y
 * desde que cada reporte lleva la cuenta que lo guardó basta entrar con otra
 * para que deje de estar ahí. Ahora el servidor ya se preguntó, así que lo que
 * queda por decir es por qué tampoco él lo dio: porque no hay sesión con la
 * que preguntar, porque no hay señal, porque falló la consulta, o porque el
 * expediente no es de esta cuenta ni está entre los que la comunidad ve.
 */
const removedDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "su momento"
    : new Intl.DateTimeFormat("es-CO", {
        dateStyle: "long",
        timeZone: "America/Bogota",
      }).format(date);
};
function ReportMissing({
  searching,
  signed,
  online,
  error,
  removed,
  returnTo,
}: {
  searching: boolean;
  signed: boolean;
  online: boolean;
  error: string;
  /** El acta, si el Consejo lo retiró y a quien pregunta le toca saberlo. */
  removed: Removed | null;
  returnTo: string;
}) {
  if (searching)
    return (
      <p role="status" className="notice">
        Buscando el reporte en este dispositivo y en el servidor…
      </p>
    );
  /* Retirado no es lo mismo que perdido, y decir «no lo encontramos» de algo
     que se retiró a propósito es lo contrario de lo que pasó. El motivo es el
     que escribió el Consejo, palabra por palabra: es el mismo que llegó a las
     novedades de quien reportó. */
  if (removed)
    return (
      <section className="panel account-empty">
        <Trash2 size={36} />
        <h2>El Consejo retiró este reporte</h2>
        <p role="status">
          Se retiró el {removedDate(removed.at)}. El expediente y su fotografía
          se borraron del servidor.
        </p>
        <blockquote className="removal-reason">{removed.reason}</blockquote>
        <div className="account-actions">
          <Link className="btn primary" href={`/${returnTo}/`}>
            Volver al listado
          </Link>
          <Link className="btn" href="/reportar/">
            Hacer un nuevo reporte
          </Link>
        </div>
      </section>
    );
  return (
    <section className="panel account-empty">
      <FileText size={36} />
      <h2>No pudimos abrir este reporte</h2>
      <p role="status">
        {!signed
          ? "No está guardado en este dispositivo. Entra con tu cuenta para buscarlo en el servidor del Consejo."
          : !online
            ? "No está guardado en este dispositivo y, sin conexión, no podemos traerlo del servidor. Vuelve a abrirlo cuando tengas señal."
            : error
              ? error
              : "No está en este dispositivo, y el servidor no lo tiene a tu nombre ni entre los reportes que la comunidad puede ver. Revisa el código o vuelve al listado."}
      </p>
      <div className="account-actions">
        {!signed && (
          <Link className="btn primary" href="/acceso/">
            Iniciar sesión
          </Link>
        )}
        <Link className={signed ? "btn primary" : "btn"} href={`/${returnTo}/`}>
          Volver al listado
        </Link>
      </div>
    </section>
  );
}
function CaseBrowser({
  items,
  onSelect,
  mine,
  notice,
  onRefresh,
}: {
  items: Case[];
  onSelect: (c: Case) => void;
  mine: boolean;
  /** Lo que no se pudo traer del servidor, dicho sin esconder lo que sí hay. */
  notice?: string;
  /** Volver a pedir la lista, donde la lista viene del servidor. */
  onRefresh?: () => void;
}) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [category, setCategory] = useState("all"),
    [vereda, setVereda] = useState("all"),
    [page, setPage] = useState(1);
  const filtered = items.filter(
    (i) =>
      (!mine || i.owner !== "community") &&
      (status === "all" || i.status === status) &&
      (category === "all" || i.category === category) &&
      (vereda === "all" || i.vereda === vereda) &&
      (i.title + " " + i.id).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">SEGUIMIENTO COMUNITARIO</span>
          <h1>
            {mine ? (
              <>
                Tu historial, <em>en cualquier teléfono.</em>
              </>
            ) : (
              <>
                Lo que pasa en <em>nuestra comunidad.</em>
              </>
            )}
          </h1>
          <p>
            {mine
              ? "Lo que el Consejo tiene a tu nombre, más lo que aún no ha salido de este dispositivo."
              : "Lo que la comunidad puede ver de los reportes de todos. Los tuyos, completos, están en «Mis reportes»."}
          </p>
        </div>
        <div className="intro-actions">
          <Link className="btn primary" href="/reportar/">
            <Plus size={17} /> Nuevo reporte
          </Link>
          {onRefresh && (
            <button className="text-button" type="button" onClick={onRefresh}>
              <RefreshCw size={15} /> Actualizar
            </button>
          )}
        </div>
      </div>
      {/* Por qué consta aquí el reporte de otra persona. Sin decirlo, la lista
          parece completa y no lo es: falta lo que alguien marcó como delicado y
          lo que todavía está dentro de sus horas de gracia. Lo contaba una
          tarjeta aparte, encima de esta misma lista repetida. */}
      {!mine && (
        <p className="list-source">
          Un reporte que nadie marcó como delicado consta ante la comunidad
          pasadas sus horas de gracia, tal como lo escribió quien reportó. Si el
          Consejo lo revisa, lo reemplaza por un resumen suyo. La fotografía y
          el contacto no salen nunca de aquí.
        </p>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
          {mine && " Abajo está lo que hay guardado en este teléfono."}
        </div>
      )}
      <div className="filters">
        <div className="search">
          <Search size={17} />
          <input
            placeholder="Buscar por nombre o código…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          aria-label="Estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Todos los estados</option>
          {Object.entries(statuses).map(([id, l]) => (
            <option value={id} key={id}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Categoría"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Vereda"
          value={vereda}
          onChange={(e) => {
            setVereda(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Todas las veredas</option>
          {veredas.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>{mine ? "Tus reportes" : "Historial de incidencias"}</h2>
          <span className="tag">{filtered.length} reportes</span>
        </div>
        <CaseList items={pageItems(filtered, page, 10)} onSelect={onSelect} />
        <div className="pagination">
          <small>
            Página {page} de {Math.max(1, Math.ceil(filtered.length / 10))}
          </small>
          <button
            className="btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <button
            className="btn"
            disabled={page * 10 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </div>
      </section>
    </>
  );
}
