// src/pages/agente/AgenteJuridico.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/layout/BottomNav";
import ModalPeticao from "@/components/ui/ModalPeticao";

interface Artigo {
  id: string;
  numero: number;
  ementa: string;
  texto_original: string;
  lei_sigla: string;
  palavras_chave: string[];
  similarity?: number;
}

interface Juris {
  tribunal: string;
  ementa: string;
  resumo_simples: string;
  numero_processo: string;
  url_original?: string;
}

interface Sumula {
  id: string;
  numero: number;
  tribunal: string;
  enunciado: string;
  area: string;
  palavras_chave: string[];
  similarity?: number;
}

interface Mensagem {
  role: "user" | "assistant";
  content: string;
  artigos?: Artigo[];
  juris?: Juris[];
  sumulas?: Sumula[];
  loading?: boolean;
  area?: string;
  baseSuficiente?: boolean;
  usouVetorial?: boolean;
}

const SUGESTOES = [
  "Posso ser preso por dívida de cartão?",
  "Quais são meus direitos como consumidor?",
  "O que é devido processo legal?",
  "Como funciona a tutela de urgência?",
  "Quais direitos tem uma criança vítima de violência?",
  "O que é contraditório e ampla defesa?",
  "Como funciona a ação de alimentos?",
  "Quais são os fundamentos da República?",
];

// ── Gera embedding via Edge Function ─────────────────────────
async function gerarEmbeddingPergunta(texto: string): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke("gerar-embedding", {
      body: { texto },
    });
    if (error || !data?.embedding) return null;
    return data.embedding as number[];
  } catch {
    return null;
  }
}

// ── Busca vetorial de súmulas ─────────────────────────────────
async function buscarSumulasVetorial(embedding: number[]): Promise<Sumula[]> {
  const { data, error } = await supabase.rpc("match_sumulas", {
    query_embedding: `[${embedding.join(",")}]`,
    match_threshold: 0.50,
    match_count: 4,
  });
  if (error || !data) return [];
  return (data as Sumula[]).filter(s => (s.similarity ?? 0) >= 0.50);
}

// ── Stopwords e normalização ──────────────────────────────────
const STOPWORDS = new Set([
  "o","a","os","as","um","uma","uns","umas","de","do","da","dos","das",
  "em","no","na","nos","nas","por","para","com","que","se","não","é",
  "são","foi","ser","ter","tem","como","qual","quais","quando","onde",
  "meu","minha","meus","minhas","eu","me","você","ele","ela","eles",
  "posso","pode","podem","devo","deve","devem","quero","quer","há",
  "existe","existem","caso","casos","situação","sobre","isso","isto",
  "qualquer","hora","dia","sua","seu","fui","fazer","feito","essa",
  "esse","estas","estes","aquele","aquela","pelo","pela","mais","menos",
]);

function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ── Busca textual de súmulas (fallback) ───────────────────────
async function buscarSumulasTextual(pergunta: string): Promise<Sumula[]> {
  const p = normalizar(pergunta);
  const palavras = p.replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
  if (palavras.length === 0) return [];

  const vistos = new Set<string>();
  const lista: Sumula[] = [];

  for (const t of palavras.slice(0, 4)) {
    const { data } = await supabase.from("sumulas")
      .select("id, numero, tribunal, enunciado, area, palavras_chave")
      .eq("ativo", true)
      .contains("palavras_chave", [t])
      .limit(3);
    (data as Sumula[] ?? []).forEach(s => {
      if (!vistos.has(s.id)) { vistos.add(s.id); lista.push(s); }
    });
  }

  for (const t of palavras.slice(0, 3)) {
    if (lista.length >= 6) break;
    const { data } = await supabase.from("sumulas")
      .select("id, numero, tribunal, enunciado, area, palavras_chave")
      .eq("ativo", true)
      .ilike("enunciado", `%${t}%`)
      .limit(2);
    (data as Sumula[] ?? []).forEach(s => {
      if (!vistos.has(s.id)) { vistos.add(s.id); lista.push(s); }
    });
  }

  const pontuados = lista.map(s => {
    const enunciado = normalizar(s.enunciado ?? "");
    let score = 0;
    palavras.forEach(w => { if (enunciado.includes(w)) score += 4; });
    return { s, score };
  }).filter(x => x.score >= 4).sort((a, b) => b.score - a.score);

  return pontuados.slice(0, 3).map(x => x.s);
}

