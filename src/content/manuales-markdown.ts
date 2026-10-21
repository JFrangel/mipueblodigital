import type { Bloque, Manual, NivelAviso } from "./manuales";

/**
 * Un manual, volcado a Markdown.
 *
 * El manual ilustrado vive en la aplicación (`/manuales/`) y en PDF, pero
 * quien lee el repositorio en GitHub, o quiere pegar un fragmento en un correo,
 * necesita texto plano. Esto lo genera **desde el mismo contenido**
 * (`src/content/manual-*.ts`) con `npm run manuales:md`, así que nunca se
 * contradicen: `tests/unit/manuales.test.ts` falla si `docs/manual-*.md` no
 * coincide con lo que sale de aquí. No se edita a mano.
 */

const ROTULO: Record<NivelAviso, string> = {
  consejo: "Consejo",
  ojo: "Ojo con esto",
  privacidad: "Privacidad",
  limite: "Lo que no hace",
};

/** El ancla que GitHub le da a un título: minúsculas, sin signos, con guiones. */
const ancla = (titulo: string) =>
  titulo
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replaceAll(/\s+/g, "-");

/** «Título.» pero no «¿Título?.»: el punto solo se añade si falta un signo. */
const cerrar = (texto: string) => (/[.?!:]$/.test(texto) ? texto : `${texto}.`);

/** Una celda de tabla no puede llevar `|` ni saltos de línea. */
const celda = (texto: string) =>
  texto.replaceAll("|", "\\|").replaceAll(/\s*\n\s*/g, " ");

function bloque(b: Bloque): string {
  switch (b.tipo) {
    case "texto":
      return b.texto;
    case "pasos":
      return [
        ...(b.titulo ? [`**${b.titulo}**`, ""] : []),
        ...b.pasos.map(
          (p, i) =>
            `${i + 1}. ${p.texto}${p.detalle ? `\n   ${p.detalle}` : ""}`,
        ),
      ].join("\n");
    case "aviso":
      return `> **${ROTULO[b.nivel]}.** ${b.titulo ? `**${cerrar(b.titulo)}** ` : ""}${b.texto}`;
    case "tarjetas":
      return b.tarjetas
        .map((t) => `- **${cerrar(t.titulo)}** ${t.texto}`)
        .join("\n");
    case "flujo":
      return b.etapas
        .map((t, i) => `${i + 1}. **${cerrar(t.titulo)}** ${t.texto}`)
        .join("\n");
    case "tabla":
      return [
        `| ${b.columnas.map(celda).join(" | ")} |`,
        `| ${b.columnas.map(() => "---").join(" | ")} |`,
        ...b.filas.map((fila) => `| ${fila.map(celda).join(" | ")} |`),
        ...(b.nota ? ["", b.nota] : []),
      ].join("\n");
    case "lista":
      return b.items
        .map((item) => `- ${b.estilo === "casillas" ? "[ ] " : ""}${item}`)
        .join("\n");
    case "preguntas":
      return b.items
        .map((p) => `**${p.pregunta}**\n\n${p.respuesta}`)
        .join("\n\n");
    case "glosario":
      return [
        "**Palabras útiles**",
        "",
        ...b.terminos.map((t) => `- **${t.termino}**: ${t.significado}`),
      ].join("\n");
    case "pantalla":
      return b.pie ? `*Ilustración: ${b.pie}*` : "";
  }
}

/**
 * @param fechaTexto la fecha del manual ya escrita («20 de octubre de 2026»).
 *   Llega hecha porque este módulo se ejecuta también con Node a pelo, que no
 *   resuelve imports de TypeScript sin extensión: solo lleva importaciones de
 *   tipos, que se borran, y así no depende de nadie.
 */
export function aMarkdown(manual: Manual, fechaTexto: string): string {
  const titulos = manual.capitulos.map((c, i) => `${i + 1}. ${c.titulo}`);
  const partes = [
    `<!-- Generado desde src/content/manual-${manual.id}.ts con «npm run manuales:md». No lo edites a mano: el cambio se perdería y la prueba lo detecta. -->`,
    `# ${manual.titulo} — Mi Pueblo Digital`,
    [
      `> ${manual.publico} · Actualizado el ${fechaTexto}`,
      `> Versión ilustrada, para leer en la aplicación: \`/manuales/${manual.id}/\`. PDF: \`public/manuales/manual-${manual.id}.pdf\`.`,
    ].join("\n"),
    manual.subtitulo,
    "## Contenido",
    titulos.map((t) => `- [${t}](#${ancla(t)})`).join("\n"),
  ];
  manual.capitulos.forEach((c, i) => {
    partes.push(`## ${titulos[i]}`, `*${c.resumen}*`);
    for (const b of c.bloques) {
      const texto = bloque(b);
      if (texto) partes.push(texto);
    }
  });
  partes.push(
    "---",
    `**${cerrar(manual.cierre.titulo)}** ${manual.cierre.texto}`,
  );
  return partes.join("\n\n") + "\n";
}
