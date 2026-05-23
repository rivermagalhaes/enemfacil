// supabase/functions/converter-questoes-objetivas/index.ts
// Recebe um lote de questões discursivas e gera alternativas A-D para cada uma via Claude

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuestaoInput {
  question: string;
  area: string;
  difficulty: string;
  topic?: string;
}

interface QuestaoConvertida {
  options: string[];
  answer_index: number;
  explanation: string;
}

const AREA_LABEL: Record<string, string> = {
  ciencias_natureza: "Ciências da Natureza (Biologia, Física ou Química)",
  ciencias_humanas:  "Ciências Humanas (História, Geografia, Filosofia ou Sociologia)",
  linguagens:        "Linguagens e Códigos (Português, Literatura ou Inglês)",
  matematica:        "Matemática",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { questoes }: { questoes: QuestaoInput[] } = await req.json();

    if (!questoes || !Array.isArray(questoes) || questoes.length === 0) {
      throw new Error("Campo 'questoes' é obrigatório e deve ser um array não vazio");
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada no Supabase Secrets");
    }

    // Monta prompt com todas as questões em lote — uma única chamada para o lote inteiro
    const questoesTexto = questoes.map((q, i) => 
      `QUESTÃO ${i + 1}:
Enunciado: ${q.question}
Disciplina: ${AREA_LABEL[q.area] || "Ensino Médio"}
Dificuldade: ${q.difficulty}${q.topic ? `\nTópico: ${q.topic}` : ""}`
    ).join("\n\n");

    const prompt = `Você é um especialista em elaboração de questões para vestibulares brasileiros (ENEM, UNICAMP, FUVEST, ITA).

Converta as questões discursivas abaixo em questões objetivas de múltipla escolha, cada uma com 4 alternativas (A, B, C, D).

Regras:
- UMA alternativa correta, três distratores pedagogicamente plausíveis
- Distratores baseados em erros conceituais comuns, confusões frequentes ou raciocínio incompleto
- Alternativas com tamanho similar entre si
- Linguagem objetiva e clara

${questoesTexto}

Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois:
[
  {
    "options": ["texto da alternativa A", "texto da alternativa B", "texto da alternativa C", "texto da alternativa D"],
    "answer_index": 0,
    "explanation": "Explicação de por que a alternativa correta está certa e por que as outras estão erradas"
  }
]

Retorne exatamente ${questoes.length} objeto(s) no array, na mesma ordem das questões fornecidas.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // Haiku: mais rápido e barato para este uso
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `Erro Anthropic API: ${response.status}`);
    }

    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const resultado: QuestaoConvertida[] = JSON.parse(clean);

    if (!Array.isArray(resultado)) {
      throw new Error("Resposta da IA não é um array");
    }

    // Valida e sanitiza cada resultado
    const resultadoFinal = resultado.map((r, i) => {
      const opts = (r.options || []).filter((o: string) => o?.trim());
      if (opts.length < 2) {
        // Fallback mínimo se algo der errado
        return null;
      }
      const answerIdx = (typeof r.answer_index === "number" && r.answer_index >= 0 && r.answer_index < opts.length)
        ? r.answer_index : 0;
      return {
        options: opts,
        answer_index: answerIdx,
        explanation: r.explanation || "",
      };
    });

    return new Response(JSON.stringify({ resultados: resultadoFinal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro converter-questoes-objetivas:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