const MAPA_SEMANTICO: Record<string, string[]> = {
  "preso por divida":  ["prisão civil","devedor","depositário infiel","alimentos"],
  "divida cartao":     ["cobrança abusiva","crédito ao consumidor","CDC","consumidor"],
  "divida":            ["débito","credor","devedor","cobrança","execução"],
  "preso":             ["prisão","liberdade","flagrante","preventiva","detenção"],
  "cartao":            ["consumidor","fornecedor","banco","financeira","crédito"],
  "consumidor":        ["fornecedor","produto","serviço","defeito","CDC","vício"],
  "filho":             ["criança","menor","guarda","alimentos","ECA","paternidade"],
  "crianca":           ["menor","ECA","proteção integral","vulnerável","adolescente"],
  "acidente":          ["dano","indenização","responsabilidade civil","vítima"],
  "heranca":           ["inventário","espólio","herdeiro","partilha","sucessão"],
  "aluguel":           ["locação","locatário","locador","despejo","contrato"],
  "processo":          ["ação","recurso","prazo","sentença","CPC"],
  "alimentos":         ["pensão","guarda","filho","ECA","família"],
};

const AREA_KEYWORDS: Record<string, string[]> = {
  "Direito do Consumidor":  ["consumidor","fornecedor","produto","serviço","defeito","cartão","banco","cobrança","cdc","plano de saúde"],
  "Direito Constitucional": ["constituição","cf88","fundamental","garantia","liberdade","igualdade","voto","greve","dignidade"],
  "Direito Penal":          ["crime","preso","prisão","condenação","réu","pena","delito","furto","roubo","homicídio"],
  "Direito Civil":          ["contrato","dívida","herança","aluguel","dano","indenização","responsabilidade","posse"],
  "Direito de Família":     ["filho","guarda","alimentos","divórcio","casamento","adoção","paternidade","pensão"],
  "Direito da Criança":     ["criança","menor","eca","adolescente","proteção","abuso","violência"],
  "Direito Processual":     ["processo","ação","recurso","prazo","sentença","cpc","tutela","liminar"],
  "Direito Trabalhista":    ["trabalho","emprego","demitido","clt","fgts","salário","rescisão","sindicato"],
};

function identificarArea(pergunta: string): string {
  const p = normalizar(pergunta);
  let melhor = "Direito Geral"; let maior = 0;
  for (const [area, kws] of Object.entries(AREA_KEYWORDS)) {
    const score = kws.filter(k => p.includes(normalizar(k))).length;
    if (score > maior) { maior = score; melhor = area; }
  }
  return melhor;
}

const AREA_LEIS: Record<string, string[]> = {
  "Direito do Consumidor":  ["CDC", "CF88"],
  "Direito Constitucional": ["CF88"],
  "Direito Penal":          ["CF88", "CPC"],
  "Direito Civil":          ["CF88", "CPC"],
  "Direito de Família":     ["CF88", "ECA", "CPC"],
  "Direito da Criança":     ["ECA", "CF88"],
  "Direito Processual":     ["CPC", "CF88"],
  "Direito Trabalhista":    ["CF88", "CPC"],
  "Direito Geral":          ["CF88", "CDC", "ECA", "CPC"],
};

async function buscarTextual(pergunta: string, area: string): Promise<Artigo[]> {
  const p = normalizar(pergunta);
  const extras: string[] = [];
  for (const [frase, sins] of Object.entries(MAPA_SEMANTICO)) {
    if (p.includes(normalizar(frase))) extras.push(...sins);
  }
  const palavras = p.replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
  palavras.forEach(w => { if (MAPA_SEMANTICO[w]) extras.push(...MAPA_SEMANTICO[w]); });
  const termos = [...new Set([...palavras, ...extras])].slice(0, 6);
  if (termos.length === 0) return [];

  const leisPermitidas = AREA_LEIS[area] ?? AREA_LEIS["Direito Geral"];
  const vistos = new Set<string>();
  const lista: Artigo[] = [];
  const add = (arr: Artigo[]) =>
    (arr ?? []).forEach(a => {
      if (!vistos.has(a.id) && leisPermitidas.includes(a.lei_sigla)) {
        vistos.add(a.id); lista.push(a);
      }
    });

  for (const t of termos.slice(0, 4)) {
    const { data } = await supabase.from("artigos")
      .select("id, numero, ementa, texto_original, lei_sigla, palavras_chave")
      .contains("palavras_chave", [t]).in("lei_sigla", leisPermitidas).limit(3);
    add(data as Artigo[]);
  }
  for (const t of termos.slice(0, 3)) {
    if (lista.length >= 6) break;
    const { data } = await supabase.from("artigos")
      .select("id, numero, ementa, texto_original, lei_sigla, palavras_chave")
      .ilike("ementa", `%${t}%`).in("lei_sigla", leisPermitidas).limit(2);
    add(data as Artigo[]);
  }

  const pontuados = lista.map(a => {
    const ementa = normalizar(a.ementa ?? "");
    const texto  = normalizar(a.texto_original ?? "");
    let score = 0;
    termos.forEach(t => { if (ementa.includes(t)) score += 5; if (texto.includes(t)) score += 2; });
    palavras.forEach(w => { if (ementa.includes(w)) score += 4; });
    return { a, score };
  }).filter(x => x.score >= 4).sort((a, b) => b.score - a.score);

  const ORDEM: Record<string, number> = { CF88: 0, CDC: 1, ECA: 2, CPC: 3 };
  return pontuados.slice(0, 4).map(x => x.a)
    .sort((a, b) => (ORDEM[a.lei_sigla] ?? 9) - (ORDEM[b.lei_sigla] ?? 9));
}

