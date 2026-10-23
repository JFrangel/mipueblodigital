import { it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  delivered: vi.fn(async () => {}),
  dispatch: vi.fn(),
  matched: true,
}));
vi.mock("@capacitor/core", () => ({
  registerPlugin: () => ({
    receipts: async () => ({
      items: [
        {
          key: "k",
          requestId: "r",
          state: "confirmed",
          receipt: { id: "SERVER", receivedAt: "2026-10-21" },
        },
      ],
    }),
    acknowledge: async () => {},
  }),
}));
vi.mock("../../src/platform/native", () => ({ esNativo: () => true }));
vi.mock("../../src/data/outbox", () => ({
  confirmNativeReceipt: async () => state.matched,
}));
vi.mock("../../src/data/local-store", () => ({
  markCaseDelivered: state.delivered,
}));
import { reconcileNative } from "../../src/platform/native-outbox";
it("Android vincula el recibo y actualiza la pantalla solo para la cuenta correspondiente", async () => {
  vi.stubGlobal("window", { dispatchEvent: state.dispatch });
  await reconcileNative("owner");
  expect(state.delivered).toHaveBeenCalledWith(
    "LOCAL-k",
    "2026-10-21",
    "SERVER",
  );
  expect(state.dispatch.mock.calls[0][0].type).toBe("case-delivered");
  state.delivered.mockClear();
  state.dispatch.mockClear();
  state.matched = false;
  await reconcileNative("other");
  expect(state.delivered).not.toHaveBeenCalled();
  expect(state.dispatch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
