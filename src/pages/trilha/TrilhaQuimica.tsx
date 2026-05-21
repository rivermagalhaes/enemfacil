// src/pages/trilha/TrilhaQuimica.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ITA: "#003D80", IME: "#1a3a6e", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400", OBQ: "#7C3AED", OTQ: "#0A7C4B" };

const config: TrilhaConfig = {
  materia: "quimica",
  titulo: "Trilha de Química",
  emoji: "🧪",
  mapaMentalTitulo: "Química — Ensino Médio",
  corVest: (v) => COR_VEST[v] ?? "#7C3AED",
  unidades: [
    { id: "introducao", numero: 1, titulo: "Introdução à Química", emoji: "🔬", cor: "#6366f1", bg: "#eef2ff", topic: null, topicos: ["Método científico", "Unidades SI", "Algarismos significativos", "Análise dimensional"], xp: 50 },
    { id: "estrutura-atomica", numero: 2, titulo: "Estrutura Atômica", emoji: "⚛️", cor: "#0ea5e9", bg: "#e0f2fe", topic: "estrutura-atomica", topicos: ["Modelos atômicos", "Prótons, nêutrons, elétrons", "Isótopos", "Configuração eletrônica"], xp: 80 },
    { id: "tabela-periodica", numero: 3, titulo: "Tabela Periódica", emoji: "📊", cor: "#8b5cf6", bg: "#f5f3ff", topic: "tabela-periodica", topicos: ["Organização da tabela", "Raio atômico", "Energia de ionização", "Eletronegatividade"], xp: 80 },
    { id: "ligacoes-quimicas", numero: 4, titulo: "Ligações Químicas", emoji: "🔗", cor: "#f59e0b", bg: "#fffbeb", topic: "ligacoes-quimicas", topicos: ["Ligação iônica", "Ligação covalente", "Estruturas de Lewis", "Geometria molecular"], xp: 100 },
    { id: "funcoes-inorganicas", numero: 5, titulo: "Funções Inorgânicas", emoji: "🧪", cor: "#10b981", bg: "#ecfdf5", topic: null, topicos: ["Ácidos e bases", "Sais e óxidos", "Nomenclatura química"], xp: 80 },
    { id: "reacoes-quimicas", numero: 6, titulo: "Reações Químicas", emoji: "💥", cor: "#ef4444", bg: "#fef2f2", topic: "reacoes-quimicas", topicos: ["Tipos de reações", "Balanceamento", "Reações de oxirredução"], xp: 100 },
    { id: "estequiometria", numero: 7, titulo: "Estequiometria", emoji: "⚖️", cor: "#f97316", bg: "#fff7ed", topic: "estequiometria", topicos: ["Conceito de mol", "Massa molar", "Reagente limitante", "Rendimento"], xp: 120 },
    { id: "gases", numero: 8, titulo: "Estados da Matéria & Gases", emoji: "💨", cor: "#06b6d4", bg: "#ecfeff", topic: "gases", topicos: ["Sólidos, líquidos e gases", "Mudanças de estado", "Equação dos gases ideais"], xp: 100 },
    { id: "solucoes", numero: 9, titulo: "Soluções", emoji: "🫧", cor: "#3b82f6", bg: "#eff6ff", topic: "solucoes", topicos: ["Tipos de soluções", "Concentração mol/L", "Diluição", "Solubilidade"], xp: 100 },
  ],
};

export default function TrilhaQuimica() {
  return <TrilhaBase config={config} />;
}
