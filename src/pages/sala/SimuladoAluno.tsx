// src/pages/sala/SimuladoAluno.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Assignment {
  id: string;
  titulo: string;
  descricao: string | null;
  data_liberacao: string | null;
  tempo_limite_min: number | null;
  ativo: boolean;
  questoes_data: QuestaoData[] | null;
  questoes_ids: string[];
  sala_virtual_id: string | null;
  professor_id: string;
}

interface QuestaoData {
  id: string;
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
  topic: string;
  area: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  acertos: number;
  total: number;
  concluido_em: string;
}

export default function SimuladoAluno() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { salaId } = useParams<{ salaId: string }>();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado do simulado em andamento
  const [simuladoAtivo, setSimuladoAtivo] = useState<Assignment | null>(null);
  const [questoes, setQuestoes] = useState<QuestaoData[]>([]);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [questaoAtual, setQuestaoAtual] = useState(0);
  const [iniciado, setIniciado] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [resultado, setResultado] = useState<{ acertos: number; total: number } | null>(null);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    if (!profile) return;
    carregarDados();
    const tick = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(tick);
  }, [profile, salaId]);

  useEffect(() => {
    if (!iniciado || !simuladoAtivo?.tempo_limite_min) return;
    const totalSeg = simuladoAtivo.tempo_limite_min * 60;
    setTempoRestante(totalSeg);
    timerRef.current = setInterval(() => {
      setTempoRestante(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          finalizarSimulado();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [iniciado]);

  async function carregarDados() {
    setLoading(true);
    try {
      // Carrega assignments da sala
      const { data: assigns } = await supabase
        .from("assignments")
        .select("*")
        .eq("sala_virtual_id", salaId)
        .eq("ativo", true)
        .order("data_liberacao", { ascending: true });

      setAssignments((assigns as Assignment[]) ?? []);

      // Carrega submissões do aluno
      if (assigns && assigns.length > 0) {
        const ids = assigns.map((a: any) => a.id);
        const { data: subs } = await supabase
          .from("assignment_submissions")
          .select("*")
          .eq("student_id", user!.id)
          .in("assignment_id", ids);
        setSubmissions((subs as Submission[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function isLiberado(assignment: Assignment): boolean {
    if (!assignment.data_liberacao) return true;
    return new Date(assignment.data_liberacao) <= agora;
  }

  function jaRespondeu(assignmentId: string): boolean {
    return submissions.some(s => s.assignment_id === assignmentId);
  }

  function getSubmissao(assignmentId: string): Submission | undefined {
    return submissions.find(s => s.assignment_id === assignmentId);
  }

  function contadorRegressivo(assignment: Assignment): string {
    if (!assignment.data_liberacao) return "";
    const diff = new Date(assignment.data_liberacao).getTime() - agora.getTime();
    if (diff <= 0) return "";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  async function iniciarSimulado(assignment: Assignment) {
    let qs: QuestaoData[] = [];

    if (assignment.questoes_data && assignment.questoes_data.length > 0) {
      qs = assignment.questoes_data;
    } else if (assignment.questoes_ids && assignment.questoes_ids.length > 0) {
      const { data } = await supabase
        .from("questions")
        .select("id, question, explanation, answer_index, topic, area")
        .in("id", assignment.questoes_ids);
      if (data) {
        const { data: opts } = await supabase
          .from("question_options")
          .select("question_id, option_index, label")
          .in("question_id", assignment.questoes_ids)
          .order("option_index");
        const optsMap: Record<string, string[]> = {};
        (opts ?? []).forEach((o: any) => {
          if (!optsMap[o.question_id]) optsMap[o.question_id] = [];
          optsMap[o.question_id][o.option_index] = o.label;
        });
        qs = data.map((q: any) => ({
          id: q.id, question: q.question, options: optsMap[q.id] ?? [],
          answer_index: q.answer_index, explanation: q.explanation ?? "",
          topic: q.topic ?? "", area: q.area ?? "",
        }));
      }
    }

    setQuestoes(qs);
    setSimuladoAtivo(assignment);
    setRespostas({});
    setQuestaoAtual(0);
    setIniciado(true);
    setFinalizado(false);
    setResultado(null);
  }

  async function finalizarSimulado() {
    if (!simuladoAtivo || enviando) return;
    setEnviando(true);
    clearInterval(timerRef.current!);

    let acertos = 0;
    const respostasArr = questoes.map((q, i) => {
      const resp = respostas[q.id] ?? -1;
      const correta = resp === q.answer_index;
      if (correta) acertos++;
      return { questao_index: i, resposta: resp, correta };
    });

    await supabase.from("assignment_submissions").insert({
      assignment_id: simuladoAtivo.id,
      student_id: user!.id,
      respostas: respostasArr,
      acertos,
      total: questoes.length,
      concluido_em: new Date().toISOString(),
    });

    setResultado({ acertos, total: questoes.length });
    setFinalizado(true);
    setEnviando(false);
    await carregarDados();
  }

  function formatarTempo(seg: number): string {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const AREA_COR: Record<string, string> = {
    ciencias_natureza: "#10b981", ciencias_humanas: "#f59e0b",
    linguagens: "#8b5cf6", matematica: "#3b82f6",
  };

  // ── Tela de resultado ──
  if (finalizado && resultado) {
    const pct = Math.round((resultado.acertos / resultado.total) * 100);
    const emoji = pct >= 70 ? "🏆" : pct >= 50 ? "👍" : "📚";
    return (
      <div style={{ minHeight: "100dvh", background: "#0a0f1e", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360, width: "100%" }}>
          <p style={{ fontSize: 64, margin: "0 0 16px" }}>{emoji}</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Simulado concluído!</p>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 24, marginBottom: 20 }}>
            <p style={{ fontSize: 56, fontWeight: 900, color: pct >= 70 ? "#4ece9a" : pct >= 50 ? "#f59e0b" : "#ef4444", margin: "0 0 4px" }}>{pct}%</p>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", margin: 0 }}>{resultado.acertos} de {resultado.total} acertos</p>
          </div>

          {/* Gabarito */}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 16, marginBottom: 20, textAlign: "left" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", margin: "0 0 12px" }}>Gabarito</p>
            {questoes.map((q, i) => {
              const resp = respostas[q.id] ?? -1;
              const correta = resp === q.answer_index;
              return (
                <div key={q.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < questoes.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, minWidth: 20 }}>{correta ? "✅" : "❌"}</span>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: 0 }}>{i + 1}. {q.question.slice(0, 80)}{q.question.length > 80 ? "..." : ""}</p>
                  </div>
                  {!correta && (
                    <p style={{ fontSize: 11, color: "#4ece9a", margin: "4px 0 0 28px" }}>
                      Correta: {String.fromCharCode(65 + q.answer_index)}) {q.options[q.answer_index]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => { setSimuladoAtivo(null); setIniciado(false); setFinalizado(false); }}
            style={{ width: "100%", padding: "14px 0", background: "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Voltar às salas
          </button>
        </div>
      </div>
    );
  }

  // ── Tela do simulado em andamento ──
  if (iniciado && simuladoAtivo && questoes.length > 0) {
    const q = questoes[questaoAtual];
    const respondida = respostas[q.id] !== undefined;
    const todasRespondidas = questoes.every(q => respostas[q.id] !== undefined);
    return (
      <div style={{ minHeight: "100dvh", background: "#0a0f1e", fontFamily: "system-ui, sans-serif" }}>
        {/* Header */}
        <div style={{ background: "#0f172a", padding: "12px 20px", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>{simuladoAtivo.titulo}</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{questaoAtual + 1} de {questoes.length}</p>
            </div>
            {tempoRestante !== null && (
              <div style={{ background: tempoRestante < 300 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)", borderRadius: 10, padding: "6px 12px", border: tempoRestante < 300 ? "1px solid rgba(239,68,68,0.3)" : "none" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: tempoRestante < 300 ? "#ef4444" : "#fff", margin: 0, fontVariantNumeric: "tabular-nums" }}>⏱ {formatarTempo(tempoRestante)}</p>
              </div>
            )}
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, marginTop: 10 }}>
            <div style={{ height: "100%", width: `${((questaoAtual + 1) / questoes.length) * 100}%`, background: "linear-gradient(90deg,#065C37,#0A7C4B)", borderRadius: 99, transition: "width 0.3s" }} />
          </div>
        </div>

        <div style={{ padding: "20px 20px 120px" }}>
          {/* Área badge */}
          {q.area && (
            <span style={{ fontSize: 10, fontWeight: 700, background: `${AREA_COR[q.area] ?? "#64748b"}22`, color: AREA_COR[q.area] ?? "#64748b", borderRadius: 99, padding: "3px 10px", display: "inline-block", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {q.area.replace("_", " ")}
            </span>
          )}

          {/* Enunciado */}
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "#e2e8f0", margin: "0 0 20px", fontWeight: 500 }}>{q.question}</p>

          {/* Alternativas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, idx) => {
              const selecionada = respostas[q.id] === idx;
              return (
                <button key={idx}
                  onClick={() => setRespostas(prev => ({ ...prev, [q.id]: idx }))}
                  style={{
                    padding: "14px 16px", borderRadius: 14, border: selecionada ? "2px solid #0A7C4B" : "1.5px solid rgba(255,255,255,0.08)",
                    background: selecionada ? "rgba(10,124,75,0.15)" : "rgba(255,255,255,0.03)",
                    color: selecionada ? "#4ece9a" : "#cbd5e1", fontSize: 14, textAlign: "left", cursor: "pointer",
                    display: "flex", alignItems: "flex-start", gap: 12, transition: "all 0.15s",
                  }}>
                  <span style={{ fontSize: 12, fontWeight: 800, minWidth: 20, height: 20, borderRadius: "50%", background: selecionada ? "#0A7C4B" : "rgba(255,255,255,0.08)", color: selecionada ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span style={{ lineHeight: 1.5 }}>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navegação inferior */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0f172a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 20px 28px", display: "flex", gap: 10 }}>
          <button onClick={() => setQuestaoAtual(p => Math.max(0, p - 1))} disabled={questaoAtual === 0}
            style={{ flex: 1, padding: "12px 0", background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: questaoAtual === 0 ? "not-allowed" : "pointer", opacity: questaoAtual === 0 ? 0.4 : 1 }}>
            ← Anterior
          </button>
          {questaoAtual < questoes.length - 1 ? (
            <button onClick={() => setQuestaoAtual(p => p + 1)}
              style={{ flex: 2, padding: "12px 0", background: respondida ? "linear-gradient(90deg,#065C37,#0A7C4B)" : "rgba(255,255,255,0.06)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Próxima →
            </button>
          ) : (
            <button onClick={finalizarSimulado} disabled={!todasRespondidas || enviando}
              style={{ flex: 2, padding: "12px 0", background: todasRespondidas ? "linear-gradient(90deg,#065C37,#0A7C4B)" : "rgba(255,255,255,0.06)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: todasRespondidas ? "pointer" : "not-allowed", opacity: todasRespondidas ? 1 : 0.5 }}>
              {enviando ? "Enviando..." : "✅ Finalizar"}
            </button>
          )}
        </div>

        {/* Mini mapa de questões */}
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", padding: "0 20px" }}>
          {questoes.map((q2, i) => (
            <button key={i} onClick={() => setQuestaoAtual(i)}
              style={{ width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
                background: i === questaoAtual ? "#0A7C4B" : respostas[q2.id] !== undefined ? "rgba(78,206,154,0.3)" : "rgba(255,255,255,0.08)",
                color: i === questaoAtual ? "#fff" : respostas[q2.id] !== undefined ? "#4ece9a" : "#64748b" }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Tela principal: lista de simulados da sala ──
  return (
    <div style={{ minHeight: "100dvh", background: "#0a0f1e", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#065C37,#0A7C4B)", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>📝 Simulados da Sala</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>Realize as provas do seu professor</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px 80px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Carregando simulados...</p>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>📭</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "0 0 4px" }}>Nenhum simulado disponível</p>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Aguarde seu professor criar um simulado</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {assignments.map(a => {
              const liberado = isLiberado(a);
              const respondeu = jaRespondeu(a.id);
              const sub = getSubmissao(a.id);
              const contador = contadorRegressivo(a);
              const pct = sub ? Math.round((sub.acertos / sub.total) * 100) : null;

              return (
                <div key={a.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, border: respondeu ? "1px solid rgba(78,206,154,0.2)" : liberado ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{a.titulo}</p>
                      {a.descricao && <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 6px" }}>{a.descricao}</p>}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {a.questoes_data && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "2px 8px" }}>{a.questoes_data.length} questões</span>}
                        {a.tempo_limite_min && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "2px 8px" }}>⏱ {a.tempo_limite_min}min</span>}
                        {a.data_liberacao && <span style={{ fontSize: 10, color: liberado ? "#4ece9a" : "#f59e0b", background: liberado ? "rgba(78,206,154,0.1)" : "rgba(245,158,11,0.1)", borderRadius: 99, padding: "2px 8px" }}>
                          {liberado ? "✅ Liberado" : `🔒 ${new Date(a.data_liberacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                        </span>}
                      </div>
                    </div>
                    {respondeu && pct !== null && (
                      <div style={{ textAlign: "center", minWidth: 52 }}>
                        <p style={{ fontSize: 22, fontWeight: 900, color: pct >= 70 ? "#4ece9a" : pct >= 50 ? "#f59e0b" : "#ef4444", margin: 0 }}>{pct}%</p>
                        <p style={{ fontSize: 9, color: "#64748b", margin: 0 }}>{sub?.acertos}/{sub?.total}</p>
                      </div>
                    )}
                  </div>

                  {/* Contagem regressiva */}
                  {!liberado && contador && (
                    <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: 10, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>⏳</span>
                      <div>
                        <p style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, margin: 0 }}>Libera em</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: "#fbbf24", margin: 0, fontVariantNumeric: "tabular-nums" }}>{contador}</p>
                      </div>
                    </div>
                  )}

                  {respondeu ? (
                    <div style={{ background: "rgba(78,206,154,0.08)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>✅</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#4ece9a", margin: 0 }}>Simulado concluído</p>
                        {sub?.concluido_em && <p style={{ fontSize: 10, color: "#64748b", margin: 0 }}>{new Date(sub.concluido_em).toLocaleString("pt-BR")}</p>}
                      </div>
                    </div>
                  ) : liberado ? (
                    <button onClick={() => iniciarSimulado(a)}
                      style={{ width: "100%", padding: "12px 0", background: "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                      ▶ Iniciar simulado
                    </button>
                  ) : (
                    <button disabled style={{ width: "100%", padding: "12px 0", background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "not-allowed" }}>
                      🔒 Aguardando liberação
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
