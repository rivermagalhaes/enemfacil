// src/pages/sala/SalaVirtualProfessor.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Sala {
  id: string; codigo: string; nome: string; materia: string;
  vestibular: string; status: string; modo: string;
  tempo_limite_min: number | null; max_questoes: number;
  criada_em: string; iniciada_em: string | null; encerrada_em: string | null;
}
interface Participante {
  user_id: string; nome_exibicao: string | null; entrou_em: string; saiu_em: string | null;
}
interface AlunoStats {
  user_id: string; nome: string | null; certas: number; total: number; taxa: number;
}

const MATERIAS = [
  { id: "quimica",    label: "Química",       emoji: "🧪" },
  { id: "fisica",     label: "Física",        emoji: "⚡" },
  { id: "matematica", label: "Matemática",    emoji: "📐" },
  { id: "portugues",  label: "Português",     emoji: "📝" },
  { id: "ingles",     label: "Inglês",        emoji: "🌎" },
  { id: "redacao",    label: "Redação",       emoji: "✍️" },
  { id: "historia",   label: "História",      emoji: "📜" },
  { id: "geografia",  label: "Geografia",     emoji: "🌍" },
  { id: "biologia",   label: "Biologia",      emoji: "🔬" },
  { id: "geral",      label: "Geral",         emoji: "🎯" },
];

const VESTIBULARES = ["ENEM", "FUVEST", "UNICAMP", "ITA", "IME", "UNB"];

