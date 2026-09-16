import { it, expect } from "vitest";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { buildCover, validateOriginal } from "../../src/server/evidence";
it("valida imagen y conserva exactamente bytes, resolución y hash", async () => {
  const original = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  const result = await validateOriginal(
    `data:image/png;base64,${original.toString("base64")}`,
  );
  expect(Buffer.from(result.content_base64, "base64")).toEqual(original);
  expect(result.sha256).toBe(
    createHash("sha256").update(original).digest("hex"),
  );
  expect(result.byte_size).toBe(original.length);
});
it("rechaza texto disfrazado de fotografía y MIME falso", async () => {
  await expect(
    validateOriginal("data:image/png;base64,YWJj"),
  ).rejects.toThrow();
  const original = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  await expect(
    validateOriginal(`data:image/jpeg;base64,${original.toString("base64")}`),
  ).rejects.toThrow();
});

/**
 * La portada de un comunicado.
 *
 * Aquí no manda el original —no es una prueba, es un encabezado—, así que lo
 * que se comprueba es lo contrario que en la evidencia: que se reduzca, que
 * quepa en el documento y que al cambiar la foto cambie la marca, porque de
 * esa marca depende que el navegador deje de servir la portada anterior.
 */
const foto = (width: number, height: number, sigma: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      /* El ruido es lo que manda; el fondo lo pide la firma de sharp. */
      background: "black",
      noise: { type: "gaussian", mean: 128, sigma },
    },
  })
    .jpeg({ quality: 100 })
    .toBuffer();

it("la portada se reduce a la medida del encabezado y conserva la proporción", async () => {
  const original = await foto(3000, 2000, 12);
  const cover = await buildCover(original.toString("base64"));
  expect(cover.mime_type).toBe("image/webp");
  const medidas = await sharp(
    Buffer.from(cover.content_base64, "base64"),
  ).metadata();
  expect(medidas.format).toBe("webp");
  // 3000 × 2000 encajado dentro de 1400 × 800: manda el alto.
  expect([medidas.width, medidas.height]).toEqual([1200, 800]);
});

it("una fotografía difícil sigue cabiendo en el documento", async () => {
  // Ruido fuerte: es lo que peor comprime, y lo que obliga a bajar calidad.
  const original = await foto(2400, 1600, 90);
  const cover = await buildCover(original.toString("base64"));
  expect(cover.content_base64.length).toBeLessThanOrEqual(420 * 1024);
});

it("una fotografía pequeña no se amplía ni repite marca con otra distinta", async () => {
  const pequena = await foto(320, 180, 10);
  const cover = await buildCover(pequena.toString("base64"));
  const medidas = await sharp(
    Buffer.from(cover.content_base64, "base64"),
  ).metadata();
  expect([medidas.width, medidas.height]).toEqual([320, 180]);
  const otra = await foto(320, 180, 70);
  expect((await buildCover(otra.toString("base64"))).digest).not.toBe(
    cover.digest,
  );
});
