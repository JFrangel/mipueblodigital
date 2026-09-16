import { test, expect } from "@playwright/test";
import { seedCases } from "./seed-cases";
import { sampleCase } from "../fixtures/cases";
import { openDetails } from "./report-flow";
/**
 * Hubo una versión que guardaba reportes de demostración sin enviarlos, y esos
 * registros quedaron contando en las cifras de quien los creó —y en el mapa—
 * sin manera ninguna de sacarlos. Retirar uno toca solo la copia del
 * dispositivo, así que tiene que sobrevivir a una recarga.
 */
test("un reporte guardado se puede quitar de este dispositivo y no vuelve", async ({
  page,
}) => {
  /* El registro de la versión antigua: sin la marca de dueño que lleva lo que
     se envía hoy. Es exactamente el que nadie podía sacar, así que es el que
     tiene que poder sacarse. */
  await seedCases(page, [
    sampleCase({
      id: "LOCAL-9d7d18ba",
      title: "Guardado de demostración",
      owner: "",
      notes: ["Guardado local de demostración. No enviado al Consejo."],
    }),
  ]);
  await page.goto("/mis-reportes/");
  await page.getByRole("button", { name: /Guardado de demostración/ }).click();
  await page
    .getByRole("button", { name: "Quitar de este dispositivo" })
    .click();
  // Retirar solo se ofrece para lo que nunca salió: un expediente que el
  // Consejo ya tiene no se borra de aquí, es la copia de quien lo envió.
  // Se dice qué se quita y que el Consejo conserva lo suyo antes de hacerlo.
  await expect(page.getByRole("group")).toContainText("nunca llegó al Consejo");
  await page
    .getByRole("group")
    .getByRole("button", { name: "Quitar de este dispositivo" })
    .click();
  await expect(page).toHaveURL(/\/mis-reportes\/$/);
  await expect(
    page.getByRole("button", { name: /Guardado de demostración/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Guardado de demostración/ }),
  ).toHaveCount(0);
});

test("guardar borrador conserva lo escrito y lo anuncia como borrador", async ({
  page,
}) => {
  await openDetails(page);
  await page
    .getByRole("textbox", { name: /Descripción/ })
    .fill("El puente de tablas se hundió con la creciente del sábado.");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  /* Exacto: el aviso flotante dice también «Guardado como borrador en este
     dispositivo», y una coincidencia parcial casaría con los dos. */
  await expect(
    page.getByText("GUARDADO COMO BORRADOR", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".toast-done")).toHaveText(
    "Guardado como borrador en este dispositivo.",
  );
  // Consta como borrador donde uno va a buscar lo suyo…
  await page.goto("/mis-reportes/");
  await expect(page.getByText("BORRADOR SIN ENVIAR")).toBeVisible();
  // …y al volver al formulario está tal como se dejó.
  await page.goto("/reportar/");
  await expect(page.getByRole("textbox", { name: /Descripción/ })).toHaveValue(
    /puente de tablas/,
  );
});

/**
 * Borrador y bandeja de salida son dos cosas distintas, y confundirlas tiene
 * consecuencias: uno espera a que su autor lo mande, el otro sale solo en
 * cuanto haya red. Un reporte que nunca salió tiene que poder decirlo y poder
 * retomarse; si no, se queda contando en las cifras sin haber llegado a nadie.
 */
