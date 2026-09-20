# El palafito

La marca del teléfono: el icono del cajón, el adaptable, el de la barra de
estado, la pantalla de arranque de Android y el dibujo que se traza en la
portada. Vive en `src/components/palafito.tsx`, y `scripts/marca-hoja.mjs` lo
repite trazo por trazo para generar los iconos.

## Los fondos

| dónde | color | por qué |
|---|---|---|
| icono, y la pantalla de arranque de Android | río de noche `#0d3340` | Es donde hay que destacar: a 44 px, compitiendo en el cajón, el palafito se recorta con fuerza contra el azul. Y el agua del dibujo deja de flotar sobre un fondo de otra familia. |
| portada, tema claro | manglar `#16463c` | Verde con azul dentro: la casa verde y el agua azul pertenecen las dos al fondo y ninguna salta. Ahí el dibujo va grande y no compite con nada, así que puede permitirse ser más parejo. |
| portada, tema oscuro | río de noche `#0d3340` | El mismo del icono. |

**La pantalla de Android solo admite un color** y no sabe qué tema hay puesto,
así que con el tema claro se ve pasar el azul al verde del manglar. Los dos son
hondos y dura un instante, pero está: es la única costura del arranque que no se
puede quitar desde la web.

## Las dos versiones

Dibujo para el icono y la portada de arranque. Viewbox de 24, trazo redondo,
sin relleno. Se pinta **de atrás hacia delante**, y ese orden es lo que cuenta
la profundidad: la ola de arriba tapa las patas de atrás y la de abajo tapa las
de delante. Cambiar el orden lo aplana.

    ola(y) = M2.6 {y}c1.55-1.05 3.1-1.05 4.65 0s3.1 1.05 4.65 0 3.1-1.05 4.65 0 3.1 1.05 4.65 0

## A — la elegida. El agua bajada, sin tocar la plataforma

Grosor 1,8. Las patas de atrás al 45 % de opacidad.

    patas de atrás   M10.4 15.3v2.6M13.6 15.3v2.6      (opacidad .45)
    ola de arriba    ola(18.4)
    techo            M2.5 11.3 12 3.7l9.5 7.6
    pared izquierda  M6.1 11.2v3.7
    pared derecha    M17.9 11.2v3.7
    plataforma       M4.1 15.1h15.8
    patas de delante M7.7 15.3v5M16.3 15.3v5
    ola de abajo     ola(21)

## B — guardada por si acaso. El agua más abajo, con más aire

Se descartó porque quedaba más suelta, no porque estuviera mal: se ve mejor el
hueco entre la plataforma y el agua, y a tamaño grande cuenta más claro que la
casa está **levantada sobre** el agua.

    patas de atrás   M10.4 14.9v3M13.6 14.9v3            (opacidad .45)
    ola de arriba    ola(18.8)
    techo            M2.5 10.9 12 3.3l9.5 7.6
    pared izquierda  M6.1 10.8v3.7
    pared derecha    M17.9 10.8v3.7
    plataforma       M4.1 14.7h15.8
    patas de delante M7.7 14.9v5.4M16.3 14.9v5.4
    ola de abajo     ola(21.4)

## Lo que se probó y se dejó por el camino

- **Ventanas de cuatro cuarterones.** A 44 px se cierran y la casa se vuelve una
  mancha con tejado.
- **Balcón con pasamanos y barrotes.** Mejor que las ventanas, pero seguía
  siendo más línea de la que cabe al tamaño del cajón.
- **Puerta.** Con 2,6 de ancho y trazo de 1,7 le quedaba menos de una unidad de
  hueco y se leía como un bloque. Ensanchándola se arreglaba, pero sin ella el
  dibujo gana un hueco central que respira.
- **Patas al centro.** Se parecía más a un palafito de dos pilotes, pero a 44 px
  se juntaba todo.
