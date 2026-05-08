// src/pages/sala/SalaVirtual.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Sala {
  id: string; codigo: string; nome: string; materia: string;
  vestibular: string; status: string; modo: string;
  tempo_limite_min: number | null; max_questoes: number;
  iniciada_em: string | null;
}
interface Questao {
  id: string; question: string; explanation: string;
  answer_index: number; topic: string | null; area: string | null;
  options: { option_index: number; label: string }[];
}
interface Participante { user_id: string; nome_exibicao: string | null; }
interface RankingItem { user_id: string; nome: string | null; certas: number; total: number; }

const MATERIA_EMOJI: Record<string, string> = {
  quimica: "🧪", fisica: "⚡", matematica: "📐", portugues: "📝",
  ingles: "🌎", redacao: "✍️", geral: "🎯",
};

const STATUS_LABEL: Record<string, { label: string; cor: string; bg: string }> = {
  agendada: { label: "Agendada", cor: "#facc15", bg: "rgba(250,204,21,0.12)" },
  ativa:    { label: "Ao vivo",  cor: "#4ece9a", bg: "rgba(78,206,154,0.12)" },
};

export default function SalaVirtual() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fase, setFase] = useState<"lobby" | "aguardando" | "quiz" | "resultado">("lobby");
  const [salasDisponiveis, setSalasDisponiveis] = useState<Sala[]>([]);
  const [carregandoSalas, setCarregandoSalas] = useState(true);
  const [codigoInput, setCodigoInput] = useState("");
  const [sala, setSala] = useState<Sala | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, { idx: number; correta: boolean }>>({});
  const [respondeuAtual, setRespondeuAtual] = useState(false);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!profile) return;
    const role = (profile as any).role;
    if (role === "professor" || role === "admin") {
      navigate("/sala/professor", { replace: true });
    }
  }, [profile]);

  useEffect(() => {
    carregarSalasDisponiveis();
  }, []);

  async function carregarSalasDisponiveis() {
    setCarregandoSalas(true);
    try {
      const { data } = await supabase
        .from("salas_virtuais")
        .select("*")
        .in("status", ["agendada", "ativa"])
        .order("iniciada_em", { ascending: true });
      setSalasDisponiveis((data as Sala[]) ?? []);
    } finally {
      setCarregandoSalas(false);
    }
  }

  useEffect(() => {
    const state = location.state as { salaId?: string } | null;
    if (state?.salaId) {
      supabase.from("salas_virtuais").select("*").eq("id", state.salaId).single().then(({ data }) => {
        if (!data) return;
        setSala(data);
        setFase("aguardando");
      });
    }
  }, []);

  // ✅ CORRIGIDO: só vai pro quiz quando iniciada_em mudar de null para preenchido
  useEffect(() => {
    if (!sala || fase === "lobby") return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("salas_virtuais").select("*").eq("id", sala.id).single();
      if (!data) return;
      if (fase === "aguardando" && data.iniciada_em !== null && sala.iniciada_em === null) {
        await carregarQuestoes(data);
        setSala(data);
        setFase("quiz");
      }
      if (data.status === "encerrada" && fase !== "resultado") {
        await carregarRanking(data.id);
        setFase("resultado");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sala, fase]);

  useEffect(() => {
    if (!sala) return;
    carregarParticipantes(sala.id);
    const channel = supabase
      .channel(`sala-${sala.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sala_participantes", filter: `sala_id=eq.${sala.id}` },
        () => carregarParticipantes(sala.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sala]);

  useEffect(() => {
    if (fase !== "quiz" || !sala?.tempo_limite_min) return;
    const total = sala.tempo_limite_min * 60;
    setTempoRestante(total);
    timerRef.current = setInterval(() => {
      setTempoRestante(t => {
        if (t === null || t <= 1) { clearInterval(timerRef.current!); finalizarQuiz(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fase]);

  async function entrarNaSala(codigoOverride?: string) {
    const codigo = (codigoOverride ?? codigoInput).trim().toUpperCase();
    if (!codigo) return;
    setEntrando(true); setErro("");
    const { data: salaData } = await supabase
      .from("salas_virtuais").select("*").eq("codigo", codigo).single();
    if (!salaData) { setErro("Sala não encontrada. Verifique o código."); setEntrando(false); return; }
    if (salaData.status === "encerrada") { setErro("Esta sala já foi encerrada."); setEntrando(false); return; }
    await supabase.from("sala_participantes").upsert({
      sala_id: salaData.id, user_id: user!.id,
      nome_exibicao: profile?.nome ?? "Aluno",
    }, { onConflict: "sala_id,user_id" });
    setSala(salaData);
    setFase("aguardando");
    setEntrando(false);
  }

  async function carregarQuestoes(s: Sala) {
    const { data } = await supabase
      .from("questions")
      .select("id, question, explanation, answer_index, topic, area, question_options(option_index, label)")
      .eq("vestibular", s.vestibular)
      .limit(s.max_questoes);
    if (!data) return;
    setQuestoes(data.map((q: any) => ({
      ...q,
      options: (q.question_options ?? []).sort((a: any, b: any) => a.option_index - b.option_index),
    })));
  }

  async function carregarParticipantes(salaId: string) {
    const { data } = await supabase
      .from("sala_participantes").select("user_id, nome_exibicao")
      .eq("sala_id", salaId).is("saiu_em", null);
    setParticipantes((data as Participante[]) ?? []);
  }

  async function carregarRanking(salaId: string) {
    const { data: resps } = await supabase
      .from("sala_respostas").select("user_id, correta").eq("sala_id", salaId);
    if (!resps) return;
    const mapa: Record<string, { certas: number; total: number }> = {};
    resps.forEach((r: any) => {
      if (!mapa[r.user_id]) mapa[r.user_id] = { certas: 0, total: 0 };
      mapa[r.user_id].total++;
      if (r.correta) mapa[r.user_id].certas++;
    });
    const { data: parts } = await supabase
      .from("sala_participantes").select("user_id, nome_exibicao").eq("sala_id", salaId);
    const nomes: Record<string, string | null> = {};
    (parts ?? []).forEach((p: any) => { nomes[p.user_id] = p.nome_exibicao; });
    setRanking(Object.entries(mapa)
      .map(([uid, v]) => ({ user_id: uid, nome: nomes[uid] ?? "Aluno", ...v }))
      .sort((a, b) => b.certas - a.certas || b.total - a.total));
  }

  async function responder(optIdx: number) {
    if (respondeuAtual || !sala || !questoes[qIdx]) return;
    const q = questoes[qIdx];
    const correta = optIdx === q.answer_index;
    setRespondeuAtual(true);
    setRespostas(prev => ({ ...prev, [q.id]: { idx: optIdx, correta } }));
    await supabase.from("sala_respostas").insert({
      sala_id: sala.id, user_id: user!.id,
      question_id: q.id, resposta_index: optIdx, correta,
    });
  }

  function proximaQuestao() {
    if (qIdx + 1 >= questoes.length) { finalizarQuiz(); return; }
    setQIdx(i => i + 1);
    setRespondeuAtual(false);
  }

  async function finalizarQuiz() {
    if (timerRef.current) clearInterval(timerRef.current);
    await supabase.from("sala_participantes")
      .update({ saiu_em: new Date().toISOString() })
      .eq("sala_id", sala!.id).eq("user_id", user!.id);
    if (sala) await carregarRanking(sala.id);
    setFase("resultado");
  }

  function voltarAoLobby() {
    setSala(null); setQuestoes([]); setRespostas({}); setQIdx(0);
    setCodigoInput(""); setErro("");
    setFase("lobby");
    carregarSalasDisponiveis();
  }

  const acertos = Object.values(respostas).filter(r => r.correta).length;
  const total = Object.keys(respostas).length;

  // ── LOBBY ────────────────────────────────────────────────────────────────────
  if (fase === "lobby") return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg,#0a0f1e 0%,#111827 100%)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20 }}>
          ← Voltar
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ fontSize: 36 }}>🏫</div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>Sala Virtual</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>Aulas e simulados ao vivo</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 32px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>
          Salas disponíveis
        </p>

        {carregandoSalas ? (
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 24, textAlign: "center", marginBottom: 28 }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>Carregando...</p>
          </div>
        ) : salasDisponiveis.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 24, textAlign: "center", marginBottom: 28 }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>📭</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>Nenhuma sala agendada no momento</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {salasDisponiveis.map(s => {
              const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.agendada;
              return (
                <button key={s.id} onClick={() => entrarNaSala(s.codigo)}
                  style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.05)", border: `1.5px solid ${s.status === "ativa" ? "rgba(78,206,154,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{MATERIA_EMOJI[s.materia] ?? "🎯"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nome}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>Código: <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{s.codigo}</span></p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: st.cor, background: st.bg, borderRadius: 99, padding: "3px 9px", flexShrink: 0 }}>
                    {st.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>
          Entrar com código
        </p>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16 }}>
          <input
            value={codigoInput}
            onChange={e => { setCodigoInput(e.target.value.toUpperCase()); setErro(""); }}
            onKeyDown={e => e.key === "Enter" && entrarNaSala()}
            placeholder="Ex: QUI26A"
            maxLength={8}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", fontSize: 24, fontWeight: 800, color: "#fff", textAlign: "center", letterSpacing: "0.2em", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
          />
          {erro && <p style={{ fontSize: 12, color: "#ef4444", textAlign: "center", margin: "0 0 8px" }}>{erro}</p>}
          <button onClick={() => entrarNaSala()} disabled={entrando || !codigoInput}
            style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: entrando || !codigoInput ? "rgba(255,255,255,0.08)" : "linear-gradient(90deg,#0057FF,#0ea5e9)", color: entrando || !codigoInput ? "rgba(255,255,255,0.3)" : "#fff", fontSize: 14, fontWeight: 700, cursor: entrando || !codigoInput ? "not-allowed" : "pointer" }}>
            {entrando ? "Entrando..." : "Entrar na sala →"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── AGUARDANDO ───────────────────────────────────────────────────────────────
  if (fase === "aguardando" && sala) return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(135deg,#0a0f1e,#1a1a2e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 12, animation: "pulse 2s infinite" }}>{MATERIA_EMOJI[sala.materia] ?? "🎯"}</div>
      <p style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px", textAlign: "center" }}>{sala.nome}</p>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 28px" }}>Aguardando o professor iniciar...</p>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 24px", marginBottom: 24, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Código da sala</p>
        <p style={{ fontSize: 32, fontWeight: 900, color: "#0ea5e9", margin: 0, letterSpacing: "0.15em" }}>{sala.codigo}</p>
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, width: "100%", maxWidth: 360 }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>👥 {participantes.length} na sala</p>
        {participantes.map((p, i) => (
          <div key={p.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < participantes.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#0057FF,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
              {(p.nome_exibicao ?? "A")[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: "#fff", fontWeight: p.user_id === user?.id ? 700 : 400 }}>
              {p.nome_exibicao ?? "Aluno"} {p.user_id === user?.id ? "(você)" : ""}
            </span>
          </div>
        ))}
      </div>
      <button onClick={voltarAoLobby} style={{ marginTop: 20, background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 13, cursor: "pointer" }}>
        ← Voltar ao lobby
      </button>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
    </div>
  );

  // ── QUIZ ─────────────────────────────────────────────────────────────────────
  if (fase === "quiz" && sala && questoes[qIdx]) {
    const q = questoes[qIdx];
    const resp = respostas[q.id];
    const LETRAS = ["A", "B", "C", "D", "E"];
    return (
      <div style={{ minHeight: "100dvh", background: "#0a0f1e", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "linear-gradient(135deg,#0057FF,#0ea5e9)", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>{sala.nome}</p>
            {tempoRestante !== null && (
              <span style={{ fontSize: 13, fontWeight: 800, color: tempoRestante < 30 ? "#ff4444" : "#fff", background: "rgba(0,0,0,0.2)", borderRadius: 99, padding: "3px 10px" }}>
                ⏱ {Math.floor(tempoRestante / 60)}:{String(tempoRestante % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {questoes.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < qIdx ? "#4ece9a" : i === qIdx ? "#fff" : "rgba(255,255,255,0.3)" }} />)}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: "4px 0 0" }}>Questão {qIdx + 1} de {questoes.length}</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "14px 16px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            {q.topic && <span style={{ fontSize: 10, fontWeight: 700, background: "#0057FF30", color: "#60a5fa", borderRadius: 99, padding: "2px 8px", display: "inline-block", marginBottom: 8 }}>{q.topic}</span>}
            <p style={{ fontSize: 14, color: "#f0f0f0", lineHeight: 1.65, margin: 0 }}>{q.question}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {q.options.map(opt => {
              const selecionada = resp?.idx === opt.option_index;
              const correta = resp !== undefined && opt.option_index === q.answer_index;
              const errada = selecionada && !resp.correta;
              let bg = "rgba(255,255,255,0.05)", border = "1px solid rgba(255,255,255,0.1)", cor = "#ddd";
              if (resp !== undefined) {
                if (correta) { bg = "rgba(78,206,154,0.15)"; border = "1.5px solid #4ece9a"; cor = "#4ece9a"; }
                else if (errada) { bg = "rgba(239,68,68,0.15)"; border = "1.5px solid #ef4444"; cor = "#ef4444"; }
              }
              return (
                <button key={opt.option_index} onClick={() => responder(opt.option_index)} disabled={!!resp}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, border, background: bg, cursor: resp ? "default" : "pointer", textAlign: "left" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: selecionada || correta ? (errada ? "#ef4444" : "#4ece9a") : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: selecionada || correta ? "#fff" : "#888", flexShrink: 0 }}>
                    {LETRAS[opt.option_index]}
                  </span>
                  <span style={{ fontSize: 13, color: cor, lineHeight: 1.5 }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
          {resp !== undefined && (
            <div style={{ marginTop: 14, background: resp.correta ? "rgba(78,206,154,0.1)" : "rgba(239,68,68,0.1)", borderRadius: 12, padding: "12px 14px", border: `1px solid ${resp.correta ? "#4ece9a40" : "#ef444440"}` }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: resp.correta ? "#4ece9a" : "#ef4444", margin: "0 0 4px" }}>{resp.correta ? "✅ Correto!" : "❌ Incorreto"}</p>
              {q.explanation && <p style={{ fontSize: 12, color: "#aaa", margin: 0, lineHeight: 1.5 }}>{q.explanation}</p>}
              <button onClick={proximaQuestao} style={{ marginTop: 10, width: "100%", padding: "10px 0", background: "linear-gradient(90deg,#0057FF,#0ea5e9)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {qIdx + 1 >= questoes.length ? "Ver resultado →" : "Próxima →"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTADO ────────────────────────────────────────────────────────────────
  if (fase === "resultado") {
    const minha = ranking.findIndex(r => r.user_id === user?.id);
    const minhaPos = minha + 1;
    return (
      <div style={{ minHeight: "100dvh", background: "linear-gradient(135deg,#0a0f1e,#1a1a2e)", padding: 20 }}>
        <div style={{ textAlign: "center", paddingTop: 32, marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{minhaPos === 1 ? "🥇" : minhaPos === 2 ? "🥈" : minhaPos === 3 ? "🥉" : "🏆"}</div>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{minhaPos === 1 ? "Você ganhou!" : `${minhaPos}º lugar`}</p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>{acertos} de {total || questoes.length} acertos</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>🏆 Ranking final</p>
          {ranking.map((r, i) => (
            <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < ranking.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span style={{ fontSize: i < 3 ? 20 : 13, fontWeight: 700, color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.3)", width: 28, textAlign: "center" }}>
                {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: r.user_id === user?.id ? 800 : 500, color: r.user_id === user?.id ? "#0ea5e9" : "#fff", margin: 0 }}>
                  {r.nome} {r.user_id === user?.id ? "(você)" : ""}
                </p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4ece9a" }}>{r.certas}/{r.total}</span>
            </div>
          ))}
        </div>
        <button onClick={voltarAoLobby} style={{ width: "100%", padding: "14px 0", background: "linear-gradient(90deg,#0057FF,#0ea5e9)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Voltar ao lobby
        </button>
      </div>
    );
  }

  return null;
}
