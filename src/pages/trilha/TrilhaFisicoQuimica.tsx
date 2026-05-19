// src/pages/trilha/TrilhaFisicoQuimica.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";
import { addXP } from "@/lib/xpService";
import MapaMental from "@/components/MapaMental";
import ModalUnidade from "@/components/trilha/ModalUnidade";

const UNIDADES = [
  { id: "introducao-fisicoquimica", numero: 1, titulo: "Introdução à Físico-Química", emoji: "⚗️", cor: "#6366f1", bg: "#eef2ff", topic: null, topicos: ["O que é físico-química", "Sistemas e transformações", "Grandezas físicas e químicas", "Unidades e medidas"], xp: 50 },
  { id: "termoquimica", numero: 2, titulo: "Termoquímica", emoji: "🔥", cor: "#ef4444", bg: "#fef2f2", topic: "termoquimica", topicos: ["Reações endotérmicas e exotérmicas", "Entalpia (ΔH)", "Lei de Hess", "Energia de ligação"], xp: 100 },
  { id: "cinetica-quimica", numero: 3, titulo: "Cinética Química", emoji: "⚡", cor: "#f59e0b", bg: "#fffbeb", topic: "cinetica-quimica", topicos: ["Velocidade das reações", "Teoria das colisões", "Fatores: temperatura, concentração, catalisadores", "Energia de ativação"], xp: 100 },
  { id: "equilibrio-quimico", numero: 4, titulo: "Equilíbrio Químico", emoji: "⚖️", cor: "#10b981", bg: "#ecfdf5", topic: "equilibrio-quimico", topicos: ["Reações reversíveis", "Constante de equilíbrio (Kc)", "Princípio de Le Chatelier", "Deslocamento do equilíbrio"], xp: 120 },
  { id: "equilibrio-ionico", numero: 5, titulo: "Equilíbrio Iônico", emoji: "🧫", cor: "#8b5cf6", bg: "#f5f3ff", topic: "equilibrio-ionico", topicos: ["Ácidos e bases (Arrhenius, Brønsted-Lowry)", "pH e pOH", "Escala de pH", "Força de ácidos e bases"], xp: 100 },
  { id: "eletroquimica", numero: 6, titulo: "Eletroquímica", emoji: "🔋", cor: "#0ea5e9", bg: "#e0f2fe", topic: "eletroquimica", topicos: ["Reações de oxirredução", "Pilhas (células galvânicas)", "Potencial de eletrodo", "Eletrólise"], xp: 120 },
  { id: "propriedades-coligativas", numero: 7, titulo: "Soluções e Propriedades Coligativas", emoji: "🫧", cor: "#3b82f6", bg: "#eff6ff", topic: "propriedades-coligativas", topicos: ["Tipos de soluções", "Pressão de vapor", "Ebulição e congelamento", "Osmose"], xp: 100 },
  { id: "gases-fisicoquimica", numero: 8, titulo: "Gases", emoji: "💨", cor: "#06b6d4", bg: "#ecfeff", topic: "gases", topicos: ["Propriedades dos gases", "Transformações gasosas", "Lei dos gases ideais", "Pressão, volume e temperatura"], xp: 100 },
  { id: "aplicacoes-cotidiano", numero: 9, titulo: "Aplicações no Cotidiano", emoji: "🌍", cor: "#22c55e", bg: "#f0fdf4", topic: null, topicos: ["Energia e combustíveis", "Processos industriais", "Química ambiental", "Tecnologias: baterias e materiais"], xp: 80 },
];

interface Progresso { unidade_id: string; status: "nao_iniciado" | "em_andamento" | "concluido"; xp_ganho: number; }

