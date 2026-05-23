// src/pages/trilha/TrilhaFilosofia.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ENEM: "#7C3AED", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

const config: TrilhaConfig = {
  materia: "filosofia",
  titulo: "Trilha de Filosofia e Sociologia",
  emoji: "🧠",
  mapaMentalTitulo: "Filosofia e Sociologia — Ensino Médio",
  corVest: (v) => COR_VEST[v] ?? "#7C3AED",
  unidades: [
    { id: "filosofia-antiga",     numero: 1,  titulo: "Filosofia Antiga",                emoji: "🏛️", cor: "#7C3AED", bg: "#F3F0FF", topic: "filosofia-antiga",    topicos: ["Pré-socráticos", "Sócrates e o método socrático", "Platão e o mundo das ideias", "Aristóteles e a lógica"], xp: 80 },
    { id: "filosofia-medieval",   numero: 2,  titulo: "Filosofia Medieval e Moderna",    emoji: "✝️",  cor: "#6366f1", bg: "#eef2ff", topic: "filosofia-medieval",  topicos: ["Agostinho e Tomás de Aquino", "Descartes e o racionalismo", "Locke, Hume e o empirismo", "Kant e a razão crítica"], xp: 100 },
    { id: "contratualistas",      numero: 3,  titulo: "Contratualistas e Política",      emoji: "📜", cor: "#0057FF", bg: "#E6EEFF", topic: "contratualistas",      topicos: ["Hobbes: o Leviatã e o estado de natureza", "Locke: direitos naturais e propriedade", "Rousseau: vontade geral e democracia", "Montesquieu: separação dos poderes"], xp: 100 },
    { id: "filosofia-contemporanea",numero:4, titulo: "Filosofia Contemporânea",         emoji: "💭", cor: "#8b5cf6", bg: "#f5f3ff", topic: "filosofia-contemp",   topicos: ["Nietzsche e a crítica à moral", "Marx e a alienação", "Existencialismo (Sartre, Camus)", "Foucault e o poder"], xp: 100 },
    { id: "etica-moral",          numero: 5,  titulo: "Ética e Moral",                   emoji: "⚖️", cor: "#0A7C4B", bg: "#EDFAF3", topic: "etica",               topicos: ["Ética e moral: diferenças", "Utilitarismo e deontologia", "Bioética", "Ética ambiental e cidadania"], xp: 80 },
    { id: "sociologia-classica",  numero: 6,  titulo: "Sociologia Clássica",             emoji: "👥", cor: "#B45309", bg: "#FFF8E6", topic: "sociologia-classica", topicos: ["Durkheim: fato social e solidariedade", "Marx: classes sociais e luta de classes", "Weber: ação social e burocracia", "Método sociológico"], xp: 100 },
    { id: "cultura-identidade",   numero: 7,  titulo: "Cultura, Identidade e Diversidade",emoji:"🌍",cor: "#f59e0b", bg: "#fffbeb", topic: "cultura",              topicos: ["Conceito de cultura", "Etnocentrismo e relativismo cultural", "Diversidade cultural no Brasil", "Identidade e alteridade"], xp: 80 },
    { id: "desigualdade-social",  numero: 8,  titulo: "Desigualdade e Estratificação",   emoji: "📊", cor: "#ef4444", bg: "#fef2f2", topic: "desigualdade",         topicos: ["Estratificação social", "Mobilidade social", "Pobreza e exclusão no Brasil", "Políticas de redistribuição"], xp: 100 },
    { id: "cidadania-direitos",   numero: 9,  titulo: "Cidadania e Direitos Humanos",    emoji: "🗳️", cor: "#22c55e", bg: "#f0fdf4", topic: "cidadania",            topicos: ["Conceito de cidadania", "Direitos civis, políticos e sociais", "Movimentos sociais", "Democracia e participação"], xp: 80 },
    { id: "trabalho-economia",    numero: 10, titulo: "Trabalho e Economia",             emoji: "🏭", cor: "#06b6d4", bg: "#ecfeff", topic: "trabalho",             topicos: ["Divisão social do trabalho", "Capitalismo e seus modelos", "Desemprego e precarização", "Economia solidária"], xp: 80 },
    { id: "midia-comunicacao",    numero: 11, titulo: "Mídia, Comunicação e Tecnologia", emoji: "📱", cor: "#ec4899", bg: "#fdf2f8", topic: "midia",                topicos: ["Indústria cultural (Adorno e Horkheimer)", "Redes sociais e democracia", "Fake news e manipulação", "Vigilância e privacidade"], xp: 80 },
  ],
};

export default function TrilhaFilosofia() {
  return <TrilhaBase config={config} />;
}
