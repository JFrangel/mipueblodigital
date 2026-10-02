import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ active: true }));
const permission = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.active },
}));
vi.mock("@capacitor-firebase/messaging", () => ({
  FirebaseMessaging: permission,
}));
import {
  askDeliveryAlerts,
  getAlerts,
  announceDelivery,
} from "../../src/data/delivery-alert";

describe("avisos locales de entrega en Android", () => {
  beforeEach(() => {
    native.active = true;
    vi.clearAllMocks();
  });
  it("pide el permiso nativo aunque WebView no tenga Notification", async () => {
    permission.requestPermissions.mockResolvedValue({ receive: "granted" });
    expect(await askDeliveryAlerts()).toBe("granted");
    expect(getAlerts()).toBe("granted");
  });
  it("refleja la denegación sin prometer avisos", async () => {
    permission.requestPermissions.mockResolvedValue({ receive: "denied" });
    expect(await askDeliveryAlerts()).toBe("denied");
    expect(getAlerts()).toBe("denied");
  });
  it("un fallo del complemento no impide usar la bandeja", async () => {
    permission.requestPermissions.mockRejectedValue(new Error("no disponible"));
    expect(await askDeliveryAlerts()).toBe("unsupported");
    await expect(announceDelivery(["caso privado"])).resolves.toBeUndefined();
  });
});
