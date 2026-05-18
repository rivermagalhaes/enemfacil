// supabase/functions/gerar-objetivas/index.ts
// Recebe uma questão discursiva e gera N versões objetivas via Gemini
// Salva automaticamente no banco de questões do EnemPop

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELOS = [
  { nome: "Objetiva direta",  desc: "conceitual e direta, sem texto de apoio" },
  { nome: "Interpretativa",  desc: "contextualizada com texto de apoio e interpretação" },
  { nome: "Aplicação",       desc: "envolvendo cálculo, análise ou aplicação prática" },
  { nome: "Nível olímpico",  desc: "raciocínio aprofundado com distratores avançados" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      discursiva,
      resposta_esperada,
      disciplina,
      tema,
      dificuldade = "medio",
      contexto = "ENEM / vestibular",
      n_modelos = 3,
      estilo_extra = null,
      simulado_id = null,   // se informado, vincula as questões ao simulado
    } = await req.json();

    if (!discursiva) {
      return new Response(JSON.stringify({ error: "discursiva é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const modelosUsados = MODELOS.slice(0, Math.min(n_modelos, 4));
    const estiloInstrucao = estilo_extra ? `\nEstilo especial: ${estilo_extra}` : "";

    const prompt = `Você é um especialista em avaliação educacional e pedagogia brasileira.

QUESTÃO DISCURSIVA:
"${discursiva}"

RESPOSTA ESPERADA:
"${resposta_esperada || "Infira pelo conteúdo da questão."}"

DISCIPLINA: ${disciplina || "Não informada"}
TEMA: ${tema || "Não informado"}
DIFICULDADE BASE: ${dificuldade}
CONTEXTO: ${contexto}
${estiloInstrucao}

Gere EXATAMENTE ${modelosUsados.length} versões objetivas, nos modelos:
${modelosUsados.map((m, i) => `MODELO ${i + 1} — ${m.nome.toUpperCase()}: ${m.desc}`).join("\n")}

REGRAS:
1. Cada questão: 5 alternativas (A-E), apenas 1 correta
2. Distratores plausíveis: erro conceitual, erro de cálculo, interpretação incorreta, raciocínio incompleto, confusão de unidade
3. Questões realmente distintas entre si
4. texto_base apenas quando enriquecer (pode ser null)
5. Explicação de 2-4 frases + análise dos distratores

Responda APENAS JSON válido, sem markdown:
{
  "analise": {
    "conceito_principal": "...",
    "habilidade_cognitiva": "...",
    "area_tematica": "...",
    "competencia": "...",
    "habilidade_enem": "..."
  },
  "questoes": [
    {
      "modelo": "nome do modelo",
      "enunciado": "...",
      "texto_base": "... ou null",
      "assunto_tag": "...",
      "competencia": "...",
      "habilidade": "...",
      "dificuldade": "facil|medio|dificil|olimpico",
      "alternativas": [
        {"letra":"A","texto":"...","correta":false},
        {"letra":"B","texto":"...","correta":true},
        {"letra":"C","texto":"...","correta":false},
        {"letra":"D","texto":"...","correta":false},
        {"letra":"E","texto":"...","correta":false}
      ],
      "gabarito_justificativa": "...",
      "explicacao": "...",
      "analise_distratores": "..."
    }
  ]
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error(`Gemini: ${await geminiRes.text()}`);

    const gData = await geminiRes.json();
    const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // ── Persiste no banco se simulado_id informado ───────────────────────────
    let questoes_salvas = 0;
    if (simulado_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      for (let i = 0; i < parsed.questoes.length; i++) {
        const q = parsed.questoes[i];

        const { data: qInserida, error: qErr } = await supabase
          .from("questoes_simulado")
          .insert({
            simulado_id,
            enunciado:   q.enunciado,
            texto_base:  q.texto_base !== "null" ? q.texto_base : null,
            explicacao:  `${q.explicacao}\n\nDistratores: ${q.analise_distratores}`,
            assunto_tag: q.assunto_tag,
            competencia: q.competencia,
            habilidade:  q.habilidade,
            dificuldade: q.dificuldade,
            fonte:       "ia",
            ordem:       i + 1,
          })
          .select("id")
          .single();

        if (qErr || !qInserida) continue;
        questoes_salvas++;

        await supabase.from("alternativas_simulado").insert(
          q.alternativas.map((a: any, idx: number) => ({
            questao_id: qInserida.id,
            letra: a.letra, texto: a.texto, correta: a.correta, ordem: idx,
          }))
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analise: parsed.analise,
        questoes: parsed.questoes,
        questoes_salvas,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("gerar-objetivas:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
