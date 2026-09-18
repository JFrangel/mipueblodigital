import { Suspense } from "react";
import { Access } from "@/features/access";
export default function Page() {
  /* `Access` lee la dirección para saber si alguien llegó aquí desde el
     formulario de reporte, y eso obliga a envolverlo: esta página se
     prerenderiza, y en ese momento todavía no hay dirección que leer. El
     respaldo es el mismo texto que la pantalla usa mientras comprueba la
     sesión, así que el salto no se nota. */
  return (
    <Suspense fallback={<p role="status">Comprobando conexión…</p>}>
      <Access />
    </Suspense>
  );
}
