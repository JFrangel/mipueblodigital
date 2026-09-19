import type { Firestore } from "firebase-admin/firestore";
import {
  clave,
  cuenta,
  proponer,
  seMovio,
  type Aporte,
  type Propuesta,
} from "@/domain/veredas";

/**
 * El acumulador de puntos por vereda.
 *
 * Cada reporte con punto del aparato deja aquí su grano de arena. Cuando hay
 * suficientes y de suficientes personas, se le propone un punto al Consejo; el
 * Consejo lo acepta, lo ajusta o lo descarta, y hasta entonces **no cambia nada
 * en ninguna pantalla**.
 *
 * Vive en el servidor porque lee a través de los reportes de todo el mundo, y
 * las coordenadas de un reporte no salen de aquí: lo único que llega al cliente
 * es un punto de vereda ya aceptado, redondeado y sin nada que diga quién lo
 * aportó. Ver `docs/superpowers/specs/2026-09-19-veredas-en-el-mapa-design.md`.
 */

/** Cuántos aportes se guardan por vereda. */
const TOPE_APORTES = 60;

export type Acumulado = {
  nombre: string;
  /** Cierto si el nombre no está en el catálogo y la propone la comunidad. */
  nueva: boolean;
  aportes: Aporte[];
  /** Lo que se le enseña al Consejo, cuando hay algo que enseñar. */
  propuesta: Propuesta | null;
  estado: "recogiendo" | "propuesta" | "aceptada" | "descartada";
  actualizado: string;
};

const ref = (db: Firestore, nombre: string) =>
  db.doc(`veredaProposals/${clave(nombre) || "sin-nombre"}`);

/**
 * Anota un punto para una vereda.
 *
 * **Se llama fuera de la transacción del reporte y no puede tumbarla.** Un
 * reporte confirmado no se deshace porque falle un acumulador, y esto es lo
 * menos importante que ocurre en esa petición. Quien llama la deja correr sin
 * esperarla, como ya se hace con el aviso al Consejo.
 */
export async function anotarAporte(
  db: Firestore,
  nombre: string,
  aporte: Aporte,
  opciones: { nueva: boolean; yaSituada: { lat: number; lng: number } | null },
): Promise<void> {
  /* Los que no cuentan ni se guardan. Guardar un punto tocado sobre el mapa
     «por si acaso» es guardar la tentación de contarlo algún día. */
  if (!cuenta(aporte)) return;
  const doc = ref(db, nombre);
  await db.runTransaction(async (tx) => {
    const previo = (await tx.get(doc)).data() as Acumulado | undefined;
    if (previo?.estado === "descartada") return;

    /* El tope se aplica por el final: lo reciente describe mejor dónde está la
       gente hoy, y un documento de Firestore no es un almacén de series. */
    const aportes = [...(previo?.aportes ?? []), aporte].slice(-TOPE_APORTES);
    const propuesta = proponer(aportes);

    /**
     * Cuándo se le pone algo delante al Consejo.
     *
     * Si la vereda ya está situada —por el catálogo o porque el Consejo aceptó
     * un punto— solo se vuelve a molestar cuando el centro se ha apartado de
     * verdad. Sin esto, cada reporte generaría una propuesta que dice lo mismo
     * que la anterior y la bandeja del Consejo se volvería ruido.
     */
    const merece =
      propuesta !== null &&
      (!opciones.yaSituada || seMovio(opciones.yaSituada, propuesta));

    tx.set(
      doc,
      {
        nombre,
        nueva: opciones.nueva,
        aportes,
        propuesta,
        estado: merece
          ? "propuesta"
          : previo?.estado === "aceptada"
            ? "aceptada"
            : "recogiendo",
        actualizado: new Date().toISOString(),
      },
      { merge: true },
    );
  });
}

/** Lo que el Consejo tiene pendiente de mirar. */
export async function pendientes(db: Firestore): Promise<Acumulado[]> {
  const page = await db
    .collection("veredaProposals")
    .where("estado", "==", "propuesta")
    .limit(50)
    .get();
  return page.docs.map((d) => d.data() as Acumulado);
}
