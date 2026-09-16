import { Workspace } from "@/components/workspace";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string }>;
}) {
  const { id } = await params;
  const { desde } = await searchParams;
  const returnTo =
    desde &&
    ["inicio", "mis-reportes", "historial", "mapa", "admin"].includes(desde)
      ? desde
      : "mis-reportes";
  return <Workspace section="detalle" reportId={id} returnTo={returnTo} />;
}
