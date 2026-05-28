// src/pages/olimpiadas/OlimpiadasHub.tsx
// Página central de todas as olimpíadas — substitui OlimpiadasQuimica.tsx
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

// ── Configuração de todas as olimpíadas ──────────────────────────────
const MILITARES = [
  { id: "OQCMTO", nome: "OQCMTO", nomeCompleto: "1ª Olimpíada de Química dos Colégios Militares do Tocantins",    emoji: "🧪", cor: "#1a3a6e", bg: "#eef2ff", desc: "02/10/2026 · 30 questões · 2h · Certificado automático", niveis: ["Ensino Médio · Fase Única"], dificuldade: "⭐⭐⭐", badge: "Química" },
  { id: "OMCMTO", nome: "OMCMTO", nomeCompleto: "1ª Olimpíada de Matemática dos Colégios Militares do Tocantins", emoji: "📐", cor: "#1a3a6e", bg: "#eef2ff", desc: "02/10/2026 · 30 questões · 2h · Certificado automático", niveis: ["Ensino Médio · Fase Única"], dificuldade: "⭐⭐⭐", badge: "Matemática" },
  { id: "OFCMTO", nome: "OFCMTO", nomeCompleto: "1ª Olimpíada de Física dos Colégios Militares do Tocantins",     emoji: "⚡", cor: "#1a3a6e", bg: "#eef2ff", desc: "02/10/2026 · 30 questões · 2h · Certificado automático", niveis: ["Ensino Médio · Fase Única"], dificuldade: "⭐⭐⭐", badge: "Física" },
  { id: "OPCMTO", nome: "OPCMTO", nomeCompleto: "1ª Olimpíada de Português dos Colégios Militares do Tocantins",  emoji: "📝", cor: "#1a3a6e", bg: "#eef2ff", desc: "02/10/2026 · 30 questões · 2h · Certificado automático", niveis: ["Ensino Médio · Fase Única"], dificuldade: "⭐⭐⭐", badge: "Português" },
];

const IFTO = [
  { id: "OQIFTO", nome: "OQIFTO", nomeCompleto: "1ª Olimpíada de Química do IFTO", emoji: "🔬", cor: "#065C37", bg: "#EDFAF3", desc: "02/10/2026 · 30 questões · 2h · Certificado automático", niveis: ["Ensino Médio · Fase Única"], dificuldade: "⭐⭐⭐", badge: "Química" },
];

const NACIONAIS = [
  { id: "OBQ", nome: "OBQ", nomeCompleto: "Olimpíada Brasileira de Química",   emoji: "🥇", cor: "#7C3AED", bg: "#F3F0FF", desc: "Principal olimpíada de química do Brasil",          niveis: ["Nível I · Fundamental", "Nível II · Médio", "Nível III · Avançado"], dificuldade: "⭐⭐⭐⭐", badge: "Nacional" },
];

const ESTADUAIS = [
  { id: "OTQ",  nome: "OTQ",  nomeCompleto: "Olimpíada Tocantinense de Química", emoji: "🧪", cor: "#0A7C4B", bg: "#EDFAF3", desc: "Seletiva estadual do Tocantins para OBQ",          niveis: ["Nível I · Fundamental", "Nível II · Médio"],                         dificuldade: "⭐⭐⭐",  badge: "Tocantins" },
];

type Olimpiada = typeof MILITARES[0];

export default function OlimpiadasHub() {
  const navigate = useNavigate();

  const renderCard = (o: Olimpiada) => (
    <button key={o.id} onClick={() => navigate(`/olimpiada/${o.id}`)}
      style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 14, padding: 16, borderRadius: 18, background: CORES.bgCard, border: `2px solid ${o.cor}33`, cursor: "pointer", textAlign: "left", boxShadow: `0 4px 20px ${o.cor}15`, marginBottom: 10 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${o.cor}, ${o.cor}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{o.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: o.cor, margin: 0 }}>{o.nome}</p>
          <span style={{ fontSize: 9, fontWeight: 700, background: o.cor, color: "#fff", borderRadius: 4, padding: "2px 7px" }}>{o.badge}</span>
        </div>
        <p style={{ fontSize: 11, color: CORES.textSub, margin: "0 0 6px", lineHeight: 1.4 }}>{o.nomeCompleto}</p>
        <p style={{ fontSize: 11, color: CORES.textSub, margin: "0 0 6px" }}>{o.desc}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {o.niveis.map((n, i) => <span key={i} style={{ fontSize: 10, background: o.bg, color: o.cor, borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{n}</span>)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10 }}>{o.dificuldade}</span>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke={o.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
      </div>
    </button>
  );

  const renderSecao = (titulo: string, cor: string, emoji: string, lista: Olimpiada[]) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 4, height: 18, borderRadius: 2, background: cor }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: CORES.text, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{emoji} {titulo}</p>
      </div>
      {lista.map(renderCard)}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1a3a6e 60%,#2563eb 100%)", padding: "16px 16px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.15, background: "radial-gradient(circle at 20% 80%, #fbbf24 0%, transparent 50%), radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 50%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", padding: "6px 12px", borderRadius: 99, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
            Voltar
          </button>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 40, margin: "0 0 8px" }}>🎖️</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px" }}>Olimpíadas 2026</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: "0 0 20px" }}>Colégios Militares · IFTO · Nacionais · Estaduais</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { emoji: "🎖️", label: "4 C.M. Tocantins" },
                { emoji: "🔬", label: "1 IFTO" },
                { emoji: "🌎", label: "1 Nacional" },
                { emoji: "🌿", label: "1 Estadual" },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 12px", backdropFilter: "blur(10px)" }}>
                  <p style={{ fontSize: 14, margin: "0 0 2px" }}>{s.emoji}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", margin: 0, fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 14px 90px" }}>

        {/* Banner destaque C.M. Tocantins */}
        <div style={{ background: "linear-gradient(135deg,#1a3a6e,#2563eb)", borderRadius: 16, padding: "14px 16px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>🗓️ 02 de outubro de 2026</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>🎖️ 1ªs Olimpíadas dos C.M. Tocantins</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "0 0 10px" }}>Química · Matemática · Física · Português · Certificado automático</p>
          <div style={{ display: "flex", gap: 8 }}>
            {MILITARES.map(o => (
              <button key={o.id} onClick={() => navigate(`/olimpiada/${o.id}`)}
                style={{ padding: "6px 12px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {o.emoji} {o.badge}
              </button>
            ))}
          </div>
        </div>

        {renderSecao("Colégios Militares — Tocantins", "#1a3a6e", "🎖️", MILITARES)}
        {renderSecao("IFTO — Instituto Federal do Tocantins", "#065C37", "🔬", IFTO)}
        {renderSecao("Nacionais", "#7C3AED", "🌎", NACIONAIS)}
        {renderSecao("Estaduais — Tocantins", "#0A7C4B", "🌿", ESTADUAIS)}

        <div style={{ background: "linear-gradient(135deg,#0f172a,#1a3a6e)", borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>💡 Como funciona</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.6 }}>
            Estude pelas trilhas, pratique com simulados e participe da prova oficial. O certificado é emitido automaticamente para quem atingir nota mínima de 50%.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
