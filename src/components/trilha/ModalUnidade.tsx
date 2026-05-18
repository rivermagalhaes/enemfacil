// src/components/trilha/ModalUnidade.tsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CORES } from "@/styles/theme";

interface Unidade {
  id: string; titulo: string; emoji: string; cor: string; bg: string;
  topic: string | null; topicos: string[]; xp: number;
  area_enem?: string; competencia?: string; habilidade?: string;
}

interface Questao {
  id: string; question: string; explanation: string;
  answer_index: number; difficulty: string; ano: number;
}

interface Conteudo {
  titulo: string; conteudo: string; exemplos: string | null; formulas: string | null;
}

// Tipos do Mini Simulado
interface QuestaoSimulado {
  id: string; enunciado: string; texto_base?: string;
  explicacao: string; assunto_tag: string; dificuldade: string; area_enem: string;
  alternativas: { id: string; letra: string; texto: string }[];
}

interface SimuladoData {
  simulado: { id: string; titulo: string };
  questoes: QuestaoSimulado[];
}

type Etapa = "topicos" | "conteudo" | "questoes" | "resultado" | "simulado" | "simulado_resultado";

const AREAS_ENEM: Record<string, { label: string; emoji: string; cor: string }> = {
  linguagens:        { label: "Linguagens",            emoji: "📝", cor: "#8b5cf6" },
  matematica:        { label: "Matemática",             emoji: "📐", cor: "#3b82f6" },
  ciencias_natureza: { label: "Ciências da Natureza",  emoji: "🔬", cor: "#10b981" },
  ciencias_humanas:  { label: "Ciências Humanas",      emoji: "🌍", cor: "#f59e0b" },
  redacao:           { label: "Redação",                emoji: "✍️", cor: "#ec4899" },
};

const NIVEL_CONFIG = {
  dominio:  { label: "Domínio Total",    cor: "#22c55e", emoji: "🏆" },
  bom:      { label: "Bom Domínio",     cor: "#84cc16", emoji: "🎯" },
  regular:  { label: "Em Evolução",     cor: "#f59e0b", emoji: "📈" },
  revisar:  { label: "Precisa Revisar", cor: "#ef4444", emoji: "📚" },
};

