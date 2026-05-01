// ============================================================
// FASE 1 — Testar busca semântica (corrigido)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// ── Configure aqui (mesmas chaves do script anterior) ────────
const SUPABASE_URL = "https://fijltxrkvkmbhzevtqgi.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpamx0eHJrdmttYmh6ZXZ0cWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ2Nzg1MCwiZXhwIjoyMDkyMDQzODUwfQ.k0hBQ5gX05ozK69GJjz2zYZVbK8tNKyT0hig7g0-dHg";
const HF_API_KEY = "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";
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mesma URL e formato do script que funcionou
async function gerarEmbedding(texto) {
  const res = await fetch(
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: texto }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HF erro ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  if (Array.isArray(data) && Array.isArray(data[0])) return data[0];
  if (Array.isArray(data) && typeof data[0] === "number") return data;
  throw new Error("Formato inesperado: " + JSON.stringify(data).slice(0, 100));
}

async function buscarSemantico(pergunta, threshold = 0.3, limit = 5) {
  console.log(`\n🔍 "${pergunta}"`);

  const embedding = await gerarEmbedding(pergunta);

  const { data, error } = await supabase.rpc("match_artigos", {
    query_embedding: `[${embedding.join(",")}]`,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    console.error(`   ❌ RPC erro: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`   ⚠️  Nenhum artigo acima de ${threshold} de similaridade`);
    return;
  }

  data.forEach((a, i) => {
    const sim = (a.similarity * 100).toFixed(1);
    console.log(`   ${i + 1}. [${a.lei_sigla} Art.${a.numero}] ${sim}% — ${a.ementa.slice(0, 70)}`);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Contar artigos com embedding
  const { data: amostra, error: errAmostra } = await supabase
    .from("artigos")
    .select("id")
    .not("embedding", "is", null)
    .limit(1);

  if (errAmostra) {
    console.error("❌ Erro ao consultar banco:", errAmostra.message);
    process.exit(1);
  }

  // Contar total
  const { count } = await supabase
    .from("artigos")
    .select("*", { count: "exact", head: true })
    .not("embedding", "is", null);

  console.log(`📊 Artigos com embedding: ${count ?? "?"}`);

  if (!amostra || amostra.length === 0) {
    console.log("❌ Nenhum embedding encontrado. Rode 02_popular_embeddings.js primeiro.");
    process.exit(1);
  }

  const testes = [
    "Posso ser preso por dívida de cartão?",
    "Quais são meus direitos como consumidor?",
    "O que é devido processo legal?",
    "Quais direitos tem uma criança vítima de violência?",
    "Como funciona a tutela de urgência?",
  ];

  for (const pergunta of testes) {
    await buscarSemantico(pergunta);
    await sleep(800);
  }

  console.log("\n═══════════════════════════════");
  console.log("Se os artigos fazem sentido → Fase 1 concluída ✅");
  console.log("Próximo passo: substituir AgenteJuridico.tsx pelo 04_AgenteJuridico.tsx");
}

main().catch(console.error);