// ── Busca principal: artigos + súmulas em paralelo ────────────
async function buscarTudo(pergunta: string, area: string) {
  const embedding = await gerarEmbeddingPergunta(pergunta);

  const [artigosVetorial, sumulasVetorial] = await Promise.all([
    embedding
      ? supabase.rpc("match_artigos", {
          query_embedding: `[${embedding.join(",")}]`,
          match_threshold: 0.50,
          match_count: 5,
        }).then(({ data }) => {
          const ORDEM: Record<string, number> = { CF88: 0, CDC: 1, ECA: 2, CPC: 3 };
          return (data as Artigo[] ?? [])
            .filter(a => (a.similarity ?? 0) >= 0.50)
            .sort((a, b) => (ORDEM[a.lei_sigla] ?? 9) - (ORDEM[b.lei_sigla] ?? 9));
        })
      : Promise.resolve([] as Artigo[]),
    embedding ? buscarSumulasVetorial(embedding) : Promise.resolve([] as Sumula[]),
  ]);

  let artigos = artigosVetorial;
  let sumulas = sumulasVetorial;
  const usouVetorial = artigos.length >= 2;

  if (!usouVetorial) artigos = await buscarTextual(pergunta, area);
  if (sumulas.length === 0) sumulas = await buscarSumulasTextual(pergunta);

  return { artigos, sumulas, usouVetorial };
}

async function buscarJuris(artigoIds: string[]): Promise<Juris[]> {
  if (artigoIds.length === 0) return [];
  const { data } = await supabase.from("jurisprudencias")
    .select("tribunal, ementa, resumo_simples, numero_processo, url_original")
    .in("artigo_id", artigoIds).eq("ativo", true)
    .order("relevancia", { ascending: false }).limit(3);
  return (data as Juris[]) ?? [];
}

function gerarOrientacao(area: string, leis: Set<string>): string {
  if (area === "Direito do Consumidor" || leis.has("CDC"))
    return "Registre sua reclamação no Procon ou consumidor.gov.br antes de acionar a Justiça.";
  if (area === "Direito Penal")
    return "Em caso de prisão ilegal, cabe Habeas Corpus imediato. Procure a Defensoria Pública.";
  if (area === "Direito de Família")
    return "Ações de alimentos e guarda podem ser propostas pela Defensoria Pública gratuitamente.";
  if (area === "Direito da Criança" || leis.has("ECA"))
    return "Violações aos direitos de crianças podem ser denunciadas ao Conselho Tutelar (ligue 156).";
  if (area === "Direito Processual" || leis.has("CPC"))
    return "Prazos processuais são fatais. Ao receber uma citação, consulte um advogado imediatamente.";
  if (area === "Direito Trabalhista")
    return "Reclamação trabalhista pode ser feita na Justiça do Trabalho em até 2 anos do fim do contrato.";
  return "";
}

