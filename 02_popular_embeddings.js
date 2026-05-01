// ============================================================
// FASE 1 — Popular embeddings (formato corrigido HF)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// ── Configure aqui ───────────────────────────────────────────
const SUPABASE_URL = "https://fijltxrkvkmbhzevtqgi.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpamx0eHJrdmttYmh6ZXZ0cWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ2Nzg1MCwiZXhwIjoyMDkyMDQzODUwfQ.k0hBQ5gX05ozK69GJjz2zYZVbK8tNKyT0hig7g0-dHg";
const HF_API_KEY = "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";
const BATCH_SIZE = 20;
const DELAY_MS = 1500;
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Modelo de feature-extraction com payload correto
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
    throw new Error(`HF erro ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();

  // Normaliza resposta: pode ser [[...]] ou [...]
  if (Array.isArray(data) && Array.isArray(data[0])) return data[0];
  if (Array.isArray(data) && typeof data[0] === "number") return data;
  throw new Error("Formato inesperado: " + JSON.stringify(data).slice(0, 100));
}

function textoParaEmbedding(artigo) {
  return [
    `${artigo.lei_sigla} Artigo ${artigo.numero}`,
    artigo.ementa ?? "",
    (artigo.palavras_chave ?? []).join(" "),
    (artigo.texto_original ?? "").slice(0, 500),
  ].filter(Boolean).join(". ").replace(/\s+/g, " ").trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("🔍 Buscando artigos sem embedding...");

  const { data: artigos, error } = await supabase
    .from("artigos")
    .select("id, numero, ementa, texto_original, lei_sigla, palavras_chave")
    .is("embedding", null)
    .order("lei_sigla", { ascending: true });

  if (error) { console.error("❌ Erro:", error.message); process.exit(1); }
  console.log(`📄 ${artigos.length} artigos para processar\n`);

  // Teste de conexão
  console.log("🧪 Testando conexão com Hugging Face...");
  try {
    const teste = await gerarEmbedding("direito constitucional brasileiro");
    console.log(`✅ HF OK — vetor de ${teste.length} dimensões\n`);
  } catch (e) {
    console.error("❌ Falha HF:", e.message);
    process.exit(1);
  }

  let sucesso = 0;
  let falha = 0;

  for (let i = 0; i < artigos.length; i += BATCH_SIZE) {
    const lote = artigos.slice(i, i + BATCH_SIZE);
    const loteNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalLotes = Math.ceil(artigos.length / BATCH_SIZE);
    process.stdout.write(`Lote ${loteNum}/${totalLotes} (${sucesso} salvos até agora)... `);

    for (const artigo of lote) {
      try {
        const texto = textoParaEmbedding(artigo);
        const embedding = await gerarEmbedding(texto);
        const { error: upErr } = await supabase
          .from("artigos")
          .update({ embedding: `[${embedding.join(",")}]` })
          .eq("id", artigo.id);
        if (upErr) throw new Error(upErr.message);
        sucesso++;
      } catch (err) {
        process.stdout.write(`\n  ⚠️  Art.${artigo.numero}(${artigo.lei_sigla}): ${err.message.slice(0,80)}\n  `);
        falha++;
        await sleep(500);
      }
    }

    console.log(`✅`);
    if (i + BATCH_SIZE < artigos.length) await sleep(DELAY_MS);
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`✅ Sucesso: ${sucesso}`);
  console.log(`❌ Falha:   ${falha}`);
  if (sucesso > 0) console.log(`\nPróximo passo: node 03_testar_busca.js`);
}

main().catch(console.error);