function formatTempo(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function ModalUnidade({
  unidade, vestibular, materia, onClose, onConcluir,
}: {
  unidade: Unidade; vestibular: string; materia: string;
  onClose: () => void; onConcluir: () => void;
}) {
  // ── Estado original ──────────────────────────────────────────────────────
  const [etapa, setEtapa] = useState<Etapa>("topicos");
  const [conteudo, setConteudo] = useState<Conteudo | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [opcoes, setOpcoes] = useState<Record<string, string[]>>({});
  const [idx, setIdx] = useState(0);
  const [resposta, setResposta] = useState<number | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Estado Mini Simulado ──────────────────────────────────────────────────
  const [simuladoData, setSimuladoData] = useState<SimuladoData | null>(null);
  const [simuladoLoading, setSimuladoLoading] = useState(false);
  const [simIdx, setSimIdx] = useState(0);
  const [simResposta, setSimResposta] = useState<string | null>(null);
  const [simRespostaCorreta, setSimRespostaCorreta] = useState<boolean | null>(null);
  const [simMostrarFeedback, setSimMostrarFeedback] = useState(false);
  const [simAcertos, setSimAcertos] = useState(0);
  const [simRespostas, setSimRespostas] = useState<{ questao_id: string; assunto_tag: string; correta: boolean }[]>([]);
  const [tentativaId, setTentativaId] = useState<string | null>(null);
  const [tempoTotal, setTempoTotal] = useState(0);
  const [xpSimulado, setXpSimulado] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inicioQuestaoRef = useRef(Date.now());

  useEffect(() => {
    carregarConteudo();
    if (unidade.topic) carregarQuestoes();
  }, []);

  // Timer do simulado
  useEffect(() => {
    if (etapa === "simulado") {
      timerRef.current = setInterval(() => setTempoTotal(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [etapa]);

  async function carregarConteudo() {
    const { data } = await supabase
      .from("trilha_conteudos")
      .select("titulo, conteudo, exemplos, formulas")
      .eq("materia", materia)
      .eq("unidade_id", unidade.id)
      .single();
    if (data) setConteudo(data);
  }

  async function carregarQuestoes() {
    setLoading(true);
    const { data: qs } = await supabase
      .from("questions")
      .select("id, question, explanation, answer_index, difficulty, ano")
      .eq("vestibular", vestibular)
      .eq("topic", unidade.topic)
      .limit(5);
    if (!qs?.length) { setLoading(false); return; }
    const { data: ops } = await supabase
      .from("question_options").select("question_id, option_index, label")
      .in("question_id", qs.map(q => q.id));
    const opMap: Record<string, string[]> = {};
    ops?.forEach((op: any) => {
      if (!opMap[op.question_id]) opMap[op.question_id] = [];
      opMap[op.question_id][op.option_index] = op.label;
    });
    setQuestoes(qs); setOpcoes(opMap); setLoading(false);
  }

  function responder(i: number) {
    if (resposta !== null) return;
    setResposta(i);
    if (i === questoes[idx].answer_index) setAcertos(a => a + 1);
  }

  function proxima() {
    if (idx + 1 >= questoes.length) { onConcluir(); setEtapa("resultado"); }
    else { setIdx(i => i + 1); setResposta(null); }
  }

  // ── Mini Simulado: carrega do banco ou gera via IA ───────────────────────
  async function iniciarSimulado() {
    setSimuladoLoading(true);
    setSimIdx(0); setSimAcertos(0); setSimRespostas([]);
    setSimResposta(null); setSimRespostaCorreta(null);
    setSimMostrarFeedback(false); setTempoTotal(0);

    try {
      // Busca simulado vinculado à unidade (trilha_id = unidade.id)
      const { data, error } = await supabase.rpc("get_simulado_completo", {
        p_trilha_id: unidade.id,
      });

      if (error) throw error;

      // Se não há questões suficientes → gera via IA
      if (!data || (data.questoes ?? []).length < 5) {
        await supabase.functions.invoke("gerar-questoes-enem", {
          body: {
            trilha_id:   unidade.id,
            area_enem:   unidade.area_enem ?? "ciencias_natureza",
            assunto:     unidade.titulo,
            competencia: unidade.competencia,
            habilidade:  unidade.habilidade,
          },
        });
        const { data: data2 } = await supabase.rpc("get_simulado_completo", {
          p_trilha_id: unidade.id,
        });
        setSimuladoData(data2);
      } else {
        setSimuladoData(data);
      }

      // Inicia tentativa
      if (data?.simulado?.id) {
        const { data: tentId } = await supabase.rpc("iniciar_tentativa_simulado", {
          p_simulado_id: data.simulado.id,
        });
        setTentativaId(tentId);
      }

      setEtapa("simulado");
    } catch (e) {
      console.error("Erro ao carregar simulado:", e);
      // Falhou → vai direto fechar
      onClose();
    } finally {
      setSimuladoLoading(false);
    }
  }

  async function responderSimulado(alternativaId: string) {
    if (simMostrarFeedback || !simuladoData || !tentativaId) return;

    const questao = simuladoData.questoes[simIdx];
    const tempoMs = Date.now() - inicioQuestaoRef.current;

    // Verifica resposta correta no banco
    const { data: alt } = await supabase
      .from("alternativas_simulado")
      .select("correta")
      .eq("id", alternativaId)
      .single();

    const correta = alt?.correta ?? false;

    // Persiste resposta
    await supabase.from("respostas_simulado").insert({
      tentativa_id:   tentativaId,
      questao_id:     questao.id,
      alternativa_id: alternativaId,
      correta,
      tempo_ms:       tempoMs,
    });

    setSimResposta(alternativaId);
    setSimRespostaCorreta(correta);
    if (correta) setSimAcertos(a => a + 1);
    setSimRespostas(prev => [...prev, { questao_id: questao.id, assunto_tag: questao.assunto_tag, correta }]);
    setSimMostrarFeedback(true);
  }

  async function proximaSimulado() {
    if (!simuladoData) return;

    if (simIdx + 1 >= simuladoData.questoes.length) {
      // Finaliza tentativa
      const { data: res } = await supabase.rpc("finalizar_tentativa_simulado", {
        p_tentativa_id:   tentativaId,
        p_tempo_segundos: tempoTotal,
      });
      if (res) setXpSimulado(res.xp_ganho ?? 0);
      setEtapa("simulado_resultado");
    } else {
      inicioQuestaoRef.current = Date.now();
      setSimIdx(i => i + 1);
      setSimResposta(null);
      setSimRespostaCorreta(null);
      setSimMostrarFeedback(false);
    }
  }

  const q = questoes[idx];
  const letras = ["A", "B", "C", "D", "E"];

  const ETAPAS: { id: Etapa; label: string; emoji: string }[] = [
    { id: "topicos",   label: "Tópicos",   emoji: "📋" },
    { id: "conteudo",  label: "Conteúdo",  emoji: "📖" },
    { id: "questoes",  label: "Questões",  emoji: "🧠" },
    { id: "resultado", label: "Resultado", emoji: "🏆" },
  ];
  const etapaIdx = ETAPAS.findIndex(e => e.id === etapa);
  const area = unidade.area_enem ? AREAS_ENEM[unidade.area_enem] : null;

  // Resultado simulado
  const simPct = simuladoData ? Math.round((simAcertos / simuladoData.questoes.length) * 100) : 0;
  const simNivel = simPct === 100 ? "dominio" : simPct >= 80 ? "bom" : simPct >= 60 ? "regular" : "revisar";
  const simNivelCfg = NIVEL_CONFIG[simNivel];
  const simErros = [...new Set(simRespostas.filter(r => !r.correta).map(r => r.assunto_tag).filter(Boolean))];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "92dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Header — oculto nas etapas do simulado */}
        {etapa !== "simulado" && etapa !== "simulado_resultado" && (
          <div style={{ background: unidade.cor, padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {unidade.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{unidade.titulo}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>⚡ {unidade.xp} XP ao concluir</p>
              </div>
              <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 18, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {ETAPAS.map((e, i) => (
                <div key={e.id} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= etapaIdx ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)", transition: "background 0.3s" }} />
              ))}
            </div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", margin: "4px 0 0", textAlign: "center" }}>
              {ETAPAS[etapaIdx]?.emoji} {ETAPAS[etapaIdx]?.label}
            </p>
          </div>
        )}

        {/* Header do Simulado */}
        {(etapa === "simulado" || etapa === "simulado_resultado") && simuladoData && (
          <div style={{ background: area?.cor ?? unidade.cor, padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: etapa === "simulado" ? 10 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                🎯
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Mini Simulado</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", margin: 0 }}>{unidade.titulo}</p>
              </div>
              <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 18, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {etapa === "simulado" && (
              <>
                <div style={{ height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(simIdx / simuladoData.questoes.length) * 100}%`, background: "rgba(255,255,255,0.9)", borderRadius: 99, transition: "width 0.4s ease" }} />
                </div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", margin: "4px 0 0", textAlign: "center" }}>
                  Questão {simIdx + 1} de {simuladoData.questoes.length}
                </p>
              </>
            )}
          </div>
        )}

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

          {/* ── ETAPA TÓPICOS ── */}
          {etapa === "topicos" && (
            <div>
              <div style={{ background: unidade.bg, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${unidade.cor}22` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: unidade.cor, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>📋 O que você vai aprender</p>
                {unidade.topicos.map((t, i) => (
                  <p key={i} style={{ fontSize: 13, color: CORES.text, margin: "0 0 6px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: unidade.cor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    {t}
                  </p>
                ))}
              </div>
              {conteudo ? (
                <button onClick={() => setEtapa("conteudo")} style={{ width: "100%", padding: "13px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Estudar conteúdo →
                </button>
              ) : (
                <button onClick={() => unidade.topic ? setEtapa("questoes") : (onConcluir(), onClose())}
                  style={{ width: "100%", padding: "13px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {unidade.topic ? "Ir para as questões →" : "Marcar como concluída ✓"}
                </button>
              )}
            </div>
          )}

          {/* ── ETAPA CONTEÚDO ── */}
          {etapa === "conteudo" && conteudo && (
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: CORES.text, margin: "0 0 12px" }}>{conteudo.titulo}</p>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${CORES.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: unidade.cor, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>📖 Teoria</p>
                <p style={{ fontSize: 13, color: CORES.text, lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{conteudo.conteudo}</p>
              </div>
              {conteudo.formulas && (
                <div style={{ background: "#fef9ec", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #fcd34d" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>📐 Fórmulas</p>
                  <p style={{ fontSize: 13, color: "#78350f", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{conteudo.formulas}</p>
                </div>
              )}
              {conteudo.exemplos && (
                <div style={{ background: "#EDFAF3", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #86efac" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>✏️ Exemplos resolvidos</p>
                  <p style={{ fontSize: 13, color: "#166534", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{conteudo.exemplos}</p>
                </div>
              )}
              <button onClick={() => unidade.topic ? setEtapa("questoes") : (onConcluir(), onClose())}
                style={{ width: "100%", padding: "13px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {unidade.topic ? "Praticar com questões →" : "Marcar como concluída ✓"}
              </button>
            </div>
          )}

          {/* ── ETAPA QUESTÕES ── */}
          {etapa === "questoes" && (
            <div>
              {loading && <p style={{ textAlign: "center", color: CORES.textSub, padding: 24 }}>Carregando questões...</p>}
              {!loading && questoes.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <p style={{ fontSize: 36, margin: "0 0 12px" }}>📚</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: CORES.text, margin: "0 0 6px" }}>Questões em breve!</p>
                  <p style={{ fontSize: 13, color: CORES.textSub, marginBottom: 20 }}>Ainda não há questões para este tópico.</p>
                  <button onClick={() => { onConcluir(); onClose(); }} style={{ padding: "12px 28px", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    Marcar como concluída ✓
                  </button>
                </div>
              )}
              {!loading && q && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, background: unidade.bg, color: unidade.cor, borderRadius: 99, padding: "3px 10px" }}>
                      Questão {idx + 1}/{questoes.length}
                    </span>
                    {q.ano && <span style={{ fontSize: 11, color: CORES.textSub }}>{vestibular} {q.ano}</span>}
                  </div>
                  <div style={{ background: CORES.bgCard, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${unidade.cor}15` }}>
                    <p style={{ fontSize: 14, color: CORES.text, lineHeight: 1.7, margin: 0, fontFamily: "Georgia, serif" }}>{q.question}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    {(opcoes[q.id] ?? []).map((op, i) => {
                      const selecionada = resposta === i;
                      const correta = q.answer_index === i;
                      const mostrar = resposta !== null && (selecionada || correta);
                      let bg = CORES.bgCard, border = `1px solid ${CORES.border}`, cor = CORES.text;
                      if (mostrar) {
                        if (correta) { bg = "#EDFAF3"; border = "1.5px solid #22c55e"; cor = "#22c55e"; }
                        else if (selecionada) { bg = "#FFF1F1"; border = "1.5px solid #ef4444"; cor = "#ef4444"; }
                      }
                      return (
                        <button key={i} onClick={() => responder(i)} disabled={resposta !== null}
                          style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 13px", borderRadius: 10, border, background: bg, cursor: resposta !== null ? "default" : "pointer", textAlign: "left" }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", background: selecionada || (resposta !== null && correta) ? unidade.cor : "#e5e7eb", color: selecionada || (resposta !== null && correta) ? "#fff" : "#666", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{letras[i]}</span>
                          <span style={{ fontSize: 13, color: cor, lineHeight: 1.5 }}>{op}</span>
                        </button>
                      );
                    })}
                  </div>
                  {resposta !== null && (
                    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: 12, marginTop: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#0284c7", margin: "0 0 4px" }}>💡 Explicação</p>
                      <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.6 }}>{q.explanation}</p>
                    </div>
                  )}
                  {resposta !== null && (
                    <button onClick={proxima} style={{ width: "100%", marginTop: 14, padding: "12px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      {idx + 1 >= questoes.length ? "Ver resultado 🎉" : "Próxima →"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ETAPA RESULTADO (original) ── */}
          {etapa === "resultado" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: acertos >= questoes.length * 0.7 ? "#EDFAF3" : "#E6EEFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 40 }}>
                {acertos >= questoes.length * 0.7 ? "🏆" : acertos >= questoes.length * 0.5 ? "👍" : "💪"}
              </div>
              <p style={{ fontSize: 28, fontWeight: 800, color: CORES.text, margin: "0 0 4px" }}>{acertos}/{questoes.length}</p>
              <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 700, margin: "0 0 4px" }}>+{unidade.xp} XP ganhos!</p>
              <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 24px" }}>
                {acertos === questoes.length ? "Perfeito! Você domina esse conteúdo!" : acertos >= questoes.length / 2 ? "Bom trabalho! Continue praticando." : "Revise o conteúdo e tente novamente."}
              </p>
              {acertos < questoes.length / 2 && conteudo && (
                <button onClick={() => { setEtapa("conteudo"); setIdx(0); setResposta(null); setAcertos(0); }}
                  style={{ width: "100%", padding: "12px 0", background: "#f8fafc", color: unidade.cor, border: `1.5px solid ${unidade.cor}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
                  📖 Revisar conteúdo
                </button>
              )}

              {/* Botão Mini Simulado */}
              <div style={{ background: `${unidade.cor}11`, border: `1px solid ${unidade.cor}33`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: unidade.cor, margin: "0 0 4px" }}>🎯 Mini Simulado Liberado!</p>
                <p style={{ fontSize: 12, color: CORES.textSub, margin: "0 0 10px" }}>5 questões rápidas no estilo ENEM sobre este conteúdo.</p>
                <button
                  onClick={iniciarSimulado}
                  disabled={simuladoLoading}
                  style={{ width: "100%", padding: "12px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: simuladoLoading ? 0.7 : 1 }}>
                  {simuladoLoading ? "Preparando..." : "Iniciar Mini Simulado →"}
                </button>
              </div>

              <button onClick={onClose} style={{ width: "100%", padding: "11px 0", background: "#f8fafc", color: CORES.textSub, border: `1px solid ${CORES.border}`, borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                Deixar para depois
              </button>
            </div>
          )}

          {/* ── ETAPA SIMULADO ── */}
          {etapa === "simulado" && simuladoData && (() => {
            const simQ = simuladoData.questoes[simIdx];
            return (
              <div>
                {/* Tags */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px",
                    background: simQ.dificuldade === "facil" ? "rgba(34,197,94,0.1)" : simQ.dificuldade === "medio" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                    color: simQ.dificuldade === "facil" ? "#22c55e" : simQ.dificuldade === "medio" ? "#f59e0b" : "#ef4444",
                  }}>{simQ.dificuldade}</span>
                  {simQ.assunto_tag && (
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "#e0f2fe", color: "#0284c7", fontWeight: 600 }}>{simQ.assunto_tag}</span>
                  )}
                </div>

                {/* Texto base */}
                {simQ.texto_base && (
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12, marginBottom: 12, border: "1px solid #e2e8f0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 1, margin: "0 0 6px" }}>📄 Texto de apoio</p>
                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, margin: 0, fontStyle: "italic" as const }}>{simQ.texto_base}</p>
                  </div>
                )}

                {/* Enunciado */}
                <div style={{ background: CORES.bgCard ?? "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${unidade.cor}15` }}>
                  <p style={{ fontSize: 14, color: CORES.text, lineHeight: 1.75, margin: 0, fontFamily: "Georgia, serif" }}>{simQ.enunciado}</p>
                </div>

                {/* Alternativas A-E */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {simQ.alternativas.map((alt) => {
                    const selecionada = simResposta === alt.id;
                    let bg = CORES.bgCard ?? "#fff", border = `1px solid ${CORES.border ?? "#e2e8f0"}`, cor = CORES.text;
                    if (simMostrarFeedback && selecionada) {
                      if (simRespostaCorreta) { bg = "#EDFAF3"; border = "1.5px solid #22c55e"; cor = "#22c55e"; }
                      else { bg = "#FFF1F1"; border = "1.5px solid #ef4444"; cor = "#ef4444"; }
                    }
                    return (
                      <button key={alt.id} onClick={() => responderSimulado(alt.id)} disabled={simMostrarFeedback}
                        style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 13px", borderRadius: 10, border, background: bg, cursor: simMostrarFeedback ? "default" : "pointer", textAlign: "left", opacity: simMostrarFeedback && !selecionada ? 0.5 : 1 }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: selecionada ? unidade.cor : "#e5e7eb", color: selecionada ? "#fff" : "#666", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{alt.letra}</span>
                        <span style={{ fontSize: 13, color: cor, lineHeight: 1.5 }}>{alt.texto}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {simMostrarFeedback && (
                  <div>
                    <div style={{ background: simRespostaCorreta ? "#EDFAF3" : "#FFF1F1", border: `1px solid ${simRespostaCorreta ? "#22c55e" : "#ef4444"}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: simRespostaCorreta ? "#22c55e" : "#ef4444", margin: "0 0 4px" }}>
                        {simRespostaCorreta ? "✅ Correto!" : "❌ Incorreto"}
                      </p>
                      {simQ.explicacao && <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.6 }}>{simQ.explicacao}</p>}
                    </div>
                    <button onClick={proximaSimulado} style={{ width: "100%", padding: "12px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      {simIdx + 1 >= simuladoData.questoes.length ? "Ver resultado 🎉" : "Próxima →"}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── ETAPA RESULTADO DO SIMULADO ── */}
          {etapa === "simulado_resultado" && simuladoData && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 4 }}>{simNivelCfg.emoji}</div>
              <p style={{ fontSize: 28, fontWeight: 800, color: CORES.text, margin: "0 0 2px" }}>
                {simAcertos}/{simuladoData.questoes.length}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: simNivelCfg.cor, margin: "0 0 4px" }}>{simNivelCfg.label}</p>
              <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 16px" }}>{simPct}% de aproveitamento</p>

              {/* Métricas */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: CORES.text, margin: 0 }}>⏱ {formatTempo(tempoTotal)}</p>
                  <p style={{ fontSize: 10, color: CORES.textSub, margin: 0 }}>Tempo</p>
                </div>
                <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#4f46e5", margin: 0 }}>⚡ +{xpSimulado} XP</p>
                  <p style={{ fontSize: 10, color: "#6366f1", margin: 0 }}>XP Ganho</p>
                </div>
              </div>

              {/* Revisão */}
              {simErros.length > 0 && (
                <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: 12, marginBottom: 16, textAlign: "left" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e", margin: "0 0 8px" }}>📚 Revise estes tópicos:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {simErros.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={onClose} style={{ width: "100%", padding: "13px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
                Continuar estudando →
              </button>
              <button onClick={iniciarSimulado} style={{ width: "100%", padding: "11px 0", background: "#f8fafc", color: unidade.cor, border: `1.5px solid ${unidade.cor}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Tentar novamente
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
