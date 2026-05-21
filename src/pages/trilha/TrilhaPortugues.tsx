// src/pages/trilha/TrilhaPortugues.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ITA: "#003D80", IME: "#1a3a6e", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

const config: TrilhaConfig = {
  materia: "portugues",
  titulo: "Trilha de Português",
  emoji: "📖",
  mapaMentalTitulo: "Português — Ensino Médio",
  corVest: (v) => COR_VEST[v] ?? "#003D80",
  unidades: [
    { id: "interpretacao", numero: 1, titulo: "Interpretação de Texto", emoji: "📖", cor: "#7c3aed", bg: "#f5f3ff", topic: null, topicos: ["Leitura crítica", "Inferência", "Coerência", "Argumentação"], xp: 80 },
    { id: "gramatica", numero: 2, titulo: "Gramática", emoji: "✏️", cor: "#0284c7", bg: "#e0f2fe", topic: null, topicos: ["Morfologia", "Sintaxe", "Concordância", "Regência"], xp: 100 },
    { id: "literatura", numero: 3, titulo: "Literatura Brasileira", emoji: "📚", cor: "#b45309", bg: "#fffbeb", topic: null, topicos: ["Modernismo", "Romantismo", "Realismo", "Parnasianismo"], xp: 100 },
    { id: "literatura-portuguesa", numero: 4, titulo: "Literatura Portuguesa", emoji: "🇵🇹", cor: "#15803d", bg: "#f0fdf4", topic: null, topicos: ["Camões", "Pessoa", "Queirós", "Gil Vicente"], xp: 80 },
    { id: "redacao", numero: 5, titulo: "Redação & Dissertação", emoji: "📝", cor: "#dc2626", bg: "#fef2f2", topic: null, topicos: ["Tese e argumentação", "Repertório cultural", "Coesão textual", "Conclusão"], xp: 120 },
    { id: "linguistica", numero: 6, titulo: "Linguística & Estilística", emoji: "🗣️", cor: "#0891b2", bg: "#ecfeff", topic: null, topicos: ["Figuras de linguagem", "Variação linguística", "Funções da linguagem", "Intertextualidade"], xp: 80 },
  ],
};

export default function TrilhaPortugues() {
  return <TrilhaBase config={config} />;
}
