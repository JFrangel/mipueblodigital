import { expect, it } from "vitest";
import { registrationError, authError } from "../../src/domain/auth";
it("registro valida nombre, longitud y confirmación", () => {
  expect(registrationError("Ana", "contraseña-larga", "diferente")).toContain(
    "coinciden",
  );
  expect(registrationError("Ana", "corta", "corta")).toContain("12");
  expect(
    registrationError(" ", "contraseña-larga", "contraseña-larga"),
  ).toContain("nombre");
  expect(
    registrationError("Ana", "contraseña-larga", "contraseña-larga"),
  ).toBeNull();
});
it("errores no revelan existencia de cuentas", () => {
  expect(authError({ code: "auth/email-already-in-use" })).toBe(
    authError({ code: "auth/user-not-found" }),
  );
  expect(authError({ code: "auth/popup-blocked" })).toContain("ventana");
});

/**
 * La cuenta que su dueña cerró. Antes caía en el texto de reserva, que le echa
 * la culpa a sus datos y la manda a recuperar la contraseña: un correo que sí
 * llega, un formulario que sí funciona y una puerta que sigue cerrada.
 */
it("una cuenta cerrada manda al Consejo, no a recuperar la contraseña", () => {
  const dicho = authError({ code: "auth/user-disabled" });
  expect(dicho).toContain("Consejo");
  expect(dicho).not.toContain("contraseña");
  /* Y no es el texto de reserva: sin esto, borrar la entrada del mapa dejaría
     la prueba en verde en cuanto el texto genérico mencionara al Consejo. */
  expect(dicho).not.toBe(authError({ code: "mpd/inventado" }));
});
