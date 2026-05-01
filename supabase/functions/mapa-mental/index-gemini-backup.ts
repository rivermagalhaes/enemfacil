// supabase/functions/mapa-mental/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_SISTEMA = `Você é um assistente jurídico especializado em Direito Penal brasileiro.
Sua função NÃO é dar respostas prontas, mas ORGANIZAR o raciocínio jurídico em formato de mapa mental estruturado.
Com base no caso fornecido, gere um mapa mental completo com foco em defesa.

Estruture usando este formato exato:
## ⚖️ 1. CLASSIFICAÇÃO DO CRIME
### Tipo penal aplicável
### Doloso / culposo / preterdoloso
### Possíveis qualificadoras ou causas de aumento
### Forma tentada ou consumada

## 🔍 2. ELEMENTOS DO CRIME
### Conduta (ação/omissão)
### Resultado
### Nexo causal
### Tipicidade (formal e material)
### Ilicitude
### Culpabilidade

## 🛡️ 3. LINHAS DE DEFESA POSSÍVEIS
Liste TODAS as teses juridicamente plausíveis com breve fundamentação.

## 📋 4. PROVAS RELEVANTES
### O que deve ser analisado
### Pontos fracos da acusação
### Oportunidades defensivas

## 📚 5. FUNDAMENTOS LEGAIS
Cite artigos do Código Penal, CPP e CF/88 relacionando com cada tese.

## 🗺️ 6. ESTRATÉGIA JURÍDICA (sem decidir pelo advogado)
### Caminhos possíveis
### Pontos de atenção
### Riscos

REGRAS: NÃO escreva peça jurídica. NÃO conclua qual é a melhor defesa. Apenas organize o raciocínio. Use linguagem jurídica precisa.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { caso } = await req.json();
    if (!caso || caso.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Caso muito curto." }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${PROMPT_SISTEMA}\n\nCASO:\n${caso}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      }),
    });

    const data = await res.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!texto) {
      return new Response(JSON.stringify({ error: "Sem resposta da IA." }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ texto }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
