import { expect, test } from "@playwright/test";

/**
 * El interruptor de avisos solo existe donde puede funcionar.
 *
 * Un interruptor que no hace nada es peor que no tener el interruptor: la
 * persona cree que lo activó y se queda esperando un aviso que no va a llegar.
 *
 * Aquí no hay ciclo rojo-verde y conviene decirlo en vez de fingirlo. `next
 * start` sirve el build ya hecho, así que la clave pública de los avisos viene
 * horneada y Playwright no puede encenderla ni apagarla entre pruebas. El caso
 * positivo —que el interruptor aparece y funciona— se comprueba a mano en el
 * emulador, que es donde de verdad importa. Lo que sí se puede fijar de forma
 * determinista, y se fija, es la regla contraria.
 */
test("sin soporte de avisos, Mi cuenta no ofrece el interruptor", async ({
  page,
}) => {
  await page.addInitScript(() => {
    /* Un navegador sin la API de notificaciones: iOS antiguo, o una vista web
       incrustada de las que no la traen. */
    delete (window as unknown as { Notification?: unknown }).Notification;
  });
  await page.goto("/cuenta/");
  /* La fila de al lado sí está: así se distingue «la pantalla cargó y el
     interruptor no aparece» de «la pantalla no cargó». */
  await expect(page.getByText("Apariencia")).toBeVisible();
  await expect(page.getByText("Avisos en este teléfono")).toHaveCount(0);
});
