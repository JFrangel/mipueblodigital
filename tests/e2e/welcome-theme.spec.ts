import {test,expect} from "@playwright/test";
test("bienvenida centra el aviso y mantiene contraste en ambos temas",async({page})=>{
 await page.setViewportSize({width:461,height:912});await page.goto("/bienvenida/");
 const offline=page.locator("p").filter({hasText:"También puedes reportar"});await expect(offline).toBeVisible();
 const box=await offline.boundingBox();expect(Math.abs(box!.x+box!.width/2-230.5)).toBeLessThan(2);
 /* Y en escritorio al canto, como el titular y el botón: la columna se lee en
    una sola línea de arranque y una nota centrada la partía. */
 await page.setViewportSize({width:1280,height:900});
 const inicio=await page.getByRole("heading",{level:1}).boundingBox();
 const ancho=await offline.boundingBox();
 expect(Math.abs(ancho!.x-inicio!.x)).toBeLessThan(2);
 const heading=page.getByRole("heading",{level:1});const light=await heading.evaluate(e=>getComputedStyle(e).color);
 await page.getByRole("button",{name:"Activar tema oscuro"}).click();const dark=await heading.evaluate(e=>getComputedStyle(e).color);expect(light).not.toBe(dark);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("login y registro comparten tema sin perder controles",async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto("/acceso/");await expect(page.getByRole("button",{name:"Iniciar sesión",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Crear una cuenta",exact:true}).click();await expect(page.getByLabel("Confirmar contraseña",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Activar tema oscuro"}).click();const submit=page.getByRole("button",{name:"Crear cuenta",exact:true});await submit.hover();expect(await submit.evaluate(e=>getComputedStyle(e).color)).toBe("rgb(255, 255, 255)");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

/**
 * Quien ya tiene cuenta viene a entrar, no a que le cuenten la aplicación.
 *
 * Antes tenía que pasar por «Comenzar», llegar a Inicio y buscar el acceso
 * desde ahí o desde Mi cuenta. El enlace va en segundo plano a propósito: la
 * puerta principal de esta pantalla sigue siendo conocer el proyecto sin
 * registrarse.
 *
 * Se comprueba el contraste en los dos temas porque la primera versión llevaba
 * un blanco copiado del área oscura de arriba, y sobre la tarjeta clara no se
 * leía.
 */
test("la bienvenida ofrece entrar, y se lee en los dos temas",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/bienvenida/");
 const entrar=page.getByRole("link",{name:"Inicia sesión"});
 await expect(entrar).toBeVisible();
 await expect(entrar).toHaveAttribute("href","/acceso/");
 /* La pregunta que lo acompaña no puede ser del color del fondo. Se compara
    contra el texto de al lado, que sí se sabe legible en las dos pantallas. */
 const legible=async()=>{
  const pregunta=page.locator("p").filter({hasText:"¿Ya tienes cuenta?"});
  const [color,vecino]=await Promise.all([
   pregunta.evaluate(el=>getComputedStyle(el).color),
   page.locator("p").filter({hasText:"Haz visible lo que pasa"}).evaluate(el=>getComputedStyle(el).color),
  ]);
  /* `color-mix` no resuelve a `rgb(0-255)` sino a `color(srgb 0-1 …)`, y
     comparar las dos notaciones a pelo hace fallar la prueba por unidades, no
     por color. Se normaliza a 0-255. */
  const canal=(c:string)=>{
   const n=c.match(/[\d.]+/g)!.slice(0,3).map(Number);
   return c.startsWith("color(")?n.map(v=>v*255):n;
  };
  const [a,b]=[canal(color),canal(vecino)];
  /* Mismo tono que el texto vecino, solo más apagado: si alguien vuelve a
     copiar un color del área contraria, estos tres canales se separan. */
  return a.every((v,i)=>Math.abs(v-b[i])<12);
 };
 expect(await legible()).toBe(true);
 await page.getByRole("button",{name:"Activar tema oscuro"}).click();
 await expect(page.getByRole("button",{name:"Activar tema claro"})).toBeVisible();
 expect(await legible()).toBe(true);
});
