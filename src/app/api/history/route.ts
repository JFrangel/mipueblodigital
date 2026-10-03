import { adminServices, credentialsReady } from "@/server/admin-auth";
import {
  historyFailure,
  publicHistory,
  readHistory,
} from "@/server/council-history";
export async function GET() {
  try {
    await credentialsReady();
    return Response.json(
      { items: publicHistory(await readHistory(adminServices().db, true)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return historyFailure(error);
  }
}
