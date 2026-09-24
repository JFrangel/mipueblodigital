import type { Metadata } from "next";
import { Terminos } from "@/features/terminos";
export const metadata: Metadata = {
  title: "Términos y tratamiento de datos · Mi Pueblo Digital",
  description:
    "Qué información recoge Mi Pueblo Digital, para qué la usa el Gran Consejo Comunitario Río Satinga, y qué derechos tiene quien reporta.",
};
export default function Page() {
  return <Terminos />;
}
