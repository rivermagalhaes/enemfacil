// src/pages/trilha/TrilhaFisicoQuimica.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const config: TrilhaConfig = {
  materia: "fisicoquimica",
  titulo: "Trilha de Físico-Química",
  emoji: "⚗️",
  mapaMentalTitulo: "Físico-Química — Ensino Médio",
  corVest: (v) => ({ ITA: "#003D80", IME: "#1a3a6e", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" }[v] ?? "#0057FF"),
  unidades: [
    { id: "introducao-fisicoquimica", numero: 1, titulo: "Introdução à Físico-Química", emoji: "⚗️", cor: "#6366f1", bg: "#eef2ff", topic: null, topicos: ["O que é físico-química", "Sistemas e transformações", "Grandezas físicas e químicas", "Unidades e medidas"], xp: 50 },
    { id: "termoquimica", numero: 2, titulo: "Termoquímica", emoji: "🔥", cor: "#ef4444", bg: "#fef2f2", topic: "termoquimica", topicos: ["Reações endotérmicas e exotérmicas", "Entalpia (ΔH)", "Lei de Hess", "Energia de ligação"], xp: 100 },
    { id: "cinetica-quimica", numero: 3, titulo: "Cinética Química", emoji: "⚡", cor: "#f59e0b", bg: "#fffbeb", topic: "cinetica-quimica", topicos: ["Velocidade das reações", "Teoria das colisões", "Fatores: temperatura, concentração, catalisadores", "Energia de ativação"], xp: 100 },
    { id: "equilibrio-quimico", numero: 4, titulo: "Equilíbrio Químico", emoji: "⚖️", cor: "#10b981", bg: "#ecfdf5", topic: "equilibrio-quimico", topicos: ["Reações reversíveis", "Constante de equilíbrio (Kc)", "Princípio de Le Chatelier", "Deslocamento do equilíbrio"], xp: 120 },
    { id: "equilibrio-ionico", numero: 5, titulo: "Equilíbrio Iônico", emoji: "🧫", cor: "#8b5cf6", bg: "#f5f3ff", topic: "equilibrio-ionico", topicos: ["Ácidos e bases (Arrhenius, Brønsted-Lowry)", "pH e pOH", "Escala de pH", "Força de ácidos e bases"], xp: 100 },
    { id: "eletroquimica", numero: 6, titulo: "Eletroquímica", emoji: "🔋", cor: "#0ea5e9", bg: "#e0f2fe", topic: "eletroquimica", topicos: ["Reações de oxirredução", "Pilhas (células galvânicas)", "Potencial de eletrodo", "Eletrólise"], xp: 120 },
    { id: "propriedades-coligativas", numero: 7, titulo: "Soluções e Propriedades Coligativas", emoji: "🫧", cor: "#3b82f6", bg: "#eff6ff", topic: "propriedades-coligativas", topicos: ["Tipos de soluções", "Pressão de vapor", "Ebulição e congelamento", "Osmose"], xp: 100 },
    { id: "gases-fisicoquimica", numero: 8, titulo: "Gases", emoji: "💨", cor: "#06b6d4", bg: "#ecfeff", topic: "gases", topicos: ["Propriedades dos gases", "Transformações gasosas", "Lei dos gases ideais", "Pressão, volume e temperatura"], xp: 100 },
    { id: "aplicacoes-cotidiano", numero: 9, titulo: "Aplicações no Cotidiano", emoji: "🌍", cor: "#22c55e", bg: "#f0fdf4", topic: null, topicos: ["Energia e combustíveis", "Processos industriais", "Química ambiental", "Tecnologias: baterias e materiais"], xp: 80 },
  ],
};

export default function TrilhaFisicoQuimica() {
  return <TrilhaBase config={config} />;
}
