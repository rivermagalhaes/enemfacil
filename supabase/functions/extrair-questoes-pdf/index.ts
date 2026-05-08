import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { base64Data } = await req.json();
    if (!base64Data) throw new Error("base64Data é obrigatório");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada no Supabase");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64Data }
            },
            {
              type: "text",
              text: `Extraia TODAS as questões deste PDF e retorne SOMENTE um JSON válido (sem markdown, sem backticks) com este formato exato:
[
  {
    "question": "enunciado completo da questão",
    "options": ["alternativa A", "alternativa B", "alternativa C", "alternativa D", "alternativa E"],
    "answer_index": 0,
    "explanation": "explicação da resposta correta se disponível",
    "topic": "tópico específico da questão",
    "area": "ciencias_natureza | ciencias_humanas | linguagens | matematica",
    "difficulty": "facil | medio | dificil",
    "vestibular": "ENEM | FUVEST | UNICAMP | PROPRIO",
    "ano": ${new Date().getFullYear()}
  }
]
Regras:
- answer_index: índice 0-4 da alternativa correta (0=A, 1=B, 2=C, 3=D, 4=E). Se não souber, use 0.
- area: infira pela temática (Química/Física/Biologia → ciencias_natureza; História/Geografia/Sociologia → ciencias_humanas; Português/Literatura/Inglês → linguagens; Matemática → matematica).
- vestibular: se identificar o vestibular no PDF, use o nome; caso contrário, use "PROPRIO".
- Retorne APENAS o array JSON, sem nenhum texto adicional.`
            }
          ]
        }]
      })
    });

    const anthropicData = await response.json();

    if (!response.ok) {
      throw new Error(anthropicData.error?.message || `Anthropic API error: ${response.status}`);
    }

    const text = anthropicData.content
      ?.map((i: any) => i.text || "")
      .join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const questoes = JSON.parse(clean);

    return new Response(JSON.stringify({ questoes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Erro extrair-questoes-pdf:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
