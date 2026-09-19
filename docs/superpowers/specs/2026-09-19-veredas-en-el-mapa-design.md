# Poner en el mapa las veredas que el catálogo no sitúa — diseño

19 de septiembre de 2026

## 1. Todo lo que falta, de una vez

Este documento cierra lo que queda abierto. Tres bloques, de mayor a menor:

| | Qué es |
| --- | --- |
| **§3–§7** | Las veredas sin punto, y las que no están en el catálogo. Lo nuevo |
| **§8** | Las tres filas de permisos en Mi cuenta |
| **§9** | La documentación: integraciones de IA, dictado, sin conexión, y lo que falta |

Y dos cosas que no son código y siguen pendientes de una persona: **rotar la
clave de la cuenta de servicio de Firebase** —estuvo dentro de despliegues que
ya se borraron— y **la clave de firma** para publicar un APK de versión.

## 2. De qué se trata

Dieciocho veredas en el catálogo; **seis sin punto documentado**. Para esas,
hoy:

- El formulario de reporte **no dibuja mapa** —no hay dónde centrarlo— así que
  no hay manera ninguna de darle una coordenada al caso.
- El reporte viaja con el nombre y nada más.
- En el mapa del territorio no aparece. Cuenta en las cifras, pero no se ve.

Y si tu vereda no está en la lista, directamente no puedes reportar: la ruta
exige `isCatalogued(vereda)` y devuelve «Selecciona una vereda del catálogo
territorial vigente».

El catálogo sale del EOT de 2007 y de fuentes abiertas, y él mismo se declara
**pendiente de validación por el Consejo**. La gente del río sabe dónde queda su
vereda mejor que un documento de hace diecinueve años. Esto es la manera de que
lo diga.

## 3. La idea, en una frase

**Quien está parado allí pone el punto; cuando varios coinciden, el Consejo lo
acepta y la vereda entra al mapa con su nombre.**

Tres piezas: una persona aporta, la aritmética propone, el Consejo decide.

## 4. Quién aporta, y cómo

El botón **Usar mi ubicación** que ya existe. Para una vereda sin punto es la
única manera de darle coordenadas, y el mapa nace de ahí.

Debajo, y solo en ese caso, una frase que explica para qué sirve además de para
este reporte:

> Tu vereda todavía no está en el mapa. Con esta ubicación y la de otros
> reportes, el Consejo podrá ponerla.

Es lo honesto: se está pidiendo un dato que va a servir para algo más que el
caso, y eso se dice antes y no después.

### 4.1. Un campo nuevo en el expediente: de dónde salió el punto

`incidents/{id}` gana `pointSource: "aparato" | "mano" | null`.

**No es contabilidad, es lo que impide que esto se muerda la cola.** En cuanto
una vereda tenga punto aceptado, el formulario abrirá su mapa ahí y la gente
tocará para ajustar el caso. Esos toques **no dicen dónde está la vereda**:
dicen dónde está el derrumbe, y salen de un mapa que ya estaba centrado donde
nosotros lo centramos. Contarlos sería medir nuestra propia respuesta.

Solo cuentan los puntos que vinieron del GPS del aparato.

### 4.2. Y con qué margen

El reporte acepta un punto con hasta 500 m de margen (`MARGEN_MAXIMO`). Para
**deducir dónde queda una vereda** eso es demasiado: aquí solo cuentan los
puntos con **100 m o menos**. Un caso mal situado se corrige en campo; un
catálogo mal situado se queda.

## 5. La aritmética, y por qué no es un promedio

Para cada vereda sin punto se acumula: cuántos reportes, de cuántas cuentas
distintas, y dónde.

**El centro es la mediana coordenada a coordenada, no el promedio.** Un solo
reporte hecho desde el casco urbano sobre algo que pasó en la vereda arrastra un
promedio kilómetros; a la mediana no la mueve. Con puñados de puntos —que es lo
que va a haber— es además trivial de calcular y de explicar, y explicarlo
importa: el Consejo tiene que poder entender de dónde salió el punto que le
proponen.

**Umbrales para proponer:**

| | Cuánto | Por qué |
| --- | --- | --- |
| Reportes | **≥ 3** | Uno es una anécdota |
| Cuentas distintas | **≥ 2** | Una persona reportando tres veces desde su casa es **un** dato, no tres |
| Margen de cada punto | **≤ 100 m** | Ver §4.2 |

**La dispersión se enseña, no se usa para rechazar.** Se calcula la distancia
mediana de los puntos al centro y se pone delante del Consejo. Por encima de
2 km se marca en rojo —«los reportes de esta vereda están repartidos en un área
grande»— pero se propone igual: una vereda a lo largo del río puede medir eso, y
quien sabe si el punto sirve como referencia es el Consejo, no un umbral.

