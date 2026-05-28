// src/pages/olimpiadas/OlimpiadaHub.tsx
// Hub da olimpíada — Prova Oficial, Simulados, Admin

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { CORES } from "@/styles/theme";
import BottomNav from "@/components/layout/BottomNav";

const CONFIG: Record<string, { nome: string; emoji: string; cor: string; bg: string; desc: string }> = {
  OTQ:    { nome: "Olimpíada Tocantinense de Química",                              emoji: "🧪",  cor: "#0A7C4B", bg: "#EDFAF3", desc: "Seletiva estadual do Tocantins" },
  OBQ:    { nome: "Olimpíada Brasileira de Química",                                emoji: "🥇",  cor: "#7C3AED", bg: "#F3F0FF", desc: "Principal olimpíada de química do Brasil" },
  OQCMTO: { nome: "1ª Olimpíada de Química dos Colégios Militares do Tocantins",   emoji: "🎖️", cor: "#1B3A1B", bg: "#F0F4F0", desc: "Fase única · 30 questões · 120 min · 02/10/2025" },
};

export default function OlimpiadaHub() {
  const { id = "OTQ" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const cfg = CONFIG[id.toUpperCase()] ?? CONFIG.OTQ;
  const isAdmin = (profile as any)?.role === "admin" || (profile as any)?.role === "super_admin";

  const [prova, setProva] = useState<any>(null);
  const [tentativa, setTentativa] = useState<any>(null);
  const [, setSimulados] = useState<any[]>([]);

  useEffect(() => { carregarDados(); }, [id]);

  async function carregarDados() {
    const { data: ev } = await supabase
      .from("eventos_certificaveis").select("id").eq("sigla", id.toUpperCase()).single();
    if (!ev) return;

    const { data: p } = await supabase
      .from("provas_olimpiada").select("*").eq("evento_id", ev.id).eq("ativa", true).single();
    setProva(p);

    if (p && user?.id) {
      const { data: t } = await supabase
        .from("tentativas_prova").select("*").eq("prova_id", p.id).eq("user_id", user.id).single();
      setTentativa(t);
    }

    const { data: sims } = await supabase
      .from("mini_simulados").select("id,titulo").eq("trilha_id", ev.id).limit(5);
    setSimulados(sims ?? []);
  }

  const acoes = [
    ...(prova ? [{
      id: "prova",
      emoji: "📝",
      titulo: "Prova Oficial",
      desc: tentativa?.status === "finalizado"
        ? `✅ Concluída — Nota: ${tentativa.nota?.toFixed(1)}`
        : tentativa?.status === "em_andamento"
        ? "⏳ Em andamento — continuar"
        : `${prova.total_questoes} questões · ${prova.duracao_minutos / 60}h · Modo bloqueado`,
      cor: "#1a3a6e",
      bg: "#eef2ff",
      onClick: () => navigate(`/olimpiada/${id}/prova/${prova.id}`),
      destaque: true,
    }] : []),
    {
      id: "simulado",
      emoji: "🎯",
      titulo: "Simulados de Treino",
      desc: "Pratique com questões no estilo da olimpíada",
      cor: cfg.cor,
      bg: cfg.bg,
      onClick: () => navigate(`/olimpiada/${id}/simulados`),
    },
    {
      id: "trilha",
      emoji: "📚",
      titulo: "Estudar por Trilha",
      desc: "Conteúdo → exemplos → exercícios",
      cor: "#f59e0b",
      bg: "#fffbeb",
      onClick: () => navigate(`/vestibular/${id}`),
    },
    {
      id: "certificado",
      emoji: "📜",
      titulo: "Meus Certificados",
      desc: "Ver certificados emitidos",
      cor: "#0A7C4B",
      bg: "#EDFAF3",
      onClick: () => navigate("/certificados"),
    },
    ...(isAdmin ? [{
      id: "admin",
      emoji: "⚙️",
      titulo: "Admin Olimpíada",
      desc: "Gerenciar provas, questões e certificados",
      cor: "#6b7280",
      bg: "#f9fafb",
      onClick: () => navigate(`/olimpiada/${id}/admin`),
    }] : []),
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100dvh", background:CORES.bg }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${cfg.cor}, ${cfg.cor}cc)`, padding:"16px 16px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <button onClick={() => navigate(-1)} style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:22, fontWeight:800, color:"#fff", margin:0 }}>{cfg.emoji} {id.toUpperCase()}</p>
            <p style={{ fontSize:12, color:"rgba(255,255,255,0.75)", margin:0 }}>{cfg.nome}</p>
          </div>
        </div>

        {/* Info rápida da OQCMTO */}
        {id.toUpperCase() === "OQCMTO" && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
            {[
              { emoji:"📅", label:"02/10/2025" },
              { emoji:"📝", label:"30 questões" },
              { emoji:"⏱️", label:"120 min" },
              { emoji:"🎓", label:"Certif. ≥ 50%" },
            ].map((item, i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.15)", borderRadius:8, padding:"5px 10px", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:12 }}>{item.emoji}</span>
                <span style={{ fontSize:11, color:"#fff", fontWeight:600 }}>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Status da prova */}
        {prova && (
          <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"10px 14px", backdropFilter:"blur(10px)" }}>
            {tentativa?.status === "finalizado" ? (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,0.7)", margin:"0 0 2px" }}>Sua nota</p>
                  <p style={{ fontSize:24, fontWeight:800, color:"#fff", margin:0 }}>{tentativa.nota?.toFixed(1)}<span style={{ fontSize:13, fontWeight:400 }}>/100</span></p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,0.7)", margin:"0 0 2px" }}>Aproveitamento</p>
                  <p style={{ fontSize:20, fontWeight:700, color: tentativa.nota >= prova.nota_minima_certificado ? "#4ade80" : "#f87171", margin:0 }}>
                    {tentativa.nota?.toFixed(0)}%
                  </p>
                  {tentativa.nota >= prova.nota_minima_certificado
                    ? <p style={{ fontSize:10, color:"#4ade80", margin:0 }}>✅ Certificado disponível</p>
                    : <p style={{ fontSize:10, color:"#f87171", margin:0 }}>❌ Abaixo do mínimo ({prova.nota_minima_certificado}%)</p>
                  }
                </div>
              </div>
            ) : tentativa?.status === "em_andamento" ? (
              <p style={{ fontSize:13, color:"#fff", margin:0, fontWeight:600 }}>⏳ Prova em andamento — toque em "Prova Oficial" para continuar</p>
            ) : (
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.85)", margin:0 }}>
                Prova disponível: {prova.total_questoes} questões · {prova.duracao_minutos} min · Nota mínima {prova.nota_minima_certificado}% para certificado
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 90px" }}>
        {acoes.map(a => (
          <button key={a.id} onClick={a.onClick}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:16, borderRadius:16, background: (a as any).destaque ? `linear-gradient(135deg, ${a.cor}, ${a.cor}dd)` : CORES.bgCard, border:`2px solid ${a.cor}${ (a as any).destaque ? "00" : "33"}`, cursor:"pointer", textAlign:"left", marginBottom:10, boxShadow: (a as any).destaque ? `0 6px 20px ${a.cor}40` : `0 2px 10px ${a.cor}10` }}>
            <div style={{ width:48, height:48, borderRadius:14, background: (a as any).destaque ? "rgba(255,255,255,0.2)" : a.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{a.emoji}</div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:15, fontWeight:700, color: (a as any).destaque ? "#fff" : a.cor, margin:"0 0 2px" }}>{a.titulo}</p>
              <p style={{ fontSize:12, color: (a as any).destaque ? "rgba(255,255,255,0.75)" : CORES.textSub, margin:0 }}>{a.desc}</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke={ (a as any).destaque ? "#fff" : a.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
          </button>
        ))}

        {!prova && (
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:14, marginTop:4 }}>
            <p style={{ fontSize:12, color:"#92400e", margin:0 }}>⏳ Nenhuma prova ativa no momento. Volte na data do evento ou use os simulados para se preparar.</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
