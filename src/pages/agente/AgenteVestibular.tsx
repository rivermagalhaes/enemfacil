// src/pages/agente/AgenteVestibular.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

// ── Limites por plano ─────────────────────────────────────────
// plano: free=gratis | estudante | pro | ouro
const LIMITES_PLANO: Record<string, number> = {
  gratis: 0,
  free: 0,       // sem acesso ao agente vestibular
  estudante: 10,
  pro: 10,   // 10 mensagens/dia
  premium: 30,         // 30 mensagens/dia
  ouro: Infinity,  // ilimitado
};

// ── Configuração dos vestibulares ─────────────────────────────
const VESTIBULARES_CONFIG: Record<string, {
  nome: string; emoji: string; cor: string; bg: string;
  desc: string; foco: string[]; estilo: string; dificuldade: string;
  systemPrompt: string;
}> = {
  ITA: {
    nome: "ITA", emoji: "✈️", cor: "#003D80", bg: "#E6F0FF",
    desc: "Instituto Tecnológico de Aeronáutica",
    foco: ["Matemática avançada", "Física", "Química", "Inglês"],
    estilo: "Questões longas, elegantes e com múltiplas etapas",
    dificuldade: "Extremamente difícil — top 5% dos vestibulares",
    systemPrompt: `Você é o Prof. ITA, professor especialista no vestibular do ITA (Instituto Tecnológico de Aeronáutica), considerado um dos vestibulares mais difíceis do Brasil.

ESPECIALIDADE: Matemática avançada (cálculo, análise combinatória, geometria analítica), Física (mecânica, eletromagnetismo, óptica), Química e Inglês técnico-científico.

ESTILO DO ITA:
- Questões longas com múltiplas etapas e elegância matemática
- Exige raciocínio lógico profundo, não apenas memorização
- Problemas interdisciplinares que conectam Física e Matemática
- Inglês em nível avançado com textos científicos
- 5 alternativas, gabarito único, sem ponto negativo

COMO RESPONDER:
- Seja rigoroso e preciso como um professor universitário de engenharia
- Explique o raciocínio passo a passo, mostrando a elegância da solução
- Quando relevante, apresente mais de uma abordagem
- Cite conceitos avançados: séries, integrais, vetores, termodinâmica
- Use notação matemática clara
- Ao final, sugira tópicos relacionados para estudar

IDIOMA: Português brasileiro. Para questões de inglês, explique em português.`,
  },
  IME: {
    nome: "IME", emoji: "⚙️", cor: "#1a3a6e", bg: "#E6EEFF",
    desc: "Instituto Militar de Engenharia",
    foco: ["Matemática", "Física", "Química", "Desenho Técnico"],
    estilo: "Questões técnicas com aplicações práticas de engenharia",
    dificuldade: "Muito difícil — similar ao ITA",
    systemPrompt: `Você é o Prof. IME, professor especialista no vestibular do IME (Instituto Militar de Engenharia), um dos vestibulares mais exigentes do Brasil.

ESPECIALIDADE: Matemática (álgebra, geometria, cálculo), Física (mecânica, eletricidade, ondulatória), Química e Desenho Técnico/Geométrico.

ESTILO DO IME:
- Questões com aplicações práticas de engenharia militar
- Forte ênfase em Geometria Descritiva e Desenho Técnico
- Problemas de Física com contexto tecnológico e militar
- Química com foco em materiais e reações industriais
- Matemática rigorosa com aplicações em engenharia

COMO RESPONDER:
- Abordagem técnica e precisa, como engenheiro militar
- Destaque aplicações práticas dos conceitos
- Explique Desenho Técnico com vocabulário específico (vistas, cortes, seções)
- Para Física, sempre apresente diagrama de forças ou esquema
- Conecte os conceitos com aplicações militares e de engenharia quando possível

IDIOMA: Português brasileiro.`,
  },
  FUVEST: {
    nome: "FUVEST", emoji: "🎓", cor: "#8B0000", bg: "#FFE6E6",
    desc: "Fundação para o Vestibular da USP",
    foco: ["Todas as áreas", "Interpretação textual", "Atualidades"],
    estilo: "Equilibrado, contextualizado, valoriza interpretação",
    dificuldade: "Muito difícil — portal para a USP",
    systemPrompt: `Você é o Prof. FUVEST, professor especialista na FUVEST (vestibular da USP), um dos vestibulares mais tradicionais e concorridos do Brasil.

ESPECIALIDADE: Todas as áreas do conhecimento com ênfase em interpretação crítica, contextualização histórica e interdisciplinaridade.

ESTILO DA FUVEST:
- Questões contextualizadas em situações reais e atuais
- Forte ênfase em interpretação de texto, gráficos e imagens
- Interdisciplinaridade: conecta diferentes áreas do conhecimento
- Atualidades e temas sociais, ambientais e culturais
- Redação exige argumentação sofisticada e repertório cultural
- 2ª fase: questões dissertativas que exigem domínio profundo

COMO RESPONDER:
- Abordagem analítica e reflexiva, como professor universitário da USP
- Contextualize sempre os conceitos no mundo real
- Para Humanas: conecte com atualidades brasileiras e globais
- Para Ciências: valorize a compreensão dos fenômenos, não só fórmulas
- Para Língua Portuguesa: analise recursos expressivos e estilísticos
- Sugira leituras complementares (jornais, revistas científicas)

IDIOMA: Português brasileiro culto e preciso.`,
  },
  UNICAMP: {
    nome: "UNICAMP", emoji: "🔬", cor: "#005C97", bg: "#E6F4FF",
    desc: "Universidade Estadual de Campinas",
    foco: ["Interdisciplinaridade", "Contextualização", "Atualidades"],
    estilo: "Questões contextualizadas e interdisciplinares",
    dificuldade: "Muito difícil — foco em raciocínio crítico",
    systemPrompt: `Você é o Prof. UNICAMP, professor especialista no vestibular da UNICAMP, conhecido por suas questões contextualizadas e interdisciplinares.

ESPECIALIDADE: Todas as áreas, com ênfase especial em interdisciplinaridade, contextualização e pensamento crítico.

ESTILO DA UNICAMP:
- Questões longas com texto-base e contexto elaborado
- Interdisciplinaridade marcante: uma questão pode envolver várias áreas
- Forte uso de gráficos, tabelas, mapas e infográficos
- Temas contemporâneos: meio ambiente, tecnologia, sociedade
- Linguagem acessível mas conteúdo profundo
- Redação criativa e argumentativa com tema inovador

COMO RESPONDER:
- Abordagem interdisciplinar: conecte sempre com outras áreas
- Incentive o pensamento crítico e a análise de contexto
- Para questões com gráficos: ensine a interpretar os dados
- Contextualize com problemas reais e atuais do Brasil e do mundo
- Sugira como o tema aparece em outras disciplinas

IDIOMA: Português brasileiro.`,
  },
  UNB: {
    nome: "UnB", emoji: "🏛️", cor: "#006400", bg: "#E6FFE6",
    desc: "Universidade de Brasília — PAS e Vestibular",
    foco: ["PAS", "Atualidades", "Política", "Brasília"],
    estilo: "Foco em competências, atualidades e contexto de Brasília",
    dificuldade: "Difícil — ênfase em atualidades e contexto político",
    systemPrompt: `Você é o Prof. UnB, professor especialista no vestibular da UnB e no PAS (Programa de Avaliação Seriada), com foco especial no contexto político, social e cultural brasileiro.

ESPECIALIDADE: Todas as áreas, com ênfase especial em Ciências Humanas, atualidades políticas, história de Brasília e do Brasil, e o programa PAS que avalia competências por série.

ESTILO DA UnB/PAS:
- PAS avalia por competências progressivas ao longo do ensino médio
- Forte ênfase em atualidades políticas e sociais brasileiras
- Brasília e o Distrito Federal aparecem frequentemente como contexto
- Questões sobre democracia, direitos humanos e cidadania
- Literatura e artes com foco em autores brasileiros contemporâneos

COMO RESPONDER:
- Contextualize sempre com a realidade política e social do Brasil
- Para o PAS: explique como o tema se relaciona com as competências avaliadas
- Destaque a importância de Brasília como capital federal
- Para Humanas: análise crítica da realidade brasileira contemporânea
- Para Ciências: aplicações no contexto do Centro-Oeste e do Cerrado
- Relacione com temas de cidadania, democracia e direitos fundamentais

IDIOMA: Português brasileiro.`,
  },
};

