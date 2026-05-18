// supabase/functions/gerar-questoes-enem/index.ts
// Edge Function: gera 5 questões no estilo ENEM via Gemini
// Acionada quando o banco tem menos de 5 questões para a trilha

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de área para nome amigável no prompt
const AREA_LABELS: Record<string, string> = {
  linguagens:        "Linguagens, Códigos e suas Tecnologias",
  matematica:        "Matemática e suas Tecnologias",
  ciencias_natureza: "Ciências da Natureza e suas Tecnologias",
  ciencias_humanas:  "Ciências Humanas e suas Tecnologias",
  redacao:           "Redação",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { trilha_id, area_enem, assunto, competencia, habilidade } = await req.json();

    if (!trilha_id || !area_enem || !assunto) {
      return new Response(
        JSON.stringify({ error: "trilha_id, area_enem e assunto são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const areaLabel = AREA_LABELS[area_enem] ?? area_enem;
    const competenciaInfo = competencia ? `Competência: ${competencia}` : "";
    const habilidadeInfo  = habilidade  ? `Habilidade: ${habilidade}`  : "";

    // ─── Prompt estilo ENEM ───────────────────────────────────────────────────
    const prompt = `Você é um especialista em elaboração de questões do ENEM (Exame Nacional do Ensino Médio).

Gere EXATAMENTE 5 questões no estilo ENEM sobre:
- Área: ${areaLabel}
- Assunto específico: ${assunto}
${competenciaInfo}
${habilidadeInfo}

REGRAS OBRIGATÓRIAS:
1. Cada questão deve ter EXATAMENTE 5 alternativas (A, B, C, D, E)
2. Apenas UMA alternativa correta por questão
3. Questões no estilo contextualizado do ENEM (situação-problema real)
4. Incluir texto_base (trecho, charge, gráfico descrito em texto, notícia, etc.) quando pertinente — pode ser null
5. Dificuldade variada: 2 fáceis, 2 médias, 1 difícil
6. Explicação pedagógica clara de 2-3 frases explicando POR QUE a alternativa está correta
7. assunto_tag: tópico específico (ex: "Funções Inorgânicas", "Segunda Guerra Mundial")

Responda APENAS com JSON válido, sem markdown, sem explicações fora do JSON:
{
  "questoes": [
    {
      "enunciado": "texto do enunciado",
      "texto_base": "texto de apoio ou null",
      "assunto_tag": "tópico específico",
      "competencia": "Competência X",
      "habilidade": "HXX",
      "dificuldade": "facil|medio|dificil",
      "explicacao": "explicação da resposta correta",
      "alternativas": [
        { "letra": "A", "texto": "...", "correta": false },
        { "letra": "B", "texto": "...", "correta": false },
        { "letra": "C", "texto": "...", "correta": true },
        { "letra": "D", "texto": "...", "correta": false },
        { "letra": "E", "texto": "...", "correta": false }
      ]
    }
  ]
}`;

    // ─── Chamada Gemini ───────────────────────────────────────────────────────
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 3000 },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error(`Gemini error: ${await geminiRes.text()}`);

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    const questoes = parsed.questoes;

    if (!questoes?.length) throw new Error("IA não retornou questões válidas");

    // ─── Persiste no banco ────────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: simulado, error: simErr } = await supabase
      .from("mini_simulados")
      .select("id")
      .eq("trilha_id", trilha_id)
      .single();

    if (simErr || !simulado) throw new Error("Simulado não encontrado para esta trilha");

    // Remove questões IA antigas, mantém as do banco
    await supabase
      .from("questoes_simulado")
      .delete()
      .eq("simulado_id", simulado.id)
      .eq("fonte", "ia");

    // Insere novas questões
    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i];

      const { data: qInserida, error: qErr } = await supabase
        .from("questoes_simulado")
        .insert({
          simulado_id:   simulado.id,
          enunciado:     q.enunciado,
          texto_base:    q.texto_base ?? null,
          explicacao:    q.explicacao,
          area_enem:     area_enem,
          competencia:   q.competencia ?? competencia ?? null,
          habilidade:    q.habilidade  ?? habilidade  ?? null,
          assunto_tag:   q.assunto_tag,
          dificuldade:   q.dificuldade,
          fonte:         "ia",
          ordem:         i + 1,
        })
        .select("id")
        .single();

      if (qErr || !qInserida) continue;

      await supabase.from("alternativas_simulado").insert(
        q.alternativas.map((a: any, idx: number) => ({
          questao_id: qInserida.id,
          letra:  a.letra,
          texto:  a.texto,
          correta: a.correta,
          ordem:  idx,
        }))
      );
    }

    return new Response(
      JSON.stringify({ success: true, questoes_geradas: questoes.length, simulado_id: simulado.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erro em gerar-questoes-enem:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
