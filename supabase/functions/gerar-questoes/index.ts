// supabase/functions/gerar-questoes/index.ts
// Gera questões estilo CESPE a partir de um artigo da CF/88
// Deploy: supabase functions deploy gerar-questoes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Tipagens ────────────────────────────────────────────────

interface RequestBody {
  artigo_id: string;       // UUID do artigo na tabela artigos
  concurso_id?: string;    // UUID do concurso (opcional — filtra assunto/cargo)
  quantidade?: number;     // 1–10 questões por chamada (default: 5)
  nivel?: "facil" | "medio" | "dificil";
}

interface QuestaoGerada {
  enunciado: string;
  assertiva: string;
  gabarito: "certo" | "errado";
  justificativa: string;
  assunto: string;
  nivel: "facil" | "medio" | "dificil";
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

// ── Handler principal ───────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Autenticação via JWT do Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Token de autenticação ausente", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Verifica usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("Usuário não autenticado", 401);
    }

    // 3. Verifica plano (apenas plano pago pode gerar questões via IA)
    const { data: profile } = await supabase
      .from("profiles")
      .select("plano, plano_ate")
      .eq("id", user.id)
      .single();

    const temPlano =
      profile?.plano !== "gratis" &&
      (!profile?.plano_ate || new Date(profile.plano_ate) > new Date());

    if (!temPlano) {
      return errorResponse("Recurso disponível apenas nos planos pagos", 403);
    }

    // 4. Valida body da requisição
    const body: RequestBody = await req.json();
    if (!body.artigo_id) {
      return errorResponse("artigo_id é obrigatório", 400);
    }

    const quantidade = Math.min(Math.max(body.quantidade ?? 5, 1), 10);
    const nivel = body.nivel ?? "medio";

    // 5. Busca o artigo no banco
    const { data: artigo, error: artigoError } = await supabase
      .from("artigos")
      .select("numero, ementa, texto_original, texto_simples, palavras_chave")
      .eq("id", body.artigo_id)
      .single();

    if (artigoError || !artigo) {
      return errorResponse("Artigo não encontrado", 404);
    }

    // 6. Busca incisos do artigo (contexto extra para a IA)
    const { data: incisos } = await supabase
      .from("incisos")
      .select("identificador, texto_original")
      .eq("artigo_id", body.artigo_id)
      .order("ordem");

    // 7. Busca dados do concurso (opcional)
    let concursoCtx = "";
    if (body.concurso_id) {
      const { data: concurso } = await supabase
        .from("concursos")
        .select("nome, orgao, banca, cargo_area")
        .eq("id", body.concurso_id)
        .single();

      if (concurso) {
        concursoCtx = `
Concurso alvo: ${concurso.nome} (${concurso.orgao})
Banca: ${concurso.banca}
Perfil do cargo: ${concurso.cargo_area}`;
      }
    }

    // 8. Monta contexto do artigo para o prompt
    const incisosTexto = incisos?.length
      ? "\n\nIncisos e parágrafos:\n" +
        incisos.map((i) => `${i.identificador}: ${i.texto_original}`).join("\n")
      : "";

    const artigoCtx = `Art. ${artigo.numero}º — ${artigo.ementa}

Texto constitucional:
${artigo.texto_original}${incisosTexto}`;

    // 9. Chama a Claude API
    const prompt = buildPrompt(artigoCtx, concursoCtx, quantidade, nivel);

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error("Erro Claude API:", err);
      return errorResponse("Falha ao chamar a Claude API", 502);
    }

    const claudeData: ClaudeResponse = await claudeRes.json();
    const rawText = claudeData.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // 10. Parseia JSON retornado pela IA
    let questoes: QuestaoGerada[];
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      questoes = JSON.parse(cleaned);
    } catch {
      console.error("Falha ao parsear JSON da IA:", rawText);
      return errorResponse("Resposta inválida da IA — tente novamente", 500);
    }

    // 11. Persiste questões no banco (marcadas como gerado_por_ia = true)
    const rows = questoes.map((q) => ({
      artigo_id: body.artigo_id,
      concurso_id: body.concurso_id ?? null,
      banca: "GERADO_IA",
      nivel: q.nivel ?? nivel,
      assunto: q.assunto,
      enunciado: q.enunciado,
      assertiva: q.assertiva,
      gabarito_cespe: q.gabarito,
      justificativa: q.justificativa,
      gerado_por_ia: true,
      revisado: false,
      ativo: true,
    }));

    // Usa supabase service role para inserir (bypassa RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("questoes")
      .insert(rows)
      .select("id, assertiva, gabarito_cespe, assunto, nivel");

    if (insertError) {
      console.error("Erro ao inserir questões:", insertError);
      return errorResponse("Erro ao salvar questões no banco", 500);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        geradas: inserted?.length ?? 0,
        questoes: inserted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      }
    );
  } catch (err) {
    console.error("Erro inesperado:", err);
    return errorResponse("Erro interno do servidor", 500);
  }
});

// ── System prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um especialista em elaboração de questões para concursos públicos brasileiros, 
com profundo conhecimento da banca CESPE/CEBRASPE e do Direito Constitucional.

Suas questões seguem RIGOROSAMENTE o padrão CESPE:
- Enunciado contextualiza o tema (ex: "Julgue o item a seguir, relativo a...")
- Assertiva é uma afirmação objetiva que o candidato deve julgar como CERTO ou ERRADO
- Linguagem formal e jurídica, sem ambiguidades intencionais
- Justificativa cita o artigo/inciso exato da CF/88
- As questões testam interpretação e aplicação, não apenas memorização
- Distribua equilibradamente entre gabarito CERTO e ERRADO

IMPORTANTE: Você cria questões INSPIRADAS no estilo CESPE — não copia questões existentes.
Sempre retorne JSON válido, sem markdown ou texto adicional.`;

// ── Builder do prompt do usuário ────────────────────────────

function buildPrompt(
  artigoCtx: string,
  concursoCtx: string,
  quantidade: number,
  nivel: string
): string {
  const nivelDesc: Record<string, string> = {
    facil: "básica, testando conhecimento direto do texto constitucional",
    medio: "intermediária, exigindo interpretação e correlação entre dispositivos",
    dificil: "avançada, envolvendo jurisprudência do STF e casos complexos de aplicação",
  };

  return `Com base no artigo constitucional abaixo, gere exatamente ${quantidade} questões estilo CESPE de dificuldade ${nivel} (${nivelDesc[nivel]}).
${concursoCtx ? `\n${concursoCtx}\n` : ""}
## Artigo

${artigoCtx}

## Instruções

- Gere ${quantidade} questões no formato CESPE (assertiva certo/errado)
- Nível de dificuldade: ${nivel}
- Varie os temas abordados entre as questões
- Distribua equilibradamente entre gabarito "certo" e "errado"
- A justificativa deve citar o dispositivo exato (art., inciso, §)

## Formato de resposta (JSON puro, sem markdown)

[
  {
    "enunciado": "Julgue o item a seguir, relativo aos direitos e garantias fundamentais previstos na CF/88.",
    "assertiva": "Texto da assertiva a ser julgada pelo candidato.",
    "gabarito": "certo",
    "justificativa": "Explicação detalhada citando o dispositivo constitucional exato.",
    "assunto": "Direitos fundamentais",
    "nivel": "${nivel}"
  }
]`;
}

// ── Utilitário ──────────────────────────────────────────────

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
