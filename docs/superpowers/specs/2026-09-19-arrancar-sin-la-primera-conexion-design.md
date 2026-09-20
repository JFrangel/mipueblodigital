# Reportar sin haber visto nunca la red — diseño y lo construido

19 de septiembre de 2026

## 1. Qué se quería

Que alguien reciba el APK por Bluetooth en el río, lo instale, lo abra **sin
señal** y pueda **escribir un reporte**, que sale solo cuando aparece la red.

No se pretendía que viera los comunicados de ayer ni sus expedientes: un
teléfono recién instalado no los ha recibido nunca. Lo que no era razonable es
que la aplicación ni siquiera abriera.

**Está hecho.** Este documento cuenta por qué se eligió el camino corto y no el
largo, porque el largo parecía el obvio.

## 2. Por qué no se podía

El APK no lleva la aplicación dentro: es una ventana a la aplicación servida por
HTTPS. En el primer arranque no hay código —ni HTML, ni JavaScript, ni service
worker— y no hay nada que ejecutar. **Lo que falta no son los datos: es el
programa.**

### 2.1. Y el origen lo complicaba todo

La tentación era meter una páginita suelta en el APK que guardara el reporte.
**No sirve**: el almacén de un navegador es por origen, y esa página se sirve
desde `localhost` mientras la aplicación vive en su dominio. El reporte quedaría
en un cajón que nadie abre.

## 3. El camino largo, que no se tomó

Mover la aplicación entera al aparato: exportación estática dentro del APK, sin
`server.url`. Una semana larga, y dos costes que no se ven:

- **La API queda expuesta a otro origen** —CORS en veintinueve rutas— y en una
  aplicación donde se reporta minería ilegal eso es una decisión de seguridad,
  no de arquitectura. La variante que lo evita, servir bajo el mismo nombre de
  dominio, obliga a `CapacitorHttp` para que `/api/` no dé 404: sustituye
  `fetch` globalmente, y esta aplicación usa `AbortSignal.timeout` en casi todas
  sus llamadas.
- **Las actualizaciones**: con el código dentro, un cambio de pantalla exigiría
  repartir diez megas por Bluetooth río arriba.

## 4. El camino corto, que sí

Leyendo el código de Capacitor apareció algo que lo cambia todo:

> `getErrorUrl()` construye la dirección de la página de error con
> `config.getHostname()`, y `shouldInterceptRequest` la sirve **desde el APK**
> aunque `server.url` esté puesto.

O sea: **poniendo `server.hostname` al dominio de la aplicación, la página de
arranque comparte origen con ella.** Y con el origen compartido, comparte el
almacén: un reporte escrito ahí lo recoge la bandeja de envíos.

Y no arrastra nada: el dominio **ya estaba** en las autoridades del servidor
local —lo añade `server.url`— así que la intermediación de peticiones es la
misma de siempre. Lo único que cambia es dónde vive esa página.

Eso convierte una semana en una tarde.

## 5. Lo que se construyó

| | |
| --- | --- |
| `capacitor.config.ts` | `errorPath` y `hostname` |
| `capacitor/www/index.html` | La página: aviso, reintentar y **formulario de reporte** |
| `scripts/pagina-sin-red.mjs` | Inlina los módulos reales y la dirección |
| `src/features/outbox.tsx` | La tarjeta que pregunta por lo que quedó sin dueño |
| `src/features/leaf-fall.tsx` | Las hojas aprenden a quedarse abiertas y a caber en una franja |

### 5.1. Los módulos de verdad, no una copia

La página guarda en la misma bandeja que la aplicación, con la misma clave, la
misma fotografía preparada igual y las mismas validaciones. **No los
reimplementa: los inlina.**

`src/data/outbox.ts`, `src/platform/evidence.ts`, `src/domain/logic.ts` y el
catálogo territorial no tienen dependencias en tiempo de ejecución, así que el
guion los transpila y los mete envueltos en su propio ámbito —dos declaran
constantes de nombre parecido y juntarlas sería esperar a que un día se pisen—.

**Y si algún día dejan de ser autosuficientes, el guion se detiene** con un
mensaje que dice qué decidir. Ese guardián es la mitad del valor del archivo:
sin él, el día que alguien añada un `import` a `outbox.ts`, la página se
quedaría escribiendo en el vacío y nadie se enteraría hasta que un reporte se
perdiera en el río.

Lo cazó a la primera vez que corrió, con un import que ocupaba varias líneas.

### 5.2. La página no ofrece lo que no puede cumplir

Antes de enseñar el formulario comprueba dos cosas, y si falta cualquiera **no
lo enseña**: que los módulos estén, y que `location.origin` sea el de la
aplicación. Un formulario que guarda donde nadie mira es peor que no tenerlo: la
persona se va convencida de que su reporte existe.

Esa comprobación es además la prueba viva de que `server.hostname` sigue puesto.

### 5.3. El fallo que habría convertido esto en teatro

