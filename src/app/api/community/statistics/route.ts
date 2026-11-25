import { categories, statuses } from "@/data/catalog";
import { FieldPath } from "firebase-admin/firestore";
import {
  summarize as aggregateCases,
  type Countable,
} from "@/domain/aggregate";
import { summarize } from "@/domain/logic";
import { ApiError, requireMember } from "@/server/admin-auth";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const { db } = await requireMember(request);
    const items: (Countable & { status: string; category: string })[] = [];
    const query = db
      .collection("incidents")
      .select("status", "category", "assignee", "date")
      .orderBy(FieldPath.documentId())
      .limit(500);
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    while (true) {
      request.signal.throwIfAborted();
      const page = await (cursor ? query.startAfter(cursor) : query).get();
      for (const doc of page.docs) {
        const item = doc.data();
        items.push({
          status: String(item.status ?? ""),
          category: String(item.category ?? ""),
          assignee: String(item.assignee ?? ""),
          date: String(item.date ?? ""),
        });
      }
      if (page.size < 500) break;
      cursor = page.docs.at(-1);
    }
    const counts = (field: "status" | "category") => {
      const keys =
        field === "status"
          ? Object.keys(statuses)
          : categories.map((item) => item.id);
      const values = new Map(keys.map((key) => [key, 0]));
      for (const item of items)
        if (values.has(item[field]))
          values.set(item[field], (values.get(item[field]) ?? 0) + 1);
      return Object.fromEntries(values);
    };
    const { open, unassigned, medianOpenDays } = aggregateCases(items);
    return Response.json(
      {
        management: { open, unassigned, medianOpenDays },
        summary: summarize(items),
        states: counts("status"),
        categories: counts("category"),
      },
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "No se pudo consultar el total general.",
      },
      { status: error instanceof ApiError ? error.status : 503, headers },
    );
  }
}
