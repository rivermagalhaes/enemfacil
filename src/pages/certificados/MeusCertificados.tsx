// src/pages/certificados/MeusCertificados.tsx
// Tela do aluno: visualizar, baixar e compartilhar certificados

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { CORES } from "@/styles/theme";
import BottomNav from "@/components/layout/BottomNav";

interface Certificado {
  id: string;
  codigo: string;
  tipo_certificado: string;
  medalha?: string;
  nota?: number;
  percentual?: number;
  emitido_em: string;
  pdf_url?: string;
  valido: boolean;
  downloads: number;
  eventos_certificaveis: {
    nome: string;
    sigla: string;
    disciplina?: string;
    ano: number;
  };
}

const TIPO_CONFIG: Record<string, { label: string; emoji: string; cor: string; bg: string }> = {
  participacao:   { label: "Participação",    emoji: "📜", cor: "#3b82f6", bg: "#eff6ff" },
  conclusao:      { label: "Conclusão",       emoji: "🎓", cor: "#10b981", bg: "#ecfdf5" },
  desempenho:     { label: "Desempenho",      emoji: "📈", cor: "#8b5cf6", bg: "#f5f3ff" },
  ouro:           { label: "Medalha de Ouro", emoji: "🥇", cor: "#f59e0b", bg: "#fffbeb" },
  prata:          { label: "Medalha de Prata",emoji: "🥈", cor: "#6b7280", bg: "#f9fafb" },
  bronze:         { label: "Medalha de Bronze",emoji:"🥉", cor: "#92400e", bg: "#fef9ee" },
  mencao_honrosa: { label: "Menção Honrosa",  emoji: "⭐", cor: "#ec4899", bg: "#fdf2f8" },
  organizador:    { label: "Organização",     emoji: "🏛️", cor: "#0284c7", bg: "#e0f2fe" },
  professor:      { label: "Orientação",      emoji: "👨‍🏫", cor: "#059669", bg: "#ecfdf5" },
};

