// src/pages/trilha/TrilhaIngles.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ITA: "#003D80", IME: "#1a3a6e", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

const config: TrilhaConfig = {
  materia: "ingles",
  titulo: "English Track",
  emoji: "🇺🇸",
  subtitulo: "Scientific English",
  mapaMentalTitulo: "English Track",
  corVest: (v) => COR_VEST[v] ?? "#003D80",
  unidades: [
    { id: "reading-comprehension", numero: 1, titulo: "Reading Comprehension", emoji: "📰", cor: "#0369a1", bg: "#e0f2fe", topic: null, topicos: ["Main idea", "Inference", "Vocabulary in context", "Text structure"], xp: 80 },
    { id: "grammar", numero: 2, titulo: "Grammar & Structure", emoji: "📝", cor: "#7c3aed", bg: "#f5f3ff", topic: null, topicos: ["Verb tenses", "Conditionals", "Modal verbs", "Passive voice"], xp: 100 },
    { id: "vocabulary", numero: 3, titulo: "Vocabulary & Idioms", emoji: "💬", cor: "#0891b2", bg: "#ecfeff", topic: null, topicos: ["Academic vocabulary", "False cognates", "Phrasal verbs", "Idioms"], xp: 80 },
    { id: "scientific-english", numero: 4, titulo: "Scientific English", emoji: "🔬", cor: "#059669", bg: "#ecfdf5", topic: null, topicos: ["Technical terminology", "Research papers", "Abstract reading", "Scientific writing"], xp: 100 },
    { id: "writing", numero: 5, titulo: "Writing & Essay", emoji: "✍️", cor: "#dc2626", bg: "#fef2f2", topic: null, topicos: ["Essay structure", "Argumentation", "Cohesion devices", "Academic writing"], xp: 120 },
  ],
};

export default function TrilhaIngles() {
  return <TrilhaBase config={config} />;
}
