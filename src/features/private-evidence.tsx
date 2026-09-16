"use client";
import { useEffect, useState } from "react";
import { PhotoView } from "@/components/photo-view";
import { memberHeaders } from "@/data/remote-reports";
import { firebaseClient } from "@/data/firebase/client";
import { useOnline } from "@/data/network";

type Photo = { url: string; reduced: boolean };
type State = "cargando" | "lista" | "sin-foto" | "error";

/**
 * La fotografía de un expediente, dentro del panel del Consejo.
 *
 * Estaba detrás de un botón —«Revisar fotografía privada»— y en la práctica
 * quedaba escondida: se abría un expediente y se leía «pídela cuando la
 * necesites» en el sitio donde tenía que estar la fotografía. La fotografía
 * **es** el reporte; quien lo abre ya la está pidiendo.
 *
 * Así que llega sola, y llega la **copia reducida**: pesa lo que pesa una
 * imagen de pantalla y no varios megas. El original —el que sirve como prueba—
 * queda a un toque, dicho por su nombre, para quien lo necesite de verdad.
 *
 * El servidor dice en una cabecera cuál de las dos sirvió, y aquí se repite:
 * quien vaya a usarla como prueba tiene derecho a saber cuál está mirando.
 */
async function fetchPhoto(id: string, full: boolean) {
  const { headers, uid } = await memberHeaders();
  const response = await fetch(
    `/api/incidents/${id}/evidence/${full ? "" : "?vista=copia"}`,
    { headers, cache: "no-store", signal: AbortSignal.timeout(30000) },
  );
  /* Un reporte sin fotografía no es un fallo: se dice y ya está. */
  if (response.status === 404) return { uid, photo: null };
  if (!response.ok) throw new Error("sin fotografía");
  const blob = await response.blob();
  return {
    uid,
    photo: {
      url: URL.createObjectURL(blob),
      reduced: response.headers.get("X-Evidencia") === "copia-reducida",
    },
  };
}

export function PrivateEvidence({ id }: { id: string }) {
  const online = useOnline();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [state, setState] = useState<State>("cargando");
  /* Sube al pedir el original o al reintentar: es lo que vuelve a disparar la
     consulta sin que el efecto tenga que mirar el estado. */
  const [attempt, setAttempt] = useState(0);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let alive = true;
    let created = "";
    fetchPhoto(id, full)
      .then(({ uid, photo: found }) => {
        /* Si la sesión cambió entre la petición y la respuesta, lo traído ya
           no es de quien mira: se descarta sin dibujarlo. */
        const mine = firebaseClient().auth.currentUser?.uid === uid;
        if (!alive || !mine) {
          if (found) URL.revokeObjectURL(found.url);
          return;
        }
        if (found) created = found.url;
        setPhoto(found);
        setState(found ? "lista" : "sin-foto");
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
      /* La dirección del objeto se suelta al cerrar el expediente; si no, cada
         uno que se abre deja su fotografía retenida en memoria. */
      if (created) URL.revokeObjectURL(created);
    };
  }, [id, full, attempt]);

  const ask = () => {
    setPhoto(null);
    setState("cargando");
    setAttempt((current) => current + 1);
  };
  const askOriginal = () => {
    setPhoto(null);
    setState("cargando");
    setFull(true);
  };

  return (
    <div className="evidence-view">
      {state === "cargando" && <p role="status">Cargando evidencia…</p>}
      {state === "sin-foto" && (
        <p className="subtle-note">Este reporte se envió sin fotografía.</p>
      )}
      {/* La fotografía vive en el servidor y sin red no hay manera de traerla.
          Decía «no se pudo traer» a secas, que suena a que se perdió: quien lo
          lee sin señal no sabe si su prueba sigue existiendo. Son dos motivos
          distintos y se dicen distinto. */}
      {state === "error" && (
        <p className="notice" role="alert">
          {online
            ? "No se pudo traer la fotografía del servidor."
            : "Sin conexión no se puede traer la fotografía. Sigue guardada en el servidor del Consejo."}{" "}
          <button type="button" className="text-button" onClick={ask}>
            Reintentar
          </button>
        </p>
      )}
      {photo && (
        <>
          <PhotoView src={photo.url} alt="Fotografía del expediente" />
          {/* Solo se dice lo que cambia la lectura de la prueba. Que sea el
              original es lo normal; anunciarlo en cada expediente es una línea
              que nadie vuelve a leer después de la primera vez. */}
          {/* Lo que cambia la lectura de la prueba, y la manera de conseguir
              la otra. Que sea el original es lo normal; anunciarlo en cada
              expediente es una línea que nadie vuelve a leer. */}
          {photo.reduced && (
            <p className="subtle-note evidence-full">
              Copia reducida, para mirarla. La original es la que sirve como
              prueba.
              <button
                type="button"
                className="text-button"
                onClick={askOriginal}
              >
                Ver la fotografía original
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