const SUGESTOES_POR_VESTIBULAR: Record<string, string[]> = {
  ITA: [
    "Como resolver equações diferenciais do ITA?",
    "Explique o método de Lagrange para máximos e mínimos",
    "Como o ITA cobra termodinâmica?",
    "Resolva um problema típico de vetores do ITA",
    "Como estudar Física para o ITA em 3 meses?",
  ],
  IME: [
    "Como é o Desenho Técnico no IME?",
    "Explique vistas ortogonais e cortes",
    "Como o IME cobra Química orgânica?",
    "Dicas para a prova objetiva do IME",
    "Qual a diferença entre ITA e IME?",
  ],
  FUVEST: [
    "Como interpretar textos na FUVEST?",
    "Temas recorrentes na redação da FUVEST",
    "Como a FUVEST cobra Biologia?",
    "Dicas para a 2ª fase da FUVEST",
    "Como estudar História para a FUVEST?",
  ],
  UNICAMP: [
    "Como interpretar gráficos na UNICAMP?",
    "Temas interdisciplinares frequentes",
    "Como a UNICAMP avalia redação criativa?",
    "Questões de Física contextualizadas da UNICAMP",
    "Como estudar para o vestibular da UNICAMP?",
  ],
  UNB: [
    "O que é o PAS da UnB e como funciona?",
    "Competências avaliadas no PAS por série",
    "Temas de atualidades frequentes na UnB",
    "Como estudar Humanas para o vestibular da UnB?",
    "Qual a diferença entre PAS e vestibular da UnB?",
  ],
};


