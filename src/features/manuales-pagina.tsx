"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Lock } from "lucide-react";
import { Palafito } from "@/components/palafito";
import { manualConsejo } from "@/content/manual-consejo";
import type { Manual } from "@/content/manuales";
import { useSession } from "@/data/session";
import { abrirArchivo } from "@/platform/export";
import { esNativo } from "@/platform/native";
import { HojaPlatano } from "./leaf-fall";
import { ManualDocumento } from "./manuales";
import styles from "./manuales.module.css";

/**
 * Las páginas de los manuales.
 *
 * `ManualDocumento` dibuja el manual; esto es lo que lo rodea: la barra para
 * volver, el botón de descargar y la puerta del manual del Consejo.
 *
 * **La puerta del manual del Consejo es de interfaz, no un secreto.** Decide
 * qué se enseña, y quien no es del Consejo no lo encuentra enlazado; pero el
 * PDF es un archivo público y el texto viaja en el código de esta página. El
 * manual está escrito sin datos internos precisamente por eso: es una guía de
 * trabajo, no un documento reservado. Si algún día debiera serlo de verdad,
 * habría que servirlo desde una ruta que compruebe el rol.
 */

export type FichaManual = Pick<
  Manual,
  "id" | "titulo" | "subtitulo" | "publico"
> & { archivo: string };

/**
 * El botón de descargar el PDF.
 *
 * En un navegador es un enlace normal con `download`. Dentro del APK no basta:
 * la ventana de Capacitor no sabe descargar, así que se entrega la dirección
 * al navegador del sistema, que sí (ver `src/platform/export.ts`).
 */
export function DescargarPdf({
  archivo,
  claro = false,
}: {
  archivo: string;
  claro?: boolean;
}) {
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState("");

  async function alPulsar(evento: React.MouseEvent<HTMLAnchorElement>) {
    if (!esNativo()) return;
    evento.preventDefault();
    setAbriendo(true);
    setError("");
    try {
      await abrirArchivo(archivo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el PDF.");
    } finally {
      setAbriendo(false);
    }
  }

  return (
    <>
      <a
        className={`${styles.descargar} ${claro ? styles.descargarClaro : ""}`}
        href={archivo}
        download
        onClick={alPulsar}
        aria-busy={abriendo}
      >
        <Download size={16} aria-hidden="true" />
        {abriendo ? "Abriendo…" : "Descargar PDF"}
      </a>
      {error && (
        <p className={styles.avisoDescarga} role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** La barra de arriba: volver y descargar, a mano en cualquier punto. */
function BarraManual({
  titulo,
  volver,
  archivo,
}: {
  titulo: string;
  volver: { href: string; rotulo: string };
  archivo?: string;
}) {
  return (
    <div className={styles.barra}>
      <Link href={volver.href} className={styles.volver}>
        <ArrowLeft size={15} aria-hidden="true" /> {volver.rotulo}
      </Link>
      <p className={styles.barraTitulo}>{titulo}</p>
      {archivo ? <DescargarPdf archivo={archivo} /> : <span />}
    </div>
  );
}

/** Un manual abierto, con su barra y su botón. */
export function PaginaManual({
  manual,
  archivo,
}: {
  manual: Manual;
  archivo: string;
}) {
  return (
    <>
      <BarraManual
        titulo={manual.titulo}
        volver={{ href: "/manuales/", rotulo: "Manuales" }}
        archivo={archivo}
      />
      <ManualDocumento
        manual={manual}
        acciones={<DescargarPdf archivo={archivo} claro />}
      />
    </>
  );
}

/**
 * El manual del Consejo, para quien es del Consejo.
 *
 * Importa el contenido aquí y no en la página del servidor a propósito: así no
 * va en el HTML que recibe cualquiera, sino en el código de esta pantalla, que
 * solo se pide al abrirla.
 */
export function PaginaManualConsejo({ archivo }: { archivo: string }) {
  const sesion = useSession();
  if (sesion.admin)
    return <PaginaManual manual={manualConsejo} archivo={archivo} />;
  return (
    <>
      <BarraManual
        titulo="Manual del Consejo"
        volver={{ href: "/manuales/", rotulo: "Manuales" }}
      />
      <div className={styles.elegir}>
        <div className={styles.reservado} role="status">
          <Lock size={20} aria-hidden="true" />
          <strong>Este manual es para quienes trabajan en el Consejo.</strong>
          {!sesion.ready ? (
            "Comprobando tu sesión…"
          ) : sesion.uid ? (
            "Tu cuenta no tiene el rol del Consejo. Si deberías tenerlo, pídeselo a quien administra."
          ) : (
            <>
              Entra con tu cuenta del Consejo para leerlo.{" "}
              <Link href="/acceso/">Entrar</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** La página que lista los manuales y deja elegir. */
export function ManualesIndice({ fichas }: { fichas: FichaManual[] }) {
  const sesion = useSession();
  return (
    <>
      <BarraManual
        titulo="Manuales"
        volver={{ href: "/inicio/", rotulo: "Mi Pueblo Digital" }}
      />
      <main className={`${styles.manual} ${styles.elegir}`}>
        <h1>Manuales</h1>
        <p className={styles.elegirIntro}>
          Cómo se usa Mi Pueblo Digital, paso a paso. Léelos aquí o descárgalos
          en PDF para imprimirlos o compartirlos.
        </p>
        <div className={styles.elegirLista}>
          {fichas.map((ficha) => {
            const reservado = ficha.id === "consejo" && !sesion.admin;
            if (reservado)
              return (
                <div key={ficha.id} className={styles.reservado}>
                  <Lock size={20} aria-hidden="true" />
                  <strong>{ficha.titulo}</strong>
                  Es para quienes trabajan en el Consejo. Entra con tu cuenta
                  del Consejo para leerlo y descargarlo.
                  {!sesion.uid && sesion.ready && (
                    <>
                      {" "}
                      <Link href="/acceso/">Entrar</Link>
                    </>
                  )}
                </div>
              );
            return (
              <div key={ficha.id} className={styles.portadilla}>
                <div className={styles.hojas} aria-hidden="true">
                  <span className={styles.hojaC}>
                    <HojaPlatano />
                  </span>
                  <span className={styles.hojaD}>
                    <HojaPlatano />
                  </span>
                </div>
                <Palafito
                  size={44}
                  casa="#f4f8f1"
                  agua="#86cdd3"
                  grosor={1.3}
                />
                <p className={styles.publico}>{ficha.publico}</p>
                <h2>{ficha.titulo}</h2>
                <p>{ficha.subtitulo}</p>
                <div className={styles.portadillaAcciones}>
                  <Link
                    href={`/manuales/${ficha.id}/`}
                    className={`${styles.descargar} ${styles.descargarClaro}`}
                  >
                    Leer
                  </Link>
                  <DescargarPdf archivo={ficha.archivo} />
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
