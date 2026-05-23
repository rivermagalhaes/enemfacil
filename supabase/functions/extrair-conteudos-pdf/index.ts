// supabase/functions/extrair-conteudo-pdf/index.ts
// Extrai conteúdo didático de PDFs/imagens (apostilas, livros, resumos)
// e estrutura em: titulo, conteudo, exemplos, formulas

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildPrompt = (unidadeTitulo: string, materia: string) => `
Você é um especialista em pedagogia e ensino médio brasileiro.

Analise este material didático e extraia o conteúdo relacionado ao tópico "${unidadeTitulo}" da matéria "${materia}".

Retorne SOMENTE um JSON válido (sem markdown, sem backticks) com este formato:
{
  "titulo": "Título conciso do conteúdo encontrado (máx 80 chars)",
  "conteudo": "Texto didático principal extraído e organizado do material. Mínimo 300 palavras. Linguagem clara para ensino médio. Inclua definições, conceitos principais, explicações e contextualizações.",
  "exemplos": "Exemplos práticos, exercícios resolvidos ou situações do cotidiano encontrados no material. Se não houver, gere 2-3 exemplos baseados no conteúdo.",
  "formulas": "Fórmulas matemáticas, químicas ou físicas presentes. Leis, regras e macetes de memorização. Null se não aplicável.",
  "cobertura": "resumo em 1 frase do que foi encontrado no material sobre este tópico"
}

Instruções:
- Se o material não tratar especificamente de "${unidadeTitulo}", extraia o que for mais relevante e adapte.
- Organize o conteúdo de forma didática, do mais básico ao mais avançado.
- Preserve terminologia técnica correta.
- Retorne APENAS o JSON, sem texto antes ou depois.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { base64Data, mimeType = "application/pdf", unidadeTitulo, materia } = await req.json();

    if (!base64Data) throw new Error("base64Data é obrigatório");
    if (!unidadeTitulo) throw new Error("unidadeTitulo é obrigatório");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");

    const prompt = buildPrompt(unidadeTitulo, materia || "Ensino Médio");
    const isImage = mimeType.startsWith("image/");
    let resultado: any;

    if (isImage) {
      resultado = await extrairDeImagem(base64Data, mimeType, prompt, OPENAI_API_KEY);
    } else {
      resultado = await extrairDePdf(base64Data, prompt, OPENAI_API_KEY);
    }

    return new Response(JSON.stringify({ conteudo: resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro extrair-conteudo-pdf:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function extrairDeImagem(base64Data: string, mimeType: string, prompt: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: "high" } },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Erro OpenAI Vision: ${response.status}`);
  return parseJson(data.choices?.[0]?.message?.content || "");
}

async function extrairDePdf(base64Data: string, prompt: string, apiKey: string) {
  const pdfBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const formData = new FormData();
  formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "material.pdf");
  formData.append("purpose", "assistants");

  const uploadRes = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}` },
    body: formData,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Erro ao fazer upload");

  const fileId = uploadData.id;
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        input: [{
          role: "user",
          content: [
            { type: "input_file", file_id: fileId },
            { type: "input_text", text: prompt },
          ],
        }],
      }),
    });
    const data = await openaiRes.json();
    if (!openaiRes.ok) throw new Error(data.error?.message || `Erro OpenAI: ${openaiRes.status}`);
    const text = data.output
      ?.filter((o: any) => o.type === "message")
      ?.flatMap((o: any) => o.content)
      ?.filter((c: any) => c.type === "output_text")
      ?.map((c: any) => c.text)
      ?.join("") || "";
    return parseJson(text);
  } finally {
    fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${apiKey}` },
    }).catch(() => {});
  }
}

function parseJson(text: string): any {
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("IA não retornou JSON válido");
  return JSON.parse(match[0]);
}
