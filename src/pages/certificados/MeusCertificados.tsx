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
  participacao:   { label: "Participação",     emoji: "📜", cor: "#3b82f6", bg: "#eff6ff" },
  conclusao:      { label: "Conclusão",        emoji: "🎓", cor: "#10b981", bg: "#ecfdf5" },
  desempenho:     { label: "Desempenho",       emoji: "📈", cor: "#8b5cf6", bg: "#f5f3ff" },
  ouro:           { label: "Medalha de Ouro",  emoji: "🥇", cor: "#f59e0b", bg: "#fffbeb" },
  prata:          { label: "Medalha de Prata", emoji: "🥈", cor: "#6b7280", bg: "#f9fafb" },
  bronze:         { label: "Medalha de Bronze",emoji: "🥉", cor: "#92400e", bg: "#fef9ee" },
  mencao_honrosa: { label: "Menção Honrosa",   emoji: "⭐", cor: "#ec4899", bg: "#fdf2f8" },
  organizador:    { label: "Organização",      emoji: "🏛️", cor: "#0284c7", bg: "#e0f2fe" },
  professor:      { label: "Orientação",       emoji: "👨‍🏫", cor: "#059669", bg: "#ecfdf5" },
};

export default function MeusCertificados() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [certAberto, setCertAberto] = useState<Certificado | null>(null);
  const [htmlCert, setHtmlCert] = useState<string>("");
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [abaModal, setAbaModal] = useState<"preview"|"info">("preview");

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

  async function abrirCertificado(cert: Certificado) {
    setCertAberto(cert);
    setAbaModal("preview");
    setHtmlCert("");
    if (!cert.pdf_url) return;
    setLoadingHtml(true);
    try {
      const res = await fetch(cert.pdf_url);
      const html = await res.text();
      setHtmlCert(html);
    } catch {
      setHtmlCert("");
    }
    setLoadingHtml(false);
  }

  async function registrarDownload(cert: Certificado) {
    await supabase.from("certificados")
      .update({ downloads: (cert.downloads ?? 0) + 1 })
      .eq("id", cert.id);
    // Abre o HTML como página para imprimir/salvar como PDF
    if (htmlCert) {
      const blob = new Blob([htmlCert], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } else if (cert.pdf_url) {
      window.open(cert.pdf_url, "_blank");
    }
  }

  async function compartilhar(cert: Certificado) {
    const url = `${window.location.origin}/certificado/${cert.codigo}`;
    if (navigator.share) {
      await navigator.share({ title: `Certificado — ${cert.eventos_certificaveis.nome}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copiado!");
    }
    await supabase.from("certificados").update({ compartilhamentos: 1 }).eq("id", cert.id);
  }

  const filtrados = filtro === "todos"
    ? certificados
    : certificados.filter(c => c.tipo_certificado === filtro);

  const tipos = [...new Set(certificados.map(c => c.tipo_certificado))];

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100dvh", background:CORES.bg }}>

      {/* Modal de visualização */}
      {certAberto && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:12 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:600, maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>

            {/* Header modal */}
            <div style={{ padding:"12px 16px", borderBottom:`1px solid rgba(0,0,0,0.08)`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <p style={{ fontWeight:700, fontSize:14, margin:0 }}>
                {TIPO_CONFIG[certAberto.tipo_certificado]?.emoji} {certAberto.eventos_certificaveis.nome}
              </p>
              <button onClick={() => setCertAberto(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:CORES.textSub }}>✕</button>
            </div>

            {/* Abas */}
            <div style={{ display:"flex", borderBottom:`1px solid rgba(0,0,0,0.08)`, flexShrink:0 }}>
              {[
                { id:"preview", label:"👁️ Visualizar" },
                { id:"info",    label:"ℹ️ Detalhes" },
              ].map(a => (
                <button key={a.id} onClick={() => setAbaModal(a.id as any)}
                  style={{ flex:1, padding:"10px 0", border:"none", background:"none", fontSize:12, fontWeight:600,
                    color: abaModal===a.id ? "#1a3a6e" : CORES.textSub,
                    borderBottom: abaModal===a.id ? "2px solid #1a3a6e" : "2px solid transparent",
                    cursor:"pointer" }}>
                  {a.label}
                </button>
              ))}
            </div>

            {/* Conteúdo */}
            <div style={{ flex:1, overflowY:"auto" }}>

              {/* Preview do certificado */}
              {abaModal === "preview" && (
                <div style={{ padding:0 }}>
                  {loadingHtml && (
                    <div style={{ padding:40, textAlign:"center", color:CORES.textSub }}>
                      <p style={{ fontSize:24, margin:"0 0 8px" }}>⏳</p>
                      <p style={{ fontSize:13 }}>Carregando certificado...</p>
                    </div>
                  )}
                  {!loadingHtml && htmlCert && (
                    <div style={{ width:"100%", overflowX:"auto", background:"#f0f0f0" }}>
                      {/* Renderiza o HTML em iframe com blob URL */}
                      <iframe
                        srcDoc={htmlCert}
                        style={{
                          width:"154%", minHeight:420, border:"none",
                          transform:"scale(0.65)", transformOrigin:"top left",
                        }}
                        title="Certificado"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  )}
                  {!loadingHtml && !htmlCert && (
                    <div style={{ padding:40, textAlign:"center", color:CORES.textSub }}>
                      <p style={{ fontSize:40, margin:"0 0 8px" }}>📜</p>
                      <p style={{ fontSize:13 }}>Preview não disponível</p>
                    </div>
                  )}
                </div>
              )}

              {/* Detalhes */}
              {abaModal === "info" && (
                <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ background:CORES.bg, borderRadius:12, padding:14 }}>
                    <p style={{ fontSize:11, color:CORES.textSub, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 10px" }}>Informações</p>
                    {[
                      { label:"Evento",    valor: certAberto.eventos_certificaveis.nome },
                      { label:"Tipo",      valor: TIPO_CONFIG[certAberto.tipo_certificado]?.label },
                      { label:"Código",    valor: certAberto.codigo },
                      { label:"Emitido",   valor: new Date(certAberto.emitido_em).toLocaleDateString("pt-BR") },
                      ...(certAberto.nota ? [{ label:"Nota", valor: String(certAberto.nota) }] : []),
                      ...(certAberto.medalha ? [{ label:"Medalha", valor: certAberto.medalha }] : []),
                    ].map(item => (
                      <div key={item.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(0,0,0,0.05)" }}>
                        <span style={{ fontSize:12, color:CORES.textSub }}>{item.label}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:CORES.text }}>{item.valor}</span>
                      </div>
                    ))}
                  </div>

                  {/* QR Code */}
                  <div style={{ display:"flex", justifyContent:"center", padding:16, background:CORES.bg, borderRadius:12 }}>
                    <div style={{ textAlign:"center" }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${window.location.origin}/certificado/${certAberto.codigo}`)}`}
                        alt="QR Code" style={{ borderRadius:8 }}
                      />
                      <p style={{ fontSize:11, color:CORES.textSub, marginTop:6 }}>Escaneie para validar</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botões de ação */}
            <div style={{ padding:"12px 16px", borderTop:`1px solid rgba(0,0,0,0.08)`, display:"flex", gap:8, flexShrink:0 }}>
              <button onClick={() => registrarDownload(certAberto)}
                style={{ flex:2, padding:"12px 0", background:"#0A7C4B", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                ⬇️ Baixar / Imprimir
              </button>
              <button onClick={() => compartilhar(certAberto)}
                style={{ flex:2, padding:"12px 0", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                🔗 Compartilhar
              </button>
              <button onClick={() => navigate(`/certificado/${certAberto.codigo}`)}
                style={{ padding:"12px 14px", background:CORES.bg, color:CORES.textSub, border:`1px solid rgba(0,0,0,0.08)`, borderRadius:10, fontSize:13, cursor:"pointer" }}>
                🌐
              </button>
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
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
          {["todos", ...tipos].map(t => (
            <button key={t} onClick={() => setFiltro(t)}
              style={{ padding:"5px 12px", borderRadius:99, fontSize:11, fontWeight:600, border:"none", cursor:"pointer", whiteSpace:"nowrap",
                background: filtro===t ? "#fff" : "rgba(255,255,255,0.15)",
                color: filtro===t ? "#1a3a6e" : "#fff" }}>
              {t === "todos" ? "Todos" : TIPO_CONFIG[t]?.emoji + " " + TIPO_CONFIG[t]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 90px" }}>
        {loading && <p style={{ textAlign:"center", color:CORES.textSub, padding:32 }}>Carregando...</p>}
        {!loading && filtrados.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 20px" }}>
            <p style={{ fontSize:48, margin:"0 0 12px" }}>📜</p>
            <p style={{ fontSize:15, fontWeight:600, color:CORES.text, margin:"0 0 6px" }}>Nenhum certificado ainda</p>
            <p style={{ fontSize:13, color:CORES.textSub }}>Complete olimpíadas e simulados para receber seus certificados!</p>
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtrados.map(cert => {
            const cfg = TIPO_CONFIG[cert.tipo_certificado] ?? TIPO_CONFIG.participacao;
            return (
              <div key={cert.id} onClick={() => abrirCertificado(cert)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:16,
                  background:"#fff", border:`1.5px solid ${cfg.cor}22`,
                  cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ width:52, height:52, borderRadius:14, background:cfg.bg,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:26, flexShrink:0, border:`1.5px solid ${cfg.cor}33` }}>
                  {cfg.emoji}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:cfg.cor, background:cfg.bg, borderRadius:4, padding:"1px 6px" }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize:10, color:CORES.textSub }}>{cert.eventos_certificaveis.ano}</span>
                  </div>
                  <p style={{ fontSize:14, fontWeight:700, color:CORES.text, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {cert.eventos_certificaveis.nome}
                  </p>
                  <p style={{ fontSize:11, color:CORES.textSub, margin:0 }}>
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
