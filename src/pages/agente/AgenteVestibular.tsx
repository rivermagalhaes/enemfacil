// src/pages/agente/AgenteVestibular.tsx
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

interface Msg { role: "user" | "assistant"; content: string; }

interface Questao {
  enunciado: string;
  gabarito: string;
  explicacao: string;
  dificuldade: string;
  ano_vestibular: number | null;
}

interface Conteudo {
  titulo: string;
  conteudo: string;
  materia: string;
}

const VESTIBULARES: Record<string, { nome: string; emoji: string; cor: string; bg: string; system: string }> = {
  ITA: {
    nome: "ITA", emoji: "✈️", cor: "#003D80", bg: "#E6F0FF",
    system: `Você é o Professor ITA, especialista no vestibular do Instituto Tecnológico de Aeronáutica.

PERFIL DO VESTIBULAR:
- Considerado o mais difícil do Brasil em exatas
- Foco em Matemática, Física, Química e Inglês
- Questões abertas e dissertativas que exigem raciocínio profundo
- Média histórica de aprovação: ~1% dos candidatos

SUAS REGRAS:
1. Sempre resolva problemas passo a passo, mostrando cada etapa do raciocínio
2. Quando relevante, mencione o ano da questão (ex: "Isso caiu no ITA 2019")
3. Priorize raciocínio lógico e dedução sobre memorização
4. Use notação matemática clara (ex: x², √, ∫, Σ)
5. Quando o aluno errar, primeiro identifique onde errou antes de dar a resposta
6. Sugira questões similares quando o aluno dominar um conceito
7. Seja rigoroso mas encorajador — o ITA é difícil para todos

ESTRATÉGIAS QUE FUNCIONAM NO ITA:
- Domínio de álgebra e geometria analítica avançada
- Física com demonstrações a partir dos princípios
- Química orgânica e estequiometria aprofundadas
- Inglês científico e de leitura`,
  },
  IME: {
    nome: "IME", emoji: "⚙️", cor: "#1a3a6e", bg: "#E6EEFF",
    system: `Você é o Professor IME, especialista no vestibular do Instituto Militar de Engenharia.

PERFIL DO VESTIBULAR:
- Segunda prova mais difícil do Brasil em exatas
- Foco em Matemática, Física, Química e Desenho Geométrico
- Questões com alto grau de formalismo matemático
- Exige precisão e velocidade de cálculo

SUAS REGRAS:
1. Resolva problemas com rigor técnico e formal
2. Enfatize Geometria Descritiva e Desenho quando relevante
3. Mostre múltiplos métodos de resolução quando possível
4. Destaque armadilhas comuns nas provas do IME
5. Incentive o aluno a desenvolver velocidade de cálculo

ESTRATÉGIAS PARA O IME:
- Álgebra linear e matrizes
- Geometria espacial e descritiva
- Física com vetores e cálculo diferencial
- Química analítica e cálculos estequiométricos precisos`,
  },
  FUVEST: {
    nome: "FUVEST", emoji: "🎓", cor: "#8B0000", bg: "#FFE6E6",
    system: `Você é o Professor FUVEST, especialista no vestibular da Universidade de São Paulo (USP).

PERFIL DO VESTIBULAR:
- Vestibular mais concorrido para medicina e direito do Brasil
- Abrange todas as áreas do conhecimento
- Forte ênfase em interpretação de texto, interdisciplinaridade e redação
- Primeira fase eliminatória + segunda fase dissertativa

SUAS REGRAS:
1. Integre conhecimentos de diferentes áreas nas explicações
2. Dê atenção especial à interpretação e argumentação
3. Para redação: oriente sobre estrutura dissertativa, tese clara e repertório cultural
4. Contextualize questões com atualidades e história do Brasil
5. Na segunda fase, ensine a estruturar respostas dissertativas com clareza

ESTRATÉGIAS PARA A FUVEST:
- Leitura crítica e interpretação profunda
- Redação com tese, argumentação e proposta
- História e Geografia do Brasil aprofundadas
- Biologia e Química para saúde (medicina)
- Literatura brasileira e portuguesa`,
  },
  UNICAMP: {
    nome: "UNICAMP", emoji: "🔬", cor: "#005C97", bg: "#E6F4FF",
    system: `Você é o Professor UNICAMP, especialista no vestibular da Universidade Estadual de Campinas.

PERFIL DO VESTIBULAR:
- Estilo único: questões interdisciplinares e contextualizadas
- Exige raciocínio além da memorização
- Forte presença de temas contemporâneos e científicos
- Redação com proposta de intervenção

SUAS REGRAS:
1. Sempre contextualize o conteúdo com situações do mundo real
2. Estimule o raciocínio crítico e a síntese entre áreas
3. Use textos de apoio e situações-problema nas explicações
4. Para redação UNICAMP: trabalhe proposta de intervenção criativa
5. Explore atualidades, ciência e tecnologia nas respostas

ESTRATÉGIAS PARA A UNICAMP:
- Leitura de textos científicos e jornalísticos
- Interdisciplinaridade entre ciências e humanas
- Raciocínio lógico aplicado a contextos reais
- Redação argumentativa com soluções concretas`,
  },
  UNB: {
    nome: "UnB", emoji: "🏛️", cor: "#006400", bg: "#E6FFE6",
    system: `Você é o Professor UnB/PAS, especialista no vestibular da Universidade de Brasília e no Programa de Avaliação Seriada.

PERFIL DO VESTIBULAR:
- PAS: avaliação em 3 etapas ao longo do ensino médio
- Temas transversais e interdisciplinares
- Forte presença de atualidades, política e cultura
- Obras literárias e artísticas específicas por etapa

SUAS REGRAS:
1. Conheça as obras e temas de cada etapa do PAS
2. Conecte conteúdos com política brasileira e internacional
3. Enfatize análise de textos, imagens e obras de arte
4. Para o ENEM/UnB: foque em atualidades e cidadania
5. Estimule pensamento crítico sobre sociedade e política

ESTRATÉGIAS PARA A UnB/PAS:
- Obras literárias obrigatórias por etapa
- Atualidades e política brasileira
- Arte, cultura e história do Brasil Central
- Redação argumentativa com visão crítica`,
  },
};