**El punto propuesto se redondea a tres decimales**, unos 110 m. Es lo que hace
falta para nombrar un sector y es lo único que el catálogo promete: sus puntos
existentes son «la referencia de la vereda, no la ubicación exacta del caso». Y
de paso, un punto redondeado no señala una casa.

### 5.1. Después de aceptado

El acumulador sigue acumulando, pero **no mueve nada solo**. Si con el tiempo el
centro se aparta más de 500 m del punto aceptado, se le vuelve a proponer al
Consejo: «doce reportes sitúan ahora El Firme 600 m al oriente». Aceptar o no es
suyo.

## 6. La vereda que no está en la lista

En el paso de ubicación, debajo del desplegable: **Mi vereda no está en la
lista**. Abre un campo de texto.

### 6.1. Antes de crear nada, buscar

El nombre se normaliza —sin mayúsculas, sin tildes, sin espacios de más— y se
compara con el catálogo. Si coincide, **no se crea nada**: se ofrece la del
catálogo.

> ¿Te refieres a **Bellavista**?  · Sí, es esa · No, es otra

Esto no es cortesía. La bandeja del Consejo ya arrastra la lección: sin esto,
«Bellavista», «Bella Vista» y «bellavista» son tres sitios distintos, el mapa
los dibuja tres veces y las cifras los cuentan por separado.

### 6.2. El reporte sale igual

Un nombre propuesto **no bloquea el envío**. La ruta deja de exigir
`isCatalogued` a secas y acepta dos formas: una del catálogo, o una propuesta
—con su marca `veredaProposed: true`— siempre que venga con punto del aparato.
Sin punto no se acepta un nombre nuevo: un topónimo sin coordenada no se puede
ni situar ni verificar, y sería la puerta por la que el catálogo se llena de
ruido.

### 6.3. Y si el Consejo dice que era otra

Al aceptar una propuesta, el Consejo puede **añadirla** o **fundirla** con una
vereda que ya existe. Fundir reescribe la vereda de los reportes afectados, en
lotes. Sin eso, los tres «bellavistas» se quedan en los datos aunque el catálogo
quede limpio.

## 7. Dónde decide el Consejo

Una pestaña nueva en el panel: **Territorio**. No cabe en «Quién administra»
—eso es de personas— ni en Novedades, que es un feed y esto es una bandeja de
decisiones que pueden esperar semanas.

Cada propuesta enseña:

- El nombre, y si es del catálogo o nuevo.
- **Cuántos reportes y de cuántas cuentas.**
- La dispersión, en metros, en rojo si pasa de 2 km.
- Un mapa con el punto propuesto y **un círculo** del tamaño de la dispersión.

El círculo, y no los puntos sueltos, es deliberado: dice cuánto se dispersan sin
dibujar dónde estuvo cada quien. El Consejo puede ver los expedientes uno a uno
en su bandeja si lo necesita; esta pantalla no tiene por qué ser un mapa de por
dónde anda la gente.

Y tres botones: **Aceptar**, **Ajustar el punto a mano** —el Consejo conoce el
territorio— y **Descartar**, con motivo.

Al aceptar se escribe el punto, con quién lo aceptó y cuándo, y **la fuente
queda como «comunidad»**, distinta de «DANE» y de «cartografía abierta». Cuando
esta vereda salga en el formulario de un reporte, su nota dirá de dónde vino:
«Punto puesto por la comunidad y aceptado por el Consejo».

## 8. Dónde viven estos datos

| Colección | Qué guarda | Quién escribe |
| --- | --- | --- |
| `veredaProposals/{clave}` | El acumulador y su estado | La ruta de reportes |
| `veredaPoints/{clave}` | Los puntos aceptados | La ruta del Consejo |
| `veredaPointEvents/{id}` | Quién aceptó, ajustó o descartó qué | Ídem |

`veredaPoints` es **lo único que lee el cliente** —regla de lectura para
miembros— y lleva solo nombre, punto y fuente. El acumulador, con sus cuentas y
su dispersión, no sale del servidor.

### 8.1. La consecuencia arquitectónica, que es la parte incómoda

`src/domain/territory.ts` es hoy un módulo puro: el catálogo está compilado
dentro y funciona sin red, que es medio proyecto. Los puntos aceptados viven en
Firestore, así que **el catálogo deja de ser del todo estático**.

La forma que no rompe nada:

- El catálogo compilado **sigue siendo la base y la respuesta sin conexión**.
- `veredaPoints` se trae una vez por sesión y se guarda en el almacén local.
- `veredaReference(nombre)` consulta primero lo traído y cae al compilado.
- Sin red, sin almacén o con un fallo, **se comporta exactamente como hoy**.