function gerarCodigo(materia: string, _vestibular: string, ano: number): string {
  const prefixos: Record<string, string> = {
    quimica: "QUI", fisica: "FIS", matematica: "MAT", portugues: "POR",
    ingles: "ING", redacao: "RED", historia: "HIS", geografia: "GEO",
    biologia: "BIO", geral: "GER",
  };
  const pref = prefixos[materia] ?? "SAL";
  const anoSufixo = String(ano).slice(2);
  const rand = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${pref}${anoSufixo}${rand}`;
}

export default function SalaVirtualProfessor() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [salas, setSalas] = useState<Sala[]>([]);
  const [salaAtiva, setSalaAtiva] = useState<Sala | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [alunosStats, setAlunosStats] = useState<AlunoStats[]>([]);
  const [modalCriar, setModalCriar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    materia: "quimica", vestibular: "ENEM", modo: "quiz",
    tempo_limite_min: "", max_questoes: "10",
  });

  useEffect(() => {
    if (!profile) return;
    const role = (profile as any).role;
    if (role !== "professor" && role !== "admin") { navigate("/"); return; }
    carregarSalas();
  }, [profile]);

  // Polling sala ativa
  useEffect(() => {
    if (!salaAtiva) return;
    const interval = setInterval(() => {
      carregarParticipantes(salaAtiva.id);
      carregarStats(salaAtiva.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [salaAtiva]);

  async function carregarSalas() {
    setLoading(true);
    const { data } = await supabase
      .from("salas_virtuais").select("*")
      .eq("professor_id", user!.id)
      .order("criada_em", { ascending: false });
    setSalas((data as Sala[]) ?? []);
    setLoading(false);
  }

  async function carregarParticipantes(salaId: string) {
    const { data } = await supabase
      .from("sala_participantes").select("*").eq("sala_id", salaId);
    setParticipantes((data as Participante[]) ?? []);
  }

  async function carregarStats(salaId: string) {
    const { data: resps } = await supabase
      .from("sala_respostas").select("user_id, correta")
      .eq("sala_id", salaId);
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

    const lista: AlunoStats[] = Object.entries(mapa)
      .map(([uid, v]) => ({
        user_id: uid, nome: nomes[uid] ?? "Aluno",
        certas: v.certas, total: v.total,
        taxa: v.total > 0 ? Math.round((v.certas / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.certas - a.certas);
    setAlunosStats(lista);
  }

  async function criarSala() {
    setSalvando(true);
    const ano = new Date().getFullYear();
    const codigo = gerarCodigo(form.materia, form.vestibular, ano);
    const matInfo = MATERIAS.find(m => m.id === form.materia);
    const nome = `${matInfo?.label ?? form.materia} ${form.vestibular} ${ano}`;

    const { data, error } = await supabase.from("salas_virtuais").insert({
      codigo,
      nome,
      materia: form.materia,
      vestibular: form.vestibular,
      modo: form.modo,
      tempo_limite_min: form.tempo_limite_min ? parseInt(form.tempo_limite_min) : null,
      max_questoes: parseInt(form.max_questoes) || 10,
      professor_id: user!.id,
      status: "aguardando",
    }).select().single();

    if (!error && data) {
      setSalas(prev => [data as Sala, ...prev]);
      setModalCriar(false);
      setForm({ materia: "quimica", vestibular: "ENEM", modo: "quiz", tempo_limite_min: "", max_questoes: "10" });
    }
    setSalvando(false);
  }

  async function iniciarSala(sala: Sala) {
    await supabase.from("salas_virtuais")
      .update({ status: "ativa", iniciada_em: new Date().toISOString() })
      .eq("id", sala.id);
    const updated = { ...sala, status: "ativa", iniciada_em: new Date().toISOString() };
    setSalas(prev => prev.map(s => s.id === sala.id ? updated : s));
    setSalaAtiva(updated);
    carregarParticipantes(sala.id);
    carregarStats(sala.id);
  }

  async function encerrarSala(sala: Sala) {
    await supabase.from("salas_virtuais")
      .update({ status: "encerrada", encerrada_em: new Date().toISOString() })
      .eq("id", sala.id);
    setSalas(prev => prev.map(s => s.id === sala.id ? { ...s, status: "encerrada" } : s));
    if (salaAtiva?.id === sala.id) setSalaAtiva(null);
  }

  async function excluirSala(salaId: string) {
    await supabase.from("salas_virtuais").delete().eq("id", salaId);
    setSalas(prev => prev.filter(s => s.id !== salaId));
    if (salaAtiva?.id === salaId) setSalaAtiva(null);
  }

  const STATUS_COR: Record<string, { bg: string; cor: string; label: string }> = {
    aguardando: { bg: "#FFF8E6", cor: "#92400e", label: "Aguardando" },
    ativa:      { bg: "#EDFAF3", cor: "#15803d", label: "● Ativa" },
    encerrada:  { bg: "#F4F6FB", cor: "#64748B", label: "Encerrada" },
  };

  const INPUT: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", fontSize: 13, color: "#fff", width: "100%", boxSizing: "border-box" as const, outline: "none" };

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0f1e", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#065C37,#0A7C4B)", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/professor")} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>🏫 Salas Virtuais</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>Gerencie suas aulas ao vivo</p>
          </div>
          <button
            onClick={() => setModalCriar(true)}
            style={{ padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            + Nova sala
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 20px 80px" }}>

        {/* Sala ativa — painel em tempo real */}
        {salaAtiva && (
          <div style={{ background: "linear-gradient(135deg,#065C37,#0A7C4B)", borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>● {salaAtiva.nome}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>Sala em andamento</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "0.1em" }}>{salaAtiva.codigo}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }}>código da sala</p>
              </div>
            </div>

            {/* Cards métricas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
              {[
                { val: participantes.length, lbl: "Alunos", emoji: "👥" },
                { val: alunosStats.length, lbl: "Respondendo", emoji: "✏️" },
                { val: alunosStats.length > 0 ? `${Math.round(alunosStats.reduce((s,a)=>s+a.taxa,0)/alunosStats.length)}%` : "—", lbl: "Acerto médio", emoji: "🎯" },
              ].map(m => (
                <div key={m.lbl} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <p style={{ fontSize: 16, margin: "0 0 2px" }}>{m.emoji}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 2px" }}>{m.val}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", margin: 0 }}>{m.lbl}</p>
                </div>
              ))}
            </div>

            {/* Ranking ao vivo */}
            {alunosStats.length > 0 && (
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>🏆 Ranking ao vivo</p>
                {alunosStats.slice(0, 8).map((a, i) => (
                  <div key={a.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < alunosStats.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span style={{ fontSize: i < 3 ? 16 : 12, width: 22, textAlign: "center" }}>
                      {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                    </span>
                    <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.nome}</p>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#4ece9a" }}>{a.certas}/{a.total}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>{a.taxa}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lista de participantes */}
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>👥 Participantes ({participantes.length})</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {participantes.map(p => (
                  <span key={p.user_id} style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", color: "#fff", borderRadius: 99, padding: "3px 10px" }}>
                    {p.nome_exibicao ?? "Aluno"}
                  </span>
                ))}
                {participantes.length === 0 && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>Aguardando alunos entrarem...</p>}
              </div>
            </div>

            <button
              onClick={() => encerrarSala(salaAtiva)}
              style={{ width: "100%", padding: "12px 0", background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              ⏹ Encerrar sala
            </button>
          </div>
        )}

        {/* Lista de salas */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#64748B", padding: 32 }}>Carregando salas...</p>
        ) : salas.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 36, margin: "0 0 8px" }}>🏫</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 4px" }}>Nenhuma sala criada</p>
            <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 16px" }}>Crie sua primeira sala virtual</p>
            <button onClick={() => setModalCriar(true)} style={{ padding: "10px 24px", background: "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + Criar sala
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {salas.map(sala => {
              const st = STATUS_COR[sala.status] ?? STATUS_COR.aguardando;
              return (
                <div key={sala.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 3px" }}>{sala.nome}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: "#0ea5e9", margin: "0 0 4px", letterSpacing: "0.1em" }}>{sala.codigo}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: st.bg, color: st.cor, borderRadius: 99, padding: "2px 8px" }}>{st.label}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "2px 8px" }}>{sala.max_questoes} questões</span>
                        {sala.tempo_limite_min && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "2px 8px" }}>⏱ {sala.tempo_limite_min}min</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {sala.status === "aguardando" && (
                      <button onClick={() => iniciarSala(sala)} style={{ flex: 1, padding: "9px 0", background: "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        ▶ Iniciar
                      </button>
                    )}
                    {sala.status === "ativa" && (
                      <button onClick={() => { setSalaAtiva(sala); carregarParticipantes(sala.id); carregarStats(sala.id); }} style={{ flex: 1, padding: "9px 0", background: "rgba(78,206,154,0.15)", color: "#4ece9a", border: "1px solid rgba(78,206,154,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        👁 Ver ao vivo
                      </button>
                    )}
                    {sala.status === "encerrada" && (
                      <button onClick={() => { setSalaAtiva(sala); carregarParticipantes(sala.id); carregarStats(sala.id); }} style={{ flex: 1, padding: "9px 0", background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        📊 Ver resultados
                      </button>
                    )}
                    <button onClick={() => excluirSala(sala.id)} style={{ padding: "9px 14px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal criar sala */}
      {modalCriar && (
        <>
          <div onClick={() => setModalCriar(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001, background: "#0f172a", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "90dvh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>🏫 Nova Sala Virtual</p>

            {/* Matéria */}
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Matéria</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 14 }}>
              {MATERIAS.map(m => (
                <button key={m.id} onClick={() => setForm(f => ({ ...f, materia: m.id }))} style={{
                  padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: form.materia === m.id ? "rgba(10,124,75,0.3)" : "rgba(255,255,255,0.05)",
                  outline: form.materia === m.id ? "1.5px solid #0A7C4B" : "none",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                  <span style={{ fontSize: 18 }}>{m.emoji}</span>
                  <span style={{ fontSize: 9, color: form.materia === m.id ? "#4ece9a" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>{m.label.slice(0, 5)}</span>
                </button>
              ))}
            </div>

            {/* Vestibular */}
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Vestibular</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {VESTIBULARES.map(v => (
                <button key={v} onClick={() => setForm(f => ({ ...f, vestibular: v }))} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", background: form.vestibular === v ? "rgba(10,124,75,0.3)" : "rgba(255,255,255,0.05)", color: form.vestibular === v ? "#4ece9a" : "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, outline: form.vestibular === v ? "1.5px solid #0A7C4B" : "none" }}>
                  {v}
                </button>
              ))}
            </div>

            {/* Modo */}
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Modo</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 14 }}>
              {[
                { id: "quiz", label: "Quiz", emoji: "🧠", desc: "Ao vivo" },
                { id: "prova", label: "Prova", emoji: "📝", desc: "Com tempo" },
                { id: "ranking", label: "Ranking", emoji: "🏆", desc: "Competitivo" },
              ].map(m => (
                <button key={m.id} onClick={() => setForm(f => ({ ...f, modo: m.id }))} style={{ padding: "10px 6px", borderRadius: 10, border: "none", cursor: "pointer", background: form.modo === m.id ? "rgba(10,124,75,0.3)" : "rgba(255,255,255,0.05)", outline: form.modo === m.id ? "1.5px solid #0A7C4B" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 20 }}>{m.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: form.modo === m.id ? "#4ece9a" : "#fff" }}>{m.label}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{m.desc}</span>
                </button>
              ))}
            </div>

            {/* Configurações */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Nº de questões</p>
                <input type="number" value={form.max_questoes} min={1} max={50}
                  onChange={e => setForm(f => ({ ...f, max_questoes: e.target.value }))}
                  style={INPUT} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Tempo (min)</p>
                <input type="number" value={form.tempo_limite_min} placeholder="Sem limite"
                  onChange={e => setForm(f => ({ ...f, tempo_limite_min: e.target.value }))}
                  style={INPUT} />
              </div>
            </div>

            {/* Preview do nome */}
            <div style={{ background: "rgba(10,124,75,0.1)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(10,124,75,0.3)" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 2px" }}>Nome da sala</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>
                {MATERIAS.find(m => m.id === form.materia)?.label} {form.vestibular} {new Date().getFullYear()}
              </p>
            </div>

            <button
              onClick={criarSala}
              disabled={salvando}
              style={{ width: "100%", padding: "14px 0", background: salvando ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer" }}
            >
              {salvando ? "Criando..." : "✅ Criar sala"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
