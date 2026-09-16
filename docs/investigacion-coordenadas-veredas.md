# Coordenadas de las veredas: qué existe en fuentes oficiales

*Investigación del 14 de septiembre de 2026. **Integrada en el código ese mismo
día** —ver §7—, salvo lo que sigue esperando trabajo de campo del Consejo.*

---

## Resumen en una página

| Pregunta | Respuesta corta |
| --- | --- |
| ¿Existe cartografía oficial del territorio? | **Sí.** La ANT publica el polígono del título colectivo. |
| ¿Existe cartografía oficial de las veredas? | **Prácticamente no.** De 61 polígonos veredales del municipio, 40 no tienen nombre. |
| ¿Cuántas de nuestras 18 veredas tienen coordenada oficial? | **Una con certeza** (Boca de Víbora) y **una con reserva** (Pueblo Nuevo). |
| ¿Sirve el marco territorial que usa la app? | **Funciona, pero es ~70 veces más grande que el título real.** Se puede ajustar. |
| ¿Se puede automatizar el resto? | **No.** Las 16 restantes necesitan trabajo de campo del Consejo. |

---

## 1. El título colectivo sí está mapeado oficialmente

La **Agencia Nacional de Tierras** publica como dato abierto la capa de consejos
comunitarios titulados. Consultada directamente, devuelve un único registro para
la cuenca:

| Campo | Valor |
| --- | --- |
| Nombre | Consejo Comunitario del Río Satinga |
| Departamento / Municipio | 52 Nariño / 52490 Olaya Herrera |
| Acto administrativo | **Resolución 3292 del 18 de diciembre de 2000** |
| Área titulada | **24 507,04 ha** |

El polígono tiene 1 334 vértices. Su extensión en WGS84:

```
sur    2.06451      norte  2.37358
oeste −78.32801     este  −78.17089
```

### Comparación con el marco que usa la aplicación hoy

`src/domain/territory.ts` valida los puntos marcados a mano contra este
rectángulo:

```ts
territoryBounds = { south: 1.5, north: 3.2, west: -79.2, east: -77.2 }
```

| | Alto | Ancho |
| --- | --- | --- |
| Marco actual de la app | 1,70° (~190 km) | 2,00° (~222 km) |
| Título colectivo real | 0,31° (~34 km) | 0,16° (~17 km) |

El marco actual abarca **unas setenta veces el área** del título. Cumple su
función —impedir que una coordenada equivocada sitúe un caso en otro
departamento— pero deja pasar un punto a 150 km del territorio.

**Los seis puntos conocidos caen dentro de la extensión real del título**, así
que ajustar el marco no invalidaría nada de lo que hay.

---

## 2. La cartografía veredal oficial no sirve para este municipio

Capa **«Veredas de Colombia»** (IGAC / DANE, publicada por Esri Colombia,
vigencia 2016). Consultada para `DPTOMPIO = 52490`:

- **61 polígonos veredales** en Olaya Herrera.
- **40 de ellos se llaman literalmente «SIN DEFINIR».**
- 21 tienen nombre.
- Los campos `VIGENCIA` y `FUENTE` dicen `INDF` y `ESRI`: ni siquiera declara de
  dónde salió cada límite.

### Cruce contra nuestro catálogo

De las 18 veredas del catálogo de la aplicación, **solo «El Cedro» aparece** en
la capa oficial.

Los nombres oficiales que la app no tiene son otros por completo:

> Antequera · Barracoíta · Calabazal · Caña · Chapil · El Carmen · El Chicú ·
> Galdámez · Guabal · Jorge Eliécer Gaitán · La Soledad · La Traviesa · Nariño ·
> Nerete · Paispamba · San Antonio · Sucre · Tame · Tangarial

Esto **no significa que nuestro catálogo esté mal**. Significa que la
nomenclatura estatal y la que usa la comunidad no coinciden, algo corriente en
territorios colectivos donde el Estado nunca completó el levantamiento veredal.
Nuestros nombres vienen del EOT de 2007 y de «Territorios Narrados»; son los que
la gente usa.

Centroides de las cuatro veredas nombradas que podrían servir de referencia:

| Vereda oficial | Código | Centroide aprox. | Área |
| --- | --- | --- | --- |
| El Cedro | 52490060 | 2.29172, −78.24905 | 2 583 ha |
| Chapil | 52490052 | 2.23853, −78.26269 | 1 057 ha |
| Guabal | 52490059 | 2.36909, −78.35926 | 2 001 ha |
| Calabazal | 52490053 | 2.46760, −78.26800 | 2 408 ha |

> Un centroide de polígono **no es el caserío**. Es el centro geométrico de un
> área de 2 500 ha; puede caer en medio del monte. Sirve para encuadrar un mapa,
> no para señalar dónde vive la gente.

---

## 3. Centros poblados del DANE: dos coordenadas aprovechables

