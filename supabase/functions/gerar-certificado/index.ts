const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { base64Data } = await req.json();

    if (!base64Data) {
      throw new Error("base64Data é obrigatório");
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada no Supabase Secrets");
    }

    // Faz upload do PDF para a OpenAI Files API
    const pdfBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const formData = new FormData();
    formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "questoes.pdf");
    formData.append("purpose", "assistants");

    const uploadResponse = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok) {
      throw new Error(uploadData.error?.message || "Erro ao fazer upload do PDF");
    }

    const fileId = uploadData.id;

    // Usa o Responses API com file_search para ler o PDF
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                file_id: fileId,
              },
              {
                type: "input_text",
                text: `Analise este PDF em DUAS etapas antes de responder:

ETAPA 1 — GABARITO: Procure no PDF por um gabarito explícito. Ele pode estar:
- No final do documento (ex: "Gabarito: 1-C 2-A 3-B..." ou tabela com respostas)
- Em página separada intitulada "Gabarito" ou "Respostas"
- Junto a cada questão (ex: "Resposta: B" ou "(B)" destacado)
Se encontrar o gabarito, mapeie cada número de questão para o índice da alternativa correta (A=0, B=1, C=2, D=3, E=4).

ETAPA 2 — EXTRAÇÃO: Extraia TODAS as questões e retorne SOMENTE um JSON válido (sem markdown, sem backticks) com este formato exato:
[
  {
    "question": "enunciado completo da questão",
    "options": ["alternativa A", "alternativa B", "alternativa C", "alternativa D", "alternativa E"],
    "answer_index": 2,
    "explanation": "explicação da resposta correta se disponível, senão string vazia",
    "topic": "tópico específico da questão",
    "area": "ciencias_natureza",
    "difficulty": "medio",
    "vestibular": "PROPRIO",
    "ano": 2025
  }
]
Regras obrigatórias:
- answer_index: número inteiro 0-4 da alternativa correta (0=A, 1=B, 2=C, 3=D, 4=E). Use o gabarito encontrado na ETAPA 1. Se não houver gabarito explícito e não for possível inferir com certeza, use null (não use 0 como padrão — null indica "não identificado").
- area: use EXATAMENTE um destes valores: ciencias_natureza | ciencias_humanas | linguagens | matematica. Infira pela temática (Química/Física/Biologia → ciencias_natureza; História/Geografia/Sociologia/Filosofia → ciencias_humanas; Português/Literatura/Inglês/Espanhol → linguagens; Matemática/Estatística → matematica).
- difficulty: use EXATAMENTE um destes valores: facil | medio | dificil.
- vestibular: se identificar no PDF (ENEM, FUVEST, UNICAMP, ITA, IME, CEFET, etc), use esse nome; caso contrário use PROPRIO.
- ano: número inteiro com o ano da prova. Se não souber, use 2025.
- options: sempre um array com as alternativas como strings simples, sem prefixo de letra (ex: "A)" ou "a)").
- Retorne APENAS o array JSON, sem nenhum texto antes ou depois.`,
              },
            ],
          },
        ],
      }),
    });

    const openaiData = await openaiResponse.json();

    if (!openaiResponse.ok) {
      throw new Error(openaiData.error?.message || `Erro OpenAI API: ${openaiResponse.status}`);
    }

    // Deleta o arquivo após uso
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
    });

    const text = openaiData.output
      ?.filter((o: any) => o.type === "message")
      ?.flatMap((o: any) => o.content)
      ?.filter((c: any) => c.type === "output_text")
      ?.map((c: any) => c.text)
      ?.join("") || "";

    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const questoes = JSON.parse(clean);

    if (!Array.isArray(questoes)) {
      throw new Error("Resposta da IA não é um array de questões");
    }

    return new Response(JSON.stringify({ questoes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro extrair-questoes-pdf:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
