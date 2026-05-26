// supabase/functions/generate-topic-content/index.ts
// v2 — usa texto do material como contexto quando disponível

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é uma equipe de especialistas em educação:
- Professor especialista em ENEM
- Elaborador de questões do ENEM
- Especialista em aprendizagem ativa
- Designer instrucional

Sua missão é gerar conteúdo educacional completo para o app ENEM FÁCIL.
Quando um material de referência for fornecido, BASE TODO O CONTEÚDO NELE.
Retorne EXCLUSIVAMENTE JSON VÁLIDO, sem markdown, sem comentários.`;

const buildPrompt = (materia: string, trilha: string, topico: string, textoMaterial?: string) => {
  const contexto = textoMaterial
    ? `\n\nMATERIAL DE REFERÊNCIA (use este conteúdo como base):\n${textoMaterial.slice(0, 60000)}\n\n`
    : "\n\n(Gere baseado no seu conhecimento sobre o tópico)\n\n";

  return `DISCIPLINA: ${materia}
TRILHA: ${trilha}
TÓPICO: ${topico}
${contexto}
OBJETIVO: Criar pacote completo de aprendizagem do iniciante ao nível ENEM.

ESTRUTURA JSON:
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
  "mapa_mental": { "titulo": "", "nodos": [] },
  "imagens": [{ "titulo": "", "tipo": "hero", "prompt": "" }],
  "flashcards": [{ "pergunta": "", "resposta": "" }],
  "exercicios": [{ "nivel": "facil", "pergunta": "", "resposta": "", "explicacao": "" }],
  "questoes_enem": [{
    "dificuldade": "",
    "enunciado": "",
    "alternativas": { "A": "", "B": "", "C": "", "D": "", "E": "" },
    "gabarito": "",
    "comentario": "",
    "habilidade_bncc": ""
  }],
  "mini_simulado": { "titulo": "", "questoes": [] },
  "revisao_inteligente": { "dia_1": [], "dia_7": [], "dia_15": [], "dia_30": [] },
  "pptx": { "slides": [] }
}