function gerarResposta(
  pergunta: string, artigos: Artigo[], juris: Juris[], sumulas: Sumula[], area: string
): string {
  if (artigos.length === 0 && sumulas.length === 0) {
    return `Não encontrei base legal suficiente no banco de dados para esta questão.\n\nSugestões:\n• Reformule com outras palavras-chave\n• Consulte diretamente os artigos na aba CF/88\n• Para questões específicas, consulte um advogado`;
  }

  const leiLabel: Record<string, string> = {
    CF88: "Constituição Federal de 1988", CDC: "Código de Defesa do Consumidor",
    ECA: "Estatuto da Criança e do Adolescente", CPC: "Código de Processo Civil",
  };

  const leis = new Set(artigos.map(a => a.lei_sigla));
  const leiList = [...leis].map(l => leiLabel[l] ?? l).join(", ");
  const pNorm = normalizar(pergunta);
  let r = `📋 ${area}\n\n`;

  const ehBinaria = ["posso","pode","tenho direito","e possivel","sou obrigado"].some(w => pNorm.startsWith(w));
  if (ehBinaria) {
    if (artigos.length > 0) {
      const e = normalizar(artigos[0].ementa);
      if (["proibido","vedado","ilegal","crime","pena"].some(t => e.includes(t)))
        r += `A legislação impõe restrições importantes nessa situação.\n\n`;
      else if (["garantido","assegurado","permitido","direito","livre"].some(t => e.includes(t)))
        r += `A legislação assegura direitos relevantes nessa situação.\n\n`;
      else r += `A legislação trata dessa questão da seguinte forma:\n\n`;
    } else {
      r += `Encontrei jurisprudência consolidada sobre esse tema:\n\n`;
    }
  } else {
    const partes = [];
    if (artigos.length > 0) partes.push(`${artigos.length} artigo${artigos.length > 1 ? "s" : ""} em: ${leiList}`);
    if (sumulas.length > 0) partes.push(`${sumulas.length} súmula${sumulas.length > 1 ? "s" : ""} do STF/STJ`);
    r += `Encontrei ${partes.join(" e ")}.\n\n`;
  }

  if (artigos.length > 0) {
    r += `⚖️ Fundamento legal:\n`;
    artigos.slice(0, 3).forEach(a => {
      const sim = a.similarity ? ` • ${(a.similarity * 100).toFixed(0)}% relevância` : "";
      const trecho = a.texto_original.replace(/\s+/g, " ").trim().slice(0, 220);
      r += `\n📌 ${a.lei_sigla} — Art. ${a.numero}º${sim}\n${a.ementa}\n"${trecho}${a.texto_original.length > 220 ? "..." : ""}"\n`;
    });
  }

  if (sumulas.length > 0) {
    r += `\n📜 Súmulas aplicáveis:\n`;
    sumulas.slice(0, 3).forEach(s => {
      const sim = s.similarity ? ` • ${(s.similarity * 100).toFixed(0)}% relevância` : "";
      r += `\n🔖 Súmula ${s.numero}/${s.tribunal}${sim}\n"${s.enunciado}"\n`;
    });
  }

  if (juris.length > 0) {
    r += `\n⚖️ Jurisprudência:\n`;
    juris.slice(0, 2).forEach(j => {
      r += `• ${j.tribunal} (${j.numero_processo}): ${(j.resumo_simples ?? j.ementa ?? "").slice(0, 150)}...\n`;
    });
  }

  const orientacao = gerarOrientacao(area, leis);
  if (orientacao) r += `\n💡 Orientação prática:\n${orientacao}\n`;
  r += `\n⚠️ Esta informação é educativa e não substitui consulta com advogado.`;
  if (artigos.length > 0) r += `\n\n👆 Toque nos cards abaixo para ler os artigos completos.`;
  return r;
}

const LEI_COR: Record<string, { bg: string; color: string }> = {
  CF88: { bg: "#E6F1FB", color: "#0C447C" },
  CDC:  { bg: "#E1F5EE", color: "#085041" },
  ECA:  { bg: "#EEEDFE", color: "#3C3489" },
  CPC:  { bg: "#FEF3E2", color: "#92400e" },
};

const TRIB_COR: Record<string, { bg: string; color: string }> = {
  STF: { bg: "#E6F1FB", color: "#0C447C" },
  STJ: { bg: "#EAF3DE", color: "#27500A" },
};

