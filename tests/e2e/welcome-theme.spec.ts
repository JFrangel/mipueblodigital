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
