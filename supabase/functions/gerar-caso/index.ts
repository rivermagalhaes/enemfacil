// supabase/functions/gerar-caso/index.ts
// Gera um "caso do dia a dia" vinculado a um artigo da CF/88
// Deploy: supabase functions deploy gerar-caso

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  artigo_id: string;
  inciso_id?: string;
  categoria?: "escola" | "trabalho" | "saude" | "policia" | "familia" | "consumidor";
}

interface CasoGerado {
  titulo: string;
  categoria: string;
  situacao: string;
  pergunta: string;
  resposta: string;
  veredicto_positivo: string;
  veredicto_negativo: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Token ausente", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return errorResponse("Não autenticado", 401);

    const body: RequestBody = await req.json();
    if (!body.artigo_id) return errorResponse("artigo_id obrigatório", 400);

    // Busca artigo + inciso opcional
    const { data: artigo } = await supabase
      .from("artigos")
      .select("numero, ementa, texto_original, texto_simples")
      .eq("id", body.artigo_id)
      .single();

    if (!artigo) return errorResponse("Artigo não encontrado", 404);

    let incisoCtx = "";
    if (body.inciso_id) {
      const { data: inciso } = await supabase
        .from("incisos")
        .select("identificador, texto_original")
        .eq("id", body.inciso_id)
        .single();
      if (inciso) {
        incisoCtx = `\nFoco no ${inciso.identificador}: "${inciso.texto_original}"`;
      }
    }

    const categoriaHint = body.categoria
      ? `\nCategoria sugerida: ${body.categoria}`
      : "";

    const prompt = `Crie um "caso do dia a dia" que ilustre o Art. ${artigo.numero}º da Constituição Federal de forma que um estudante do ensino médio ou um cidadão comum consiga se identificar e entender seus direitos.
${incisoCtx}${categoriaHint}

## Artigo

Art. ${artigo.numero}º — ${artigo.ementa}
${artigo.texto_simples || artigo.texto_original}

## Instruções

- A situação deve ser REALISTA e acontecer no cotidiano brasileiro
- Use personagens com nomes brasileiros e contextos locais
- A linguagem deve ser acessível (sem jargão jurídico excessivo)
- O caso deve deixar claro QUAL direito está sendo exercido ou violado
- veredicto_positivo: o que é permitido / garantido pela CF
- veredicto_negativo: o que viola a CF no caso apresentado

## Formato (JSON puro, sem markdown)

{
  "titulo": "Pergunta curta que resume o dilema (ex: 'A escola pode proibir meu cabelo?')",
  "categoria": "escola|trabalho|saude|policia|familia|consumidor",
  "situacao": "Narrativa de 2-3 frases descrevendo a situação com personagem específico.",
  "pergunta": "A dúvida jurídica central em forma de pergunta direta.",
  "resposta": "O que a Constituição Federal garante, em linguagem simples (2-3 frases).",
  "veredicto_positivo": "O que é permitido / garantido neste caso.",
  "veredicto_negativo": "O que configura violação constitucional neste caso."
}`;

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system:
          "Você é um especialista em Direito Constitucional e educação cidadã. Cria exemplos práticos que conectam a CF/88 ao cotidiano dos brasileiros. Responde APENAS com JSON válido, sem markdown.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) return errorResponse("Falha na Claude API", 502);

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");

    let caso: CasoGerado;
    try {
      caso = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      return errorResponse("Resposta inválida da IA", 500);
    }

    // Persiste no banco
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("casos_dia_a_dia")
      .insert({
        artigo_id: body.artigo_id,
        inciso_id: body.inciso_id ?? null,
        titulo: caso.titulo,
        categoria: caso.categoria,
        situacao: caso.situacao,
        pergunta: caso.pergunta,
        resposta: caso.resposta,
        veredicto_positivo: caso.veredicto_positivo,
        veredicto_negativo: caso.veredicto_negativo,
        gerado_por_ia: true,
        ativo: true,
      })
      .select()
      .single();

    if (insertErr) return errorResponse("Erro ao salvar caso", 500);

    return new Response(JSON.stringify({ ok: true, caso: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });
  } catch (err) {
    console.error(err);
    return errorResponse("Erro interno", 500);
  }
});

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
