// gerar-embeddings-sumulas.mjs
// Rode com: node gerar-embeddings-sumulas.mjs

const SUPABASE_URL = "https://fijltxrkvkmbhzevtqgi.supabase.co"; // ← URL do ConstituiçãoFácil
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpamx0eHJrdmttYmh6ZXZ0cWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ2Nzg1MCwiZXhwIjoyMDkyMDQzODUwfQ.k0hBQ5gX05ozK69GJjz2zYZVbK8tNKyT0hig7g0-dHg"; // ← cole sua service_role key

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

// Busca todas as súmulas sem embedding
async function buscarSumulas() {
  const res = await fetchJson(
    `${SUPABASE_URL}/rest/v1/sumulas?select=id,enunciado&embedding=is.null&limit=200`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  return res;
}

// Gera embedding via Edge Function
async function gerarEmbedding(texto) {
  const res = await fetchJson(
    `${SUPABASE_URL}/functions/v1/gerar-embedding`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ texto }),
    }
  );
  return res.embedding;
}

// Salva embedding no banco
async function salvarEmbedding(id, embedding) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sumulas?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ embedding: `[${embedding.join(",")}]` }),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro ao salvar: ${txt}`);
  }
}

// Aguarda um tempo (para não sobrecarregar a API)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🔍 Buscando súmulas sem embedding...");
  const sumulas = await buscarSumulas();
  console.log(`📋 ${sumulas.length} súmulas para processar\n`);

  let ok = 0;
  let erro = 0;

  for (const sumula of sumulas) {
    try {
      process.stdout.write(`⚙️  Processando súmula ${sumula.id.slice(0, 8)}... `);
      const embedding = await gerarEmbedding(sumula.enunciado);
      if (!embedding) throw new Error("Embedding vazio");
      await salvarEmbedding(sumula.id, embedding);
      console.log("✅");
      ok++;
      await sleep(300); // 300ms entre cada chamada
    } catch (err) {
      console.log(`❌ ${err.message}`);
      erro++;
      await sleep(500);
    }
  }

  console.log(`\n🎉 Concluído! ${ok} embeddings gerados, ${erro} erros.`);
}

main().catch(console.error);
