# El palafito

La marca del teléfono: el icono del cajón, el adaptable, el de la barra de
estado, la pantalla de arranque de Android y el dibujo que se traza en la
portada. Vive en `src/components/palafito.tsx`, y `scripts/marca-hoja.mjs` lo
repite trazo por trazo para generar los iconos.

## Los fondos

**Uno solo: río de noche `#0d3340`**, en los dos temas y en las cinco piezas
que se suceden al abrir.

| dónde | quién lo declara |
|---|---|
| la pantalla que dibuja Android | `mpd_arranque` en `android/…/values/avisos.xml` |
| el fondo de la ventana mientras carga | `backgroundColor` en `capacitor.config.ts` |
| la portada que va dentro del archivo | `.portada` en `capacitor/www/index.html` |
| la portada de la web, y el telón de hojas | `--arranque` en `globals.css` |
| la pantalla de arranque de reserva | `FONDO_ARRANQUE` en `scripts/iconos-android.mjs` |

Se eligió el azul porque a 44 px, compitiendo en el cajón del teléfono, el
palafito se recorta con fuerza contra él, y porque el agua del dibujo deja de
flotar sobre un fondo de otra familia.

**Hubo un tiempo en que fueron dos** —el manglar `#16463c` para el tema claro—,
y la idea se sostenía mirando la portada sola: sobre ese verde, la casa verde y
el agua azul pertenecen las dos al fondo y ninguna salta. Lo que no se sostenía
era la sucesión. La pantalla de Android **solo admite un color** y se pinta antes
de que exista el navegador donde vive la elección del tema, así que cualquier
desacuerdo —entre temas, o entre el tema del teléfono y el de la aplicación— se
veía como un verde cruzando el azul justo al abrir. Con un color no hay nada que
coordinar, y el que vale es el que esa pantalla puede garantizar.

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
