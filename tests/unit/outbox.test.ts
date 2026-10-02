import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  enqueue,
  outgoingFor,
  claimOutgoing,
  settleOutgoing,
  retryOutgoing,
  retryDelay,
  readPayload,
  pendingAnnouncements,
  markDeliveriesSeen,
  confirmNativeReceipt,
  markNativeAttention,
} from "../../src/data/outbox";
const payload = {
  category: "infraestructura",
  vereda: "Bocas de Satinga",
  description: "El muelle presenta daños",
  phone: "",
  photo: "data:image/png;base64,YWJj",
  sensitive: false,
};
describe("bandeja persistente", () => {
  it("conserva identificador al repetir un envío y aísla cuentas", async () => {
    const owner = crypto.randomUUID();
    const a = await enqueue(owner, payload),
      b = await enqueue(owner, payload),
      c = await enqueue("other-" + owner, payload);
    expect(a.requestId).toBe(b.requestId);
    expect(c.requestId).not.toBe(a.requestId);
    expect(await outgoingFor(owner)).toHaveLength(1);
  });
  it("reserva un solo envío entre dos pestañas y rechaza otro dueño", async () => {
    const owner = crypto.randomUUID(),
      item = await enqueue(owner, payload);
    expect(await claimOutgoing(item.key, "intruder")).toBeNull();
    const claims = await Promise.all([
      claimOutgoing(item.key, owner),
      claimOutgoing(item.key, owner),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
  });
  it("conserva datos si falla y libera fotografía solo con recibo", async () => {
    const owner = crypto.randomUUID(),
      item = await enqueue(owner, payload),
      claimed = (await claimOutgoing(item.key, owner))!;
    await settleOutgoing(claimed, { error: "sin señal", permanent: false });
    expect(await readPayload(item.key)).toEqual(payload);
    await retryOutgoing(item.key, owner);
    const retry = (await claimOutgoing(item.key, owner))!;
    expect(retry.requestId).toBe(item.requestId);
    await settleOutgoing(retry, {
      receipt: { id: "remote", receivedAt: new Date().toISOString() },
    });
    const saved = (await outgoingFor(owner))[0];
    expect(saved.state).toBe("confirmed");
    expect(await readPayload(item.key)).toBeUndefined();
    expect(saved.bytes).toBe(0);
  });
  it("limita a diez reportes sin eliminar pendientes", async () => {
    const owner = crypto.randomUUID();
    for (let i = 0; i < 10; i++)
      await enqueue(owner, { ...payload, description: `reporte ${i}` });
    await expect(
      enqueue(owner, { ...payload, description: "once" }),
    ).rejects.toThrow("10 reportes");
    expect(await outgoingFor(owner)).toHaveLength(10);
  });
  it("bloquea reintentos automáticos de rechazos permanentes", async () => {
    const owner = crypto.randomUUID(),
      item = await enqueue(owner, payload),
      claimed = (await claimOutgoing(item.key, owner))!;
    await settleOutgoing(claimed, {
      error: "verificar correo",
      permanent: true,
    });
    expect((await outgoingFor(owner))[0].state).toBe("attention");
    expect(await claimOutgoing(item.key, owner)).toBeNull();
  });
  it("listar la bandeja no carga las fotografías", async () => {
    const owner = crypto.randomUUID();
    await enqueue(owner, payload);
    const listed = (await outgoingFor(owner))[0] as Record<string, unknown>;
    expect(listed.photo).toBeUndefined();
    expect(Object.hasOwn(listed, "payload")).toBe(false);
  });
  it("anuncia lo que salió sin nadie delante y calla lo que se vio salir", async () => {
    const owner = crypto.randomUUID();
    const watched = await enqueue(owner, payload);
    const receipt = { id: "a", receivedAt: new Date().toISOString() };
    await settleOutgoing(
      (await claimOutgoing(watched.key, owner))!,
      { receipt },
      true,
    );
    // Enviado con el formulario delante: el recibo ya se mostró allí.
    expect(pendingAnnouncements(await outgoingFor(owner))).toHaveLength(0);

    const waiting = await enqueue(owner, {
      ...payload,
      description: "El puente quedó sin tablas",
    });
    await settleOutgoing((await claimOutgoing(waiting.key, owner))!, {
      receipt: { id: "b", receivedAt: new Date().toISOString() },
    });
    const news = pendingAnnouncements(await outgoingFor(owner));
    expect(news).toHaveLength(1);
    expect(news[0].title).toContain("puente");

    await markDeliveriesSeen(owner);
    expect(pendingAnnouncements(await outgoingFor(owner))).toHaveLength(0);
  });
  it("no anuncia entregas anteriores a la marca", async () => {
    const owner = crypto.randomUUID();
    const item = await enqueue(owner, payload);
    const claimed = (await claimOutgoing(item.key, owner))!;
    await settleOutgoing(claimed, {
      receipt: { id: "viejo", receivedAt: new Date().toISOString() },
    });
    // Se simula lo guardado antes de existir `seen`: confirmado y sin marca.
    const stored = (await outgoingFor(owner))[0] as Record<string, unknown>;
    delete stored.seen;
    expect(pendingAnnouncements([stored as never])).toHaveLength(0);
  });
  it("espera progresiva acotada", () => {
    expect(retryDelay(1)).toBe(5000);
    expect(retryDelay(2)).toBe(10000);
    expect(retryDelay(100)).toBe(900000);
  });
  it("un fallo web tardío no reactiva un rechazo nativo definitivo", async () => {
    const owner = crypto.randomUUID();
    const entry = await enqueue(owner, payload);
    const attempt = (await claimOutgoing(entry.key, owner))!;
    await markNativeAttention(entry.key, owner, entry.requestId);
    await settleOutgoing(attempt, { error: "sin señal", permanent: false });
    expect((await outgoingFor(owner))[0].state).toBe("attention");
    expect(await readPayload(entry.key)).toBeDefined();
  });
  it("acepta el recibo nativo al reabrir sin entregar el caso a otra cuenta", async () => {
    const owner = crypto.randomUUID();
    const item = await enqueue(owner, {
      ...payload,
      description: "Desde Android",
    });
    const receipt = { id: "consejo-1", receivedAt: new Date().toISOString() };
    expect(
      await confirmNativeReceipt(item.key, "otro", item.requestId, receipt),
    ).toBe(false);
    expect(await readPayload(item.key)).toBeDefined();
    expect(
      await confirmNativeReceipt(item.key, owner, "otro-id", receipt),
    ).toBe(false);
    const webAttempt = (await claimOutgoing(item.key, owner))!;
    expect(
      await confirmNativeReceipt(item.key, owner, item.requestId, receipt),
    ).toBe(true);
    // La ventana web pudo quedar enviando al mismo tiempo: su error tardío no
    // puede volver a poner en cola un caso confirmado por Android.
    await settleOutgoing(webAttempt, {
      error: "red inestable",
      permanent: false,
    });
    expect((await outgoingFor(owner))[0].receipt).toEqual(receipt);
    expect(await readPayload(item.key)).toBeUndefined();
    expect(pendingAnnouncements(await outgoingFor(owner))).toHaveLength(1);
  });
});
