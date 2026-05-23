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
    "contexto_visual": "Descrição da figura/gráfico se houver, senão null"
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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");

    const isImage = mimeType.startsWith("image/");
    let questoes: any[];

    if (isImage) {
      // ── IMAGEM (JPG, PNG, WEBP) → GPT-4o Vision direto ──────────────────
      questoes = await extrairDeImagem(base64Data, mimeType, OPENAI_API_KEY);
    } else {
      // ── PDF → tenta texto primeiro, fallback para visão ──────────────────
      questoes = await extrairDePdf(base64Data, OPENAI_API_KEY);
    }

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

// ── Extração via imagem (GPT-4o Vision) ──────────────────────────────────────
async function extrairDeImagem(base64Data: string, mimeType: string, apiKey: string): Promise<any[]> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: "high" },
          },
          { type: "text", text: PROMPT_EXTRACAO },
        ],
      }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Erro OpenAI Vision: ${response.status}`);

  const text = data.choices?.[0]?.message?.content || "";
  return parseJson(text);
}

// ── Extração via PDF (Files API + Responses API) ──────────────────────────────
async function extrairDePdf(base64Data: string, apiKey: string): Promise<any[]> {
  const pdfBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  // Upload do PDF
  const formData = new FormData();
  formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "questoes.pdf");
  formData.append("purpose", "assistants");

  const uploadRes = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}` },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Erro ao fazer upload do PDF");

  const fileId = uploadData.id;

  try {
    // Responses API com file input
    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        input: [{
          role: "user",
          content: [
            { type: "input_file", file_id: fileId },
            { type: "input_text", text: PROMPT_EXTRACAO },
          ],
        }],
      }),
    });

    const openaiData = await openaiRes.json();
    if (!openaiRes.ok) throw new Error(openaiData.error?.message || `Erro OpenAI API: ${openaiRes.status}`);

    const text = openaiData.output
      ?.filter((o: any) => o.type === "message")
      ?.flatMap((o: any) => o.content)
      ?.filter((c: any) => c.type === "output_text")
      ?.map((c: any) => c.text)
      ?.join("") || "";

    return parseJson(text);

  } finally {
    // Deleta o arquivo após uso (fire-and-forget)
    fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${apiKey}` },
    }).catch(() => {});
  }
}

// ── Parse seguro do JSON retornado pela IA ────────────────────────────────────
function parseJson(text: string): any[] {
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();

  // Tenta extrair array mesmo se vier com texto antes/depois
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("IA não retornou JSON válido");

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error("Resposta da IA não é um array de questões");
  return parsed;
}
