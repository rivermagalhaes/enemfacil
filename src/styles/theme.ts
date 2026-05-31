// src/styles/theme.ts
// ENEMfácil — Design System
export const CORES = {
  primary:     "#0057FF",
  primaryDark: "#0040CC",
  primaryLight:"#E6EEFF",
  linguagens: { bg: "#FFF0F6", cor: "#C0156A", dark: "#8B0F4E", emoji: "📚" },
  matematica: { bg: "#F0F4FF", cor: "#0057FF", dark: "#0040CC", emoji: "➕" },
  humanas:    { bg: "#FFF8E6", cor: "#B45309", dark: "#7C3A00", emoji: "🌍" },
  natureza:   { bg: "#EDFAF3", cor: "#0A7C4B", dark: "#065C37", emoji: "🔬" },
  redacao:    { bg: "#F3F0FF", cor: "#6D28D9", dark: "#4C1D95", emoji: "✏️" },
  bg:          "#F4F6FB",
  bgCard:      "#FFFFFF",
  bgDark:      "#0A0F1E",
  text:        "#0F172A",
  textSub:     "#64748B",
  border:      "rgba(0,0,0,0.08)",
  success:     "#10B981",
  warning:     "#F59E0B",
  error:       "#EF4444",
  info:        "#3B82F6",
  free:        { cor: "#64748B", bg: "#F1F5F9", label: "Gratuito",  emoji: "🆓" },
  pro:         { cor: "#0057FF", bg: "#E6EEFF", label: "Pro",       emoji: "⚡" },
  premium:     { cor: "#7C3AED", bg: "#F3F0FF", label: "Premium",   emoji: "⭐" },
  ouro:        { cor: "#B45309", bg: "#FFF8E6", label: "Ouro",      emoji: "👑" },
};
export const AREAS = [
  { id: "linguagens", label: "Linguagens",  sublabel: "Língua Portuguesa, Literatura, Inglês", ...CORES.linguagens },
  { id: "matematica", label: "Matemática",  sublabel: "Matemática e suas tecnologias",         ...CORES.matematica },
  { id: "humanas",    label: "Humanas",     sublabel: "História, Geografia, Filosofia",        ...CORES.humanas    },
  { id: "natureza",   label: "Natureza",    sublabel: "Física, Química, Biologia",             ...CORES.natureza   },
  { id: "redacao",    label: "Redação",     sublabel: "Dissertação argumentativa",             ...CORES.redacao    },
];
// Limite diário de quizzes por plano
export const LIMITES_DIA: Record<string, number> = {
  free:      5,
  gratis:    5,
  pro:       Infinity,
  estudante: Infinity,
  premium:   Infinity,
  ouro:      Infinity,
};
// Limite diário de simulados por plano
// free: 1 simulado/dia — para incentivar assinatura
export const LIMITES_SIMULADO: Record<string, number> = {
  free:      1,
  gratis:    1,
  pro:       Infinity,
  estudante: Infinity,
  premium:   Infinity,
  ouro:      Infinity,
};
