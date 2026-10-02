/** Comprobación de lectura: no crea expedientes ni usa tokens de ciudadanos. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const origin = new URL(
  process.env.MPD_BASE_URL ?? "https://mipueblodigital.vercel.app",
);
if (origin.protocol !== "https:")
  throw new Error("La comprobación remota exige HTTPS.");
const expected = JSON.parse(
  readFileSync("public/descargas/version.json", "utf8"),
);
const report = {
  checkedAt: new Date().toISOString(),
  origin: origin.origin,
  routes: [],
  apk: null,
};
const get = (path, options = {}) =>
  fetch(new URL(path, origin), {
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
    ...options,
  });
for (const [path, status] of [
  ["/bienvenida/", 200],
  ["/reportar/", 200],
  ["/comunidad/", 200],
  ["/memoria/", 200],
  ["/cuenta/", 200],
  ["/api/incidents/", 401],
  ["/api/admin/incidents/", 401],
]) {
  const response = await get(path);
  report.routes.push({ path, status: response.status, expected: status });
  await response.body?.cancel();
  if (response.status !== status)
    throw new Error(`${path}: ${response.status}, se esperaba ${status}.`);
}
const response = await get("/descargas/version.json");
if (!response.ok)
  throw new Error("No se pudo consultar el manifiesto publicado.");
const published = await response.json();
for (const key of ["versionCode", "versionName", "bytes", "sha256"])
  if (published[key] !== expected[key])
    throw new Error(`El manifiesto difiere en ${key}.`);
const download = new URL(published.url, origin);
if (download.origin !== origin.origin)
  throw new Error("Revisar manualmente el alojamiento externo del APK.");
const apk = await get(download.href, {
  headers: { "User-Agent": "AndroidDownloadManager" },
});
if (!apk.ok) throw new Error(`No se puede descargar el APK: ${apk.status}.`);
const buffer = Buffer.from(await apk.arrayBuffer());
const sha256 = createHash("sha256").update(buffer).digest("hex");
if (buffer.length !== expected.bytes || sha256 !== expected.sha256)
  throw new Error("El APK remoto no coincide con el archivo compilado.");
report.apk = {
  versionCode: published.versionCode,
  versionName: published.versionName,
  bytes: buffer.length,
  sha256,
  status: apk.status,
};
const output =
  process.env.MPD_VERIFY_OUTPUT ?? ".runtime/production-check.json";
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  `PASS: ${report.routes.length} rutas y APK ${published.versionName}, tamaño y SHA-256 coincidentes. Evidencia: ${output}`,
);
