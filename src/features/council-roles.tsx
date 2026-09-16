"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Search, ShieldCheck, UserMinus } from "lucide-react";
import { memberHeaders } from "@/data/remote-reports";
import { useSession } from "@/data/session";
import { toast } from "@/data/toasts";

type Person = {
  uid: string;
  email: string;
  name: string;
  admin: boolean;
  /** Nulo si nunca entró: a esa cuenta todavía no se le puede conceder. */
  lastSignIn: string | null;
};

/** Para buscar como se teclea: sin tildes y en minúsculas. */
const plain = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Quién administra el Consejo.
 *
 * El rol es una reivindicación del token, no un campo de la base: por eso no
 * basta con escribirlo a mano en Firestore, y por eso hasta hace poco hacía
 * falta el guion de servidor con las credenciales privadas para cada persona.
 * Aquí el Consejo se administra a sí mismo.
 *
 * Y por eso mismo el cambio no es instantáneo en la otra punta: el token dura
 * una hora, así que hasta que se renueve —o hasta que esa persona cierre
 * sesión y vuelva a entrar— su aplicación la seguirá tratando como ciudadana.
 * Se dice aquí para que nadie crea que no funcionó.
 */
export function CouncilRoles() {
  const account = useSession().uid;
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);

  const request = useCallback(
    async (body?: { email: string; admin: boolean }) => {
      const { headers } = await memberHeaders();
      const response = await fetch("/api/admin/roles/", {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.people as Person[];
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    request()
      .then((list) => {
        if (alive) setPeople(list);
      })
      .catch((e: unknown) => {
        if (alive)
          setError(e instanceof Error ? e.message : "No se pudo consultar.");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [request]);

  function change(target: string, admin: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    request({ email: target, admin })
      .then((list) => {
        setPeople(list);
        toast(
          admin
            ? `${target} ya administra el Consejo.`
            : `${target} deja de administrar el Consejo.`,
        );
        setMessage(
          admin
            ? `${target} ya administra el Consejo. Tiene que cerrar sesión y volver a entrar para verlo.`
            : `${target} deja de administrar el Consejo.`,
        );
      })
      .catch((e: unknown) => {
        const dicho = e instanceof Error ? e.message : "No se pudo guardar.";
        setError(dicho);
        toast(dicho, "error");
      })
      .finally(() => setBusy(false));
  }

  const needle = plain(query);
  const shown = people.filter(
    (person) =>
      !needle ||
      plain(`${person.name} ${person.email}`).includes(needle),
  );
  const admins = people.filter((person) => person.admin).length;

  return (
    <section className="panel council-roles">
      <span className="eyebrow">CONSEJO COMUNITARIO</span>
      <h2>Quién administra</h2>
      <p>
        El rol da acceso a los expedientes, a los comunicados y al análisis. Se
        concede a cuentas que ya entraron alguna vez a la aplicación.
      </p>
      {/* La lista entera, no solo quien ya administra: conceder el rol
          dependía de saberse el correo de memoria y escribirlo sin una letra
          de más. Aquí se busca a la persona y se pulsa. */}
      <form
        className="filters roles-search"
        onSubmit={(event) => {
          event.preventDefault();
          /* La lista filtra mientras se escribe, así que el botón no tiene que
             ir a buscar nada: lleva a lo encontrado. Está porque un campo de
             búsqueda sin botón se lee a medias, y porque el Intro del teclado
             del teléfono tiene que hacer algo. */
          list.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }}
      >
        <label className="field-label">
          Buscar una cuenta
          <span className="search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              placeholder="Nombre o correo…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </span>
        </label>
        <button className="btn" type="submit">
          <Search size={16} /> Buscar
        </button>
      </form>
      {error && (
        <p className="errors" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice done" role="status">
          <Check size={15} />
          {message}
        </p>
      )}
      <div className="news-editor-list" ref={list}>
        {busy && !people.length && <p>Consultando las cuentas…</p>}
        {!busy && !shown.length && (
          <p className="subtle-note">
            {people.length
              ? "Ninguna cuenta se llama así."
              : "Todavía no hay cuentas registradas."}
          </p>
        )}
        {shown.map((person) => (
          <div className="news-editor-row" key={person.uid}>
            <span className="account-row">
              <span>
                <strong>{person.name || person.email}</strong>
                {person.name && <small>{person.email}</small>}
              </span>
              {/* El rol, dicho en la fila. Antes la lista era solo de
                  administradores y la etiqueta sobraba; con todas las cuentas
                  delante, sin ella no se distingue quién es quién. */}
              {person.admin && <span className="tag role-admin">Admin</span>}
              {person.uid === account && <span className="tag">Tú</span>}
            </span>
            {/* Nadie se retira a sí mismo: si te equivocas y eras el único, el
                Consejo se queda fuera de su propio panel. */}
            {person.uid !== account &&
              (person.admin ? (
                <button
                  className="text-button"
                  disabled={busy || admins < 2}
                  title={
                    admins < 2
                      ? "Es la única cuenta con el rol. Concédeselo antes a otra persona."
                      : undefined
                  }
                  onClick={() => change(person.email, false)}
                >
                  <UserMinus size={15} /> Retirar
                </button>
              ) : (
                <button
                  className="text-button"
                  disabled={busy || !person.lastSignIn}
                  title={
                    person.lastSignIn
                      ? undefined
                      : "Esta cuenta todavía no ha entrado a la aplicación."
                  }
                  onClick={() => change(person.email, true)}
                >
                  <ShieldCheck size={15} /> Hacer admin
                </button>
              ))}
          </div>
        ))}
      </div>
      <p className="subtle-note">
        {admins === 1
          ? "Ahora mismo administra una sola cuenta. Conviene que sean al menos dos: si esa persona pierde el acceso, el Consejo se queda fuera de su panel."
          : `${admins} cuentas administran el Consejo.`}{" "}
        Un cambio se nota en la otra aplicación cuando esa persona cierra sesión
        y vuelve a entrar. Cada concesión y cada retirada quedan registradas con
        quién las hizo.
      </p>
    </section>
  );
}
