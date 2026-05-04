// src/pages/vestibular/VestibularHub.tsx
import { useParams, useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

const VESTIBULARES: Record<string, {
  nome: string; emoji: string; cor: string; bg: string;
  desc: string; dificuldade: string; foco: string[];
}> = {
  ITA: {
    nome: "ITA", emoji: "✈️", cor: "#003D80", bg: "#E6F0FF",
    desc: "Instituto Tecnológico de Aeronáutica",
    dificuldade: "⭐⭐⭐⭐⭐ Extremamente difícil",
    foco: ["Matemática", "Física", "Química", "Inglês"],
  },
  IME: {
    nome: "IME", emoji: "⚙️", cor: "#1a3a6e", bg: "#E6EEFF",
    desc: "Instituto Militar de Engenharia",
    dificuldade: "⭐⭐⭐⭐⭐ Muito difícil",
    foco: ["Matemática", "Física", "Química", "Desenho"],
  },
  FUVEST: {
    nome: "FUVEST", emoji: "🎓", cor: "#8B0000", bg: "#FFE6E6",
    desc: "Universidade de São Paulo — USP",
    dificuldade: "⭐⭐⭐⭐ Muito difícil",
    foco: ["Todas as áreas", "Interpretação", "Redação"],
  },
  UNICAMP: {
    nome: "UNICAMP", emoji: "🔬", cor: "#005C97", bg: "#E6F4FF",
    desc: "Universidade Estadual de Campinas",
    dificuldade: "⭐⭐⭐⭐ Muito difícil",
    foco: ["Interdisciplinar", "Contextualizado", "Atualidades"],
  },
  UNB: {
    nome: "UnB", emoji: "🏛️", cor: "#006400", bg: "#E6FFE6",
    desc: "Universidade de Brasília — PAS",
    dificuldade: "⭐⭐⭐ Difícil",
    foco: ["Atualidades", "PAS", "Humanas", "Política"],
  },
};

const MATERIAS: Record<string, { id: string; label: string; emoji: string; trilha: string }[]> = {
  ITA: [
    { id: "matematica", label: "Matemática", emoji: "📐", trilha: "matematica" },
    { id: "natureza",   label: "Física",     emoji: "⚡", trilha: "fisica"     },
    { id: "natureza",   label: "Química",    emoji: "🧪", trilha: "quimica"    },
    { id: "linguagens", label: "Português",  emoji: "📖", trilha: "portugues"  },
    { id: "linguagens", label: "Inglês",     emoji: "🇺🇸", trilha: "ingles"     },
  ],
  IME: [
    { id: "matematica", label: "Matemática", emoji: "📐", trilha: "matematica" },
    { id: "natureza",   label: "Física",     emoji: "⚡", trilha: "fisica"     },
    { id: "natureza",   label: "Química",    emoji: "🧪", trilha: "quimica"    },
    { id: "linguagens", label: "Português",  emoji: "📖", trilha: "portugues"  },
  ],
  FUVEST: [
    { id: "linguagens", label: "Linguagens", emoji: "📖", trilha: "portugues"  },
    { id: "humanas",    label: "Humanas",    emoji: "🌍", trilha: "portugues"  },
    { id: "matematica", label: "Matemática", emoji: "📐", trilha: "matematica" },
    { id: "natureza",   label: "Ciências",   emoji: "🔬", trilha: "fisica"     },
  ],
  UNICAMP: [
    { id: "linguagens", label: "Linguagens", emoji: "📖", trilha: "portugues"  },
    { id: "humanas",    label: "Humanas",    emoji: "🌍", trilha: "portugues"  },
    { id: "matematica", label: "Matemática", emoji: "📐", trilha: "matematica" },
    { id: "natureza",   label: "Ciências",   emoji: "🔬", trilha: "fisica"     },
  ],
  UNB: [
    { id: "linguagens", label: "Linguagens", emoji: "📖", trilha: "portugues"  },
    { id: "humanas",    label: "Humanas",    emoji: "🌍", trilha: "portugues"  },
    { id: "matematica", label: "Matemática", emoji: "📐", trilha: "matematica" },
    { id: "natureza",   label: "Ciências",   emoji: "🔬", trilha: "fisica"     },
  ],
};

export default function VestibularHub() {
  const { vestibular = "ITA" } = useParams<{ vestibular: string }>();
  const navigate = useNavigate();
  const v = VESTIBULARES[vestibular.toUpperCase()] ?? VESTIBULARES.ITA;
  const materias = MATERIAS[vestibular.toUpperCase()] ?? [];

  const acoes = [
    {
      id: "quiz",
      emoji: "🧠",
      titulo: "Quiz",
      desc: "Questões reais por matéria",
      cor: "#0057FF",
      bg: "#E6EEFF",
      onClick: () => navigate(`/quiz/vestibular/${vestibular.toUpperCase()}`),
    },
    {
      id: "simulado",
      emoji: "📝",
      titulo: "Simulado",
      desc: "Prova completa cronometrada",
      cor: "#7C3AED",
      bg: "#F5F3FF",
      onClick: () => navigate(`/simulado?vestibular=${vestibular.toUpperCase()}`),
    },
    {
      id: "agente",
      emoji: "🤖",
      titulo: "Prof. IA",
      desc: `Especialista em ${v.nome}`,
      cor: v.cor,
      bg: v.bg,
      onClick: () => navigate(`/agentes/${vestibular.toUpperCase()}`),
    },
    {
      id: "ranking",
      emoji: "🏆",
      titulo: "Ranking",
      desc: "Top alunos deste vestibular",
      cor: "#D97706",
      bg: "#FFFBEB",
      onClick: () => navigate(`/ranking/${vestibular.toUpperCase()}`),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${v.cor}, ${v.cor}cc)`, padding: "16px 16px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.5px" }}>
              {v.emoji} {v.nome}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0 }}>{v.desc}</p>
          </div>
        </div>

        {/* Foco e dificuldade */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 6, padding: "3px 10px", fontWeight: 600 }}>
            {v.dificuldade}
          </span>
          {v.foco.map(f => (
            <span key={f} style={{ fontSize: 11, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", borderRadius: 6, padding: "3px 10px" }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>

        {/* Ações principais */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {acoes.map(a => (
            <button
              key={a.id}
              onClick={a.onClick}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                padding: "16px 14px", borderRadius: 16,
                background: CORES.bgCard,
                border: `1.5px solid ${a.cor}22`,
                cursor: "pointer", textAlign: "left",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                transition: "all 0.2s",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10 }}>
                {a.emoji}
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: a.cor, margin: "0 0 3px" }}>{a.titulo}</p>
              <p style={{ fontSize: 11, color: CORES.textSub, margin: 0, lineHeight: 1.4 }}>{a.desc}</p>
            </button>
          ))}
        </div>

        {/* Estudar por matéria */}
        <p style={{ fontSize: 11, fontWeight: 700, color: CORES.textSub, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
          Estudar por matéria
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {materias.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              {/* Quiz da matéria */}
              <button
                onClick={() => navigate(`/quiz/vestibular/${vestibular.toUpperCase()}?area=${m.id}`)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 12,
                  background: CORES.bgCard, border: `1px solid ${CORES.border}`,
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{m.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: CORES.text, margin: 0 }}>{m.label}</p>
                  <p style={{ fontSize: 11, color: CORES.textSub, margin: 0 }}>Quiz · questões reais</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={CORES.textSub} strokeWidth="1.5"><path d="M6 4l4 4-4 4"/></svg>
              </button>

              {/* Trilha da matéria */}
              <button
                onClick={() => navigate(`/trilha/${vestibular.toUpperCase()}/${m.trilha}`)}
                style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  background: v.bg, border: `1.5px solid ${v.cor}33`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", gap: 2,
                }}
              >
                <span style={{ fontSize: 14 }}>📚</span>
                <span style={{ fontSize: 9, color: v.cor, fontWeight: 700 }}>Trilha</span>
              </button>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div style={{ background: v.bg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${v.cor}22` }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: v.cor, margin: "0 0 4px" }}>💡 Como usar este hub</p>
          <p style={{ fontSize: 12, color: CORES.textSub, margin: 0, lineHeight: 1.6 }}>
            Use o <strong>Quiz</strong> para praticar questões reais, o <strong>Prof. IA</strong> para tirar dúvidas específicas e a <strong>Trilha</strong> para estudar o conteúdo de forma estruturada.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
