// src/pages/vestibular/VestibularHub.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

const VESTIBULARES: Record<string, {
  nome: string; emoji: string; cor: string; bg: string;
  desc: string; dificuldade: string; foco: string[];
}> = {
OBQ: {
  nome: "OBQ", emoji: "🥇", cor: "#7C3AED", bg: "#F3F0FF",
  desc: "Olimpíada Brasileira de Química",
  dificuldade: "⭐⭐⭐⭐ Difícil",
  foco: ["Química Geral", "Inorgânica", "Orgânica", "Físico-Química"],
},
OTQ: {
  nome: "OTQ", emoji: "🧪", cor: "#0A7C4B", bg: "#EDFAF3",
  desc: "Olimpíada Tocantinense de Química",
  dificuldade: "⭐⭐⭐ Médio",
  foco: ["Química Geral", "Inorgânica", "Orgânica"],
},
  ENEM: {
    nome: "ENEM", emoji: "🎯", cor: "#0057FF", bg: "#E6EEFF",
    desc: "Exame Nacional do Ensino Médio",
    dificuldade: "⭐⭐⭐ Médio",
    foco: ["Linguagens", "Matemática", "Humanas", "Natureza", "Redação"],
  },
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

// Grupos de sub-trilhas — quando uma matéria agrupa múltiplas trilhas
const SUB_TRILHAS: Record<string, { label: string; emoji: string; trilha: string; desc: string }[]> = {
  "quimica-grupo": [
    { label: "Química Geral",   emoji: "🔬", trilha: "quimica",       desc: "Funções · Reações · Nomenclatura · Estequiometria" },
    { label: "Físico-Química",  emoji: "🔥", trilha: "fisicoquimica", desc: "Termoquímica · Cinética · Equilíbrio · Eletroquímica" },
    { label: "Orgânica",        emoji: "🧬", trilha: "organica",      desc: "Hidrocarbonetos · Funções orgânicas · Isomeria" },
  ],
  "natureza-grupo": [
    { label: "Física",          emoji: "⚡", trilha: "fisica",        desc: "Mecânica · Eletromagnetismo · Termodinâmica · Óptica" },
    { label: "Química Geral",   emoji: "🔬", trilha: "quimica",       desc: "Funções · Reações · Nomenclatura · Estequiometria" },
    { label: "Físico-Química",  emoji: "🔥", trilha: "fisicoquimica", desc: "Termoquímica · Cinética · Equilíbrio · Eletroquímica" },
    { label: "Química Orgânica",emoji: "🧪", trilha: "organica",      desc: "Hidrocarbonetos · Funções orgânicas · Isomeria" },
    { label: "Biologia",        emoji: "🧬", trilha: "biologia",      desc: "Genética · Ecologia · Fisiologia · Evolução" },
  ],
};

const MATERIAS: Record<string, { id: string; label: string; emoji: string; trilha: string; desc: string; grupo?: string }[]> = {
  OBQ: [
    { id: "natureza", label: "Química Geral",  emoji: "⚗️", trilha: "fisicoquimica", desc: "Estequiometria · Gases · Soluções" },
    { id: "natureza", label: "Inorgânica",     emoji: "🔬", trilha: "quimica",       desc: "Funções · Reações · Nomenclatura" },
    { id: "natureza", label: "Orgânica",       emoji: "🧬", trilha: "quimica",       desc: "Hidrocarbonetos · Funções orgânicas" },
    { id: "natureza", label: "Físico-Química", emoji: "⚡", trilha: "fisicoquimica", desc: "Termoquímica · Cinética · Equilíbrio" },
  ],
  OTQ: [
    { id: "natureza", label: "Química Geral",  emoji: "⚗️", trilha: "fisicoquimica", desc: "Estequiometria · Gases · Soluções" },
    { id: "natureza", label: "Inorgânica",     emoji: "🔬", trilha: "quimica",       desc: "Funções · Reações · Nomenclatura" },
    { id: "natureza", label: "Orgânica",       emoji: "🧬", trilha: "quimica",       desc: "Hidrocarbonetos · Funções orgânicas" },
    { id: "natureza", label: "Físico-Química", emoji: "⚡", trilha: "fisicoquimica", desc: "Termoquímica · Cinética · Equilíbrio" },
  ],
  ENEM: [
    { id: "linguagens", label: "Português",    emoji: "📚", trilha: "portugues",     desc: "Interpretação · Literatura · Gramática" },
    { id: "linguagens", label: "Inglês",       emoji: "🇺🇸", trilha: "ingles",       desc: "Reading · Vocabulary · Grammar" },
    { id: "matematica", label: "Matemática",   emoji: "📐", trilha: "matematica",    desc: "Álgebra · Geometria · Estatística" },
    { id: "humanas",    label: "Humanas",      emoji: "🌍", trilha: "humanas",       desc: "História · Geografia · Filosofia" },
    { id: "natureza",   label: "Ciências da Natureza", emoji: "🔬", trilha: "", desc: "Física · Química · Biologia", grupo: "natureza-grupo" },
    { id: "redacao",    label: "Redação",      emoji: "✏️",  trilha: "redacao",       desc: "Dissertação · Argumentação · ENEM" },
  ],
  ITA: [
    { id: "matematica", label: "Matemática",   emoji: "📐", trilha: "matematica",    desc: "Alta complexidade · ITA" },
    { id: "natureza",   label: "Física",       emoji: "⚡", trilha: "fisica",        desc: "Mecânica · Eletromagnetismo · Óptica" },
    { id: "natureza",   label: "Química",      emoji: "⚗️", trilha: "",               desc: "Geral · Inorgânica · Orgânica · FQ", grupo: "quimica-grupo" },
    { id: "natureza",   label: "Físico-Quím",  emoji: "🔥", trilha: "fisicoquimica", desc: "Termoquímica · Cinética · Equilíbrio" },
    { id: "linguagens", label: "Português",    emoji: "📖", trilha: "portugues",     desc: "Interpretação · Gramática" },
    { id: "linguagens", label: "Inglês",       emoji: "🇺🇸", trilha: "ingles",       desc: "Scientific English · Reading" },
  ],
  IME: [
    { id: "matematica", label: "Matemática",   emoji: "📐", trilha: "matematica",    desc: "Alta complexidade · IME" },
    { id: "natureza",   label: "Física",       emoji: "⚡", trilha: "fisica",        desc: "Mecânica · Eletromagnetismo · Óptica" },
    { id: "natureza",   label: "Química",      emoji: "⚗️", trilha: "",               desc: "Geral · Inorgânica · Orgânica · FQ", grupo: "quimica-grupo" },
    { id: "natureza",   label: "Físico-Quím",  emoji: "🔥", trilha: "fisicoquimica", desc: "Termoquímica · Cinética · Equilíbrio" },
    { id: "linguagens", label: "Português",    emoji: "📖", trilha: "portugues",     desc: "Interpretação · Gramática" },
  ],
  FUVEST: [
    { id: "linguagens", label: "Português",    emoji: "📚", trilha: "portugues",     desc: "Literatura · Interpretação · Gramática" },
    { id: "humanas",    label: "Humanas",      emoji: "🌍", trilha: "humanas",       desc: "História · Geografia · Filosofia" },
    { id: "matematica", label: "Matemática",   emoji: "📐", trilha: "matematica",    desc: "Álgebra · Geometria · Análise" },
    { id: "natureza",   label: "Física",       emoji: "⚡", trilha: "fisica",        desc: "Mecânica · Eletromagnetismo · Óptica" },
    { id: "natureza",   label: "Química",      emoji: "⚗️", trilha: "",               desc: "Geral · Inorgânica · Orgânica · FQ", grupo: "quimica-grupo" },
    { id: "natureza",   label: "Físico-Quím",  emoji: "🔥", trilha: "fisicoquimica", desc: "Termoquímica · Cinética · Equilíbrio" },
    { id: "natureza",   label: "Biologia",     emoji: "🧬", trilha: "biologia",      desc: "Genética · Ecologia · Fisiologia" },
    { id: "redacao",    label: "Redação",      emoji: "✏️",  trilha: "redacao",       desc: "Dissertação · Argumentação" },
  ],
  UNICAMP: [
    { id: "linguagens", label: "Português",    emoji: "📚", trilha: "portugues",     desc: "Literatura · Interpretação · Gramática" },
    { id: "linguagens", label: "Inglês",       emoji: "🇺🇸", trilha: "ingles",       desc: "Reading · Comprehension" },
    { id: "humanas",    label: "Humanas",      emoji: "🌍", trilha: "humanas",       desc: "História · Geografia · Filosofia" },
    { id: "matematica", label: "Matemática",   emoji: "📐", trilha: "matematica",    desc: "Álgebra · Geometria · Estatística" },
    { id: "natureza",   label: "Física",       emoji: "⚡", trilha: "fisica",        desc: "Mecânica · Eletromagnetismo · Óptica" },
    { id: "natureza",   label: "Química",      emoji: "⚗️", trilha: "",               desc: "Geral · Inorgânica · Orgânica · FQ", grupo: "quimica-grupo" },
    { id: "natureza",   label: "Físico-Quím",  emoji: "🔥", trilha: "fisicoquimica", desc: "Termoquímica · Cinética · Equilíbrio" },
    { id: "natureza",   label: "Biologia",     emoji: "🧬", trilha: "biologia",      desc: "Genética · Ecologia · Fisiologia" },
    { id: "redacao",    label: "Redação",      emoji: "✏️",  trilha: "redacao",       desc: "Dissertação · Argumentação" },
  ],
  UNB: [
    { id: "linguagens", label: "Português",    emoji: "📚", trilha: "portugues",     desc: "Literatura · Interpretação · Gramática" },
    { id: "humanas",    label: "Humanas",      emoji: "🌍", trilha: "humanas",       desc: "História · Geografia · Atualidades" },
    { id: "matematica", label: "Matemática",   emoji: "📐", trilha: "matematica",    desc: "Álgebra · Geometria · Estatística" },
    { id: "natureza",   label: "Física",       emoji: "⚡", trilha: "fisica",        desc: "Mecânica · Eletromagnetismo · Óptica" },
    { id: "natureza",   label: "Química",      emoji: "⚗️", trilha: "",               desc: "Geral · Inorgânica · Orgânica · FQ", grupo: "quimica-grupo" },
    { id: "natureza",   label: "Físico-Quím",  emoji: "🔥", trilha: "fisicoquimica", desc: "Termoquímica · Cinética · Equilíbrio" },
    { id: "natureza",   label: "Biologia",     emoji: "🧬", trilha: "biologia",      desc: "Genética · Ecologia · Fisiologia" },
    { id: "redacao",    label: "Redação",      emoji: "✏️",  trilha: "redacao",       desc: "Dissertação · Argumentação" },
  ],
};

export default function VestibularHub() {
  const { vestibular = "ENEM" } = useParams<{ vestibular: string }>();
  const navigate = useNavigate();
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(null);
  const v = VESTIBULARES[vestibular.toUpperCase()] ?? VESTIBULARES.ENEM;
  const materias = MATERIAS[vestibular.toUpperCase()] ?? [];

  // Ferramentas de avaliação — separadas das trilhas de aprendizado
  const ferramentas = [
    {
      id: "simulado", emoji: "📝", titulo: "Simulado",
      desc: "Prova completa cronometrada", cor: "#7C3AED", bg: "#F5F3FF",
      onClick: () => navigate("/simulado"),
    },
    {
      id: "quiz", emoji: "🧠", titulo: "Quiz rápido",
      desc: "Questões reais por matéria", cor: "#0057FF", bg: "#E6EEFF",
      onClick: () => navigate(`/quiz/vestibular/${vestibular.toUpperCase()}`),
    },
    {
      id: "agente", emoji: "🤖", titulo: "Prof. IA",
      desc: `Tire dúvidas sobre ${v.nome}`, cor: v.cor, bg: v.bg,
      onClick: () => navigate(`/agentes/${vestibular.toUpperCase()}`),
    },
    {
      id: "ranking", emoji: "🏆", titulo: "Ranking",
      desc: "Top alunos deste vestibular", cor: "#D97706", bg: "#FFFBEB",
      onClick: () => navigate(`/ranking/${vestibular.toUpperCase()}`),
    },
    {
      id: "certificado", emoji: "📜", titulo: "Certificado",
      desc: `Seus certificados de ${v.nome}`, cor: "#0A7C4B", bg: "#EDFAF3",
      onClick: () => navigate("/certificados"),
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
            <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>{v.emoji} {v.nome}</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0 }}>{v.desc}</p>
          </div>
          <div style={{ width: 72, height: 72, borderRadius: 14, background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            <img src={`/logo-${vestibular.toLowerCase()}.png`} alt={v.nome} style={{ width: "100%", height: "100%", objectFit: "cover", padding: 0, borderRadius: 14 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
   
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 6, padding: "3px 10px", fontWeight: 600 }}>{v.dificuldade}</span>
          {v.foco.map(f => (
            <span key={f} style={{ fontSize: 11, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", borderRadius: 6, padding: "3px 10px" }}>{f}</span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 14px 90px" }}>

        {/* ── TRILHAS DE APRENDIZADO (fluxo principal) ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: CORES.text, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
              📚 Estudar por matéria
            </p>
          </div>
          <p style={{ fontSize: 11, color: CORES.textSub, margin: "0 0 14px" }}>
            Conteúdo → exemplos → exercícios → quiz → XP
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {materias.map((m, i) => {
              const temGrupo = !!m.grupo;
              const grupoAberto = submenuAberto === `${i}-${m.grupo}`;
              const subTrilhas = m.grupo ? SUB_TRILHAS[m.grupo] ?? [] : [];

              return (
                <div key={i}>
                  <button
                    onClick={() => {
                      if (temGrupo) {
                        setSubmenuAberto(grupoAberto ? null : `${i}-${m.grupo}`);
                      } else {
                        navigate(`/trilha/${vestibular.toUpperCase()}/${m.trilha}`);
                      }
                    }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px", borderRadius: grupoAberto ? "16px 16px 0 0" : 16,
                      background: grupoAberto ? v.bg : CORES.bgCard,
                      border: `1.5px solid ${grupoAberto ? v.cor : v.cor + "22"}`,
                      borderBottom: grupoAberto ? "none" : undefined,
                      cursor: "pointer", textAlign: "left",
                      boxShadow: grupoAberto ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{
                      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                      background: grupoAberto ? CORES.bgCard : v.bg,
                      border: `1.5px solid ${v.cor}33`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                    }}>
                      {m.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: v.cor, margin: "0 0 2px" }}>{m.label}</p>
                      <p style={{ fontSize: 11, color: CORES.textSub, margin: 0 }}>{m.desc}</p>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, background: grupoAberto ? CORES.bgCard : v.bg,
                      color: v.cor, borderRadius: 6, padding: "2px 8px", flexShrink: 0,
                      transition: "transform 0.2s",
                      display: "inline-block", transform: grupoAberto ? "rotate(90deg)" : "none",
                    }}>
                      {temGrupo ? "▶" : "→"}
                    </span>
                  </button>

                  {/* Sub-trilhas expandidas */}
                  {grupoAberto && (
                    <div style={{
                      border: `1.5px solid ${v.cor}`, borderTop: "none",
                      borderRadius: "0 0 16px 16px", overflow: "hidden",
                      background: CORES.bgCard,
                    }}>
                      {subTrilhas.map((sub, si) => (
                        <button
                          key={si}
                          onClick={() => { navigate(`/trilha/${vestibular.toUpperCase()}/${sub.trilha}`); setSubmenuAberto(null); }}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 12,
                            padding: "12px 16px 12px 24px",
                            background: "transparent",
                            borderTop: si > 0 ? `1px solid ${v.cor}15` : "none",
                            border: "none", cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <div style={{
                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                            background: v.bg, display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 20,
                          }}>
                            {sub.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: v.cor, margin: "0 0 1px" }}>{sub.label}</p>
                            <p style={{ fontSize: 11, color: CORES.textSub, margin: 0 }}>{sub.desc}</p>
                          </div>
                          <span style={{ fontSize: 11, color: v.cor, flexShrink: 0 }}>→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Separador */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: CORES.border }} />
          <span style={{ fontSize: 11, color: CORES.textSub, fontWeight: 600, whiteSpace: "nowrap" }}>Ferramentas de avaliação</span>
          <div style={{ flex: 1, height: 1, background: CORES.border }} />
        </div>

        {/* ── FERRAMENTAS (avaliação/prática — após estudar) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {ferramentas.map(a => (
            <button key={a.id} onClick={a.onClick} style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start",
              padding: "16px 14px", borderRadius: 16,
              background: CORES.bgCard, border: `1.5px solid ${a.cor}22`,
              cursor: "pointer", textAlign: "left",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10 }}>
                {a.emoji}
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: a.cor, margin: "0 0 3px" }}>{a.titulo}</p>
              <p style={{ fontSize: 11, color: CORES.textSub, margin: 0, lineHeight: 1.4 }}>{a.desc}</p>
            </button>
          ))}
        </div>

        {/* Dica pedagógica */}
        <div style={{ background: v.bg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${v.cor}22` }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: v.cor, margin: "0 0 4px" }}>💡 Fluxo recomendado</p>
          <p style={{ fontSize: 12, color: CORES.textSub, margin: 0, lineHeight: 1.6 }}>
            Estude pela <strong>trilha</strong> primeiro — conteúdo, exemplos e exercícios guiados. Depois use o <strong>Quiz</strong> ou <strong>Simulado</strong> para testar o que aprendeu e ganhar XP.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