export default function AgenteJuridico() {
  const navigate = useNavigate();
  const [mensagens, setMensagens] = useState<Mensagem[]>([{
    role: "assistant",
    content: "Olá! Sou o assistente jurídico do CFfácil.\n\nMinhas respostas são fundamentadas na base de dados jurídica (CF/88, CDC, ECA, CPC) e em súmulas do STF e STJ. Se não encontrar base suficiente, informarei claramente.\n\nO que você gostaria de saber?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [peticaoAberta, setPeticaoAberta] = useState(false);
  const [artigoParaPeticao, setArtigoParaPeticao] = useState<Artigo | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  async function enviar(pergunta?: string) {
    const texto = (pergunta ?? input).trim();
    if (!texto || loading) return;
    setInput(""); setLoading(true);
    setMensagens(prev => [...prev,
      { role: "user", content: texto },
      { role: "assistant", content: "", loading: true },
    ]);

    try {
      const area = identificarArea(texto);
      const { artigos, sumulas, usouVetorial } = await buscarTudo(texto, area);
      const juris = await buscarJuris(artigos.map(a => a.id));
      const resposta = gerarResposta(texto, artigos, juris, sumulas, area);
      setMensagens(prev => [...prev.slice(0, -1), {
        role: "assistant", content: resposta, artigos, juris, sumulas, area, usouVetorial,
        baseSuficiente: artigos.length > 0 || sumulas.length > 0,
      }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMensagens(prev => [...prev.slice(0, -1), {
        role: "assistant",
        content: `Não foi possível processar sua consulta.\n\nDetalhe: ${msg}\n\nTente novamente.`,
      }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f4f6fb" }}>
      {/* Header */}
      <div style={{ background: "#1a3a6e", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚖️</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>Assistente Jurídico</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>CF/88 · CDC · ECA · CPC · Súmulas STF/STJ</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {["CF88","CDC","STF","STJ"].map(lei => (
              <span key={lei} style={{ fontSize: 9, fontWeight: 700, background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 4, padding: "2px 5px" }}>{lei}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        {mensagens.map((msg, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>

            {msg.role === "assistant" && msg.area && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 9, color: "#1a3a6e", background: "#E6F1FB", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>{msg.area}</span>
                {msg.usouVetorial !== undefined && (
                  <span style={{ fontSize: 9, borderRadius: 4, padding: "2px 7px", fontWeight: 600, background: msg.usouVetorial ? "#E1F5EE" : "#FEF3E2", color: msg.usouVetorial ? "#085041" : "#92400e" }}>
                    {msg.usouVetorial ? "🧠 semântica" : "🔤 textual"}
                  </span>
                )}
              </div>
            )}

            <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "#1a3a6e" : "#fff", color: msg.role === "user" ? "#fff" : "#1a1a1a", fontSize: 13, lineHeight: 1.6, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              {msg.loading ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a3a6e", animation: `bounce 1.2s ${i*0.2}s ease-in-out infinite` }}/>)}
                  <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
                </div>
              ) : <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>}
            </div>

            {msg.role === "assistant" && !msg.loading && msg.baseSuficiente === false && (
              <div style={{ maxWidth: "85%", padding: "7px 10px", borderRadius: 8, background: "#FFF3CD", border: "1px solid #ffc10744", fontSize: 11, color: "#856404" }}>
                ⚠️ Base insuficiente — reformule ou consulte um advogado.
              </div>
            )}

            {/* Cards de artigos */}
            {msg.artigos && msg.artigos.length > 0 && (
              <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 10, color: "#888", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>📖 Base legal</p>
                {msg.artigos.slice(0, 4).map(a => {
                  const cor = LEI_COR[a.lei_sigla] ?? LEI_COR.CF88;
                  const sim = a.similarity ? `${(a.similarity * 100).toFixed(0)}%` : null;
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, background: cor.bg, borderRadius: 8, overflow: "hidden", border: `1px solid ${cor.color}22` }}>
                      {/* Botão principal — abre artigo */}
                      <button onClick={() => navigate(`/cf88/${a.id}`)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, background: cor.color, color: "#fff", borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>{a.lei_sigla} {a.numero}º</span>
                        <span style={{ fontSize: 11, color: cor.color, lineHeight: 1.3, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ementa.slice(0, 45)}...</span>
                        {sim && <span style={{ fontSize: 9, fontWeight: 700, color: cor.color, opacity: 0.7, flexShrink: 0 }}>{sim}</span>}
                      </button>
                      {/* Botão + Petição */}
                      <button
                        onClick={() => { setArtigoParaPeticao(a); setPeticaoAberta(true); }}
                        style={{ padding: "7px 8px", border: "none", borderLeft: `1px solid ${cor.color}22`, background: "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}
                        title="Adicionar à petição"
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, color: cor.color }}>+ Petição</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cards de súmulas — clicáveis abrindo site oficial */}
            {msg.sumulas && msg.sumulas.length > 0 && (
              <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 10, color: "#888", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>📜 Súmulas STF/STJ</p>
                {msg.sumulas.slice(0, 3).map(s => {
                  const cor = TRIB_COR[s.tribunal] ?? TRIB_COR.STF;
                  const sim = s.similarity ? `${(s.similarity * 100).toFixed(0)}%` : null;
                  const urlSumula = s.tribunal === "STF"
                    ? `https://jurisprudencia.stf.jus.br/pages/search?base=sumulas&queryString=${s.numero}&sort=_score&sortBy=desc`
                    : `https://processo.stj.jus.br/SCON/?b=SUMU&p=true&operador=mesmo&q=${s.numero}`;
                  return (
                    <button
                      key={s.id}
                      onClick={() => window.open(urlSumula, "_blank", "noopener noreferrer")}
                      style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 8, border: `1px solid ${cor.color}33`, background: cor.bg, cursor: "pointer", textAlign: "left" }}
                    >
                      <span style={{ fontSize: 9, fontWeight: 700, background: cor.color, color: "#fff", borderRadius: 4, padding: "2px 5px", flexShrink: 0, marginTop: 1 }}>
                        {s.tribunal} {s.numero}
                      </span>
                      <span style={{ fontSize: 11, color: cor.color, lineHeight: 1.4, flex: 1 }}>
                        {s.enunciado.slice(0, 100)}...
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                        {sim && <span style={{ fontSize: 9, fontWeight: 700, color: cor.color, opacity: 0.7 }}>{sim}</span>}
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke={cor.color} strokeWidth="2" opacity={0.6}><path d="M7 3H3v10h10v-4M9 3h4v4M9 7l4-4"/></svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Cards de jurisprudência */}
            {msg.juris && msg.juris.length > 0 && (
              <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 10, color: "#888", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚖️ Jurisprudência</p>
                {msg.juris.slice(0, 2).map((j, i) => {
                  const temUrl = !!j.url_original;
                  const Wrapper = temUrl ? "button" : "div";
                  return (
                    <Wrapper key={i}
                      onClick={temUrl ? () => window.open(j.url_original, "_blank", "noopener noreferrer") : undefined}
                      style={{ padding: "7px 10px", borderRadius: 8, background: "#fffbeb", border: `1px solid ${temUrl ? "#f0c040aa" : "#f0c04044"}`, cursor: temUrl ? "pointer" : "default", textAlign: "left", width: "100%" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#b45309", margin: 0 }}>{j.tribunal} — {j.numero_processo}</p>
                        {temUrl && (
                          <span style={{ fontSize: 9, color: "#b45309", opacity: 0.7, display: "flex", alignItems: "center", gap: 3 }}>
                            Ver original
                            <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="#b45309" strokeWidth="2"><path d="M7 3H3v10h10v-4M9 3h4v4M9 7l4-4"/></svg>
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "#555", margin: 0, lineHeight: 1.4 }}>
                        {(j.resumo_simples ?? j.ementa ?? "").slice(0, 120)}...
                      </p>
                    </Wrapper>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {mensagens.length === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 11, color: "#888", margin: "8px 0 4px", textAlign: "center" }}>Perguntas frequentes</p>
            {SUGESTOES.map((s, i) => (
              <button key={i} onClick={() => enviar(s)} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(26,58,110,0.15)", background: "#fff", cursor: "pointer", textAlign: "left", fontSize: 12, color: "#1a3a6e", lineHeight: 1.4 }}>{s}</button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: "#fff", borderTop: "0.5px solid rgba(0,0,0,0.08)", padding: "10px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Digite sua dúvida jurídica..." rows={1}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontSize: 13, outline: "none", resize: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", fontFamily: "inherit" }}
          />
          <button onClick={() => enviar()} disabled={loading || !input.trim()} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: loading || !input.trim() ? "#e5e7eb" : "#1a3a6e", color: "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 10l14-7-7 14V10H3z"/></svg>
          </button>
        </div>
        <p style={{ fontSize: 10, color: "#aaa", margin: "6px 0 0", textAlign: "center" }}>
          CF/88 · CDC · ECA · CPC · Súmulas STF/STJ · Não substitui consulta com advogado
        </p>
      </div>
      <BottomNav />
      <ModalPeticao
        isOpen={peticaoAberta}
        onClose={() => { setPeticaoAberta(false); setArtigoParaPeticao(undefined); }}
        artigoInicial={artigoParaPeticao}
      />
    </div>
  );
}
