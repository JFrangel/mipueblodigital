import { expect, it, vi } from "vitest";
import {
  notifyReportUpdate,
  onReportUpdate,
} from "../../src/data/report-updates";
it("actualiza las vistas del expediente y permite desmontar la suscripción", () => {
  vi.stubGlobal("window", new EventTarget());
  const receive = vi.fn();
  const stop = onReportUpdate(receive, "A");
  notifyReportUpdate("B");
  expect(receive).not.toHaveBeenCalled();
  notifyReportUpdate("A");
  expect(receive).toHaveBeenCalledTimes(1);
  stop();
  notifyReportUpdate("A");
  expect(receive).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});
