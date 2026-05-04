// src/pages/agente/AgentesHome.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

const VESTIBULARES = [
  {
    id: "ITA", nome: "ITA", emoji: "✈️", cor: "#003D80", bg: "#E6F0FF",
    desc: "Instituto Tecnológico de Aeronáutica",
    foco: "Matemática · Física · Química · Inglês",
    dificuldade: "⭐⭐⭐⭐⭐",
    badge: "Top 1",
  },
  {
    id: "IME", nome: "IME", emoji: "⚙️", cor: "#1a3a6e", bg: "#E6EEFF",
    desc: "Instituto Militar de Engenharia",
    foco: "Matemática · Física · Química · Desenho",
    dificuldade: "⭐⭐⭐⭐⭐",
    badge: "Top 2",
  },
  {
    id: "FUVEST", nome: "FUVEST", emoji: "🎓", cor: "#8B0000", bg: "#FFE6E6",
    desc: "Universidade de São Paulo — USP",
    foco: "Todas as áreas · Interpretação",
    dificuldade: "⭐⭐⭐⭐",
    badge: "USP",
  },
  {
    id: "UNICAMP", nome: "UNICAMP", emoji: "🔬", cor: "#005C97", bg: "#E6F4FF",
    desc: "Universidade Estadual de Campinas",
    foco: "Interdisciplinar · Contextualizado",
    dificuldade: "⭐⭐⭐⭐",
    badge: null,
  },
  {
    id: "UNB", nome: "UnB", emoji: "🏛️", cor: "#006400", bg: "#E6FFE6",
    desc: "Universidade de Brasília + PAS",
    foco: "Atualidades · PAS · Humanas",
    dificuldade: "⭐⭐⭐",
    badge: "PAS",
  },
];

const PLANO_LABEL: Record<string, string> = {
  gratis: "Grátis",
  estudante: "Estudante",
  pro: "Pro",
  ouro: "Ouro",
};

const PLANO_COR: Record<string, string> = {
  gratis: "#9ca3af",
  estudante: "#3b82f6",
  pro: "#f97316",
  ouro: "#d97706",
};

export default function AgentesHome() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const plano = (profile?.plan ?? "free") as string;
  const isGratis = plano === "free";

  const handleVestibular = (id: string) => {
    if (isGratis) {
      navigate("/assinatura");
    } else {
      navigate(`/vestibular/${id}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${CORES.bgDark}, #0D1F3C)`, padding: "16px 16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>🤖 Professores IA</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>Especialistas por vestibular</p>
          </div>
          {/* Badge de plano */}
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px",
            background: PLANO_COR[plano] ?? "#9ca3af",
            color: "#fff",
          }}>
            {PLANO_LABEL[plano] ?? plano}
          </span>
        </div>

        {/* Agente ENEM — sempre livre */}
        <button
          onClick={() => navigate("/agente")}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 14,
            background: "linear-gradient(135deg, #0057FF, #0040CC)",
            border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: "0 4px 16px rgba(0,87,255,0.4)",
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>Professor ENEM</p>
              <span style={{ fontSize: 9, background: "rgba(255,255,255,0.25)", color: "#fff", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>GRÁTIS</span>
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>Todas as áreas · Linguagens · Matemática · Humanas · Natureza</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>

        {/* Banner de upgrade para gratis */}
        {isGratis && (
          <div style={{
            background: "linear-gradient(135deg, #fef3c7, #fde68a)",
            borderRadius: 14, padding: "12px 14px", marginBottom: 14,
            border: "1px solid #fcd34d",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>⭐</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e", margin: "0 0 2px" }}>Desbloqueie os Professores IA</p>
              <p style={{ fontSize: 11, color: "#78350f", margin: 0, lineHeight: 1.5 }}>
                Professores especializados em ITA, IME, FUVEST, UNICAMP e UnB estão nos planos pagos.
              </p>
            </div>
            <button
              onClick={() => navigate("/assinatura")}
              style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#d97706", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
            >
              Ver planos
            </button>
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, color: CORES.textSub, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
          Vestibulares de Alta Concorrência
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {VESTIBULARES.map(v => (
            <button
              key={v.id}
              onClick={() => handleVestibular(v.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 16,
                background: isGratis ? "#f9fafb" : CORES.bgCard,
                border: isGratis ? "1.5px solid #e5e7eb" : `1.5px solid ${v.cor}22`,
                cursor: "pointer", textAlign: "left",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                opacity: isGratis ? 0.85 : 1,
                position: "relative",
              }}
            >
              {/* Ícone */}
              <div style={{
                width: 50, height: 50, borderRadius: 14,
                background: isGratis ? "#f3f4f6" : v.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, flexShrink: 0,
                border: `1.5px solid ${isGratis ? "#e5e7eb" : v.cor + "22"}`,
                filter: isGratis ? "grayscale(0.4)" : "none",
              }}>
                {v.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: isGratis ? "#9ca3af" : v.cor, margin: 0 }}>{v.nome}</p>
                  {v.badge && (
                    <span style={{ fontSize: 9, fontWeight: 700, background: isGratis ? "#d1d5db" : v.cor, color: "#fff", borderRadius: 4, padding: "1px 6px" }}>{v.badge}</span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: CORES.textSub, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.desc}</p>
                <p style={{ fontSize: 10, color: isGratis ? "#9ca3af" : v.cor, margin: 0, fontWeight: 500 }}>{v.foco}</p>
              </div>

              {/* Direita: cadeado ou dificuldade */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                {isGratis ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600 }}>Premium</span>
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: 10 }}>{v.dificuldade}</span>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={v.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Info box */}
        <div style={{ marginTop: 20, background: "#f0f6ff", borderRadius: 12, padding: "12px 14px", border: "1px solid #bfdbfe" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: CORES.primary, margin: "0 0 6px" }}>💡 Como funciona</p>
          <p style={{ fontSize: 12, color: CORES.textSub, margin: 0, lineHeight: 1.6 }}>
            Cada professor é especializado no estilo e conteúdo do seu vestibular. Eles conhecem o padrão das questões e sugerem exercícios do banco de questões quando relevante.
          </p>
        </div>

        {/* Tabela de planos resumida */}
        <div style={{ marginTop: 12, background: CORES.bgCard, borderRadius: 12, padding: "12px 14px", border: `1px solid ${CORES.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: CORES.text, margin: "0 0 8px" }}>📊 Mensagens por plano</p>
          {[
            { plano: "Estudante", cor: "#3b82f6", msgs: "10/dia por professor", preco: "R$19,90/mês" },
            { plano: "Pro", cor: "#f97316", msgs: "30/dia por professor", preco: "R$29,90/mês" },
            { plano: "Ouro 🥇", cor: "#d97706", msgs: "Ilimitado", preco: "R$49,90/mês" },
          ].map(r => (
            <div key={r.plano} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.cor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: r.cor, width: 72 }}>{r.plano}</span>
              <span style={{ fontSize: 11, color: CORES.textSub, flex: 1 }}>{r.msgs}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: CORES.text }}>{r.preco}</span>
            </div>
          ))}
          {isGratis && (
            <button
              onClick={() => navigate("/assinatura")}
              style={{ width: "100%", marginTop: 8, padding: "9px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #003D80, #0057CC)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Assinar agora
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
