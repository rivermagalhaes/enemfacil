// supabase/functions/gerar-diagnostico/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { aluno_id } = await req.json();
    if (!aluno_id) throw new Error("aluno_id obrigatório");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Verificar se já existe diagnóstico válido (menos de 24h)
    const { data: diagExistente } = await supabase
      .from("diagnosticos_aluno")
      .select("*")
      .eq("aluno_id", aluno_id)
      .gt("valido_ate", new Date().toISOString())
      .order("gerado_em", { ascending: false })
      .limit(1)
      .single();

    if (diagExistente) {
      return new Response(JSON.stringify({ diagnostico: diagExistente, cache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar dados de desempenho via RPC
    const { data: desempenho, error: errDesempenho } = await supabase
      .rpc("get_desempenho_aluno", { p_aluno_id: aluno_id });

    if (errDesempenho) throw new Error(`Erro ao buscar desempenho: ${errDesempenho.message}`);

    // Se não tiver dados suficientes, retornar diagnóstico vazio
    if (!desempenho || desempenho.length === 0) {
      return new Response(JSON.stringify({
        diagnostico: null,
        mensagem: "Responda pelo menos 10 questões para gerar seu diagnóstico.",
        cache: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calcular totais gerais
    const totalQuestoes = desempenho.reduce((s: number, r: any) => s + r.total, 0);
    const totalAcertos = desempenho.reduce((s: number, r: any) => s + r.acertos, 0);
    const pctGeral = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

    // Identificar áreas críticas (pct < 50) e fortes (pct >= 70)
    const criticos = desempenho.filter((r: any) => r.pct_acerto < 50).slice(0, 8);
    const fortes = desempenho.filter((r: any) => r.pct_acerto >= 70).slice(0, 5);

    // Chamar Claude para interpretação pedagógica
    const prompt = `Você é um especialista em pedagogia para o ENEM e vestibulares brasileiros.
Analise os dados de desempenho abaixo e gere um diagnóstico pedagógico personalizado.

DESEMPENHO GERAL: ${pctGeral}% de acertos em ${totalQuestoes} questões

CONTEÚDOS COM DIFICULDADE (ordenados do pior para o melhor):
${criticos.map((r: any) => `- ${r.disciplina || 'N/A'} > ${r.conteudo || 'N/A'}: ${r.pct_acerto}% (${r.total} questões)`).join('\n')}

PONTOS FORTES:
${fortes.map((r: any) => `- ${r.disciplina || 'N/A'} > ${r.conteudo || 'N/A'}: ${r.pct_acerto}%`).join('\n')}

Responda APENAS com JSON válido, sem markdown, sem explicações fora do JSON:
{
  "resumo": "2-3 frases sobre o perfil pedagógico do aluno, tom encorajador e direto",
  "pontos_criticos": [
    { "conteudo": "nome do conteúdo", "disciplina": "disciplina", "motivo": "por que é crítico e o que estudar", "prioridade": 1 }
  ],
  "pontos_fortes": ["conteúdo forte 1", "conteúdo forte 2"],
  "plano_acao": [
    { "acao": "ação específica recomendada", "prazo": "curto", "tipo": "revisao" }
  ],
  "mensagem_motivacional": "mensagem curta e motivadora personalizada para o ENEM"
}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const aiText = aiData.content?.[0]?.text ?? "{}";

    let interpretacao: any = {};
    try {
      interpretacao = JSON.parse(aiText);
    } catch {
      interpretacao = { resumo: aiText, pontos_criticos: [], pontos_fortes: [], plano_acao: [], mensagem_motivacional: "" };
    }

    // Montar objeto de diagnóstico
    const novoDiagnostico = {
      aluno_id,
      total_questoes: totalQuestoes,
      pct_acerto_geral: pctGeral,
      areas_criticas: criticos.map((r: any) => ({
        area: r.area_conhecimento,
        disciplina: r.disciplina,
        pct_acerto: r.pct_acerto,
        status: r.pct_acerto < 40 ? "CRITICO" : "ATENCAO",
      })),
      conteudos_fracos: criticos.map((r: any) => ({
        conteudo: r.conteudo,
        disciplina: r.disciplina,
        pct_acerto: r.pct_acerto,
        total: r.total,
      })),
      pontos_fortes: fortes.map((r: any) => ({
        conteudo: r.conteudo,
        disciplina: r.disciplina,
        pct_acerto: r.pct_acerto,
      })),
      interpretacao_ia: interpretacao.resumo ?? "",
      plano_acao: interpretacao.plano_acao ?? [],
      mensagem_motivacional: interpretacao.mensagem_motivacional ?? "",
      habilidades_criticas: interpretacao.pontos_criticos ?? [],
    };

    // Salvar diagnóstico no banco
    const { data: diagSalvo, error: errSalvar } = await supabase
      .from("diagnosticos_aluno")
      .insert(novoDiagnostico)
      .select()
      .single();

    if (errSalvar) throw new Error(`Erro ao salvar diagnóstico: ${errSalvar.message}`);

    return new Response(JSON.stringify({ diagnostico: diagSalvo, cache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