test("un expediente entregado no ofrece retirarse de este dispositivo", async ({
  page,
}) => {
  await seedCases(page, [
    sampleCase({ id: "MPD-0248", title: "Alumbrado en el malecón" }),
  ]);
  await page.goto("/mis-reportes/");
  await page.getByRole("button", { name: /Alumbrado en el malecón/ }).click();
  await expect(
    page.getByRole("button", { name: "Quitar de este dispositivo" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Retomar y enviar" }),
  ).toHaveCount(0);
});

test("lo que nunca salió lo dice y se puede retomar como borrador", async ({
  page,
}) => {
  await seedCases(page, [
    sampleCase({
      id: "LOCAL-9d7d18ba",
      title: "Guardado de demostración",
      vereda: "Boca de Víbora",
      description: "El poste de la escuela lleva semanas apagado.",
      owner: "",
      notes: ["Guardado local de demostración. No enviado al Consejo."],
    }),
  ]);
  await page.goto("/mis-reportes/");
  // En el listado se ve sin abrirlo.
  await expect(page.getByText("Sin enviar").first()).toBeVisible();
  await page.getByRole("button", { name: /Guardado de demostración/ }).click();
  await expect(page.getByText("nunca llegó al Consejo")).toBeVisible();

  await page.getByRole("button", { name: "Retomar y enviar" }).click();
  await expect(page).toHaveURL(/\/reportar\/$/);
  // Vuelve al formulario con lo que tenía, listo para revisarlo y mandarlo.
  await expect(page.getByRole("textbox", { name: /Descripción/ })).toHaveValue(
    /poste de la escuela/,
  );

  // Y desde ese momento consta como borrador, que no sale solo.
  await page.goto("/mis-reportes/");
  await expect(page.getByText("BORRADOR SIN ENVIAR")).toBeVisible();
  await expect(page.getByText("Un borrador no sale solo")).toBeVisible();
});

test("calendario navega a mes vacío y filtra periodo", async ({ page }) => {
  await page.goto("/estadisticas/");
  await page.screenshot({
    path: "test-results/estadisticas-calendario.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await expect(
    page.getByText("No hay incidencias para este día."),
  ).toBeVisible();
  await page.getByLabel("Desde", { exact: true }).fill("2027-01-01");
  // Un periodo sin nada dice cero, no esconde el contador.
  await expect(page.getByText("0 registros en el periodo")).toBeVisible();
});

/**
 * El almacén del aparato es de quien lo escribió.
 *
 * Devolvía todo a cualquiera: quien entrara después en el mismo teléfono veía
 * en «Mis reportes» los de quien estuvo antes, con su relato y su fotografía.
 * En un territorio donde el teléfono se presta, eso es una filtración, no un
 * detalle de implementación.
 */
test("un reporte de otra cuenta no aparece en Mis reportes", async ({
  page,
}) => {
  await seedCases(page);
  /* Lo sembrado no lleva cuenta: es lo que dejó una versión anterior. */
  await page.goto("/mis-reportes/");
  await expect(
    page.getByRole("button", { name: /Alumbrado en el malecón/ }),
  ).toBeVisible();

  /* Ahora firma como una cuenta. Al releer, lo reclama. */
  await page.evaluate(async (uid) => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("mi-pueblo", 1);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("cases", "readwrite");
        const store = tx.objectStore("cases");
        const all = store.getAll();
        all.onsuccess = () => {
          for (const item of all.result) store.put({ ...item, account: uid });
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
  }, "cuenta-de-otra-persona");

  await page.reload();
  /* Sin sesión solo se ve lo que no tiene dueño, y ya no queda ninguno. */
  await expect(
    page.getByRole("button", { name: /Alumbrado en el malecón/ }),
  ).toHaveCount(0);

  /* Y su expediente, abierto por su dirección, ya no se planta en «no está en
     este dispositivo». Eso era verdad y no servía de nada: el aparato no es la
     fuente. Dice por qué no puede traerlo y por dónde se entra. */
  await page.goto("/reporte/MPD-0248/");
  await expect(
    page.getByRole("heading", { name: "No pudimos abrir este reporte" }),
  ).toBeVisible();
  await expect(page.getByText(/Entra con tu cuenta/)).toBeVisible();
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/acceso\//);
});

/**
 * El traslado desde el nombre viejo de la base local.
 *
 * Se llamaba `mi-pueblo-demo`, y ese nombre se lee en el inspector del
 * navegador. Al cambiarlo hay que traerse lo que había, porque ahí vive lo
 * único irrecuperable del sistema: los borradores y los reportes que todavía no
 * han salido del teléfono. Un cambio de nombre a secas los perdería, y son los
 * de quien reportó sin señal.
 */
test("lo guardado con el nombre anterior se conserva al abrir", async ({
  page,
}) => {
  await page.goto("/inicio/");
  await page.evaluate(
    (item) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("mi-pueblo-demo", 2);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore("cases", { keyPath: "id" });
          db.createObjectStore("drafts");
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(["cases", "drafts"], "readwrite");
          tx.objectStore("cases").put(item);
          tx.objectStore("drafts").put(
            { description: "quedó a medias" },
            "current",
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
    sampleCase({ id: "LOCAL-VIEJO", title: "Poste caído en la escuela" }),
  );

  await page.goto("/mis-reportes/");
  await expect(
    page.getByRole("button", { name: /Poste caído en la escuela/ }),
  ).toBeVisible();

  /* Y la vieja se va: dejarla sería tener lo mismo en dos sitios, con uno de
     los dos diciendo todavía «demo». */
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const bases = await indexedDB.databases();
        return bases.map((b) => b.name);
      }),
    )
    .not.toContain("mi-pueblo-demo");
});