export default function MeusCertificados() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [certAberto, setCertAberto] = useState<Certificado | null>(null);

  useEffect(() => {
    if (user?.id) carregarCertificados();
  }, [user?.id]);

  async function carregarCertificados() {
    const { data } = await supabase
      .from("certificados")
      .select("*, eventos_certificaveis(nome, sigla, disciplina, ano)")
      .eq("user_id", user!.id)
      .eq("valido", true)
      .order("emitido_em", { ascending: false });
    setCertificados(data ?? []);
    setLoading(false);
  }

  async function registrarDownload(cert: Certificado) {
    await supabase.from("certificados")
      .update({ downloads: (cert.downloads ?? 0) + 1 })
      .eq("id", cert.id);
    if (cert.pdf_url) window.open(cert.pdf_url, "_blank");
  }

  async function compartilhar(cert: Certificado) {
    const url = `${window.location.origin}/certificado/${cert.codigo}`;
    if (navigator.share) {
      await navigator.share({ title: `Certificado — ${cert.eventos_certificaveis.nome}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copiado!");
    }
    await supabase.from("certificados")
      .update({ compartilhamentos: 1 })
      .eq("id", cert.id);
  }

  const filtrados = filtro === "todos"
    ? certificados
    : certificados.filter(c => c.tipo_certificado === filtro);

  const tipos = [...new Set(certificados.map(c => c.tipo_certificado))];

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100dvh", background:CORES.bg }}>

      {/* Modal de visualização */}
      {certAberto && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, overflow:"hidden" }}>
            {/* Preview HTML do certificado */}
            <div style={{ padding:16, background:CORES.bg, borderBottom:`1px solid ${CORES.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <p style={{ fontWeight:700, fontSize:14, margin:0 }}>📜 Visualizar Certificado</p>
              <button onClick={() => setCertAberto(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:CORES.sub }}>✕</button>
            </div>
            <div style={{ padding:20, display:"flex", flexDirection:"column", gap:12 }}>
              {/* Info */}
              <div style={{ background:CORES.bg, borderRadius:12, padding:14 }}>
                <p style={{ fontSize:11, color:CORES.sub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 8px" }}>Detalhes</p>
                <p style={{ fontSize:14, fontWeight:700, margin:"0 0 4px" }}>{certAberto.eventos_certificaveis.nome}</p>
                <p style={{ fontSize:12, color:CORES.sub, margin:0 }}>Código: <strong style={{ color:CORES.text }}>{certAberto.codigo}</strong></p>
                <p style={{ fontSize:12, color:CORES.sub, margin:"4px 0 0" }}>
                  Emitido em: {new Date(certAberto.emitido_em).toLocaleDateString("pt-BR")}
                </p>
                {certAberto.nota && <p style={{ fontSize:12, color:CORES.sub, margin:"4px 0 0" }}>Nota: <strong>{certAberto.nota}</strong></p>}
                {certAberto.percentual && <p style={{ fontSize:12, color:CORES.sub, margin:"4px 0 0" }}>Aproveitamento: <strong>{certAberto.percentual}%</strong></p>}
              </div>

              {/* QR Code */}
              <div style={{ display:"flex", justifyContent:"center", padding:12, background:CORES.bg, borderRadius:12 }}>
                <div style={{ textAlign:"center" }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${window.location.origin}/certificado/${certAberto.codigo}`)}`}
                    alt="QR Code"
                    style={{ borderRadius:8 }}
                  />
                  <p style={{ fontSize:11, color:CORES.sub, marginTop:6 }}>Escaneie para validar</p>
                </div>
              </div>

              {/* Botões */}
              <div style={{ display:"flex", gap:8 }}>
                <button
                  onClick={() => registrarDownload(certAberto)}
                  style={{ flex:1, padding:"12px 0", background:"#0A7C4B", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" }}
                >
                  ⬇️ Baixar PDF
                </button>
                <button
                  onClick={() => compartilhar(certAberto)}
                  style={{ flex:1, padding:"12px 0", background:CORES.primary, color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" }}
                >
                  🔗 Compartilhar
                </button>
                <button
                  onClick={() => navigate(`/certificado/${certAberto.codigo}`)}
                  style={{ padding:"12px 14px", background:CORES.bg, color:CORES.sub, border:`1px solid ${CORES.border}`, borderRadius:10, fontSize:13, cursor:"pointer" }}
                >
                  🌐
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, #1a3a6e, #0057FF)`, padding:"16px 16px 20px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <button onClick={() => navigate(-1)} style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div>
            <p style={{ fontSize:18, fontWeight:700, color:"#fff", margin:0 }}>📜 Meus Certificados</p>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.7)", margin:0 }}>{certificados.length} certificado{certificados.length !== 1 ? "s" : ""} emitido{certificados.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
          {["todos", ...tipos].map(t => (
            <button
              key={t}
              onClick={() => setFiltro(t)}
              style={{
                padding:"5px 12px", borderRadius:99, fontSize:11, fontWeight:600,
                border:"none", cursor:"pointer", whiteSpace:"nowrap",
                background: filtro === t ? "#fff" : "rgba(255,255,255,0.15)",
                color: filtro === t ? "#1a3a6e" : "#fff",
              }}
            >
              {t === "todos" ? "Todos" : TIPO_CONFIG[t]?.emoji + " " + TIPO_CONFIG[t]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 90px" }}>
        {loading && <p style={{ textAlign:"center", color:CORES.sub, padding:32 }}>Carregando...</p>}

        {!loading && filtrados.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 20px" }}>
            <p style={{ fontSize:48, margin:"0 0 12px" }}>📜</p>
            <p style={{ fontSize:15, fontWeight:600, color:CORES.text, margin:"0 0 6px" }}>Nenhum certificado ainda</p>
            <p style={{ fontSize:13, color:CORES.sub }}>Complete olimpíadas e simulados para receber seus certificados!</p>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtrados.map(cert => {
            const cfg = TIPO_CONFIG[cert.tipo_certificado] ?? TIPO_CONFIG.participacao;
            return (
              <div
                key={cert.id}
                onClick={() => setCertAberto(cert)}
                style={{
                  display:"flex", alignItems:"center", gap:14,
                  padding:"14px 16px", borderRadius:16,
                  background:"#fff", border:`1.5px solid ${cfg.cor}22`,
                  cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                {/* Ícone */}
                <div style={{
                  width:52, height:52, borderRadius:14, background:cfg.bg,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:26, flexShrink:0, border:`1.5px solid ${cfg.cor}33`,
                }}>
                  {cfg.emoji}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:cfg.cor, background:cfg.bg, borderRadius:4, padding:"1px 6px" }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize:10, color:CORES.sub }}>{cert.eventos_certificaveis.ano}</span>
                  </div>
                  <p style={{ fontSize:14, fontWeight:700, color:CORES.text, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {cert.eventos_certificaveis.nome}
                  </p>
                  <p style={{ fontSize:11, color:CORES.sub, margin:0 }}>
                    {cert.codigo} · {new Date(cert.emitido_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={cfg.cor} strokeWidth="2">
                  <path d="M6 4l4 4-4 4"/>
                </svg>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