// ── Matérias por vestibular ───────────────────────────────────
const MATERIAS_VESTIBULAR: Record<string, { id: string; label: string; emoji: string; area: string }[]> = {
  ITA: [
    { id: "todas", label: "Todas", emoji: "📚", area: "" },
    { id: "matematica", label: "Matemática", emoji: "📐", area: "matematica" },
    { id: "fisica", label: "Física", emoji: "⚡", area: "natureza" },
    { id: "quimica", label: "Química", emoji: "🧪", area: "natureza" },
    { id: "portugues", label: "Português", emoji: "📖", area: "linguagens" },
    { id: "ingles", label: "Inglês", emoji: "🇺🇸", area: "linguagens" },
  ],
  IME: [
    { id: "todas", label: "Todas", emoji: "📚", area: "" },
    { id: "matematica", label: "Matemática", emoji: "📐", area: "matematica" },
    { id: "fisica", label: "Física", emoji: "⚡", area: "natureza" },
    { id: "quimica", label: "Química", emoji: "🧪", area: "natureza" },
    { id: "desenho", label: "Desenho", emoji: "📏", area: "matematica" },
    { id: "portugues", label: "Português", emoji: "📖", area: "linguagens" },
  ],
  FUVEST: [
    { id: "todas", label: "Todas", emoji: "📚", area: "" },
    { id: "linguagens", label: "Linguagens", emoji: "📖", area: "linguagens" },
    { id: "humanas", label: "Humanas", emoji: "🌍", area: "humanas" },
    { id: "matematica", label: "Matemática", emoji: "📐", area: "matematica" },
    { id: "natureza", label: "Ciências", emoji: "🔬", area: "natureza" },
  ],
  UNICAMP: [
    { id: "todas", label: "Todas", emoji: "📚", area: "" },
    { id: "linguagens", label: "Linguagens", emoji: "📖", area: "linguagens" },
    { id: "humanas", label: "Humanas", emoji: "🌍", area: "humanas" },
    { id: "matematica", label: "Matemática", emoji: "📐", area: "matematica" },
    { id: "natureza", label: "Ciências", emoji: "🔬", area: "natureza" },
  ],
  UNB: [
    { id: "todas", label: "Todas", emoji: "📚", area: "" },
    { id: "linguagens", label: "Linguagens", emoji: "📖", area: "linguagens" },
    { id: "humanas", label: "Humanas", emoji: "🌍", area: "humanas" },
    { id: "matematica", label: "Matemática", emoji: "📐", area: "matematica" },
    { id: "natureza", label: "Ciências", emoji: "🔬", area: "natureza" },
  ],
};



