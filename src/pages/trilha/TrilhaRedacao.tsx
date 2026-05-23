// src/pages/trilha/TrilhaRedacao.tsx
import TrilhaBase, { TrilhaConfig } from "@/components/trilha/TrilhaBase";

const COR_VEST: Record<string, string> = { ENEM: "#6D28D9", FUVEST: "#8B0000", UNICAMP: "#005C97", UNB: "#006400" };

const config: TrilhaConfig = {
  materia: "redacao",
  titulo: "Trilha de Redação",
  emoji: "✏️",
  mapaMentalTitulo: "Redação — Dissertação Argumentativa",
  corVest: (v) => COR_VEST[v] ?? "#6D28D9",
  unidades: [
    { id: "estrutura-dissertacao", numero: 1, titulo: "Estrutura da Dissertação", emoji: "📄", cor: "#6D28D9", bg: "#F3F0FF", topic: "redacao", topicos: ["Introdução, desenvolvimento e conclusão", "Parágrafo temático", "Coesão e coerência", "Tipologia textual"], xp: 60 },
    { id: "introducao", numero: 2, titulo: "Construindo a Introdução", emoji: "🚪", cor: "#7C3AED", bg: "#F5F3FF", topic: "redacao", topicos: ["Apresentação do tema", "Contextualização histórica", "Citações e dados", "Tese clara e direta"], xp: 80 },
    { id: "argumentacao", numero: 3, titulo: "Técnicas de Argumentação", emoji: "💬", cor: "#8B5CF6", bg: "#EDE9FE", topic: "redacao", topicos: ["Argumento de autoridade", "Argumento de exemplificação", "Argumento causal", "Contra-argumento e refutação"], xp: 120 },
    { id: "desenvolvimento", numero: 4, titulo: "Desenvolvendo os Parágrafos", emoji: "✍️", cor: "#A78BFA", bg: "#F5F3FF", topic: "redacao", topicos: ["Tópico frasal", "Desenvolvimento e exemplos", "Conectivos e coesão", "Progressão textual"], xp: 100 },
    { id: "conclusao", numero: 5, titulo: "A Conclusão Propositiva", emoji: "🎯", cor: "#6D28D9", bg: "#EDE9FE", topic: "redacao", topicos: ["Retomada da tese", "Proposta de intervenção (ENEM)", "Agentes, ações e finalidades", "Fechamento coeso"], xp: 100 },
    { id: "competencias-enem", numero: 6, titulo: "5 Competências do ENEM", emoji: "📊", cor: "#4C1D95", bg: "#F3F0FF", topic: "redacao", topicos: ["C1: domínio da norma culta", "C2: compreensão da proposta", "C3: seleção de argumentos", "C4: coesão e C5: proposta de intervenção"], xp: 120 },
    { id: "repertorio", numero: 7, titulo: "Repertório Sociocultural", emoji: "🌐", cor: "#7C3AED", bg: "#F5F3FF", topic: "redacao", topicos: ["Dados e estatísticas", "Referências filosóficas", "Legislação e direitos", "Atualidades e contexto"], xp: 100 },
    { id: "coesao-coerencia", numero: 8, titulo: "Coesão e Coerência", emoji: "🔗", cor: "#6366F1", bg: "#EEF2FF", topic: "redacao", topicos: ["Conectivos aditivos e adversativos", "Referência e substituição", "Progressão temática", "Erros de coerência comuns"], xp: 80 },
    { id: "pratica-temas", numero: 9, titulo: "Temas Recorrentes do ENEM", emoji: "📰", cor: "#8B5CF6", bg: "#EDE9FE", topic: "redacao", topicos: ["Direitos humanos e sociais", "Meio ambiente e sustentabilidade", "Tecnologia e sociedade", "Saúde pública e educação"], xp: 100 },
  ],
};

export default function TrilhaRedacao() {
  return <TrilhaBase config={config} />;
}
