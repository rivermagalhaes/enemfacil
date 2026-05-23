// src/pages/trilha/TrilhaGeografia.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ENEM: "#0A7C4B", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

const config: TrilhaConfig = {
  materia: "geografia",
  titulo: "Trilha de Geografia",
  emoji: "🗺️",
  mapaMentalTitulo: "Geografia — Ensino Médio",
  corVest: (v) => COR_VEST[v] ?? "#0A7C4B",
  unidades: [
    { id: "cartografia",         numero: 1,  titulo: "Cartografia e Orientação",         emoji: "🧭", cor: "#0A7C4B", bg: "#EDFAF3", topic: "cartografia",         topicos: ["Escalas e projeções", "Coordenadas geográficas", "Fusos horários", "Leitura de mapas e gráficos"], xp: 60 },
    { id: "relevo-solo",         numero: 2,  titulo: "Relevo e Solos",                   emoji: "🌋", cor: "#f59e0b", bg: "#fffbeb", topic: "relevo",              topicos: ["Formação do relevo brasileiro", "Tipos de solo", "Intemperismo", "Erosão e degradação"], xp: 80 },
    { id: "clima-meteorologia",  numero: 3,  titulo: "Clima e Meteorologia",             emoji: "🌤️", cor: "#0ea5e9", bg: "#e0f2fe", topic: "clima",               topicos: ["Elementos e fatores climáticos", "Climas do Brasil e do mundo", "Fenômenos El Niño e La Niña", "Mudanças climáticas"], xp: 100 },
    { id: "hidrografia",         numero: 4,  titulo: "Hidrografia",                      emoji: "💧", cor: "#3b82f6", bg: "#eff6ff", topic: "hidrografia",         topicos: ["Bacias hidrográficas brasileiras", "Aquíferos", "Oceanos e mares", "Recursos hídricos e conflitos"], xp: 80 },
    { id: "biomas-vegetacao",    numero: 5,  titulo: "Biomas e Vegetação",               emoji: "🌿", cor: "#22c55e", bg: "#f0fdf4", topic: "biomas",              topicos: ["Biomas brasileiros: Amazônia, Cerrado, Caatinga", "Mata Atlântica e Pantanal", "Biomas mundiais", "Desmatamento e preservação"], xp: 100 },
    { id: "populacao",           numero: 6,  titulo: "População Mundial e Brasileira",   emoji: "👥", cor: "#8b5cf6", bg: "#f5f3ff", topic: "populacao",           topicos: ["Crescimento populacional", "Transição demográfica", "Migrações", "Distribuição espacial no Brasil"], xp: 100 },
    { id: "urbanizacao",         numero: 7,  titulo: "Urbanização",                      emoji: "🏙️", cor: "#f97316", bg: "#fff7ed", topic: "urbanizacao",         topicos: ["Processo de urbanização no Brasil", "Metrópoles e megalópoles", "Problemas urbanos", "Planejamento urbano"], xp: 100 },
    { id: "economia-mundial",    numero: 8,  titulo: "Economia Mundial",                 emoji: "📈", cor: "#ef4444", bg: "#fef2f2", topic: "economia",            topicos: ["Globalização econômica", "Blocos econômicos", "Desigualdade Norte-Sul", "Países emergentes (BRICS)"], xp: 100 },
    { id: "geopolitica",         numero: 9,  titulo: "Geopolítica e Conflitos",          emoji: "🌐", cor: "#6366f1", bg: "#eef2ff", topic: "geopolitica",         topicos: ["Conflitos territoriais", "Terrorismo e refugiados", "Oriente Médio", "Nova ordem mundial"], xp: 100 },
    { id: "brasil-regionalizacao",numero:10, titulo: "Regiões e Regionalização do Brasil",emoji:"🇧🇷",cor: "#0057FF", bg: "#E6EEFF", topic: "regioes-brasil",      topicos: ["Regiões brasileiras: Norte, Nordeste, Centro-Oeste, Sudeste, Sul", "Desigualdades regionais", "Fronteiras agrícolas", "Desenvolvimento regional"], xp: 100 },
    { id: "questoes-ambientais", numero: 11, titulo: "Questões Ambientais Globais",      emoji: "♻️", cor: "#14b8a6", bg: "#f0fdfa", topic: "meio-ambiente",       topicos: ["Aquecimento global e Protocolo de Kyoto", "Desertificação", "Poluição e resíduos", "Desenvolvimento sustentável"], xp: 80 },
  ],
};

export default function TrilhaGeografia() {
  return <TrilhaBase config={config} />;
}
