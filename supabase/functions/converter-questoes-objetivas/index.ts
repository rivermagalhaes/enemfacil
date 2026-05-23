const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { questoes } = await req.json();
    if (!questoes || !Array.isArray(questoes) || questoes.length === 0) {
      throw new Error("questoes é obrigatório");
    }
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const AREA_LABEL = {
      ciencias_natureza: "Ciências da Natureza (Biologia, Física ou Química)",
      ciencias_humanas: "Ciências Humanas (História, Geografia, Filosofia ou Sociologia)",
      linguagens: "Linguagens e Códigos (Português, Literatura ou Inglês)",
      matematica: "Matemática",
    };

    const questoesTexto = questoes.map((q, i) =>
      `QUESTÃO ${i + 1}:\nEnunciado: ${q.question}\nDisciplina: ${AREA_LABEL[q.area] || "Ensino Médio"}\nDificuldade: ${q.difficulty}${q.topic ? `\nTópico: ${q.topic}` : ""}`
    ).join("\n\n");

    const prompt = `Converta as questões discursivas abaixo em objetivas com 4 alternativas (A-D). Uma correta, três distratores plausíveis baseados em erros conceituais comuns.\n\n${questoesTexto}\n\nResponda APENAS JSON válido sem markdown:\n[\n  {\n    "options": ["alternativa A", "alternativa B", "alternativa C", "alternativa D"],\n    "answer_index": 0,\n    "explanation": "por que a correta está certa"\n  }\n]\nRetorne exatamente ${questoes.length} objeto(s) na mesma ordem.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Erro API: ${response.status}`);

    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const resultado = JSON.parse(clean);
    if (!Array.isArray(resultado)) throw new Error("Resposta não é array");

    const resultadoFinal = resultado.map((r) => {
      const opts = (r.options || []).filter((o) => o?.trim());
      if (opts.length < 2) return null;
      const idx = (typeof r.answer_index === "number" && r.answer_index >= 0 && r.answer_index < opts.length) ? r.answer_index : 0;
      return { options: opts, answer_index: idx, explanation: r.explanation || "" };
    });

    return new Response(JSON.stringify({ resultados: resultadoFinal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