Fuente: **DIVIPOLA – Cabeceras y Centros Poblados** (DANE), descarga directa en
XLSX con nombre, código y coordenadas. Olaya Herrera tiene 16 registros.

### Coincidencias con nuestro catálogo

| Nuestra vereda | Registro DANE | Código | Latitud | Longitud | Valoración |
| --- | --- | --- | --- | --- | --- |
| **Boca de Víbora** | BOCA DE VIBORA | 52490015 | 2.339981 | −78.309402 | **Sólida.** Mismo municipio, mismo nombre. |
| Pueblo Nuevo | PUEBLO NUEVO | 52473008 | 2.246450 | −78.451425 | **Con reserva.** El DANE lo sitúa en **Mosquera**, no en Olaya Herrera. |

Además, el casco urbano:

| Bocas de Satinga (cabecera municipal) | 52490000 | 2.347457 | −78.325814 |
| --- | --- | --- | --- |

Sobre **Pueblo Nuevo**: el Ministerio de Educación documenta que las veredas
Pueblo Nuevo, Chapil, Chocó y Buenavista pertenecen a los territorios colectivos
de los consejos comunitarios del río Satinga. El registro del DANE lo asigna a
Mosquera. Puede ser un homónimo, un ajuste de límite municipal, o un error de
asignación. **No adoptar esta coordenada sin que el Consejo la confirme.**

### Las 16 restantes: sin fuente oficial

Ninguna aparece como centro poblado en Olaya Herrera. Varias tienen **homónimos
lejanos** en Nariño, y ahí está el peligro:

| Nombre | Homónimo del DANE | Distancia aproximada |
| --- | --- | --- |
| San Isidro | Ospina, Ricaurte, Taminango | 130–180 km, en los Andes |
| Bellavista | San Andrés de Tumaco | ~120 km |
| Las Mercedes | San Andrés de Tumaco | ~110 km |
| La Victoria | Pasto, El Tablón, Guachucal, Ipiales | 150–230 km |

Un emparejamiento automático por nombre situaría reportes del río en la
cordillera. La aplicación ya advierte de esto en el mapa; conviene que la
advertencia siga.

---

## 4. Las cuatro coordenadas que la app usa hoy

Vienen de **Mapcarta** (OpenStreetMap + GeoNames), no de fuente estatal.
Verificadas contra la extensión del título colectivo:

| Vereda | Coordenada | ¿Dentro del título? |
| --- | --- | --- |
| Lérida Las Marías | 2.28328, −78.25426 | sí |
| Barro Caliente | 2.21071, −78.23532 | sí |
| Bellavista | 2.23560, −78.24741 | sí |
| San Isidro | 2.19907, −78.20389 | sí |

**Las cuatro son geográficamente plausibles**: caen dentro del territorio
titulado, en el tramo medio del río. No están confirmadas por el Estado, pero
tampoco hay nada que las contradiga.

---

## 5. Fuentes consultadas

### Sirvieron

