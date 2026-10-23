# Manuales de uso

Los dos manuales de Mi Pueblo Digital —el del ciudadano y el del Consejo— se
leen dentro de la aplicación, se descargan en PDF y se pueden leer en Markdown
en este repositorio. Los tres salen **del mismo texto**.

Fecha de esta documentación: 23 de octubre de 2026.

| Para quién | Dónde se lee | PDF | Hoja |
| --- | --- | --- | --- |
| Quien reporta | `/manuales/ciudadano/` | `public/manuales/manual-ciudadano.pdf` | A5, pensada para el teléfono |
| Quien gestiona | `/manuales/consejo/`, solo con la cuenta del Consejo | `public/manuales/manual-consejo.pdf` | A4, con tablas |

La entrada es **Manuales**, en «Herramientas» de la columna (y del menú del
teléfono). `/manuales/` lista los dos.

## Una sola fuente

| Qué | Dónde |
| --- | --- |
| El texto del manual del ciudadano | `src/content/manual-ciudadano.ts` |
| El texto del manual del Consejo | `src/content/manual-consejo.ts` |
| La forma del contenido (bloques, iconos, avisos, marcas) | `src/content/manuales.ts` |
| Cómo se ve cada bloque | `src/features/manuales.tsx` y `manuales.module.css` |
| Las pantallas dibujadas | `src/features/manuales-escenas.tsx` |
| Los dibujos del territorio | `src/components/filigranas.tsx` |
| El volcado a Markdown | `src/content/manuales-markdown.ts` → `docs/manual-*.md` |

El contenido son **datos, no maquetación**: títulos, pasos, avisos, tablas,
preguntas y glosario. Quien corrige un manual cambia texto; el diseño lo pone la
vista. Dos marcas dentro del texto: `**negrita**` y `«Etiqueta»`, que es el
**rótulo exacto de un botón, pestaña o menú** tal como está escrito en la
aplicación.

`docs/manual-ciudadano.md` y `docs/manual-consejo.md` **se generan** con
`npm run manuales:md`. No se editan a mano.

## La identidad visual

No es un documento de Word: es la aplicación con forma de cuadernillo.

- **La portada abre como la aplicación**: el azul de noche del río (`--arranque`),
  el palafito sobre el agua, las hojas de plátano de la pantalla de arranque y el
  rótulo de la marca.
- **Cada capítulo** lleva su número en una hoja, un dibujo del territorio en la
  esquina —la ola, el monte, la canoa, la palma, el palafito, el manglar, el
  canalete, la brújula, la atarraya, el brote— y sus avisos con color propio:
  verde para el consejo, ámbar para el cuidado, azul para la privacidad y gris
  para lo que la aplicación no hace.
- **Los pasos** van unidos por un hilo, porque son un camino. Las etiquetas de
  la interfaz son pastillas, como los botones que nombran.
- **Las pantallas** (`pantalla` en el contenido) no son capturas: se arman con
  las mismas clases y componentes de la aplicación —la insignia de estado, la
  cápsula de conexión, los iconos de la barra—, así que se redibujan solas y
  nunca envejecen.
- **Tipografía**: DM Sans para leer, Caveat para lo que dice una persona y el
  rótulo de la marca solo donde es la marca.

## El PDF

Se imprime con el **mismo motor que el diálogo de imprimir de Chrome** a partir
de esa misma vista, no de una segunda versión del diseño. Es un archivo estático
en `public/manuales/`, que se sirve como el APK.

```bash
npm run build          # el generador usa la compilación
npm run manuales:pdf   # imprime los dos y actualiza manifest.json
```

- Imprime en **dos pasadas**: la primera lee en qué hoja cae cada capítulo; la
  segunda vuelve a imprimir con esos números en el índice.
- **Ajusta la paginación solo.** Antes de la pasada final repite la impresión
  hasta que ningún capítulo deje una cola suelta en una hoja aparte:
  - si un capítulo arranca al pie de una hoja con muy pocas líneas, pasa
    entero a la hoja siguiente;
  - si deja una cola corta al comienzo de la hoja siguiente, se aprieta ese
    capítulo (letra y espacios hasta un 82 % del tamaño normal, en tres niveles)
    hasta que quepa;
  - donde queda al pie de una hoja un hueco de 45 mm o más, se rellena con uno
    de los dibujos del territorio; los huecos pequeños se dejan vacíos.
  Resultado actual: 21 hojas el del ciudadano (A5) y 16 el del Consejo (A4).
- Sale **etiquetado y con marcadores**: los lectores de pantalla lo leen y el
  visor de PDF muestra el índice de capítulos.
- La ruta que imprime, `/manuales/impresion/<manual>/`, **no existe en
  producción**: solo responde si quien arranca el servidor pone
  `MPD_IMPRIMIR_MANUALES=1`, que el generador pone por su cuenta.
- `public/manuales/manifest.json` apunta, junto a cada PDF, la huella de lo que
  lo produce (el texto, la vista, la hoja de estilos y los dibujos). **Si alguien
  cambia cualquiera de ellos y no vuelve a generar, `npm test` falla** y dice qué
  comando correr.

### Por qué archivos y no PDF al vuelo

