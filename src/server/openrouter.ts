import type { Aggregate } from "@/domain/aggregate";
export type { Aggregate };

/**
 * Lo que se le manda al modelo: las cifras y, de los casos cerrados, la nota
 * pública con la que el Consejo los cerró. Ni relatos, ni nombres, ni
 * teléfonos, ni notas internas.
 */
export type Material = Aggregate & { actuaciones?: string[] };

export async function describeAggregate(aggregate: Material) {
  const key = process.env.OPENROUTER_API_KEY || process.env.apikey_openrouter;
  if (!key) throw new Error("OpenRouter no está configurado en el servidor.");
  const model =
    process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";
  if (!model.endsWith(":free") && model !== "openrouter/free")
    throw new Error("Este entorno admite únicamente modelos gratuitos.");
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model,
        reasoning: { enabled: false },
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "Redacta en español un párrafo breve para un consejo comunitario de la costa pacífica. Recibes únicamente conteos verificados de sus propios expedientes: por estado, por categoría, por vereda y por prioridad, cuántos siguen abiertos y sin responsable, cuántos días lleva el más antiguo, cuánto se tarda en cerrar y cuántos llegaron en la última semana y el último mes. Señala dónde se acumula el trabajo, qué lleva más tiempo esperando y qué desequilibrios se ven entre veredas o categorías, y propón preguntas de seguimiento para la asamblea. No escribas cifras ni porcentajes: se muestran aparte. No inventes causas, acciones realizadas ni fechas. No des instrucciones operativas como hechos. Si vienen actuaciones, son las notas con las que el Consejo cerró casos: úsalas para decir **qué se hizo** en lugar de preguntarlo, y no las cites textualmente ni las atribuyas a nadie. Si el conjunto es una muestra, dilo. Es un borrador para revisión humana.",
          },
          { role: "user", content: JSON.stringify(aggregate) },
        ],
      }),
    },
  );
  if (!response.ok)
    throw new Error(
      "OpenRouter no respondió. Consulta los conteos y vuelve a intentarlo más tarde.",
    );
  const result = await response.json();
  const text = result.choices?.[0]?.message?.content;
  if (
    typeof text !== "string" ||
    !text.trim() ||
    text.length > 5000 ||
    /\d|%/.test(text)
  )
    throw new Error(
      "El borrador no superó la validación. Los conteos siguen disponibles.",
    );
  return text.trim();
}
