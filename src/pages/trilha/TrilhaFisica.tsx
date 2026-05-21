// src/pages/trilha/TrilhaFisica.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ITA: "#003D80", IME: "#1a3a6e", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

const config: TrilhaConfig = {
  materia: "fisica",
  titulo: "Trilha de Física",
  emoji: "⚡",
  mapaMentalTitulo: "Física — Ensino Médio",
  corVest: (v) => COR_VEST[v] ?? "#003D80",
  unidades: [
    { id: "introducao-cinematica", numero: 1, titulo: "Introdução à Cinemática", emoji: "📏", cor: "#6366f1", bg: "#eef2ff", topic: null, topicos: ["Movimento e repouso", "Referencial", "Trajetória", "Grandezas escalares e vetoriais"], xp: 50 },
    { id: "posicao-deslocamento", numero: 2, titulo: "Posição e Deslocamento", emoji: "📍", cor: "#0ea5e9", bg: "#e0f2fe", topic: "cinematica", topicos: ["Espaço e posição", "Deslocamento", "Distância percorrida", "Gráfico posição × tempo"], xp: 80 },
    { id: "velocidade", numero: 3, titulo: "Velocidade", emoji: "💨", cor: "#10b981", bg: "#ecfdf5", topic: "mecanica", topicos: ["Velocidade média", "Velocidade instantânea", "Movimento uniforme (MU)", "Gráficos v × t"], xp: 100 },
    { id: "aceleracao", numero: 4, titulo: "Aceleração e MUV", emoji: "🚀", cor: "#f59e0b", bg: "#fffbeb", topic: "mecanica", topicos: ["Aceleração média", "MUV", "Equação de Torricelli", "Função horária"], xp: 120 },
    { id: "queda-livre", numero: 5, titulo: "Queda Livre e Lançamento Vertical", emoji: "🍎", cor: "#ef4444", bg: "#fef2f2", topic: "queda-livre", topicos: ["Queda livre", "Lançamento para cima", "Lançamento para baixo", "Gravidade g = 10 m/s²"], xp: 100 },
    { id: "movimento-circular", numero: 6, titulo: "Movimento Circular", emoji: "🔄", cor: "#8b5cf6", bg: "#f5f3ff", topic: "movimento-circular", topicos: ["MCU", "Velocidade angular", "Período e frequência", "Relação v = ωr"], xp: 100 },
    { id: "lancamento-projeteis", numero: 7, titulo: "Lançamento de Projéteis", emoji: "🎯", cor: "#ec4899", bg: "#fdf2f8", topic: "lancamento-projeteis", topicos: ["Movimento bidimensional", "Lançamento horizontal", "Lançamento oblíquo", "Alcance e altura máxima"], xp: 120 },
    { id: "analise-grafica", numero: 8, titulo: "Análise Gráfica do Movimento", emoji: "📊", cor: "#06b6d4", bg: "#ecfeff", topic: "mecanica", topicos: ["Gráficos s×t, v×t, a×t", "Interpretação física", "Área sob o gráfico", "Inclinação de curvas"], xp: 80 },
    { id: "ondulatoria", numero: 9, titulo: "Ondulatória & Óptica", emoji: "🌊", cor: "#0891b2", bg: "#e0f2fe", topic: "ondulatoria", topicos: ["Ondas mecânicas", "Som", "Luz", "Óptica geométrica"], xp: 100 },
    { id: "eletromagnetismo", numero: 10, titulo: "Eletromagnetismo", emoji: "⚡", cor: "#7c3aed", bg: "#f5f3ff", topic: "eletromagnetismo", topicos: ["Campo elétrico", "Corrente elétrica", "Campo magnético", "Indução"], xp: 120 },
    { id: "termodinamica", numero: 11, titulo: "Termodinâmica", emoji: "🌡️", cor: "#dc2626", bg: "#fef2f2", topic: "termodinamica", topicos: ["Temperatura e calor", "Leis da termodinâmica", "Entropia", "Máquinas térmicas"], xp: 100 },
    { id: "fisica-moderna", numero: 12, titulo: "Física Moderna", emoji: "🔬", cor: "#059669", bg: "#ecfdf5", topic: null, topicos: ["Relatividade", "Física quântica", "Efeito fotoelétrico", "Radioatividade"], xp: 80 },
  ],
};

export default function TrilhaFisica() {
  return <TrilhaBase config={config} />;
}
