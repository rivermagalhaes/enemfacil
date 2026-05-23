// src/pages/trilha/TrilhaHistoria.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ENEM: "#B45309", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

const config: TrilhaConfig = {
  materia: "historia",
  titulo: "Trilha de História",
  emoji: "🏛️",
  mapaMentalTitulo: "História — Ensino Médio",
  corVest: (v) => COR_VEST[v] ?? "#B45309",
  unidades: [
    { id: "pre-historia",    numero: 1,  titulo: "Pré-História e Antiguidade",   emoji: "🏛️", cor: "#B45309", bg: "#FFF8E6", topic: "pre-historia",    topicos: ["Surgimento do ser humano", "Mesopotâmia e Egito", "Grécia Antiga", "Roma Antiga"], xp: 50 },
    { id: "idade-media",     numero: 2,  titulo: "Idade Média",                  emoji: "⚔️", cor: "#6B7280", bg: "#F9FAFB", topic: "idade-media",     topicos: ["Feudalismo", "Igreja Católica", "Cruzadas", "Renascimento"], xp: 80 },
    { id: "idade-moderna",   numero: 3,  titulo: "Idade Moderna",                emoji: "⛵", cor: "#0057FF", bg: "#E6EEFF", topic: "idade-moderna",   topicos: ["Grandes Navegações", "Reforma Protestante", "Absolutismo", "Mercantilismo"], xp: 100 },
    { id: "revolucoes",      numero: 4,  titulo: "Revoluções e Iluminismo",      emoji: "🔦", cor: "#7C3AED", bg: "#F3F0FF", topic: "revolucoes",      topicos: ["Iluminismo", "Revolução Francesa", "Revolução Industrial", "Independências americanas"], xp: 100 },
    { id: "brasil-colonial", numero: 5,  titulo: "Brasil Colonial",              emoji: "🌿", cor: "#0A7C4B", bg: "#EDFAF3", topic: "brasil-colonial", topicos: ["Colonização portuguesa", "Ciclos econômicos", "Escravidão", "Quilombos"], xp: 100 },
    { id: "brasil-imperio",  numero: 6,  titulo: "Brasil Império e República",   emoji: "🇧🇷", cor: "#22c55e", bg: "#f0fdf4", topic: "brasil-imperio",  topicos: ["Independência do Brasil", "Período imperial", "Proclamação da República", "República Velha"], xp: 100 },
    { id: "guerras-mundiais",numero: 7,  titulo: "Guerras Mundiais",             emoji: "🌍", cor: "#ef4444", bg: "#fef2f2", topic: "guerras-mundiais",topicos: ["1ª Guerra Mundial", "Nazifascismo", "2ª Guerra Mundial", "Holocausto"], xp: 100 },
    { id: "brasil-republica",numero: 8,  titulo: "Brasil República Moderna",     emoji: "🏙️", cor: "#0ea5e9", bg: "#e0f2fe", topic: "brasil-republica",topicos: ["Era Vargas", "Democracia e Ditadura Militar", "Redemocratização", "Brasil contemporâneo"], xp: 100 },
    { id: "historia-africa", numero: 9,  titulo: "África e Diáspora Africana",   emoji: "🌍", cor: "#f97316", bg: "#fff7ed", topic: "historia-africa",  topicos: ["Civilizações africanas", "Tráfico negreiro", "Resistência e cultura afro-brasileira", "África contemporânea"], xp: 80 },
    { id: "america-latina",  numero: 10, titulo: "América Latina",               emoji: "🌎", cor: "#84cc16", bg: "#f7fee7", topic: "america-latina",  topicos: ["Colonização espanhola", "Independências latino-americanas", "Ditaduras do século XX", "Integração regional"], xp: 80 },
    { id: "mundo-contemporaneo", numero: 11, titulo: "Mundo Contemporâneo",     emoji: "🌐", cor: "#06b6d4", bg: "#ecfeff", topic: "mundo-contemporaneo", topicos: ["Guerra Fria", "Descolonização da África e Ásia", "Globalização", "Conflitos atuais"], xp: 100 },
  ],
};

export default function TrilhaHistoria() {
  return <TrilhaBase config={config} />;
}