const LIMITE_PLANO: Record<string, number> = {
  free: 0, gratis: 0, estudante: 10, pro: 30, premium: 999, ouro: 999,
};

export default function AgenteVestibular() {
  const { vestibular = "ITA" } = useParams<{ vestibular: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const vestUpper = vestibular.toUpperCase();
  const v = VESTIBULARES[vestUpper] ?? VESTIBULARES.ITA;
  const plano = profile?.plano ?? "free";
  const limite = LIMITE_PLANO[plano] ?? 0;

  const [msgs, setMsgs] = useState<Msg[]>([{
    role: "assistant",
    content: `Olá! Sou o **Professor ${v.nome}** ${v.emoji}\n\nSou especialista neste vestibular e estou carregando questões reais e conteúdo do banco de dados para te ajudar melhor...\n\nAguarde um instante! ⚡`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [inicializando, setInicializando] = useState(true);
  const [msgCount, setMsgCount] = useState(0);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [systemPrompt, setSystemPrompt] = useState(v.system);
  const conteudosRef = useRef<Conteudo[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // Inicializa: carrega questões, conteúdos e conta mensagens do dia
  useEffect(() => {
    if (user?.id) inicializar();
  }, [user?.id, vestUpper]);

  async function inicializar() {
    setInicializando(true);
    try {
      // 1. Conta mensagens usadas hoje
      const hoje = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("agente_vestibular_mensagens")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("vestibular", vestUpper)
        .gte("criado_em", `${hoje}T00:00:00`);
      setMsgCount(count ?? 0);

      // 2. Busca questões reais do banco
      const { data: questoesData } = await supabase
        .from("questoes")
        .select("enunciado, gabarito, explicacao, dificuldade, ano_vestibular")
        .eq("vestibular", vestUpper)
        .eq("ativo", true)
        .order("ano_vestibular", { ascending: false })
        .limit(8);
      const qs = (questoesData ?? []) as Questao[];
      setQuestoes(qs);

      // 3. Busca conteúdos da trilha
      const materiasPorVest: Record<string, string[]> = {
        ITA: ["matematica", "fisica", "quimica", "ingles"],
        IME: ["matematica", "fisica", "quimica"],
        FUVEST: ["portugues", "matematica", "fisica", "quimica"],
        UNICAMP: ["portugues", "matematica", "fisica"],
        UNB: ["portugues", "matematica"],
      };
      const materias = materiasPorVest[vestUpper] ?? ["matematica"];
      const { data: conteudosData } = await supabase
        .from("trilha_conteudos")
        .select("titulo, conteudo, materia")
        .in("materia", materias)
        .limit(6);
      const cs = (conteudosData ?? []) as Conteudo[];
      conteudosRef.current = cs;

      // 4. Monta system prompt enriquecido
      const questoesCtx = qs.length > 0
        ? `\n\nQUESTÕES REAIS DISPONÍVEIS NO BANCO (use quando relevante):\n${qs.map((q, i) =>
            `[Q${i + 1}${q.ano_vestibular ? ` - ${vestUpper} ${q.ano_vestibular}` : ""}] ${q.enunciado.slice(0, 200)}... | Gabarito: ${q.gabarito}`
          ).join("\n")}`
        : "";

      const conteudosCtx = conteudosRef.current.length > 0
        ? `\n\nCONTEÚDO DE ESTUDO DISPONÍVEL:\n${conteudosRef.current.map(c =>
            `[${c.materia.toUpperCase()}] ${c.titulo}: ${c.conteudo.slice(0, 150)}...`
          ).join("\n")}`
        : "";

      const prompt = `${v.system}${questoesCtx}${conteudosCtx}

INSTRUÇÕES FINAIS:
- Quando citar uma questão do banco, mencione como "[Q1]" ou "[ITA 2022]"
- Se o aluno pedir uma questão, use as do banco acima preferencialmente
- Adapte a dificuldade ao plano do aluno: ${plano}
- Seja objetivo, didático e encorajador`;

      setSystemPrompt(prompt);

      // 5. Atualiza mensagem de boas-vindas
      const temQuestoes = qs.length > 0;
      setMsgs([{
        role: "assistant",
        content: `Olá! Sou o **Professor ${v.nome}** ${v.emoji}\n\n✅ Carregado com ${qs.length} questões reais${temQuestoes ? ` (até ${Math.max(...qs.map(q => q.ano_vestibular ?? 0))})` : ""} e ${conteudosRef.current.length} módulos de conteúdo.\n\nPosso te ajudar com:\n• Questões e exercícios específicos do ${v.nome}\n• Estratégias de resolução passo a passo\n• Dúvidas sobre qualquer conteúdo\n• Dicas e macetes para a prova\n\nO que você quer estudar hoje?`,
      }]);
    } catch (e) {
      console.error("Erro ao inicializar agente:", e);
      setMsgs([{
        role: "assistant",
        content: `Olá! Sou o **Professor ${v.nome}** ${v.emoji}\n\nEstou pronto para te ajudar! O que você quer estudar?`,
      }]);
    }
    setInicializando(false);
  }

  const semAcesso = limite === 0;
  const atingiuLimite = msgCount >= limite && !semAcesso;

  async function enviar() {
    if (!input.trim() || loading || semAcesso || atingiuLimite || inicializando) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Registra mensagem no banco
    await supabase.from("agente_vestibular_mensagens").insert({
      user_id: user!.id,
      vestibular: vestUpper,
      criado_em: new Date().toISOString(),
    });
    setMsgCount(c => c + 1);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...msgs, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "Desculpe, erro ao processar.";
      setMsgs(prev => [...prev, { role: "assistant", content: text }]);
    } catch {
      setMsgs(prev => [...prev, { role: "assistant", content: "Erro de conexão. Tente novamente." }]);
    }
    setLoading(false);
  }

  function renderMsg(content: string) {
    return content.split('\n').map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} style={{ margin: "0 0 4px", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: bold }} />;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: CORES.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${v.cor}, ${v.cor}cc)`, padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{v.emoji}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>Prof. {v.nome}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              {semAcesso
                ? "🔒 Plano pago necessário"
                : inicializando
                ? "⚡ Carregando banco de questões..."
                : `${questoes.length} questões · ${msgCount}/${limite} msgs hoje`}
            </p>
          </div>
          <button onClick={() => navigate("/agentes")} style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>Outros</button>
        </div>
      </div>

      {/* Bloqueio para free */}
      {semAcesso && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 48, margin: "0 0 16px" }}>🔒</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: CORES.text, margin: "0 0 8px" }}>Recurso Premium</p>
          <p style={{ fontSize: 14, color: CORES.textSub, margin: "0 0 24px", lineHeight: 1.6 }}>
            O Professor {v.nome} está disponível nos planos <strong>Estudante</strong>, <strong>Pro</strong> e <strong>Ouro</strong>.
          </p>
          <button onClick={() => navigate("/assinatura")} style={{ padding: "12px 28px", background: v.cor, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Ver planos →
          </button>
        </div>
      )}

      {/* Chat */}
      {!semAcesso && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                {m.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: v.bg, border: `1px solid ${v.cor}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2 }}>{v.emoji}</div>
                )}
                <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? v.cor : CORES.bgCard, border: m.role === "assistant" ? `1px solid ${CORES.border}` : "none", fontSize: 13, color: m.role === "user" ? "#fff" : CORES.text }}>
                  {renderMsg(m.content)}
                </div>
              </div>
            ))}
            {(loading || inicializando) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: v.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{v.emoji}</div>
                <div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: CORES.bgCard, border: `1px solid ${CORES.border}` }}>
                  <span style={{ fontSize: 18 }}>•••</span>
                </div>
              </div>
            )}
            {atingiuLimite && (
              <div style={{ textAlign: "center", padding: "16px", background: "#fef3c7", borderRadius: 12, margin: "8px 0", border: "1px solid #fcd34d" }}>
                <p style={{ fontSize: 13, color: "#92400e", margin: "0 0 8px" }}>Limite diário atingido ({limite} msgs)</p>
                <button onClick={() => navigate("/assinatura")} style={{ fontSize: 12, fontWeight: 700, color: "#d97706", background: "none", border: "none", cursor: "pointer" }}>Fazer upgrade →</button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "8px 14px 12px", flexShrink: 0, borderTop: `1px solid ${CORES.border}`, background: CORES.bgCard }}>
            {/* Sugestões rápidas */}
            {msgs.length <= 1 && !inicializando && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", paddingBottom: 2 }}>
                {[
                  `Me dê uma questão difícil de ${v.nome}`,
                  "Explique passo a passo",
                  "Quais são as principais dicas?",
                  `Como me preparar para o ${v.nome}?`,
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)} style={{ whiteSpace: "nowrap", fontSize: 11, padding: "5px 10px", borderRadius: 8, border: `1px solid ${v.cor}44`, background: v.bg, color: v.cor, cursor: "pointer", fontWeight: 500 }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                placeholder={inicializando ? "Carregando..." : `Pergunte ao Prof. ${v.nome}...`}
                disabled={atingiuLimite || inicializando}
                rows={1}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${CORES.border}`, fontSize: 14, resize: "none", outline: "none", fontFamily: "inherit", background: CORES.bg, color: CORES.text, maxHeight: 120, overflowY: "auto" }}
              />
              <button
                onClick={enviar}
                disabled={!input.trim() || loading || atingiuLimite || inicializando}
                style={{ width: 42, height: 42, borderRadius: 12, background: (!input.trim() || loading || atingiuLimite || inicializando) ? "#e5e7eb" : v.cor, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={(!input.trim() || loading || atingiuLimite || inicializando) ? "#9ca3af" : "#fff"} strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
              </button>
            </div>
          </div>
        </>
      )}
      <BottomNav />
    </div>
  );
}
