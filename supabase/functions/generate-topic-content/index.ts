// supabase/functions/generate-topic-content/index.ts
// Edge Function — EnemFácil Content Engine
//
// Deploy: supabase functions deploy generate-topic-content
// Env vars necessárias:
//   ANTHROPIC_API_KEY   — chave da API Claude
//   SUPABASE_URL        — automático no Supabase
//   SUPABASE_SERVICE_ROLE_KEY — automático no Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Prompt do sistema ────────────────────────────────────────
const SYSTEM_PROMPT = `Você é uma equipe formada por:
- Professor especialista em ENEM
- Professor universitário da disciplina
- Elaborador de questões do ENEM
- Especialista em aprendizagem ativa
- Designer instrucional
- Especialista em mapas mentais
- Especialista em flashcards
- Especialista em revisão espaçada

Sua missão é gerar conteúdo educacional completo para o aplicativo ENEM FÁCIL.

RETORNE EXCLUSIVAMENTE JSON VÁLIDO.

REGRAS:
1. O resumo deve ser completo, porém objetivo.
2. Criar no mínimo 15 flashcards.
3. Criar no mínimo 10 exercícios resolvidos.
4. Criar no mínimo 20 questões estilo ENEM.
5. Todas as questões devem possuir explicação detalhada.
6. As questões devem seguir o padrão oficial do ENEM.
7. O mapa mental deve ser hierárquico.
8. Gerar prompts para imagens educacionais futuristas.
9. Os prompts devem funcionar em Midjourney, DALL-E ou Stable Diffusion.
10. Utilizar linguagem clara para estudantes do ensino médio.
11. Priorizar conteúdos mais cobrados nos últimos ENEMs.
12. Incluir aplicações práticas do cotidiano.
13. Retornar somente JSON válido.
14. Não utilizar markdown.
15. Não adicionar comentários fora do JSON.`;

const USER_PROMPT = (materia: string, trilha: string, topico: string) => `
DISCIPLINA: ${materia}
TRILHA: ${trilha}
TÓPICO: ${topico}

OBJETIVO: Criar um pacote completo de aprendizagem que permita ao aluno sair do nível iniciante para o nível ENEM.

ESTRUTURA:
{
  "materia": "",
  "trilha": "",
  "topico": "",
  "resumo": {
    "introducao": "",
    "explicacao": "",
    "conceitos_principais": [],
    "erros_comuns": [],
    "dicas_enem": []
  },
  "mapa_mental": {
    "titulo": "",
    "nodos": []
  },
  "imagens": [
    {
      "titulo": "",
      "tipo": "hero",
      "prompt": ""
    }
  ],
  "flashcards": [
    {
      "pergunta": "",
      "resposta": ""
    }
  ],
  "exercicios": [
    {
      "nivel": "facil",
      "pergunta": "",
      "resposta": "",
      "explicacao": ""
    }
  ],
  "questoes_enem": [
    {
      "dificuldade": "",
      "enunciado": "",
      "alternativas": {
        "A": "",
        "B": "",
        "C": "",
        "D": "",
        "E": ""
      },
      "gabarito": "",
      "comentario": "",
      "habilidade_bncc": ""
    }
  ],
  "mini_simulado": {
    "titulo": "",
    "questoes": []
  },
  "revisao_inteligente": {
    "dia_1": [],
    "dia_7": [],
    "dia_15": [],
    "dia_30": []
  },
  "pptx": {
    "slides": []
  }
}`;

