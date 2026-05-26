// supabase/functions/extrair-conteudo-pdf/index.ts
// Migrado de OpenAI → Anthropic Claude

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildPrompt = (unidadeTitulo: string, materia: string) => `
Você é um especialista em pedagogia e ensino médio brasileiro.

Analise este material didático e extraia o conteúdo relacionado ao tópico "${unidadeTitulo}" da matéria "${materia}".

Retorne SOMENTE um JSON válido (sem markdown, sem backticks) com este formato:
{
  "titulo": "Título conciso do conteúdo encontrado (máx 80 chars)",
  "conteudo": "Texto didático principal extraído e organizado do material. Mínimo 300 palavras. Linguagem clara para ensino médio. Inclua definições, conceitos principais, explicações e contextualizações.",
  "exemplos": "Exemplos práticos, exercícios resolvidos ou situações do cotidiano encontrados no material. Se não houver, gere 2-3 exemplos baseados no conteúdo.",
  "formulas": "Fórmulas matemáticas, químicas ou físicas presentes. Leis, regras e macetes de memorização. Null se não aplicável.",
  "cobertura": "resumo em 1 frase do que foi encontrado no material sobre este tópico"
}

Instruções:
- Se o material não tratar especificamente de "${unidadeTitulo}", extraia o que for mais relevante e adapte.
- Organize o conteúdo de forma didática, do mais básico ao mais avançado.
- Preserve terminologia técnica correta.
- Retorne APENAS o JSON, sem texto antes ou depois.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { base64Data, mimeType = "application/pdf", unidadeTitulo, materia } = await req.json();

    if (!base64Data) throw new Error("base64Data é obrigatório");
    if (!unidadeTitulo) throw new Error("unidadeTitulo é obrigatório");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const isImage = mimeType.startsWith("image/");
    const docType = isImage ? "image" : "document";
    const mediaType = isImage ? mimeType : "application/pdf";

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            {
              type: docType,
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: buildPrompt(unidadeTitulo, materia || "Ensino Médio"),
            },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} — ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text ?? "";
    const resultado = parseJson(text);

    return new Response(JSON.stringify({ conteudo: resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseJson(text: string): any {
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON inválido");
  return JSON.parse(match[0]);
}
