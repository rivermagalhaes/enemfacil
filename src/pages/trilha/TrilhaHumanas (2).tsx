// src/pages/trilha/TrilhaHumanas.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const config: TrilhaConfig = {
  materia: "humanas",
  titulo: "Trilha de Humanas",
  emoji: "🌍",
  subtitulo: "História · Geografia · Filosofia",
  mapaMentalTitulo: "Humanas — Ensino Médio",
  corVest: (v) => ({ ITA: "#003D80", IME: "#1a3a6e", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" }[v] ?? "#B45309"),
  unidades: [
    { id: "pre-historia", numero: 1, titulo: "Pré-História e Antiguidade", emoji: "🏛️", cor: "#B45309", bg: "#FFF8E6", topic: null, topicos: ["Surgimento do ser humano", "Mesopotâmia e Egito", "Grécia Antiga", "Roma Antiga"], xp: 50 },
    { id: "idade-media", numero: 2, titulo: "Idade Média", emoji: "⚔️", cor: "#6B7280", bg: "#F9FAFB", topic: "idade-media", topicos: ["Feudalismo", "Igreja Católica", "Cruzadas", "Renascimento"], xp: 80 },
    { id: "idade-moderna", numero: 3, titulo: "Idade Moderna", emoji: "⛵", cor: "#0057FF", bg: "#E6EEFF", topic: "idade-moderna", topicos: ["Grandes Navegações", "Reforma Protestante", "Absolutismo", "Mercantilismo"], xp: 100 },
    { id: "revolucoes", numero: 4, titulo: "Revoluções e Iluminismo", emoji: "🔦", cor: "#7C3AED", bg: "#F3F0FF", topic: "revolucoes", topicos: ["Iluminismo", "Revolução Francesa", "Revolução Industrial", "Independências americanas"], xp: 100 },
    { id: "brasil-colonial", numero: 5, titulo: "Brasil Colonial", emoji: "🌿", cor: "#0A7C4B", bg: "#EDFAF3", topic: "brasil-colonial", topicos: ["Colonização portuguesa", "Ciclos econômicos", "Escravidão", "Quilombos"], xp: 100 },
    { id: "brasil-imperio", numero: 6, titulo: "Brasil Império e República", emoji: "🇧🇷", cor: "#22c55e", bg: "#f0fdf4", topic: "brasil-imperio", topicos: ["Independência do Brasil", "Período imperial", "Proclamação da República", "República Velha"], xp: 100 },
    { id: "guerras-mundiais", numero: 7, titulo: "Guerras Mundiais", emoji: "🌍", cor: "#ef4444", bg: "#fef2f2", topic: "guerras-mundiais", topicos: ["1ª Guerra Mundial", "Nazifascismo", "2ª Guerra Mundial", "Holocausto"], xp: 100 },
    { id: "brasil-republica", numero: 8, titulo: "Brasil República Moderna", emoji: "🏙️", cor: "#0ea5e9", bg: "#e0f2fe", topic: "brasil-republica", topicos: ["Era Vargas", "Democracia e Ditadura Militar", "Redemocratização", "Brasil contemporâneo"], xp: 100 },
    { id: "geografia-fisica", numero: 9, titulo: "Geografia Física", emoji: "🌋", cor: "#f59e0b", bg: "#fffbeb", topic: "geografia-fisica", topicos: ["Relevo e clima", "Hidrografia", "Biomas brasileiros", "Questões ambientais"], xp: 80 },
    { id: "geografia-humana", numero: 10, titulo: "Geografia Humana e Geopolítica", emoji: "🗺️", cor: "#8b5cf6", bg: "#f5f3ff", topic: "geografia-humana", topicos: ["Urbanização", "Globalização", "Blocos econômicos", "Conflitos geopolíticos"], xp: 100 },
    { id: "filosofia-sociologia", numero: 11, titulo: "Filosofia e Sociologia", emoji: "🧠", cor: "#06b6d4", bg: "#ecfeff", topic: "filosofia-sociologia", topicos: ["Filosofia antiga e moderna", "Contratualistas", "Marx, Weber e Durkheim", "Cidadania e direitos"], xp: 100 },
  ],
};

export default function TrilhaHumanas() {
  return <TrilhaBase config={config} />;
}
