import { describe, it, expect } from "vitest";
import {
  mergeAccountReports,
  orphanedReports,
} from "../../src/domain/account-reports";
import { sampleCase } from "../fixtures/cases";

const remote = (
  over: Partial<Parameters<typeof mergeAccountReports>[1][0]> = {},
) => ({
  id: "MPD-REMOTO",
  title: "Creciente en la escuela",
  description: "El agua entró al salón.",
  vereda: "Codemaco",
  category: "infraestructura",
  status: "pendiente",
  date: "2026-09-10T10:00:00Z",
  ...over,
});

describe("el historial es de la cuenta, no del teléfono", () => {
  /**
   * El caso que motivó todo esto: quien entra desde otro teléfono, o después de
   * reinstalar, no veía nada de lo que había enviado.
   */
  it("trae del servidor lo que este dispositivo no tiene", () => {
    const merged = mergeAccountReports([], [remote()]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("MPD-REMOTO");
    expect(merged[0].delivery).toBe("enviado");
  });

  it("no repite el que ya está aquí, y conserva la copia local con su foto", () => {
    const local = sampleCase({
      id: "MPD-REMOTO",
      photo: "data:image/png;base64,YWJj",
    });
    const merged = mergeAccountReports([local], [remote()]);
    expect(merged).toHaveLength(1);
    expect(merged[0].photo).toBe("data:image/png;base64,YWJj");
    expect(merged[0].title).toBe(local.title);
  });

  /**
   * Un reporte hecho en el río no puede desaparecer de la vista por no estar
   * todavía en el servidor: es justo cuando más falta hace verlo.
   */
  it("mantiene lo que aún no ha salido de este dispositivo", () => {
    const esperando = sampleCase({
      id: "LOCAL-abc",
      title: "Sin señal todavía",
      delivery: "en-cola",
    });
    const merged = mergeAccountReports([esperando], [remote()]);
    expect(merged.map((i) => i.id).sort()).toEqual(["LOCAL-abc", "MPD-REMOTO"]);
  });

  it("ordena del más reciente al más antiguo", () => {
    const viejo = sampleCase({ id: "A", date: "2026-01-01T00:00:00Z" });
    const merged = mergeAccountReports(
      [viejo],
      [remote({ id: "B", date: "2026-09-01T00:00:00Z" })],
    );
    expect(merged.map((i) => i.id)).toEqual(["B", "A"]);
  });
});

/**
 * El estado de un reporte entregado lo lleva el Consejo en el servidor.
 *
 * La copia de este teléfono es una foto del día en que se envió. Si gana ella,
 * quien reportó ve «pendiente» un caso que el Consejo ya atendió, y eso es lo
 * contrario de para lo que existe la aplicación.
 */
it("el servidor manda en el estado; el aparato, en lo suyo", () => {
  const local = {
    id: "abc",
    title: "Creciente en la quebrada",
    description: "El agua se llevó el paso.",
    vereda: "Bellavista",
    category: "infraestructura",
    status: "pendiente",
    date: "2026-09-14T21:12:00.000Z",
    owner: "propio",
    notes: [],
    photo: "data:image/webp;base64,AAA",
    delivery: "enviado" as const,
  };
  const [merged] = mergeAccountReports(
    [local],
    [{ ...local, status: "en_proceso" }],
  );
  expect(merged.status).toBe("en_proceso");
  /* Y no se pierde nada de lo que solo está aquí. */
  expect(merged.photo).toBe("data:image/webp;base64,AAA");
  expect(merged.delivery).toBe("enviado");
});

/**
 * Lo que el Consejo retiró tiene que irse también del teléfono que lo envió.
 *
 * El servidor lo borra con su motivo y avisa a quien reportó, pero la copia de
 * este aparato no se entera de nada: seguía saliendo en «Mis reportes», en el
 * mapa y en las cifras del inicio, con su «Enviado» intacto. Retirar dejaba de
 * valer justo para quien más falta le hacía que valiera.
 */
it("un reporte que el servidor ya no tiene se señala para quitarlo de aquí", () => {
  const local = [
    sampleCase({ id: "aaa", delivery: "enviado" }),
    sampleCase({ id: "bbb", delivery: "enviado" }),
  ];
  expect(orphanedReports(local, [remote({ id: "aaa" })])).toEqual(["bbb"]);
});

it("lo que todavía no ha salido nunca se señala", () => {
  const local = [
    sampleCase({ id: "LOCAL-1", delivery: "sin-enviar" }),
    sampleCase({ id: "ccc", delivery: "en-cola" }),
  ];
  /* No están en el servidor porque aún no han llegado, no porque se hayan ido:
     borrarlos sería perder lo único que existe de ellos. */
  expect(orphanedReports(local, [])).toEqual([]);
});

it("con el servidor al día no se señala nada", () => {
  const local = [sampleCase({ id: "aaa", delivery: "enviado" })];
  expect(orphanedReports(local, [remote({ id: "aaa" })])).toEqual([]);
});