Un manual cambia cuando alguien corrige el texto, no con cada visita. Generarlo
en el servidor exigiría un Chrome dentro de cada petición (peso, arranque en
frío, coste). Hecho aquí, una vez, queda un archivo que se puede **mirar antes
de publicarlo**.

## En el APK

La ventana de Capacitor no sabe descargar archivos. El botón «Descargar PDF»
entrega la dirección al **navegador del teléfono** con el complemento `Ajustes`
(`abrirEnlace`), el mismo que usa el informe de estadísticas; allí el PDF se
descarga y queda en la carpeta de descargas. **No hace falta un APK nuevo**: el
complemento ya viene en el 2.2 y en todos desde el 1.2 (versionCode 4). En uno anterior, el
mensaje de error deja la dirección a la vista para abrirla a mano
(`src/platform/export.ts`).

## Quién ve el manual del Consejo

**La puerta es de interfaz, no un secreto.** La página `/manuales/consejo/` solo
dibuja el manual con el rol de administración puesto; sin él, `/manuales/` no lo
ofrece ni lo enlaza, el contenido no va en el HTML que recibe cualquiera y los
buscadores lo tienen prohibido (`src/app/robots.ts`). Pero el PDF es un archivo
público: quien conozca su dirección lo descarga, y el texto viaja en el código
de la pantalla.

Por eso **el manual está escrito sin datos internos**: nada de rutas de la base
de datos, nombres de claves, variables de entorno, direcciones de la API ni datos
de personas (`tests/unit/manuales.test.ts` lo vigila en los dos manuales). Es una
guía de trabajo, no un documento reservado.

Si algún día debiera serlo de verdad, hay que servirlo desde una ruta que
compruebe el rol —y, para el APK, con un billete de un solo uso como el del
informe (`src/server/export-tickets.ts`)—. Quien lo decida debe saber que eso
quita el PDF estático y el acceso sin conexión.

## Cómo actualizar un manual

1. Cambia el texto en `src/content/manual-*.ts`. **Contrasta cada afirmación con
   el código** y deja anotado en el comentario del capítulo contra qué se
   verificó (`Verificado contra: …`).
2. `npm run manuales:md`.
3. `npm run build` y `npm run manuales:pdf`. Mira los PDF antes de subirlos.
4. `npm test`: comprueba que cada rótulo entre «guillemets» sigue en `src/`, que
   los Markdown y los PDF son los de este texto y que no hay hojas en blanco.
5. Súbelo todo junto: texto, Markdown, PDF y `manifest.json`.

## Pruebas

| Archivo | Qué comprueba |
| --- | --- |
| `tests/unit/manuales.test.ts` | Estructura de los capítulos; **cada «rótulo» existe en `src/`**; ningún dato personal ni identificador interno; el Markdown de `docs/` y los PDF son los de este contenido; los PDF abren con su portada, listan todos los capítulos y no tienen hojas en blanco |
| `tests/unit/export-archivo.test.ts` | La dirección que recibe el navegador del teléfono es absoluta; el mensaje cuando falta el complemento o la señal |
| `tests/e2e/manuales.spec.ts` | La página, el índice, el teléfono sin desbordes, la puerta del Consejo, la ruta de impresión cerrada, `robots.txt`, los PDF servidos, imprimir la página en cuadernillo y el enlace de la columna |

## Lo que salió al contrastar el texto con el código

Al reescribir los manuales contra la aplicación aparecieron diferencias entre lo
que la aplicación **dice** y lo que **hace**. No se corrigieron en el código; los
manuales cuentan lo que hace y, donde hace falta, lo dicen en un aviso. Salen de
la lectura del código, **sin probarlas en ejecución**. Si se arreglan, hay que
quitar el aviso del manual.

**Privacidad al retirar o eliminar**

- Retirar un expediente y eliminar una cuenta **no borran la copia reducida de
  la fotografía** (`incidentEvidence/{id}`, hasta 1.600 px), y la eliminación
  tampoco limpia el punto marcado ni las notas. Los términos y las pantallas
  prometen otra cosa (`delete-account.tsx`, `workspace.tsx`). Tampoco se borran
  las propuestas de vereda con su ubicación (`veredaProposals`).

**Roles y publicación**

- Quitar el rol de administración puede **deshacerse solo**: `requireAdmin`
  (`src/server/admin-auth.ts`) reescribe el rol si llega una petición con la
  sesión vieja, que aún lleva la marca.
- Al **reabrir un expediente ya publicado**, el editor rellena el resumen público
  con el relato; guardar sin tocarlo reemplaza lo aprobado y reinicia las 24 h
  (`src/features/council-inbox.tsx`).
- El aviso «Un caso nuevo en la comunidad» sale **al aprobar**, no a las 24 h
  (`src/app/api/admin/incidents/[id]/route.ts`).

**Textos de la aplicación que no coinciden con su comportamiento**

- `knowledge.ts` dice que el perfil se crea sin verificar el correo; `session.ts`
  lo exige.
- `access.tsx` y `report.tsx` hablan de un «borrador» y de «Mis envíos» que no
  existen, y de la fotografía «original» cuando se recodifica.
- La arquitectura dice que el Consejo puede ajustar el punto a mano; la pantalla
  no lo ofrece.
- En Estadísticas, «Abiertos sin responsable» cuenta como sin asignar todo caso
  ajeno, porque el responsable no viaja en la lista pública.