| Fuente | Qué aportó | Acceso |
| --- | --- | --- |
| **ANT — Consejo Comunitario Titulado** | Polígono y acto administrativo del título | Servicio ArcGIS abierto |
| **DANE — DIVIPOLA Centros Poblados** | Nombre, código y coordenadas | [XLSX directo](https://geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_CentrosPoblados.xlsx) |
| **IGAC/DANE — Veredas de Colombia 2016** | Polígonos veredales (casi sin nombre) | [Servicio Esri Colombia](https://ags.esri.co/arcgis/rest/services/DatosAbiertos/VEREDAS_2016/MapServer) |
| **MinEducación — Territorios Narrados** | Pertenencia de veredas al consejo | [Ficha Las Marías](https://www.mineducacion.gov.co/portal/men/Publicaciones/Guias/360526:Las-Marias) |

### No sirvieron, y por qué

| Fuente | Resultado |
| --- | --- |
| IGAC — Nombres Geográficos | `Token Required`. Es el diccionario geográfico oficial; **sería la mejor fuente** si se consigue acceso institucional. |
| IGAC — `limites/veredascolombia` | 404. El servicio que citan los buscadores está retirado. |
| datos.gov.co — ficha «Veredas de Colombia» | 404 al consultarla directamente. |
| Geoportal DANE — descargas MGN | Aplicación JavaScript; el shapefile del Marco Geoestadístico Nacional exige descarga manual. |

---

## 6. Recomendación

**No adoptar nada todavía.** Cuando se decida, propongo esto:

### 6.1 Distinguir la procedencia de cada punto

Hoy todas las coordenadas se tratan igual. Convendría que cada una declarara de
dónde viene, porque no merecen la misma confianza:

- **`oficial`** — DANE o ANT, con código y acto administrativo.
- **`abierta`** — OpenStreetMap / GeoNames. Plausible, sin respaldo estatal.
- **`comunitaria`** — levantada por el Consejo. **La de mayor autoridad real**,
  aunque no figure en ningún registro nacional.

La interfaz ya dice que el catálogo está pendiente de validación; con esto podría
decir *cuáles* lo están y cuáles no.

### 6.2 Ajustar el marco territorial

Sustituir el rectángulo actual por la extensión del título con un margen
prudente —el territorio de uso desborda el título— por ejemplo:

```
sur 2.00   norte 2.45   oeste −78.40   este −78.10
```

Sigue admitiendo los seis puntos conocidos y rechaza cualquier coordenada fuera
de la cuenca. **Antes de aplicarlo hay que comprobar que ninguna vereda del
catálogo quede fuera**, porque el marco decide qué reportes se aceptan.

### 6.3 Lo que solo el Consejo puede aportar

Las 16 veredas sin fuente son precisamente las que el Estado nunca levantó. Dos
caminos, y el primero es mejor:

1. **Una salida con GPS o teléfono**: un punto por caserío, tomado por gente de
   la comunidad. Media jornada de río. El resultado sería la fuente más
   autorizada que existe sobre ese territorio, y la app ya sabe registrar un
   punto marcado a mano.
2. **Los anexos cartográficos del EOT 2007**, si el municipio conserva los
   planos. Sirve para encuadrar, no para precisar.

### 6.4 Una advertencia que conviene mantener

Si algún día se automatiza el emparejamiento por nombre contra fuentes
nacionales, **debe restringirse al municipio 52490**. Sin ese filtro, «San
Isidro» y «Bellavista» viajan a los Andes y a Tumaco.


---

## 7. Qué se integró

### 7.1 Once veredas con punto, de cuatro que había

Una segunda pasada sobre OpenStreetMap, **acotada al rectángulo de la cuenca**,
encontró bastante más que la búsqueda por nombre completo. Acotar es lo que
cambia el resultado: sin marco, «Bellavista» devuelve Tumaco.

| Vereda | Punto | Procedencia |
| --- | --- | --- |
| Boca de Víbora | 2.339981, −78.309402 | **oficial** — DANE 52490015 |
| Lérida Las Marías | 2.28328, −78.25426 | abierta |
| Barro Caliente | 2.21071, −78.23532 | abierta |
| Bellavista | 2.23560, −78.24741 | abierta |
| San Isidro | 2.19907, −78.20389 | abierta |
| **Travesía** | 2.27432, −78.26755 | abierta — *nueva* |
| **El Cedro** | 2.29916, −78.24719 | abierta — *nueva* |
| **Merizalde Porvenir** | 2.34263, −78.27183 | abierta — *nueva* |
| **Alto Merizalde** | 2.33895, −78.28002 | escuela — *nueva* |
| **Bajo Merizalde** | 2.34823, −78.28181 | escuela — *nueva* |
| **Víbora Paraíso** | 2.33930, −78.30691 | escuela — *nueva* |
| **Codemaco** | 2.35365, −78.32148 | escuela — *nueva* |

Sobre las marcadas como **escuela**: no hay punto de la localidad, pero sí del
centro educativo rural, que **lleva el nombre de su vereda y está en ella**. Es
una inferencia, y por eso se rotula como tal. El punto de El Cedro además
concuerda con el centroide del polígono veredal del IGAC (2.29172, −78.24905),
lo que respalda el método.

### 7.2 Cada punto declara su procedencia

`localityReferences` gana un campo `kind`, y el formulario dice cuál es al
elegir la vereda:

- **oficial** — «Punto oficial del DANE para esta localidad.»
- **abierta** — «Punto de cartografía abierta, sin validar por el Consejo.»
- **escuela** — «Punto deducido de la escuela rural que lleva el nombre de la
  vereda. Sitúa el sector; si el caso está lejos de la escuela, muévelo.»

Quien reporta decide si mover el marcador según lo fiable que sea el de partida.
Sin esa distinción, los doce puntos parecían valer lo mismo.

### 7.3 El marco territorial

Pasó de `1,5–3,2 N / −79,2 a −77,2 O` a **`1,9–2,55 N / −78,5 a −78,0 O`**:
el polígono del título ensanchado unos veinte kilómetros por lado, porque el
territorio de uso desborda el título. El marco anterior admitía un punto a
ciento cincuenta kilómetros; el nuevo rechaza el San Isidro de Taminango, que es
exactamente la trampa que había que cerrar.

### 7.4 Lo que sigue sin fuente

**Cañas, José, Pueblo Nuevo, La Victoria y Los Leyos.** No aparecen ni en el
DANE, ni en el IGAC, ni en OpenStreetMap dentro de la cuenca. Siguen en el
catálogo sin coordenada, y el formulario lo dice: *«Todavía no hay un punto
documentado para esta vereda. No se inventan coordenadas: el reporte viaja con
su nombre.»*

**Las Mercedes** merece mención aparte: OpenStreetMap tiene una en 2.09097,
−78.13274, pero está en **Magüí Payán** y **cae fuera del título**. No se
integró. Es el mismo caso que los San Isidro andinos.
