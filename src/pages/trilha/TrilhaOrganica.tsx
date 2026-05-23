// src/pages/trilha/TrilhaOrganica.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ENEM: "#0A7C4B", ITA: "#003D80", IME: "#1a3a6e", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400", OBQ: "#7C3AED", OTQ: "#0A7C4B" };

const config: TrilhaConfig = {
  materia: "organica",
  titulo: "Trilha de Química Orgânica",
  emoji: "🧬",
  mapaMentalTitulo: "Química Orgânica — Ensino Médio",
  corVest: (v) => COR_VEST[v] ?? "#0A7C4B",
  unidades: [
    { id: "introducao-organica", numero: 1, titulo: "Introdução à Química Orgânica", emoji: "⚗️", cor: "#10b981", bg: "#ecfdf5", topic: "organica", topicos: ["O carbono e suas peculiaridades", "Cadeias carbônicas abertas e fechadas", "Cadeias saturadas e insaturadas", "Classificação dos carbonos"], xp: 60 },
    { id: "hidrocarbonetos", numero: 2, titulo: "Hidrocarbonetos", emoji: "🛢️", cor: "#f59e0b", bg: "#fffbeb", topic: "hidrocarbonetos", topicos: ["Alcanos · Alcenos · Alcinos", "Alcadienos e ciclanos", "Aromáticos: benzeno e derivados", "Nomenclatura IUPAC"], xp: 100 },
    { id: "funcoes-organicas", numero: 3, titulo: "Funções Orgânicas Oxigenadas", emoji: "🧪", cor: "#ef4444", bg: "#fef2f2", topic: "funcoes-organicas", topicos: ["Álcoois e fenóis", "Aldeídos e cetonas", "Ácidos carboxílicos", "Ésteres e éteres"], xp: 120 },
    { id: "funcoes-nitrogenadas", numero: 4, titulo: "Funções Nitrogenadas e Halogenadas", emoji: "🔬", cor: "#8b5cf6", bg: "#f5f3ff", topic: "funcoes-organicas", topicos: ["Aminas e amidas", "Nitrocompostos e nitrilas", "Haletos orgânicos", "Aplicações industriais"], xp: 100 },
    { id: "isomeria", numero: 5, titulo: "Isomeria", emoji: "🔄", cor: "#0ea5e9", bg: "#e0f2fe", topic: "isomeria", topicos: ["Isomeria plana: cadeia, posição, função", "Isomeria geométrica (cis-trans)", "Isomeria óptica (quiralidade)", "Exemplos no ENEM"], xp: 120 },
    { id: "reacoes-organicas", numero: 6, titulo: "Reações Orgânicas", emoji: "💥", cor: "#f97316", bg: "#fff7ed", topic: "reacoes-organicas", topicos: ["Substituição em alcanos", "Adição em alcenos e alcinos", "Eliminação (desidratação)", "Oxidação e combustão"], xp: 120 },
    { id: "polimeros", numero: 7, titulo: "Polímeros e Plásticos", emoji: "🏭", cor: "#06b6d4", bg: "#ecfeff", topic: "polimeros", topicos: ["Polímeros naturais e sintéticos", "Adição: polietileno, PVC, teflon", "Condensação: náilon, poliéster", "Reciclagem e impacto ambiental"], xp: 80 },
    { id: "bioquimica-organica", numero: 8, titulo: "Bioquímica Orgânica", emoji: "🧫", cor: "#22c55e", bg: "#f0fdf4", topic: "bioquimica", topicos: ["Carboidratos: glicose, frutose, amido", "Lipídios: triglicerídeos e sabões", "Proteínas e aminoácidos", "Ácidos nucleicos: DNA e RNA"], xp: 100 },
    { id: "organica-cotidiano", numero: 9, titulo: "Orgânica no Cotidiano", emoji: "🌍", cor: "#ec4899", bg: "#fdf2f8", topic: "organica", topicos: ["Combustíveis e álcool etílico", "Fármacos e pesticidas", "Cosméticos e alimentos", "Poluição e compostos tóxicos"], xp: 80 },
  ],
};

export default function TrilhaOrganica() {
  return <TrilhaBase config={config} />;
}