// ── Tipos ─────────────────────────────────────────────────────
interface Mensagem {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  loadingText?: string;
  questoesRelacionadas?: QuestaoRelacionada[];
}

interface QuestaoRelacionada {
  id: string;
  question: string;
  area: string;
  difficulty: string;
  vestibular: string;
  ano: number;
}

// ── Conta mensagens do dia no Supabase ────────────────────────
async function contarMensagensHoje(userId: string, vestibular: string): Promise<number> {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("agente_vestibular_mensagens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("vestibular", vestibular)
      .gte("criado_em", hoje.toISOString());
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ── Registra mensagem no Supabase ─────────────────────────────
async function registrarMensagem(userId: string, vestibular: string) {
  try {
    await supabase
      .from("agente_vestibular_mensagens")
      .insert({ user_id: userId, vestibular, criado_em: new Date().toISOString() });
  } catch {
    // silencioso
  }
}

// ── Busca contexto web via DuckDuckGo ────────────────────────
async function buscarContextoWeb(pergunta: string, vestibular: string): Promise<string> {
  try {
    const query = encodeURIComponent(`${vestibular} vestibular ${pergunta}`);
    const url = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    if (!res.ok) return "";
    const data = await res.json();
    const abstract = data.AbstractText ?? "";
    const related = (data.RelatedTopics ?? [])
      .slice(0, 3)
      .map((t: any) => t.Text ?? "")
      .filter(Boolean)
      .join("\n");
    return [abstract, related].filter(Boolean).join("\n").slice(0, 600);
  } catch {
    return "";
  }
}

// ── Busca questões do banco com contexto completo ─────────────
async function buscarQuestoesComContexto(
  pergunta: string,
  vestibular: string,
  area: string = ""
): Promise<{ questoes: QuestaoRelacionada[]; resumo: string }> {
  try {
    const palavras = pergunta
      .toLowerCase()
      .replace(/[^a-záéíóúàãõâêîôûç\s]/g, " ")
      .split(/\s+/)
      .filter(p => p.length > 4)
      .slice(0, 4);

    if (palavras.length === 0) return { questoes: [], resumo: "" };

    let query = supabase
      .from("questions")
      .select("id, question, explanation, area, difficulty, vestibular, ano")
      .eq("vestibular", vestibular)
      .or(palavras.map(p => `question.ilike.%${p}%`).join(","))
      .order("ano", { ascending: false })
      .limit(5);

    if (area) query = query.eq("area", area);
    const { data } = await query;

    const questoes = data ?? [];

    const resumo = questoes.length > 0
      ? "\n\nQUESTÕES DO BANCO (referência):\n" +
        questoes.map((q: any, i: number) =>
          `[Q${i+1}] ${q.vestibular} ${q.ano} (${q.area}) — ${q.question.slice(0, 120)}...`
        ).join("\n")
      : "";

    return { questoes, resumo };
  } catch {
    return { questoes: [], resumo: "" };
  }
}

// ── Chama Claude API com contexto enriquecido ─────────────────
async function consultarClaude(
  pergunta: string,
  historico: Mensagem[],
  systemPrompt: string,
  contextoQuestoes: string,
  contextoWeb: string
): Promise<string> {

  const systemEnriquecido = systemPrompt +
    (contextoQuestoes ? `\n\nCONTEXTO DO BANCO DE QUESTÕES REAIS:\nUse as questões abaixo como referência para mostrar como o tema é cobrado no vestibular.${contextoQuestoes}` : "") +
    (contextoWeb ? `\n\nCONTEXTO ADICIONAL:\n${contextoWeb}` : "") +
    `\n\nFORMATO OBRIGATÓRIO DE RESPOSTA:
1. Explique o conceito de forma didática e passo a passo
2. Se houver questões do banco relacionadas, cite como o tema foi cobrado
3. Ao final, sempre inclua: "📌 Próximo passo: [tópico relacionado para estudar]"`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: systemEnriquecido,
      messages: [
        ...historico
          .filter((m: any) => !m.loading && m.content)
          .map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: pergunta },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message ?? "Erro na API");
  }
  const data = await response.json();
  return data.content?.[0]?.text ?? "Não foi possível obter resposta.";
}