`adoptar()` —lo que pasa a tu nombre lo que escribiste sin cuenta— **exige una
marca en `sessionStorage`**, y esa marca muere al cerrar la aplicación. Que es
exactamente lo que hace quien escribe sin señal y sale a buscarla.

Sin resolverlo: se escribe el reporte, se cierra, se vuelve con señal, se entra…
y el reporte se queda a nombre de nadie **e invisible**, porque la bandeja pasa
a enseñar la de la cuenta. La persona creería que lo mandó.

La marca no se puede mudar a un almacén que sobreviva: en el río los teléfonos
se prestan, y entonces quien entrara se llevaría el reporte de otra persona. Así
que **no se adivina, se pregunta**: con sesión abierta y algo esperando a nombre
de nadie, la bandeja lo dice y ofrece reclamarlo.

Y dice **la fecha y nada más**. El título de un envío es el principio del
relato, y el relato de quien escribió un derrumbe no es de quien resulte entrar
después en ese teléfono.

### 5.4. El dibujo: las hojas, y dónde no van

La página no lleva tipografías ni hoja de estilos de fuera —cuando se ve no hay
de dónde traerlas—, así que todo lo que la hace reconocible tiene que estar
dibujado dentro. Se cogieron **las hojas de plátano de la propia aplicación**,
con sus mismos trazos, de `leaf-fall.tsx`.

Y con ellas, su gramática, que es lo que de verdad importa: no es una hoja, es
**una pareja, una a cada lado, con la base fuera del recuadro**. En la
aplicación se apartan y **se vuelven a cerrar** cuando un reporte sale.

Aquí se apartan y **se quedan abiertas**, flanqueando el único botón que esta
pantalla puede ofrecer. No ha salido nada y no hay señal para que salga: el
dibujo dice exactamente eso y no promete otra cosa. Al guardar un reporte sale
una sola hoja y **hacia arriba**, saliendo del río: no es el gesto del envío,
porque no se envió nada; quedó sembrado en el teléfono hasta que haya señal.

De la hoja original se quitó la hojita de la base: a este tamaño no se leía como
hoja, se leía como un borrón oscuro junto al botón.

Quien ve esta página **nunca ha visto la aplicación** —es su primer arranque—,
así que el parecido no es para que lo reconozca hoy. Es para que el día que
entre, esto ya le suene suyo.

#### Dónde más van, dentro de la aplicación

Las hojas dicen una sola cosa —**algo pasa por aquí**— y en cuanto salen donde
no pasa nada dejan de significar y se vuelven papel pintado. Se probaron cuatro
sitios y solo entró uno:

| Sitio | |
| --- | --- |
| **Aviso de entrega** (`Salió de la bandeja: «…»`) | **Sí.** Es el único momento fuera del formulario en que algo sale de verdad: un reporte que llevaba días esperando señal y ya está en manos del Consejo. Corto, arriba del todo y de una sola vez, como el gesto |
| Panel de la bandeja | **No.** Medido: con tres envíos mide 745 px, así que su pie queda debajo de la barra de navegación. Un dibujo que no se ve no es un dibujo, es peso |
| Bienvenida | **No.** Ya abre con la fotografía del dosel de verdad. Hojas dibujadas encima de hojas fotografiadas no suman |
| «Tu cuenta volvió a abrirse» | **No.** Ya tiene su puerta, y lo que dice —*esta cuenta empieza vacía*— no quiere una celebración encima |

El aviso de entrega tuvo que ceder una columna a cada lado: la primera versión
dejaba las hojas debajo del texto y se leía peor. Un adorno que estorba la
lectura de un aviso no vale lo que cuesta.

Donde estaban los tres círculos y la palabra «CONEXIÓN Y RESGUARDO» del panel de
la bandeja ya no hay nada, y no se perdió nada: aquel dibujo se ocultaba por
debajo de 768 px, o sea que **en el teléfono no se vio nunca**.

## 6. Lo comprobado, y cómo

| | |
| --- | --- |
| La página escribe y la aplicación lo lee | En el navegador, mismo origen: se escribió un reporte desde la página y apareció en la bandeja con «Un reporte espera a que entres» |
| El origen coincide en el aparato | El formulario aparece en el APK instalado sin señal, y solo aparece si coincide |
| El catálogo es el real | Las dieciocho veredas, en el desplegable del APK |
| Nada en inglés | El control nativo de archivo se sustituyó: decía «Choose File / No file chosen» |
| El dibujo no tapa lo que se lee | A 375 y a 320 px, en las dos pantallas; y con «reducir movimiento» las hojas se quedan puestas en vez de desaparecer, que es lo que hacían |

## 7. Lo que sigue sin poder hacerse sin la primera conexión

Ver los comunicados, los expedientes, el mapa, entrar con una cuenta. Todo eso
necesita al servidor la primera vez, y está bien que lo diga la misma pantalla
que ofrece reportar.

**Lo que ya no hace falta es esperar a la señal para contar lo que pasó.**
