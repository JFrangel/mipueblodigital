import { afterEach, expect, it, vi } from "vitest";
import { describeAggregate } from "../../src/server/openrouter";
import { summarize } from "../../src/domain/aggregate";

/* El agregado real, para que la prueba viaje con la forma que viaja de verdad. */
const muestra = () =>
  summarize([
    {
      status: "pendiente",
      category: "infraestructura",
      vereda: "Bellavista",
      date: "2026-09-14T10:00:00.000Z",
    },
  ]);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("impide usar modelos de pago por configuración", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
  vi.stubEnv("OPENROUTER_MODEL", "provider/paid");
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  await expect(
    describeAggregate(muestra()),
  ).rejects.toThrow("gratuitos");
  expect(request).not.toHaveBeenCalled();
});
it("solo envía agregados y rechaza cifras en la redacción", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
  vi.stubEnv("OPENROUTER_MODEL", "provider/model:free");
  const request = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Hay 99 casos." } }],
        }),
        { status: 200 },
      ),
    );
  vi.stubGlobal("fetch", request);
  await expect(
    describeAggregate({
      ...muestra(),
      actuaciones: ["Se repuso la luminaria."],
    }),
  ).rejects.toThrow("validación");
  const payload = JSON.parse(request.mock.calls[0][1].body);
  const enviado = JSON.parse(payload.messages[1].content);
  /* Las actuaciones sí viajan —son lo que el Consejo escribió al cerrar— y la
     nota interna no: existe justamente para lo que no se cuenta fuera. */
  expect(enviado.actuaciones).toEqual(["Se repuso la luminaria."]);
  expect(enviado.total).toBe(1);
  expect(enviado.states.pendiente).toBe(1);
  expect(enviado.veredas.Bellavista).toBe(1);
  /* Lo que se comprueba no es la forma exacta —crecerá— sino que no viaje
     nada que no sea un conteo: ni relato, ni título, ni teléfono, ni dueño. */
  const texto = JSON.stringify(enviado);
  for (const prohibido of [
    "description",
    "title",
    "phone",
    "owner",
    "photo",
    "evidence",
    "internalNote",
  ])
    expect(texto).not.toContain(prohibido);
});
