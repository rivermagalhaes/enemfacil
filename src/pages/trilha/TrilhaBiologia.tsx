// src/pages/trilha/TrilhaBiologia.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ENEM: "#0A7C4B", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

const config: TrilhaConfig = {
  materia: "biologia",
  titulo: "Trilha de Biologia",
  emoji: "🧬",
  mapaMentalTitulo: "Biologia — Ensino Médio",
  corVest: (v) => COR_VEST[v] ?? "#0A7C4B",
  unidades: [
    { id: "citologia", numero: 1, titulo: "Citologia", emoji: "🔬", cor: "#10b981", bg: "#ecfdf5", topic: "citologia", topicos: ["Célula procarionte e eucarionte", "Organelas celulares", "Membrana plasmática", "Divisão celular"], xp: 80 },
    { id: "bioquimica", numero: 2, titulo: "Bioquímica", emoji: "⚗️", cor: "#6366f1", bg: "#eef2ff", topic: "bioquimica", topicos: ["Carboidratos", "Proteínas e enzimas", "Lipídios", "Ácidos nucleicos"], xp: 100 },
    { id: "histologia", numero: 3, titulo: "Histologia e Embriologia", emoji: "🧫", cor: "#f59e0b", bg: "#fffbeb", topic: "histologia", topicos: ["Tecidos epiteliais", "Tecidos conjuntivos", "Tecidos musculares", "Desenvolvimento embrionário"], xp: 100 },
    { id: "fisiologia-animal", numero: 4, titulo: "Fisiologia Animal", emoji: "❤️", cor: "#ef4444", bg: "#fef2f2", topic: "fisiologia", topicos: ["Sistema digestório", "Sistema circulatório", "Sistema respiratório", "Sistema nervoso e endócrino"], xp: 120 },
    { id: "botanica", numero: 5, titulo: "Botânica", emoji: "🌿", cor: "#22c55e", bg: "#f0fdf4", topic: "botanica", topicos: ["Classificação vegetal", "Fotossíntese e respiração", "Morfologia vegetal", "Fisiologia vegetal"], xp: 100 },
    { id: "zoologia", numero: 6, titulo: "Zoologia", emoji: "🦎", cor: "#0ea5e9", bg: "#e0f2fe", topic: "zoologia", topicos: ["Classificação animal", "Invertebrados", "Vertebrados", "Evolução dos grupos"], xp: 100 },
    { id: "genetica", numero: 7, titulo: "Genética", emoji: "🧬", cor: "#8b5cf6", bg: "#f5f3ff", topic: "genetica", topicos: ["Leis de Mendel", "Herança ligada ao sexo", "Mutações", "Biotecnologia e DNA"], xp: 150 },
    { id: "evolucao", numero: 8, titulo: "Evolução", emoji: "🦕", cor: "#ec4899", bg: "#fdf2f8", topic: "evolucao", topicos: ["Teorias evolutivas", "Seleção natural", "Especiação", "Origem da vida"], xp: 100 },
    { id: "ecologia", numero: 9, titulo: "Ecologia", emoji: "🌎", cor: "#14b8a6", bg: "#f0fdfa", topic: "ecologia", topicos: ["Ecossistemas e biomas", "Cadeias alimentares", "Ciclos biogeoquímicos", "Impactos ambientais"], xp: 100 },
    { id: "saude-doencas", numero: 10, titulo: "Saúde e Doenças", emoji: "🏥", cor: "#f97316", bg: "#fff7ed", topic: "saude", topicos: ["Sistema imunológico", "Doenças infecciosas", "Doenças parasitárias", "Saúde pública e vacinas"], xp: 80 },
  ],
};

export default function TrilhaBiologia() {
  return <TrilhaBase config={config} />;
}
