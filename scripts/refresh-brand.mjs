import sharp from "sharp";
// Una sola fuente para los iconos instalables; la variante maskable respeta el área segura.
for (const size of [192, 512]) {
  await sharp("public/brand/emblem.svg")
    .resize(size, size)
    .png()
    .toFile(`public/brand/pwa-${size}.png`);
}
const emblem = await sharp("public/brand/emblem.svg")
  .resize(350, 350)
  .png()
  .toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#123f39" },
})
  .composite([{ input: emblem, left: 81, top: 81 }])
  .png()
  .toFile("public/brand/pwa-maskable-512.png");