REGRAS:
- Mínimo 10 flashcards
- Mínimo 5 exercícios resolvidos
- Mínimo 10 questões estilo ENEM
- Todas questões com explicação detalhada
- Linguagem clara para ensino médio
- Priorizar conteúdos cobrados no ENEM
- Se material de referência fornecido: extraia exemplos e questões diretamente dele
- Retornar APENAS JSON válido`;
};

async function distributeContent(supabase: any, content: any, topicoId: string, trilhaId: string | null) {
  const results: Record<string, any> = {};

  // Resumo + mapa mental
  if (topicoId && !topicoId.startsWith("virtual:")) {
    await supabase.from("topicos").update({
      resumo_gerado: content.resumo ?? null,
      mapa_mental: content.mapa_mental ?? null,
      revisao_schedule: content.revisao_inteligente ?? null,
      content_gerado_em: new Date().toISOString(),
    }).eq("id", topicoId);
  }

  // Flashcards
  if (content.flashcards?.length) {
    if (topicoId && !topicoId.startsWith("virtual:")) {
      await supabase.from("flashcards").delete().eq("topico_id", topicoId).eq("gerado_por_ia", true);
    }
    const { error } = await supabase.from("flashcards").insert(
      content.flashcards.map((f: any, i: number) => ({
        topico_id: topicoId?.startsWith("virtual:") ? null : topicoId,
        trilha_id: trilhaId,
        area_enem: content.materia,
        materia: content.materia,
        pergunta: f.pergunta,
        resposta: f.resposta,
        ordem: i,
        gerado_por_ia: true,
      }))
    );
    results.flashcards = error ? { error: error.message } : { inserted: content.flashcards.length };
  }

  // Exercícios
  if (content.exercicios?.length) {
    if (topicoId && !topicoId.startsWith("virtual:")) {
      await supabase.from("exercicios_topico").delete().eq("topico_id", topicoId).eq("gerado_por_ia", true);
    }
    const { error } = await supabase.from("exercicios_topico").insert(
      content.exercicios.map((e: any, i: number) => ({
        topico_id: topicoId?.startsWith("virtual:") ? null : topicoId,
        trilha_id: trilhaId,
        area_enem: content.materia,
        materia: content.materia,
        nivel: e.nivel ?? "medio",
        pergunta: e.pergunta,
        resposta: e.resposta,
        explicacao: e.explicacao,
        ordem: i,
        gerado_por_ia: true,
      }))
    );
    results.exercicios = error ? { error: error.message } : { inserted: content.exercicios.length };
  }

  // Questões ENEM
  if (content.questoes_enem?.length && trilhaId) {
    const { data: simExistente } = await supabase
      .from("mini_simulados").select("id")
      .eq("trilha_id", trilhaId).eq("area_enem", content.materia).maybeSingle();

    let simuladoId = simExistente?.id;
    if (!simuladoId) {
      const { data: novoSim } = await supabase
        .from("mini_simulados")
        .insert({ trilha_id: trilhaId, area_enem: content.materia, ativo: true })
        .select("id").single();
      simuladoId = novoSim?.id;
    }

    if (simuladoId) {
      const tag = `ia:${topicoId}`;
      await supabase.from("questoes_simulado").delete().eq("simulado_id", simuladoId).eq("assunto_tag", tag);

      const { data: inseridas } = await supabase.from("questoes_simulado").insert(
        content.questoes_enem.map((q: any, i: number) => ({
          simulado_id: simuladoId,
          enunciado: q.enunciado,
          area_enem: content.materia,
          habilidade: q.habilidade_bncc ?? "",
          assunto_tag: tag,
          dificuldade: q.dificuldade ?? "medio",
          ordem: i,
          ativa: true,
        }))
      ).select("id");

      if (inseridas) {
        const alts: any[] = [];
        inseridas.forEach((q: any, i: number) => {
          const orig = content.questoes_enem[i];
          ["A","B","C","D","E"].forEach(l => {
            alts.push({ questao_id: q.id, letra: l, texto: orig.alternativas[l] ?? "", correta: orig.gabarito === l });
          });
        });
        await supabase.from("alternativas_simulado").insert(alts);
        results.questoes_enem = { inserted: inseridas.length };
      }
    }
  }

  // Heroes
  if (content.imagens?.length) {
    const { error } = await supabase.from("content_heroes").upsert(
      content.imagens.map((img: any) => ({
        entity_type: "topico",
        entity_id: topicoId?.startsWith("virtual:") ? trilhaId : topicoId,
        titulo: img.titulo,
        tipo: img.tipo ?? "hero",
        prompt: img.prompt,
        area_enem: content.materia,
        status: "pending",
        gerado_por_ia: true,
      })),
      { onConflict: "entity_type,entity_id,tipo" }
    );
    results.imagens = error ? { error: error.message } : { inserted: content.imagens.length };
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { materia, trilha, topico, topico_id, trilha_id, material_id } = body;

    if (!materia || !trilha || !topico) {
      return new Response(
        JSON.stringify({ error: "materia, trilha e topico são obrigatórios" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca texto do material se disponível
    let textoMaterial: string | undefined;

    if (material_id) {
      // Material específico passado
      const { data: mat } = await supabase
        .from("materiais").select("texto_extraido, titulo")
        .eq("id", material_id).single();
      if (mat?.texto_extraido) {
        textoMaterial = mat.texto_extraido;
        console.log(`Usando material: ${mat.titulo} (${textoMaterial.length} chars)`);
      }
    } else if (trilha_id) {
      // Busca material vinculado à trilha
      const { data: trilhaData } = await supabase
        .from("trilhas").select("material_id, materiais(texto_extraido, titulo)")
        .eq("id", trilha_id).single();

      if ((trilhaData as any)?.materiais?.texto_extraido) {
        textoMaterial = (trilhaData as any).materiais.texto_extraido;
        console.log(`Usando material da trilha: ${(trilhaData as any).materiais.titulo}`);
      } else {
        // Busca qualquer material da mesma matéria com texto extraído
        const { data: matDisp } = await supabase
          .from("materiais")
          .select("texto_extraido, titulo")
          .eq("materia", materia)
          .not("texto_extraido", "is", null)
          .order("criado_em", { ascending: false })
          .limit(1).single();

        if (matDisp?.texto_extraido) {
          textoMaterial = matDisp.texto_extraido;
          console.log(`Usando material disponível: ${matDisp.titulo}`);
        }
      }
    }

    // Log
    const { data: logEntry } = await supabase
      .from("content_generation_log")
      .insert({ materia, trilha, topico, topico_id, status: "processing" })
      .select("id").single();

    // Chama Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(materia, trilha, topico, textoMaterial) }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} — ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const rawContent = claudeData.content?.[0]?.text ?? "";
    const tokensUsados = (claudeData.usage?.input_tokens ?? 0) + (claudeData.usage?.output_tokens ?? 0);

    let content: any;
    try {
      const cleaned = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      content = JSON.parse(cleaned);
    } catch {
      await supabase.from("content_generation_log").update({
        status: "error", error_message: "JSON parse error",
        tokens_usados: tokensUsados, finished_at: new Date().toISOString(),
      }).eq("id", logEntry?.id);

      return new Response(
        JSON.stringify({ error: "Falha ao parsear resposta da IA", raw: rawContent.slice(0, 500) }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const distribuicao = await distributeContent(supabase, content, topico_id ?? `virtual:${topico}`, trilha_id ?? null);

    await supabase.from("content_generation_log").update({
      status: "done", tokens_usados: tokensUsados,
      duracao_ms: Date.now() - startTime, finished_at: new Date().toISOString(),
    }).eq("id", logEntry?.id);

    // Fire-and-forget: gera imagens
    const heroesGerados = (distribuicao as any)?.imagens?.inserted ?? 0;
    if (heroesGerados > 0) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-hero-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ processar_fila: true }),
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ ok: true, topico_id, tokens_usados: tokensUsados, duracao_ms: Date.now() - startTime, distribuicao, content, usou_material: !!textoMaterial }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
