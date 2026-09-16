import { adminServices } from "@/server/admin-auth";
import { applicationDefault } from "firebase-admin/app";
export async function GET() {
  try {
    // Fail before Firestore starts background retries when local credentials are absent.
    if (!process.env.FIRESTORE_EMULATOR_HOST)
      await applicationDefault().getAccessToken();
    const { db } = adminServices();
    const result = await db
      .collection("news")
      .where("status", "==", "published")
      .limit(100)
      .get();
    const items = result.docs.map((d) => {
      const n = d.data();
      return {
        id: d.id,
        title: n.title,
        body: n.body,
        kind: n.kind,
        art: n.art ?? null,
        cover: n.cover ?? null,
        pinned: n.pinned === true,
        publishedAt: n.publishedAt,
      };
    });
    return Response.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "Los comunicados del Consejo no están disponibles en este momento.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
