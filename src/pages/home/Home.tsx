// src/pages/home/Home.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { AREAS, CORES } from "@/styles/theme";

const VESTIBULARES = [
  { id: "ITA",     nome: "ITA",     emoji: "✈️", cor: "#003D80", bg: "#E6F0FF", desc: "Inst. Tecnológico de Aeronáutica" },
  { id: "IME",     nome: "IME",     emoji: "⚙️", cor: "#1a3a6e", bg: "#E6EEFF", desc: "Instituto Militar de Engenharia" },
  { id: "FUVEST",  nome: "FUVEST",  emoji: "🎓", cor: "#8B0000", bg: "#FFE6E6", desc: "Universidade de São Paulo" },
  { id: "UNICAMP", nome: "UNICAMP", emoji: "🔬", cor: "#005C97", bg: "#E6F4FF", desc: "Universidade de Campinas" },
  { id: "UNB",     nome: "UnB",     emoji: "🏛️", cor: "#006400", bg: "#E6FFE6", desc: "Universidade de Brasília" },
];

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const plano = String(profile?.plano ?? "free");
  const nome = profile?.nome ?? profile?.username ?? "Estudante";
  const xp = profile?.xp_total ?? 0;
  const sequencia = profile?.sequencia ?? 0;

  const horaAtual = new Date().getHours();
  const saudacao = horaAtual < 12 ? "Bom dia" : horaAtual < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${CORES.bgDark} 0%, #0A1628 60%, #0D1F3C 100%)`,
        padding: "16px 16px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Efeito de fundo */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.15,
          background: `radial-gradient(circle at 80% 20%, ${CORES.primary} 0%, transparent 60%)`,
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative" }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>{saudacao},</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>{nome} 👋</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* XP badge */}
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 99, padding: "6px 12px", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{xp.toLocaleString("pt-BR")} XP</span>
              </div>
              {/* Avatar */}
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: CORES.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
                onClick={() => navigate("/perfil")}>
                {nome[0].toUpperCase()}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px", backdropFilter: "blur(10px)" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>Sequência</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>🔥 {sequencia} dias</p>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px", backdropFilter: "blur(10px)" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>Próximo ENEM</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>📅 Nov/25</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 14px 90px" }}>

        {/* Acesso rápido */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button onClick={() => navigate("/simulado")} style={{
            flex: 1, padding: "14px 12px", borderRadius: 14,
            background: `linear-gradient(135deg, ${CORES.primary}, ${CORES.primaryDark})`,
            border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: `0 8px 24px ${CORES.primary}40`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📝</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Simulado</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>45 questões</p>
          </button>

          <button onClick={() => navigate("/agente")} style={{
            flex: 1, padding: "14px 12px", borderRadius: 14,
            background: "linear-gradient(135deg, #6D28D9, #4C1D95)",
            border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🤖</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Agente IA</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>Tire dúvidas</p>
          </button>

          <button onClick={() => navigate("/redacao")} style={{
            flex: 1, padding: "14px 12px", borderRadius: 14,
            background: "linear-gradient(135deg, #0A7C4B, #065C37)",
            border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: "0 8px 24px rgba(10,124,75,0.4)",
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>✏️</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Redação</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>Praticar</p>
          </button>
        </div>

        {/* Áreas do ENEM */}
        <p style={{ fontSize: 13, fontWeight: 700, color: CORES.text, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
          Estudar por área
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {AREAS.map(area => (
            <button
              key={area.id}
              onClick={() => navigate(`/quiz/${area.id}`)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 16,
                background: CORES.bgCard, border: `1.5px solid ${area.cor}22`,
                cursor: "pointer", textAlign: "left",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                transition: "transform 0.15s",
              }}
            >
              {/* Ícone */}
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: area.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
                border: `1.5px solid ${area.cor}22`,
              }}>
                {area.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: area.cor, margin: "0 0 2px" }}>{area.label}</p>
                <p style={{ fontSize: 11, color: CORES.textSub, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{area.sublabel}</p>
              </div>

              {/* Seta */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={area.cor} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, opacity: 0.6 }}>
                <path d="M6 4l4 4-4 4"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Vestibulares */}
        <p style={{ fontSize: 13, fontWeight: 700, color: CORES.text, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Vestibulares</p>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, marginBottom: 24 }}>
          {VESTIBULARES.map(v => (
            <button key={v.id} onClick={() => navigate(`/quiz/vestibular/${v.id}`)} style={{ flexShrink: 0, width: 110, padding: "14px 12px", borderRadius: 14, background: v.bg, border: `1.5px solid ${v.cor}33`, cursor: "pointer", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{v.emoji}</div>
              <p style={{ fontSize: 14, fontWeight: 800, color: v.cor, margin: "0 0 2px" }}>{v.nome}</p>
              <p style={{ fontSize: 9, color: v.cor, opacity: 0.7, margin: 0, lineHeight: 1.3 }}>{v.desc}</p>
            </button>
          ))}
        </div>

        {/* Banner de upgrade se free */}
        {plano === "free" && (
          <div style={{
            background: `linear-gradient(135deg, #0A0F1E, #0D1F3C)`,
            borderRadius: 16, padding: 18,
            border: `1.5px solid ${CORES.primary}33`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `${CORES.primary}20` }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>⚡ Desbloqueie tudo</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Simulados ilimitados, agente de IA e acompanhamento personalizado.
            </p>
            <button
              onClick={() => navigate("/assinatura")}
              style={{
                padding: "9px 20px", background: CORES.primary,
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                boxShadow: `0 4px 14px ${CORES.primary}60`,
              }}
            >
              Ver planos →
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
