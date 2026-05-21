// src/pages/trilha/TrilhaMatematica.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ITA: "#003D80", IME: "#1a3a6e", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

const config: TrilhaConfig = {
  materia: "matematica",
  titulo: "Trilha de Matemática",
  emoji: "📐",
  mapaMentalTitulo: "Matemática — Ensino Médio",
  corVest: (v) => COR_VEST[v] ?? "#003D80",
  unidades: [
    { id: "fundamentos-mat", numero: 1, titulo: "Fundamentos", emoji: "🔢", cor: "#6366f1", bg: "#eef2ff", topic: null, topicos: ["Conjuntos numéricos", "Funções", "Progressões", "Logaritmos"], xp: 50 },
    { id: "algebra", numero: 2, titulo: "Álgebra Linear", emoji: "🧮", cor: "#f59e0b", bg: "#fffbeb", topic: "algebra", topicos: ["Matrizes e determinantes", "Sistemas lineares", "Vetores", "Transformações"], xp: 120 },
    { id: "geometria", numero: 3, titulo: "Geometria", emoji: "📐", cor: "#10b981", bg: "#ecfdf5", topic: "geometria", topicos: ["Geometria plana", "Geometria espacial", "Cônicas", "Trigonometria"], xp: 100 },
    { id: "probabilidade", numero: 4, titulo: "Probabilidade & Combinatória", emoji: "🎲", cor: "#ec4899", bg: "#fdf2f8", topic: "probabilidade", topicos: ["Análise combinatória", "Probabilidade", "Distribuições", "Estatística"], xp: 100 },
    { id: "calculo", numero: 5, titulo: "Cálculo", emoji: "∫", cor: "#0ea5e9", bg: "#e0f2fe", topic: "calculo", topicos: ["Limites", "Derivadas", "Integrais", "Equações diferenciais"], xp: 150 },
    { id: "numeros-complexos", numero: 6, titulo: "Números Complexos", emoji: "ℂ", cor: "#8b5cf6", bg: "#f5f3ff", topic: null, topicos: ["Forma algébrica", "Forma trigonométrica", "Operações", "Raízes"], xp: 80 },
  ],
};

export default function TrilhaMatematica() {
  return <TrilhaBase config={config} />;
}
