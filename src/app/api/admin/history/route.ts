import { requireAdmin } from "@/server/admin-auth";
import { historyFailure, readHistory } from "@/server/council-history";
export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    return Response.json(
      { items: await readHistory(db) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return historyFailure(error);
  }
}