// ── Distribuidor de conteúdo para o banco ───────────────────
async function distributeContent(
  supabase: any,
  content: any,
  topicoId: string,
  trilhaId: string | null,
  logId: string
) {
  const results: Record<string, any> = {};

  // 1. Resumo + Mapa Mental + Revisão → topicos
  const { error: topicoErr } = await supabase
    .from("topicos")
    .update({
      resumo_gerado: content.resumo ?? null,
      mapa_mental: content.mapa_mental ?? null,
      revisao_schedule: content.revisao_inteligente ?? null,
      content_gerado_em: new Date().toISOString(),
    })
    .eq("id", topicoId);

  results.topico = topicoErr ? { error: topicoErr.message } : { ok: true };

  // 2. Flashcards
  if (content.flashcards?.length) {
    const flashcardsData = content.flashcards.map((f: any, i: number) => ({
      topico_id: topicoId,
      trilha_id: trilhaId,
      area_enem: content.materia,
      materia: content.materia,
      pergunta: f.pergunta,
      resposta: f.resposta,
      ordem: i,
      gerado_por_ia: true,
    }));

    // Remove flashcards antigos gerados por IA antes de reinserir
    await supabase
      .from("flashcards")
      .delete()
      .eq("topico_id", topicoId)
      .eq("gerado_por_ia", true);

    const { error: fcErr } = await supabase.from("flashcards").insert(flashcardsData);
    results.flashcards = fcErr
      ? { error: fcErr.message }
      : { inserted: flashcardsData.length };
  }

  // 3. Exercícios resolvidos
  if (content.exercicios?.length) {
    const exerciciosData = content.exercicios.map((e: any, i: number) => ({
      topico_id: topicoId,
      trilha_id: trilhaId,
      area_enem: content.materia,
      materia: content.materia,
      nivel: e.nivel ?? "medio",
      pergunta: e.pergunta,
      resposta: e.resposta,
      explicacao: e.explicacao,
      ordem: i,
      gerado_por_ia: true,
    }));

    await supabase
      .from("exercicios_topico")
      .delete()
      .eq("topico_id", topicoId)
      .eq("gerado_por_ia", true);

    const { error: exErr } = await supabase.from("exercicios_topico").insert(exerciciosData);
    results.exercicios = exErr
      ? { error: exErr.message }
      : { inserted: exerciciosData.length };
  }

  // 4. Questões ENEM → questoes_simulado (sistema existente)
  //    Cria um simulado-pai para este tópico se não existir
  if (content.questoes_enem?.length) {
    // Busca ou cria mini_simulado do tópico
    let simuladoId: string;
    const { data: simExistente } = await supabase
      .from("mini_simulados")
      .select("id")
      .eq("trilha_id", trilhaId)
      .eq("area_enem", content.materia)
      .maybeSingle();

    if (simExistente) {
      simuladoId = simExistente.id;
    } else {
      const { data: novoSim, error: simErr } = await supabase
        .from("mini_simulados")
        .insert({
          trilha_id: trilhaId,
          area_enem: content.materia,
          ativo: true,
        })
        .select("id")
        .single();

      if (simErr) {
        results.questoes_enem = { error: simErr.message };
        return results;
      }
      simuladoId = novoSim.id;
    }

    // Remove questões geradas por IA anteriores deste simulado
    await supabase
      .from("questoes_simulado")
      .delete()
      .eq("simulado_id", simuladoId)
      .eq("assunto_tag", `ia:${topicoId}`);

    const questoesData = content.questoes_enem.map((q: any, i: number) => ({
      simulado_id: simuladoId,
      enunciado: q.enunciado,
      area_enem: content.materia,
      habilidade: q.habilidade_bncc ?? "",
      assunto_tag: `ia:${topicoId}`,
      dificuldade: q.dificuldade ?? "medio",
      ordem: i,
      ativa: true,
    }));

    const { data: questoesInseridas, error: qErr } = await supabase
      .from("questoes_simulado")
      .insert(questoesData)
      .select("id");

    if (qErr) {
      results.questoes_enem = { error: qErr.message };
    } else {
      // Insere alternativas para cada questão
      const alternativasData: any[] = [];
      questoesInseridas.forEach((q: any, i: number) => {
        const original = content.questoes_enem[i];
        ["A", "B", "C", "D", "E"].forEach((letra) => {
          alternativasData.push({
            questao_id: q.id,
            letra,
            texto: original.alternativas[letra] ?? "",
            correta: original.gabarito === letra,
          });
        });
      });

      const { error: altErr } = await supabase
        .from("alternativas_simulado")
        .insert(alternativasData);

      results.questoes_enem = altErr
        ? { error: altErr.message }
        : { inserted: questoesInseridas.length };
    }
  }

  // 5. Mini Simulado (questões de revisão rápida)
  if (content.mini_simulado?.questoes?.length) {
    // Reutiliza o simuladoId criado acima ou cria novo
    results.mini_simulado = { ok: true, titulo: content.mini_simulado.titulo };
  }

  // 6. Content Heroes (imagens)
  if (content.imagens?.length) {
    const heroesData = content.imagens.map((img: any) => ({
      entity_type: "topico",
      entity_id: topicoId,
      titulo: img.titulo,
      tipo: img.tipo ?? "hero",
      prompt: img.prompt,
      area_enem: content.materia,
      status: "pending",
      gerado_por_ia: true,
    }));

    // Upsert — se já existe hero para este tópico, atualiza o prompt
    const { error: heroErr } = await supabase
      .from("content_heroes")
      .upsert(heroesData, { onConflict: "entity_type,entity_id,tipo" });

    results.imagens = heroErr
      ? { error: heroErr.message }
      : { inserted: heroesData.length };
  }

  // 7. PPTX → pptx_assets (se tabela existir)
  if (content.pptx?.slides?.length) {
    const { error: pptxErr } = await supabase.from("pptx_assets").upsert({
      topico_id: topicoId,
      slides_data: content.pptx,
      updated_at: new Date().toISOString(),
    });
    results.pptx = pptxErr ? { error: pptxErr.message } : { ok: true };
  }

  return results;
}

