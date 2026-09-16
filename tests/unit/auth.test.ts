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
