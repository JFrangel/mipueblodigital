"use client";
import { useEffect, useState } from "react";
import { memberHeaders } from "@/data/remote-reports";
import { firebaseClient } from "@/data/firebase/client";
import { PhotoView } from "@/components/photo-view";
export function ActionImage({ url }: { url: string }) {
  const [opened, setOpened] = useState(false),
    [src, setSrc] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (!opened) return;
    const abort = new AbortController();
    let object = "";
    void (async () => {
      try {
        const { headers, uid } = await memberHeaders();
        const r = await fetch(url, {
          headers,
          cache: "no-store",
          signal: abort.signal,
        });
        if (!r.ok) throw new Error("No se pudo cargar la imagen.");
        const blob = await r.blob();
        if (
          abort.signal.aborted ||
          firebaseClient().auth.currentUser?.uid !== uid
        )
          return;
        object = URL.createObjectURL(blob);
        setSrc(object);
      } catch (e) {
        if (!abort.signal.aborted) setError((e as Error).message);
      }
    })();
    return () => {
      abort.abort();
      if (object) URL.revokeObjectURL(object);
    };
  }, [opened, url]);
  return (
    <div>
      {!opened ? (
        <button
          type="button"
          className="text-button"
          onClick={() => setOpened(true)}
        >
          Ver imagen · solo Consejo
        </button>
      ) : src ? (
        <PhotoView src={src} alt="Imagen de la actuación del Consejo" />
      ) : (
        <p role="status">{error || "Cargando imagen…"}</p>
      )}
    </div>
  );
}
