/**
 * Firma del Consejo: una frase escrita a mano y quién la sostiene.
 *
 * Se comparte entre el pie del comunicado publicado y la vista del editor, así
 * que quien redacta ve la firma exactamente como la verá la comunidad.
 */
export function CouncilSign({ saying }: { saying: string }) {
  return (
    <div className="sign">
      <p>{saying}</p>
      <span>Gran Consejo Comunitario Río Satinga</span>
    </div>
  );
}
