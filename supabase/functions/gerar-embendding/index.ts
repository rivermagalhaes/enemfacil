import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HF_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { texto } = await req.json();
    if (!texto || typeof texto !== "string") {
      return new Response(JSON.stringify({ error: "Campo 'texto' obrigatório" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const HF_API_KEY = Deno.env.get("HF_API_KEY");
    if (!HF_API_KEY) {
      return new Response(JSON.stringify({ error: "HF_API_KEY não configurada" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const res = await fetch(
      `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/pipeline/feature-extraction`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: texto }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `HF erro ${res.status}`, detail: err.slice(0, 200) }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const embedding = Array.isArray(data[0]) ? data[0] : data;

    return new Response(JSON.stringify({ embedding }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno", detail: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
