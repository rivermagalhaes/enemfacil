// src/pages/admin/CorrecaoQR.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

const CORES = { bg:"#F4F6FB", card:"#FFFFFF", primary:"#0057FF", green:"#0A7C4B", text:"#1a1a2e", sub:"#64748B", border:"#E2E8F0" };

export default function CorrecaoQR() {
  const { assignmentId, studentId } = useParams<{ assignmentId: string; studentId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [aluno, setAluno] = useState<any>(null);
  const [avaliacao, setAvaliacao] = useState<any>(null);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [respostas, setRespostas] = useState<Record<string, number>>({}); // question_id -> índice marcado
  const [feedback, setFeedback] = useState("");
  const [submissaoExistente, setSubmissaoExistente] = useState<any>(null);

  useEffect(() => {
    if (!assignmentId || !studentId) return;
    carregarDados();
  }, [assignmentId, studentId]);

  async function carregarDados() {
    setLoading(true);
    try {
      // Carregar perfil do aluno
      const { data: alunoData } = await supabase
        .from("profiles")
        .select("id, nome, email, avatar_url")
        .eq("id", studentId)
        .single();
      setAluno(alunoData);

      // Carregar avaliação
      const { data: avData } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();
      setAvaliacao(avData);

      if (avData?.questoes_ids?.length > 0) {
        // Carregar questões
        const { data: qData } = await supabase
          .from("questions")
          .select("id, question, answer_index, explanation")
          .in("id", avData.questoes_ids);

        // Carregar opções
        const { data: opts } = await supabase
          .from("question_options")
          .select("*")
          .in("question_id", avData.questoes_ids);

        const questoesComOpts = (qData ?? []).map((q: any) => ({
          ...q,
          options: (opts ?? [])
            .filter((o: any) => o.question_id === q.id)
            .sort((a: any, b: any) => a.option_index - b.option_index),
        }));
        // Manter ordem original da avaliação
        const ordenadas = avData.questoes_ids
          .map((id: string) => questoesComOpts.find((q: any) => q.id === id))
          .filter(Boolean);
        setQuestoes(ordenadas);
      }

      // Verificar submissão existente
      const { data: subData } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", studentId)
        .maybeSingle();

      if (subData) {
        setSubmissaoExistente(subData);
        if (subData.respostas) setRespostas(subData.respostas);
        if (subData.feedback_professor) setFeedback(subData.feedback_professor);
      }
    } catch (e: any) {
      setErro("Erro ao carregar dados: " + e.message);
    }
    setLoading(false);
  }

  function marcarResposta(questionId: string, index: number) {
    setRespostas(prev => ({ ...prev, [questionId]: index }));
  }

  function calcularAcertos() {
    return questoes.filter(q => respostas[q.id] === q.answer_index).length;
  }

  async function salvarCorrecao() {
    if (!profile) return;
    setSalvando(true);
    const acertos = calcularAcertos();
    const total = questoes.length;
    const nota = total > 0 ? parseFloat(((acertos / total) * 10).toFixed(2)) : 0;

    const payload = {
      assignment_id: assignmentId,
      student_id: studentId,
      respostas,
      acertos,
      total,
      nota_manual: nota,
      feedback_professor: feedback,
      corrigido_manualmente: true,
      corrigido_em: new Date().toISOString(),
      corrigido_por: profile.id,
      concluido_em: new Date().toISOString(),
    };

    let error;
    if (submissaoExistente) {
      ({ error } = await supabase
        .from("assignment_submissions")
        .update(payload)
        .eq("id", submissaoExistente.id));
    } else {
      ({ error } = await supabase
        .from("assignment_submissions")
        .insert(payload));
    }

    if (error) {
      setErro("Erro ao salvar: " + error.message);
    } else {
      setSalvo(true);
    }
    setSalvando(false);
  }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100dvh", background:CORES.bg, flexDirection:"column", gap:12 }}>
      <div style={{ width:36, height:36, border:`3px solid ${CORES.primary}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:CORES.sub, fontSize:13 }}>Carregando avaliação...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (erro) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100dvh", background:CORES.bg, flexDirection:"column", gap:12, padding:24 }}>
      <span style={{ fontSize:40 }}>⚠️</span>
      <p style={{ color:"#ef4444", fontSize:14, textAlign:"center" }}>{erro}</p>
      <button onClick={() => navigate(-1)} style={{ padding:"10px 24px", background:CORES.primary, color:"#fff", border:"none", borderRadius:10, fontWeight:600, cursor:"pointer" }}>Voltar</button>
    </div>
  );

  if (salvo) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100dvh", background:CORES.bg, flexDirection:"column", gap:16, padding:24 }}>
      <div style={{ width:72, height:72, background:"#EDFAF3", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>✅</div>
      <p style={{ fontSize:20, fontWeight:800, color:CORES.text, margin:0 }}>Correção salva!</p>
      <div style={{ background:CORES.card, borderRadius:16, padding:"20px 32px", border:`1px solid ${CORES.border}`, textAlign:"center" }}>
        <p style={{ fontSize:13, color:CORES.sub, margin:"0 0 4px" }}>Aluno</p>
        <p style={{ fontSize:16, fontWeight:700, margin:"0 0 16px" }}>{aluno?.nome || aluno?.email}</p>
        <p style={{ fontSize:13, color:CORES.sub, margin:"0 0 4px" }}>Resultado</p>
        <p style={{ fontSize:36, fontWeight:900, color:CORES.green, margin:0 }}>{calcularAcertos()}/{questoes.length}</p>
        <p style={{ fontSize:14, color:CORES.sub, margin:"4px 0 0" }}>Nota: {((calcularAcertos()/questoes.length)*10).toFixed(1)}</p>
      </div>
      <button onClick={() => navigate("/professor")} style={{ padding:"12px 32px", background:CORES.primary, color:"#fff", border:"none", borderRadius:12, fontWeight:700, fontSize:14, cursor:"pointer" }}>
        Voltar ao Painel
      </button>
    </div>
  );

  const letras = ["A", "B", "C", "D", "E"];

  return (
    <div style={{ minHeight:"100dvh", background:CORES.bg, fontFamily:"system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,#065C37,#0A7C4B)`, padding:"14px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={() => navigate(-1)} style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:15, fontWeight:700, color:"#fff", margin:0 }}>✏️ Corrigir Avaliação</p>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.6)", margin:0 }}>EnemFácil</p>
        </div>
        {submissaoExistente && (
          <span style={{ fontSize:10, background:"rgba(255,255,255,0.2)", color:"#fff", borderRadius:99, padding:"3px 8px", fontWeight:700 }}>
            JÁ CORRIGIDA
          </span>
        )}
      </div>

      <div style={{ padding:"16px 20px 100px" }}>
        {/* Info do aluno e avaliação */}
        <div style={{ background:CORES.card, borderRadius:14, padding:16, border:`1px solid ${CORES.border}`, marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:`linear-gradient(135deg,#065C37,#0A7C4B)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
            {aluno?.avatar_url ? <img src={aluno.avatar_url} style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover" }} /> : "👤"}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:15, fontWeight:700, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {aluno?.nome || aluno?.email || "Aluno"}
            </p>
            <p style={{ fontSize:12, color:CORES.sub, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              📋 {avaliacao?.titulo || "Avaliação"} · {questoes.length} questões
            </p>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <p style={{ fontSize:22, fontWeight:900, color:CORES.green, margin:0 }}>
              {Object.keys(respostas).length > 0 ? `${calcularAcertos()}/${questoes.length}` : "—"}
            </p>
            {Object.keys(respostas).length > 0 && (
              <p style={{ fontSize:10, color:CORES.sub, margin:0 }}>acertos</p>
            )}
          </div>
        </div>

        {/* Questões */}
        {questoes.length === 0 && (
          <div style={{ background:CORES.card, borderRadius:14, padding:32, border:`1px solid ${CORES.border}`, textAlign:"center" }}>
            <p style={{ color:CORES.sub, fontSize:13 }}>Nenhuma questão encontrada nesta avaliação.</p>
          </div>
        )}

        {questoes.map((q, qi) => {
          const respondida = respostas[q.id] !== undefined;
          const correta = respostas[q.id] === q.answer_index;
          return (
            <div key={q.id} style={{ background:CORES.card, borderRadius:14, padding:16, border:`1.5px solid ${respondida ? (correta ? "#22c55e" : "#ef4444") : CORES.border}`, marginBottom:12, transition:"border-color 0.2s" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:respondida ? (correta ? "#EDFAF3" : "#FFF1F1") : "#f1f5f9", color:respondida ? (correta ? "#15803d" : "#ef4444") : CORES.sub, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>
                  {qi + 1}
                </div>
                <p style={{ fontSize:13, fontWeight:600, margin:0, lineHeight:1.5, flex:1 }}>{q.question}</p>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {q.options.map((opt: any, oi: number) => {
                  const marcada = respostas[q.id] === oi;
                  const ehCorreta = oi === q.answer_index;
                  const mostrarGabarito = respondida;

                  let bg = "#f8fafc";
                  let border = CORES.border;
                  let cor = CORES.text;

                  if (marcada && ehCorreta) { bg = "#EDFAF3"; border = "#22c55e"; cor = "#15803d"; }
                  else if (marcada && !ehCorreta) { bg = "#FFF1F1"; border = "#ef4444"; cor = "#b91c1c"; }
                  else if (!marcada && ehCorreta && mostrarGabarito) { bg = "#EDFAF3"; border = "#22c55e"; cor = "#15803d"; }

                  return (
                    <button
                      key={oi}
                      onClick={() => marcarResposta(q.id, oi)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:`1.5px solid ${border}`, background:bg, cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                    >
                      <div style={{ width:24, height:24, borderRadius:"50%", background:marcada ? (ehCorreta ? "#22c55e" : "#ef4444") : (!marcada && ehCorreta && mostrarGabarito ? "#22c55e" : "#e2e8f0"), color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>
                        {letras[oi]}
                      </div>
                      <span style={{ fontSize:13, color:cor, flex:1 }}>{opt.label}</span>
                      {marcada && <span style={{ fontSize:14 }}>{ehCorreta ? "✓" : "✗"}</span>}
                      {!marcada && ehCorreta && mostrarGabarito && <span style={{ fontSize:12, color:"#15803d", fontWeight:700 }}>✓ gabarito</span>}
                    </button>
                  );
                })}
              </div>

              {respondida && q.explanation && (
                <div style={{ marginTop:10, padding:"8px 12px", background:"#F0F9FF", borderRadius:8, border:"1px solid #BAE6FD" }}>
                  <p style={{ fontSize:11, fontWeight:700, color:"#0369A1", margin:"0 0 2px" }}>💡 Explicação</p>
                  <p style={{ fontSize:12, color:"#0369A1", margin:0 }}>{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}

        {/* Feedback */}
        <div style={{ background:CORES.card, borderRadius:14, padding:16, border:`1px solid ${CORES.border}`, marginBottom:16 }}>
          <p style={{ fontSize:13, fontWeight:700, margin:"0 0 8px" }}>💬 Feedback para o aluno (opcional)</p>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Ex: Bom desempenho em termoquímica! Revise funções orgânicas..."
            rows={3}
            style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${CORES.border}`, fontSize:13, resize:"vertical", boxSizing:"border-box", fontFamily:"inherit" }}
          />
        </div>
      </div>

      {/* Botão flutuante salvar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"12px 20px", background:"rgba(244,246,251,0.95)", backdropFilter:"blur(8px)", borderTop:`1px solid ${CORES.border}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <p style={{ fontSize:12, color:CORES.sub, margin:0 }}>
            {Object.keys(respostas).length}/{questoes.length} questões marcadas
          </p>
          {Object.keys(respostas).length > 0 && (
            <p style={{ fontSize:12, fontWeight:700, color:CORES.green, margin:0 }}>
              {calcularAcertos()} acertos · Nota {((calcularAcertos()/questoes.length)*10).toFixed(1)}
            </p>
          )}
        </div>
        <button
          onClick={salvarCorrecao}
          disabled={salvando || Object.keys(respostas).length === 0}
          style={{ width:"100%", padding:"13px 0", background: Object.keys(respostas).length === 0 ? "#e2e8f0" : `linear-gradient(90deg,#065C37,#0A7C4B)`, color: Object.keys(respostas).length === 0 ? CORES.sub : "#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:700, cursor: Object.keys(respostas).length === 0 ? "not-allowed" : "pointer" }}
        >
          {salvando ? "Salvando..." : submissaoExistente ? "💾 Atualizar correção" : "✅ Salvar correção"}
        </button>
      </div>
    </div>
  );
}
