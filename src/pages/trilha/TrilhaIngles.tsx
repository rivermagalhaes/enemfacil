// src/pages/trilha/TrilhaIngles.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

const UNIDADES = [
  { id: "reading-comprehension", numero: 1, titulo: "Reading Comprehension", emoji: "📰", cor: "#0369a1", bg: "#e0f2fe", topic: null, topicos: ["Main idea", "Inference", "Vocabulary in context", "Text structure"], xp: 80 },
  { id: "grammar", numero: 2, titulo: "Grammar & Structure", emoji: "📝", cor: "#7c3aed", bg: "#f5f3ff", topic: null, topicos: ["Verb tenses", "Conditionals", "Modal verbs", "Passive voice"], xp: 100 },
  { id: "vocabulary", numero: 3, titulo: "Vocabulary & Idioms", emoji: "💬", cor: "#0891b2", bg: "#ecfeff", topic: null, topicos: ["Academic vocabulary", "False cognates", "Phrasal verbs", "Idioms"], xp: 80 },
  { id: "scientific-english", numero: 4, titulo: "Scientific English", emoji: "🔬", cor: "#059669", bg: "#ecfdf5", topic: null, topicos: ["Technical terminology", "Research papers", "Abstract reading", "Scientific writing"], xp: 100 },
  { id: "writing", numero: 5, titulo: "Writing & Essay", emoji: "✍️", cor: "#dc2626", bg: "#fef2f2", topic: null, topicos: ["Essay structure", "Argumentation", "Cohesion devices", "Academic writing"], xp: 120 },
];

const COR_VEST: Record<string, string> = { ITA: "#003D80", IME: "#1a3a6e", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

export default function TrilhaIngles() {
  const { vestibular = "ITA" } = useParams<{ vestibular: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progresso, setProgresso] = useState<Record<string, any>>({});
  const [unidadeAberta, setUnidadeAberta] = useState<typeof UNIDADES[0] | null>(null);
  const [loading, setLoading] = useState(true);
  const vestUpper = vestibular.toUpperCase();
  const corVest = COR_VEST[vestUpper] ?? "#003D80";

  useEffect(() => { if (user?.id) carregarProgresso(); }, [user?.id]);

  async function carregarProgresso() {
    const { data } = await supabase.from("trilha_progresso").select("unidade_id, status, xp_ganho").eq("user_id", user!.id).eq("vestibular", vestUpper).eq("materia", "ingles");
    const map: Record<string, any> = {};
    data?.forEach(p => { map[p.unidade_id] = p; });
    setProgresso(map); setLoading(false);
  }

  async function concluirUnidade(unidadeId: string, xp: number) {
    if (!user?.id) return;
    await supabase.from("trilha_progresso").upsert({ user_id: user.id, vestibular: vestUpper, materia: "ingles", unidade_id: unidadeId, status: "concluido", xp_ganho: xp, atualizado_em: new Date().toISOString() }, { onConflict: "user_id,vestibular,materia,unidade_id" });
    setProgresso(prev => ({ ...prev, [unidadeId]: { status: "concluido", xp_ganho: xp } }));
    setUnidadeAberta(null);
  }

  const totalXP = Object.values(progresso).reduce((acc: number, p: any) => acc + (p.xp_ganho ?? 0), 0);
  const concluidas = Object.values(progresso).filter((p: any) => p.status === "concluido").length;
  const pct = Math.round((concluidas / UNIDADES.length) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      {unidadeAberta && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "90dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ background: unidadeAberta.cor, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{unidadeAberta.emoji}</span>
              <div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{unidadeAberta.titulo}</p></div>
              <button onClick={() => setUnidadeAberta(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 32, margin: "0 0 12px" }}>🇺🇸</p>
              <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>{unidadeAberta.titulo}</p>
              <div style={{ textAlign: "left", background: unidadeAberta.bg, borderRadius: 12, padding: 14, marginBottom: 20 }}>
                {unidadeAberta.topicos.map((t, i) => <p key={i} style={{ fontSize: 13, margin: "0 0 6px" }}>• {t}</p>)}
              </div>
              <button onClick={() => concluirUnidade(unidadeAberta.id, unidadeAberta.xp)} style={{ width: "100%", padding: "12px 0", background: unidadeAberta.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Mark as complete ✓ +{unidadeAberta.xp} XP
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ background: `linear-gradient(135deg, ${corVest}, ${corVest}dd)`, padding: "16px 16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>🇺🇸 English Track</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{vestUpper} · Scientific English</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#fbbf24", margin: 0 }}>⚡ {totalXP} XP</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", margin: 0 }}>{concluidas}/{UNIDADES.length} units</p>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Overall progress</span>
            <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #fbbf24, #f59e0b)", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>
        {loading ? <p style={{ textAlign: "center", padding: 32 }}>Loading...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {UNIDADES.map((u, i) => {
              const prog = progresso[u.id];
              const concluida = prog?.status === "concluido";
              const anterior = i === 0 || progresso[UNIDADES[i-1].id]?.status === "concluido";
              const bloqueada = !anterior && !concluida;
              return (
                <button key={u.id} onClick={() => !bloqueada && setUnidadeAberta(u)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, background: bloqueada ? "#f9fafb" : concluida ? u.bg : CORES.bgCard, border: concluida ? `2px solid ${u.cor}44` : bloqueada ? "1.5px solid #e5e7eb" : `1.5px solid ${u.cor}22`, cursor: bloqueada ? "not-allowed" : "pointer", textAlign: "left", opacity: bloqueada ? 0.6 : 1 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: bloqueada ? "#f3f4f6" : u.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, position: "relative" }}>
                    {bloqueada ? "🔒" : u.emoji}
                    {concluida && <div style={{ position: "absolute", bottom: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", border: "2px solid #fff" }}>✓</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: bloqueada ? "#9ca3af" : u.cor, background: bloqueada ? "#f3f4f6" : u.bg, borderRadius: 4, padding: "1px 6px" }}>U{u.numero}</span>
                      {concluida && <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e" }}>+{u.xp} XP ✓</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: bloqueada ? "#9ca3af" : CORES.text, margin: "0 0 3px" }}>{u.titulo}</p>
                    <p style={{ fontSize: 11, color: CORES.textSub, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.topicos.slice(0, 2).join(" · ")}</p>
                  </div>
                  {!bloqueada && <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={u.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
