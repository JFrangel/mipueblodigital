import "fake-indexeddb/auto";
import { expect, test, vi } from "vitest";
const receipts = vi.hoisted(
  () => [] as { key: string; receipt: { id: string; receivedAt: string } }[],
);
vi.mock("../../src/data/outbox", () => ({ outgoingFor: async () => receipts }));
import { sampleCase } from "../fixtures/cases";
import {
  saveLocalCase,
  readLocalCases,
  markCaseDelivered,
} from "../../src/data/local-store";
import {
  mergeAccountReports,
  orphanedReports,
} from "../../src/domain/account-reports";
test("el recibo sustituye la identidad local sin perder fotos ni duplicar el historial", async () => {
  const item = sampleCase({
    id: "LOCAL-receipt",
    account: "receipt-owner",
    delivery: "en-cola",
    photos: ["image"],
  });
  await saveLocalCase(item);
  await markCaseDelivered(item.id, "2026-10-21T12:00:00Z", "MPD-receipt");
  const saved = await readLocalCases("receipt-owner");
  expect(saved.map((c) => c.id)).toEqual(["MPD-receipt"]);
  expect(saved[0].photos).toEqual(["image"]);
  expect(saved[0].date).toBe("2026-10-21T12:00:00Z");
  const remote = [{ ...item, id: "MPD-receipt" }];
  expect(mergeAccountReports(saved, remote)).toHaveLength(1);
  expect(orphanedReports(saved, remote)).toEqual([]);
  await markCaseDelivered(item.id, "2026-10-21T12:00:00Z", "MPD-receipt");
  expect(await readLocalCases("receipt-owner")).toHaveLength(1);
});
test("recupera la identidad de una copia antigua desde su recibo conservado", async () => {
  const item = sampleCase({
    id: "LOCAL-legacy",
    account: "legacy-owner",
    delivery: "enviado",
    photos: ["old-image"],
  });
  await saveLocalCase(item);
  receipts.push({
    key: "legacy",
    receipt: { id: "MPD-legacy", receivedAt: "2026-10-20T12:00:00Z" },
  });
  const saved = await readLocalCases("legacy-owner");
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    id: "MPD-legacy",
    photos: ["old-image"],
    date: "2026-10-20T12:00:00Z",
  });
  receipts.length = 0;
});