// ── Modal de upgrade ──────────────────────────────────────────
function ModalUpgrade({
  plano,
  limite,
  onClose,
  navigate,
}: {
  plano: string;
  limite: number;
  onClose: () => void;
  navigate: (p: string) => void;
}) {
  const isGratis = plano === "gratis";
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: 28,
        maxWidth: 360, width: "100%", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <p style={{ fontSize: 48, margin: "0 0 8px" }}>🔒</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>
          {isGratis ? "Recurso Premium" : "Limite diário atingido"}
        </p>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px", lineHeight: 1.6 }}>
          {isGratis
            ? "Os Professores IA especializados em vestibulares estão disponíveis nos planos pagos."
            : `Você atingiu o limite de ${limite} mensagens/dia do plano ${plano}. Faça upgrade para continuar.`
          }
        </p>

        {/* Planos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div style={{ background: "#f0f6ff", borderRadius: 12, padding: "10px 14px", border: "1px solid #bfdbfe", textAlign: "left" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#003D80", margin: "0 0 2px" }}>Estudante — R$19,90/mês</p>
            <p style={{ fontSize: 11, color: "#555", margin: 0 }}>10 mensagens/dia por professor</p>
          </div>
          <div style={{ background: "#fff7ed", borderRadius: 12, padding: "10px 14px", border: "1px solid #fed7aa", textAlign: "left" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#c2410c", margin: "0 0 2px" }}>Pro — R$29,90/mês</p>
            <p style={{ fontSize: 11, color: "#555", margin: 0 }}>30 mensagens/dia por professor</p>
          </div>
          <div style={{ background: "linear-gradient(135deg, #fef9c3, #fde68a)", borderRadius: 12, padding: "10px 14px", border: "1px solid #fcd34d", textAlign: "left" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", margin: "0 0 2px" }}>🥇 Ouro — R$49,90/mês</p>
            <p style={{ fontSize: 11, color: "#555", margin: 0 }}>Mensagens ilimitadas · Todos os professores</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/assinatura")}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #003D80, #0057CC)",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            marginBottom: 8,
          }}
        >
          Ver planos
        </button>
        <button
          onClick={onClose}
          style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", color: "#666", fontSize: 13, cursor: "pointer" }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function AgenteVestibular() {
  const { vestibular: vestParam } = useParams<{ vestibular: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const config = VESTIBULARES_CONFIG[vestParam?.toUpperCase() ?? ""] ?? null;
  const materias = MATERIAS_VESTIBULAR[vestParam?.toUpperCase() ?? ""] ?? [];
  const sugestoes = SUGESTOES_POR_VESTIBULAR[vestParam?.toUpperCase() ?? ""] ?? [];

  // Plano do usuário
  const planoAtual = (profile?.plano ?? "gratis") as string;
  const limiteHoje = LIMITES_PLANO[planoAtual] ?? 0;

  const [materiaSelecionada, setMateriaSelecionada] = useState("todas");

  const [mensagens, setMensagens] = useState<Mensagem[]>([{
    role: "assistant",
    content: config
      ? `Olá! 👋 Sou o **Prof. ${config.nome}**, seu professor especialista.\n\n🎯 **Foco:** ${config.foco.join(", ")}\n\n📊 **Estilo das questões:** ${config.estilo}\n\n⚡ **Dificuldade:** ${config.dificuldade}\n\nPode me perguntar sobre qualquer conteúdo, estratégia de estudo ou resolução de exercícios. Quando relevante, vou sugerir questões do banco para você praticar!`
      : "Vestibular não encontrado.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [msgHoje, setMsgHoje] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Carrega contagem de msgs do dia ao entrar
  useEffect(() => {
    if (user?.id && vestParam) {
      contarMensagensHoje(user.id, vestParam.toUpperCase()).then(setMsgHoje);
    }
  }, [user?.id, vestParam]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const enviar = useCallback(async (pergunta?: string) => {
    const texto = (pergunta ?? input).trim();
    if (!texto || loading || !config) return;

    // Verificar plano
    if (limiteHoje === 0) {
      setShowUpgrade(true);
      return;
    }
    if (msgHoje >= limiteHoje) {
      setShowUpgrade(true);
      return;
    }

    setInput("");
    setLoading(true);

    setMensagens(prev => [
      ...prev,
      { role: "user", content: texto },
      { role: "assistant", content: "", loading: true, loadingText: "🔍 Buscando no banco e na web..." },
    ]);

    try {
      const materiaAtual = materias.find(m => m.id === materiaSelecionada);
      const areaFiltro = materiaAtual?.area ?? "";
      const [{ questoes, resumo }, contextoWeb] = await Promise.all([
        buscarQuestoesComContexto(texto, vestParam?.toUpperCase() ?? "", areaFiltro),
        buscarContextoWeb(texto, vestParam?.toUpperCase() ?? ""),
      ]);
      const resposta = await consultarClaude(texto, mensagens, config.systemPrompt, resumo, contextoWeb);

      // Registrar uso
      if (user?.id) {
        await registrarMensagem(user.id, vestParam?.toUpperCase() ?? "");
        setMsgHoje(prev => prev + 1);
      }

      setMensagens(prev => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: resposta,
          questoesRelacionadas: questoes,
        },
      ]);
    } catch (e: any) {
      setMensagens(prev => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: `❌ Erro: ${e.message ?? "Tente novamente."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, config, mensagens, vestParam, limiteHoje, msgHoje, user?.id]);

  if (!config) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <p style={{ fontSize: 48 }}>🤷</p>
        <p>Vestibular não encontrado.</p>
        <button onClick={() => navigate("/agentes")} style={{ marginTop: 16, padding: "10px 24px", background: CORES.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Ver vestibulares
        </button>
      </div>
    );
  }

  const diffLabel = (d: string) => d === "facil" ? "🟢" : d === "medio" ? "🟡" : "🔴";

  // Progresso do limite diário
  const progressoPct = limiteHoje === Infinity ? 100 : Math.min((msgHoje / limiteHoje) * 100, 100);
  const restantes = limiteHoje === Infinity ? null : Math.max(limiteHoje - msgHoje, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: CORES.bg }}>
      {/* Modal de upgrade */}
      {showUpgrade && (
        <ModalUpgrade
          plano={planoAtual}
          limite={limiteHoje}
          onClose={() => setShowUpgrade(false)}
          navigate={navigate}
        />
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${config.cor}, ${config.cor}dd)`, padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate("/agentes")} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            {config.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>Prof. {config.nome}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{config.desc}</p>
          </div>
          {/* Contador de msgs */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {limiteHoje === Infinity ? (
              <span style={{ fontSize: 10, background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 6, padding: "3px 8px", fontWeight: 700 }}>
                🥇 Ilimitado
              </span>
            ) : (
              <div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", margin: "0 0 3px", fontWeight: 600 }}>
                  {restantes} restantes
                </p>
                <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
                  <div style={{ width: `${progressoPct}%`, height: "100%", background: progressoPct > 80 ? "#ff6b6b" : "#fff", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Cards de matérias */}
      {materias.length > 0 && (
        <div style={{ background: `linear-gradient(135deg, ${config.cor}15, ${config.cor}05)`, borderBottom: `2px solid ${config.cor}30`, padding: "12px 14px", flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: config.cor, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
            📚 Escolha a matéria
          </p>
          {["quimica","fisica","matematica","portugues","ingles"].includes(materiaSelecionada) && (
            <button
              onClick={() => navigate(`/trilha/${vestParam?.toUpperCase()}/${materiaSelecionada}`)}
              style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: config.cor, border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}
            >
              📋 Ver trilha de {materias.find(m => m.id === materiaSelecionada)?.label}
            </button>
          )}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
            {materias.map(m => {
              const ativo = materiaSelecionada === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMateriaSelecionada(m.id);
                    setMensagens([{
                      role: "assistant",
                      content: m.id === "todas"
                        ? `Olá! 👋 Sou o **Prof. ${config.nome}**. Pode perguntar sobre qualquer conteúdo!`
                        : `${m.emoji} Modo **${m.label}** ativado!\n\nAgora foco em questões de ${m.label} do ${config.nome}. Pode perguntar!`,
                    }]);
                  }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    padding: "8px 10px", borderRadius: 12,
                    border: ativo ? `2px solid ${config.cor}` : `1.5px solid ${config.cor}25`,
                    background: ativo ? config.cor : "#fff",
                    color: ativo ? "#fff" : config.cor,
                    fontSize: 10, fontWeight: 700,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    transition: "all 0.2s",
                    boxShadow: ativo ? `0 3px 10px ${config.cor}40` : "0 1px 4px rgba(0,0,0,0.06)",
                    minWidth: 52,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        {mensagens.map((msg, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
            <div style={{
              maxWidth: "88%", padding: "10px 14px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? config.cor : CORES.bgCard,
              color: msg.role === "user" ? "#fff" : CORES.text,
              fontSize: 13, lineHeight: 1.65,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}>
              {msg.loading ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: config.cor, animation: `bounce 1.2s ${i*0.2}s ease-in-out infinite` }} />
                  ))}
                  <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
                </div>
              ) : (
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
              )}
            </div>

            {/* Questões relacionadas */}
            {msg.questoesRelacionadas && msg.questoesRelacionadas.length > 0 && (
              <div style={{ maxWidth: "88%", display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 10, color: "#888", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  📝 Questões relacionadas do banco
                </p>
                {msg.questoesRelacionadas.map(q => (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/quiz/vestibular/${q.vestibular}`)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "8px 10px", borderRadius: 10,
                      background: config.bg, border: `1px solid ${config.cor}33`,
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 10, background: config.cor, color: "#fff", borderRadius: 4, padding: "2px 6px", flexShrink: 0, fontWeight: 700, marginTop: 1 }}>
                      {q.vestibular} {q.ano}
                    </span>
                    <span style={{ fontSize: 11, color: config.cor, flex: 1, lineHeight: 1.4 }}>
                      {q.question.slice(0, 80)}...
                    </span>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{diffLabel(q.difficulty)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Sugestões iniciais */}
        {mensagens.length === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            <p style={{ fontSize: 11, color: CORES.textSub, textAlign: "center", margin: "0 0 4px" }}>Perguntas frequentes sobre o {config.nome}</p>
            {sugestoes.map((s, i) => (
              <button key={i} onClick={() => enviar(s)} style={{
                padding: "9px 14px", borderRadius: 10, border: `1px solid ${config.cor}33`,
                background: config.bg, cursor: "pointer", textAlign: "left",
                fontSize: 12, color: config.cor, lineHeight: 1.4,
              }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: CORES.bgCard, borderTop: `0.5px solid ${CORES.border}`, padding: "10px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder={limiteHoje === 0 ? "Disponível apenas em planos pagos" : `Pergunte sobre o ${config.nome}...`}
            disabled={limiteHoje === 0}
            rows={1}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: `1px solid ${config.cor}33`, fontSize: 13, outline: "none", resize: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", fontFamily: "inherit", background: limiteHoje === 0 ? "#f3f4f6" : config.bg, color: limiteHoje === 0 ? "#aaa" : "inherit" }}
          />
          <button
            onClick={() => limiteHoje === 0 ? setShowUpgrade(true) : enviar()}
            disabled={loading || (!input.trim() && limiteHoje !== 0)}
            style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: loading || (!input.trim() && limiteHoje !== 0) ? "#e5e7eb" : config.cor, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${config.cor}40` }}
          >
            {limiteHoje === 0
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              : <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 10l14-7-7 14V10H3z"/></svg>
            }
          </button>
        </div>
        <p style={{ fontSize: 10, color: CORES.textSub, margin: "6px 0 0", textAlign: "center" }}>
          Prof. {config.nome} · Powered by Claude AI
          {limiteHoje !== Infinity && limiteHoje > 0 && (
            <span style={{ color: msgHoje >= limiteHoje * 0.8 ? "#ef4444" : CORES.textSub }}>
              {" "}· {restantes} msgs restantes hoje
            </span>
          )}
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
