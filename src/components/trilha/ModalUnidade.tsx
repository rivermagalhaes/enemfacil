// src/components/trilha/ModalUnidade.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CORES } from "@/styles/theme";

interface Unidade {
  id: string; titulo: string; emoji: string; cor: string; bg: string;
  topic: string | null; topicos: string[]; xp: number;
}

interface Questao {
  id: string; question: string; explanation: string;
  answer_index: number; difficulty: string; ano: number;
}

interface Conteudo {
  titulo: string; conteudo: string; exemplos: string | null; formulas: string | null;
}

type Etapa = "topicos" | "conteudo" | "questoes" | "resultado";

export default function ModalUnidade({
  unidade, vestibular, materia, onClose, onConcluir,
}: {
  unidade: Unidade; vestibular: string; materia: string;
  onClose: () => void; onConcluir: () => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("topicos");
  const [conteudo, setConteudo] = useState<Conteudo | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [opcoes, setOpcoes] = useState<Record<string, string[]>>({});
  const [idx, setIdx] = useState(0);
  const [resposta, setResposta] = useState<number | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarConteudo();
    if (unidade.topic) carregarQuestoes();
  }, []);

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

  const q = questoes[idx];
  const letras = ["A", "B", "C", "D", "E"];

  // Indicador de etapas
  const ETAPAS: { id: Etapa; label: string; emoji: string }[] = [
    { id: "topicos",   label: "Tópicos",   emoji: "📋" },
    { id: "conteudo",  label: "Conteúdo",  emoji: "📖" },
    { id: "questoes",  label: "Questões",  emoji: "🧠" },
    { id: "resultado", label: "Resultado", emoji: "🏆" },
  ];
  const etapaIdx = ETAPAS.findIndex(e => e.id === etapa);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "92dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Header */}
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

          {/* Barra de etapas */}
          <div style={{ display: "flex", gap: 4 }}>
            {ETAPAS.map((e, i) => (
              <div key={e.id} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= etapaIdx ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)", transition: "background 0.3s" }} />
            ))}
          </div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", margin: "4px 0 0", textAlign: "center" }}>
            {ETAPAS[etapaIdx]?.emoji} {ETAPAS[etapaIdx]?.label}
          </p>
        </div>

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

              {/* Conteúdo teórico */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${CORES.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: unidade.cor, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>📖 Teoria</p>
                <p style={{ fontSize: 13, color: CORES.text, lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{conteudo.conteudo}</p>
              </div>

              {/* Fórmulas */}
              {conteudo.formulas && (
                <div style={{ background: "#fef9ec", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #fcd34d" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>📐 Fórmulas</p>
                  <p style={{ fontSize: 13, color: "#78350f", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{conteudo.formulas}</p>
                </div>
              )}

              {/* Exemplos */}
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

          {/* ── ETAPA RESULTADO ── */}
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
              <button onClick={onClose} style={{ width: "100%", padding: "12px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Voltar para a trilha →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