export default function TrilhaFisicoQuimica() {
  const { vestibular = "ENEM" } = useParams<{ vestibular: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progresso, setProgresso] = useState<Record<string, Progresso>>({});
  const [unidadeAberta, setUnidadeAberta] = useState<typeof UNIDADES[0] | null>(null);
  const [mapaMentalAberto, setMapaMentalAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [materiais, setMateriais] = useState<{id:string;titulo:string;descricao:string;tipo:string;url:string;topic:string|null}[]>([]);
  const vestUpper = vestibular.toUpperCase();
  const corVest = vestUpper === "ITA" ? "#003D80" : vestUpper === "IME" ? "#1a3a6e" : vestUpper === "FUVEST" ? "#8B0000" : vestUpper === "UNICAMP" ? "#005C97" : vestUpper === "UNB" ? "#006400" : "#0057FF";

  useEffect(() => { if (user?.id) carregarProgresso(); }, [user?.id]);

  async function carregarProgresso() {
    const [{ data: prog }, { data: mats }] = await Promise.all([
      supabase.from("trilha_progresso").select("unidade_id, status, xp_ganho").eq("user_id", user!.id).eq("vestibular", vestUpper).eq("materia", "fisicoquimica"),
      supabase.from("materiais").select("id,titulo,descricao,tipo,url,topic").eq("vestibular", vestUpper).eq("materia", "fisicoquimica").eq("ativo", true).order("criado_em", { ascending: false }),
    ]);
    const map: Record<string, any> = {};
    prog?.forEach(p => { map[p.unidade_id] = p; });
    setProgresso(map);
    setMateriais(mats ?? []);
    setLoading(false);
  }

  async function concluirUnidade(unidadeId: string, xp: number) {
    if (!user?.id) return;
    await supabase.from("trilha_progresso").upsert({ user_id: user.id, vestibular: vestUpper, materia: "fisicoquimica", unidade_id: unidadeId, status: "concluido", xp_ganho: xp, atualizado_em: new Date().toISOString() }, { onConflict: "user_id,vestibular,materia,unidade_id" });
    await addXP(user.id, xp);
    setProgresso(prev => ({ ...prev, [unidadeId]: { unidade_id: unidadeId, status: "concluido", xp_ganho: xp } }));
  }

  const totalXP = Object.values(progresso).reduce((acc, p) => acc + (p.xp_ganho ?? 0), 0);
  const concluidas = Object.values(progresso).filter(p => p.status === "concluido").length;
  const pct = Math.round((concluidas / UNIDADES.length) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>

      {mapaMentalAberto && (
        <MapaMental unidades={UNIDADES} titulo="Físico-Química — Ensino Médio" onClose={() => setMapaMentalAberto(false)}
          onSelecionarUnidade={(id) => { const u = UNIDADES.find(u => u.id === id); if (u) setUnidadeAberta(u); }} progresso={progresso} />
      )}

      {unidadeAberta && (
        <ModalUnidade unidade={unidadeAberta} vestibular={vestUpper} materia="fisicoquimica"
          onClose={() => setUnidadeAberta(null)} onConcluir={() => concluirUnidade(unidadeAberta.id, unidadeAberta.xp)} />
      )}

      <div style={{ background: `linear-gradient(135deg, ${corVest}, ${corVest}cc)`, padding: "16px 16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>⚗️ Trilha de Físico-Química</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{vestUpper} · Ensino Médio</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#fbbf24", margin: 0 }}>⚡ {totalXP} XP</p>
            <button onClick={() => setMapaMentalAberto(true)} style={{ fontSize: 10, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 99, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>🗺️ Mapa Mental</button>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Progresso geral</span>
            <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #fbbf24, #f59e0b)", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>
        {loading ? <p style={{ textAlign: "center", color: CORES.textSub, padding: 32 }}>Carregando trilha...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {UNIDADES.map((u, i) => {
              const prog = progresso[u.id];
              const concluida = prog?.status === "concluido";
              const anterior = i === 0 || progresso[UNIDADES[i - 1].id]?.status === "concluido";
              const bloqueada = !anterior && !concluida;
              return (
                <button key={u.id} onClick={() => !bloqueada && setUnidadeAberta(u)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, background: bloqueada ? "#f9fafb" : concluida ? u.bg : CORES.bgCard, border: concluida ? `2px solid ${u.cor}44` : bloqueada ? "1.5px solid #e5e7eb" : `1.5px solid ${u.cor}22`, cursor: bloqueada ? "not-allowed" : "pointer", textAlign: "left", boxShadow: concluida ? `0 2px 12px ${u.cor}20` : "0 1px 4px rgba(0,0,0,0.06)", opacity: bloqueada ? 0.6 : 1 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: bloqueada ? "#f3f4f6" : u.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: `1.5px solid ${bloqueada ? "#e5e7eb" : u.cor + "33"}`, position: "relative" }}>
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
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {u.topic ? <span style={{ fontSize: 10, color: bloqueada ? "#9ca3af" : u.cor, fontWeight: 600 }}>📝 questões</span> : <span style={{ fontSize: 10, color: "#9ca3af" }}>teoria</span>}
                    {!bloqueada && <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={u.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 16, background: "#fef9ec", borderRadius: 12, padding: "12px 14px", border: "1px solid #fcd34d" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e", margin: "0 0 4px" }}>💡 Como funciona</p>
          <p style={{ fontSize: 12, color: CORES.textSub, margin: 0, lineHeight: 1.6 }}>Complete as unidades em ordem. Cada unidade tem questões reais filtradas por tema. Ganhe XP ao concluir!</p>
        </div>
        {/* MATERIAIS DO VESTIBULAR */}
        {materiais.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: CORES.textSub, textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 10px" }}>
              Materiais {vestUpper}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {materiais.map(m => {
                const icone = m.tipo === "pdf" ? "📄" : m.tipo === "video" ? "🎥" : m.tipo === "ppt" ? "📊" : m.tipo === "excel" ? "📗" : "📦";
                return (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: CORES.bgCard, border: "1px solid " + CORES.border, textDecoration: "none" }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{icone}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: CORES.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.titulo}</p>
                      {m.descricao && <p style={{ fontSize: 11, color: CORES.textSub, margin: "2px 0 0" }}>{m.descricao}</p>}
                      {m.topic && <span style={{ fontSize: 10, color: corVest, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{m.topic}</span>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={CORES.textSub} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
                  </a>
                );
              })}
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
