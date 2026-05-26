// supabase/functions/extrair-questoes-pdf/index.ts
// Migrado de OpenAI → Anthropic Claude

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_EXTRACAO = `Analise este arquivo em TRÊS etapas antes de responder:

ETAPA 1 — TIPO DE PROVA: Identifique se as questões são:
- "objetiva": possuem alternativas A, B, C, D (ou E) explícitas
- "discursiva": são questões abertas, sem alternativas listadas
- "mista": mistura dos dois tipos

ETAPA 2 — GABARITO: Procure por um gabarito explícito (final do documento, página separada ou junto a cada questão). Se encontrar, mapeie cada número de questão para o índice da alternativa correta (A=0, B=1, C=2, D=3, E=4).

ETAPA 3 — EXTRAÇÃO E CONVERSÃO:
- Para questões OBJETIVAS: extraia as alternativas exatamente como estão.
- Para questões DISCURSIVAS: crie 4 alternativas plausíveis no estilo ENEM/vestibular onde UMA é claramente correta e as outras são distratores pedagogicamente coerentes.
- Se houver figuras, gráficos ou tabelas associados a uma questão, descreva-os no campo "contexto_visual".

Retorne SOMENTE um JSON válido (sem markdown, sem backticks):
[
  {
    "question": "enunciado completo da questão",
    "options": ["alternativa A", "alternativa B", "alternativa C", "alternativa D"],
    "answer_index": 2,
    "explanation": "explicação de por que essa alternativa é a correta",
    "topic": "tópico específico da questão",
    "area": "ciencias_natureza",
    "difficulty": "medio",
    "vestibular": "ENEM",
    "ano": 2024,
    "tipo_original": "objetiva",
    "contexto_visual": null
  }
]

Regras obrigatórias:
- options: SEMPRE array com pelo menos 4 strings não vazias. Para discursivas, GERE as alternativas.
- answer_index: inteiro 0-4. Para discursivas convertidas, aponte para a correta que criou. Use null só se objetiva sem gabarito.
- area: EXATAMENTE um de: ciencias_natureza | ciencias_humanas | linguagens | matematica
- difficulty: EXATAMENTE um de: facil | medio | dificil
- vestibular: nome identificado no arquivo (ENEM, FUVEST, UNICAMP, ITA, IME, UNB, CEFET...) ou PROPRIO
- ano: inteiro. Se não souber, use 2025.
- tipo_original: "objetiva" ou "discursiva"
- contexto_visual: descrição textual de qualquer figura/gráfico/tabela associada à questão, ou null
- Retorne APENAS o array JSON, sem texto antes ou depois.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { base64Data, mimeType = "application/pdf" } = body;

    if (!base64Data) throw new Error("base64Data é obrigatório");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const isImage = mimeType.startsWith("image/");

    // Monta o content — Claude aceita PDF e imagem via base64 nativamente
    const mediaType = isImage ? mimeType : "application/pdf";
    const docType = isImage ? "image" : "document";

    const content: any[] = [
      {
        type: docType,
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Data,
        },
      },
      {
        type: "text",
        text: PROMPT_EXTRACAO,
      },
    ];

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} — ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text ?? "";
    const questoes = parseJson(text);

    const sanitizadas = questoes.map((q: any) => ({
      ...q,
      options: Array.isArray(q.options) && q.options.filter((o: string) => o?.trim()).length >= 2
        ? q.options.filter((o: string) => o?.trim())
        : null,
    }));

    return new Response(JSON.stringify({ questoes: sanitizadas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro extrair-questoes-pdf:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseJson(text: string): any[] {
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("IA não retornou JSON válido");
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error("Resposta da IA não é um array de questões");
  return parsed;
}