Un punto aceptado que todavía no llegó a un teléfono no rompe nada: esa vereda
se ve como se veía ayer.

## 9. Cuándo corre la aritmética

Al confirmar un reporte, **fuera de la transacción y sin poder tumbarla**, como
ya se hace con el aviso al Consejo. Un reporte confirmado no puede deshacerse
porque falle un acumulador, y esto es lo menos importante que ocurre en esa
petición.

Es incremental: una lectura y una escritura por reporte, sobre un documento
cuya clave es la vereda.

## 10. Las otras dos cosas que faltan

### 10.1. Los tres permisos, en Mi cuenta

La fila de avisos ya está. Se le suman **micrófono** y **ubicación**, con su
estado, y las tres con la misma regla que este proyecto ya decidió: **se piden
en el momento en que la persona entiende para qué sirven**, nunca al abrir.

Lo que añade la pantalla es la vuelta atrás. En Android 13 en adelante un «no»
dicho a destiempo solo se deshace entrando en los ajustes del sistema, y una
aplicación que no ofrece ese camino deja a alguien encerrado para siempre en una
respuesta que dio sin mirar. Cuando un permiso esté negado, la fila abre los
ajustes de la aplicación.

### 10.2. La documentación

Cuatro cosas, todas en el índice del README:

1. **`docs/integraciones.md`**, nuevo. Lo que esta aplicación le pide a alguien
   de fuera y con qué límites: OpenRouter para las tres ayudas de redacción
   —qué sale del territorio y qué no sale nunca—, el dictado en sus dos mundos,
   la ubicación, los avisos, el mapa y el archivo de fotografías. Con lo que
   cuesta cada uno y qué pasa cuando no contesta.
2. **`docs/auditoria-offline-2026-09-16.md`**, al día y detallado: qué funciona
   sin señal y qué no, pantalla por pantalla.
3. **`docs/arquitectura.md`**: el apartado del territorio, y §14 «Límites
   conocidos» con lo que quede pendiente de verdad.
4. **El README**, con las entradas nuevas y la lista de «antes de abrirla a la
   comunidad» corregida —hoy dice cinco veredas sin punto y son seis—.

## 11. Pruebas

Como el resto del proyecto: cada una se cae al mutar la línea que defiende.

**La aritmética** (`src/domain/veredas.ts`, sin red ni base):

- Un punto lejano **no mueve** el centro. Con promedio, esta se cae.
- Tres reportes de **una sola cuenta** no proponen nada.
- Un punto con 400 m de margen no cuenta, aunque haya tres.
- Un punto **marcado a mano** no cuenta. Es el que cierra el bucle.
- La dispersión se calcula y se devuelve; no se usa para rechazar.
- El punto propuesto viene redondeado a tres decimales.

**El nombre propuesto**:

- «Bella Vista», «bellavista» y «BELLAVISTA» encuentran «Bellavista».
- Un nombre nuevo **sin punto del aparato** se rechaza.
- Fundir reescribe los reportes afectados.

**La ruta del Consejo**: solo el Consejo; aceptar escribe el punto y el evento;
ajustar a mano guarda lo que el Consejo puso y no lo propuesto; descartar deja
el motivo.

**El catálogo mezclado**: un punto aceptado gana al compilado; sin red se usa el
compilado; un almacén corrupto no tumba la pantalla.

## 12. En qué orden

1. `pointSource` en el expediente y en la puerta de ubicación. Sin esto, lo
   demás mide mal.
2. La aritmética en el dominio, con sus pruebas. No necesita nada más.
3. El acumulador en la ruta de reportes.
4. La vereda propuesta: campo, búsqueda contra el catálogo, y la ruta.
5. La pestaña **Territorio** del Consejo.
6. El catálogo mezclado en el cliente.
7. Las filas de permisos.
8. La documentación.
9. APK nuevo y despliegue.

Del 1 al 3 se sostienen solos y ya mejoran lo que hay: los reportes empiezan a
acumular evidencia desde el día uno, aunque la pantalla del Consejo llegue
después.

## 13. Lo que queda fuera, a propósito

- **Mover un punto solo, sin que nadie lo acepte.** El catálogo territorial de
  un consejo comunitario no lo edita una media.
- **Dibujar los puntos sueltos que sostienen una propuesta.** El círculo dice lo
  que hay que saber sin decir por dónde anduvo cada quien.
- **Límites de vereda.** Esto pone un punto, no un polígono. Un polígono es un
  asunto de linderos, y los linderos de un título colectivo no se deducen de
  reportes.
- **Borrar un punto aceptado.** Se ajusta; se puede volver al del catálogo.
  Borrar sin más dejaría reportes situados apuntando a nada.
