"use client";
import { registerPlugin } from "@capacitor/core";
import { esNativo } from "./native";
import {
  confirmNativeReceipt,
  markNativeAttention,
  outgoingFor,
  readPayload,
  type Outgoing,
} from "@/data/outbox";
import { markCaseDelivered } from "@/data/local-store";
import type { ReportPayload } from "@/data/remote-reports";

type NativeReceipt = {
  key: string;
  requestId: string;
  state: "confirmed" | "attention";
  receipt?: { id: string; receivedAt: string };
};
type EnviosApi = {
  ready(input: { owner: string }): Promise<{ ready: boolean }>;
  contains(input: {
    owner: string;
    requestId: string;
  }): Promise<{ present: boolean }>;
  stage(input: {
    key: string;
    requestId: string;
    owner: string;
    payload: ReportPayload;
  }): Promise<void>;
  receipts(input: { owner: string }): Promise<{ items: NativeReceipt[] }>;
  acknowledge(input: { owner: string; requestId: string }): Promise<void>;
  clearOwner(input: { owner: string }): Promise<void>;
};
const Envios = registerPlugin<EnviosApi>("Envios");

export async function stageNativeOutgoing(
  entry: Outgoing,
  payload: ReportPayload,
) {
  if (!esNativo()) return false;
  try {
    await Envios.stage({
      key: entry.key,
      requestId: entry.requestId,
      owner: entry.owner,
      payload,
    });
    return true;
  } catch {
    // La cola web sigue íntegra; sin sesión nativa se envía al abrir la app.
    return false;
  }
}

export async function stagePendingNative(owner: string) {
  if (!esNativo()) return;
  if (!(await Envios.ready({ owner }).catch(() => ({ ready: false }))).ready)
    return;
  const pending = (await outgoingFor(owner)).filter(
    (item) => item.state === "queued" || item.state === "sending",
  );
  for (const item of pending) {
    const alreadyStaged = await Envios.contains({
      owner,
      requestId: item.requestId,
    })
      .then((result) => result.present)
      .catch(() => false);
    if (alreadyStaged) continue;
    const payload = await readPayload(item.key);
    if (payload) await stageNativeOutgoing(item, payload);
  }
}

export async function acknowledgeNative(owner: string, requestId: string) {
  if (!esNativo()) return;
  await Envios.acknowledge({ owner, requestId }).catch(() => undefined);
}

export async function clearNativeOwner(owner: string) {
  if (!esNativo()) return;
  await Envios.clearOwner({ owner }).catch(() => undefined);
}

export async function reconcileNative(owner: string) {
  if (!esNativo()) return;
  const { items } = await Envios.receipts({ owner }).catch(() => ({
    items: [],
  }));
  for (const item of items) {
    if (item.state === "confirmed" && item.receipt) {
      if (
        await confirmNativeReceipt(
          item.key,
          owner,
          item.requestId,
          item.receipt,
        )
      )
        await markCaseDelivered(
          `LOCAL-${item.key}`,
          item.receipt.receivedAt,
        ).catch(() => undefined);
    } else if (item.state === "attention") {
      await markNativeAttention(item.key, owner, item.requestId);
    }
    await acknowledgeNative(owner, item.requestId);
  }
}