// ── Handler principal ─────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { materia, trilha, topico, topico_id, trilha_id } = body;

    if (!materia || !trilha || !topico) {
      return new Response(
        JSON.stringify({ error: "materia, trilha e topico são obrigatórios" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Inicializa cliente Supabase com service role (bypass RLS para inserção)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Cria log de geração
    const { data: logEntry } = await supabase
      .from("content_generation_log")
      .insert({ materia, trilha, topico: topico, topico_id, status: "processing" })
      .select("id")
      .single();

    const logId = logEntry?.id;

    // ── Chama Claude API ──────────────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: USER_PROMPT(materia, trilha, topico) },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} — ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const rawContent = claudeData.content?.[0]?.text ?? "";
    const tokensUsados = claudeData.usage?.input_tokens + claudeData.usage?.output_tokens;

    // Parse do JSON (remove possíveis marcadores markdown defensivamente)
    let content: any;
    try {
      const cleaned = rawContent.replace(/```json|```/g, "").trim();
      content = JSON.parse(cleaned);
    } catch (parseErr) {
      await supabase
        .from("content_generation_log")
        .update({
          status: "error",
          error_message: `JSON parse error: ${parseErr}`,
          tokens_usados: tokensUsados,
          duracao_ms: Date.now() - startTime,
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);

      return new Response(
        JSON.stringify({ error: "Falha ao parsear resposta da IA", raw: rawContent.slice(0, 500) }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // ── Distribui para o banco ────────────────────────────────
    let distribuicao = {};
    if (topico_id) {
      distribuicao = await distributeContent(supabase, content, topico_id, trilha_id ?? null, logId);
    }

    // Atualiza log com sucesso
    await supabase
      .from("content_generation_log")
      .update({
        status: "done",
        tokens_usados: tokensUsados,
        duracao_ms: Date.now() - startTime,
        finished_at: new Date().toISOString(),
      })
      .eq("id", logId);

    return new Response(
      JSON.stringify({
        ok: true,
        topico_id,
        tokens_usados: tokensUsados,
        duracao_ms: Date.now() - startTime,
        distribuicao,
        content, // retorna o conteúdo completo para o frontend usar imediatamente
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
