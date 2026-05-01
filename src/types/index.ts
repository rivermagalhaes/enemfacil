// src/types/index.ts

export type Gabarito = "Certo" | "Errado";

export type CargoArea = string;

export type CategoriaCase = "escola" | "trabalho" | "saude" | "policia" | "familia" | "consumidor";

export interface Questao {
  id: string;
  enunciado: string;
  assertiva?: string | null;
  gabarito_cespe?: Gabarito | null;
  justificativa?: string | null;
  banca?: string;
  ano?: number;
  assunto?: string;
  artigo_id?: string | null;
  concurso_id?: string | null;
  ativo?: boolean;
  // legacy
  opcaoCorreta?: boolean;
  explicacao?: string;
  materia?: string;
}

export interface SessaoQuiz {
  id: string;
  questoes: Questao[];
  questaoAtual: number;
  pontuacao: number;
  streak: number;
  xpGanho: number;
}

export interface Concurso {
  id: string;
  nome: string;
  orgao?: string;
  banca?: string;
  ano?: number;
  nivel?: string;
  nivel_formacao?: string;
  cargo?: string;
  area?: CargoArea | null;
  peso_const_pct?: number | null;
  video_url?: string | null;
  ativo?: boolean;
  criado_em?: string;
  pergunta?: string;
  situacao?: string;
  resposta?: string;
  veredicto_positivo?: string;
  veredicto_negativo?: string;
  artigo_id?: string;
}

export interface ConcursoAssunto {
  id: string;
  concurso_id: string;
  assunto: string;
  percentual?: number;
  ordem?: number;
  peso_pct?: number;
}

export interface Artigo {
  id: string;
  numero: number;
  ementa: string;
  texto_original?: string;
  texto_simples?: string;
  palavras_chave?: string[];
  lei_sigla?: string;
  titulo_num?: number;
}

export interface Inciso {
  id: string;
  artigo_id: string;
  ordem: number;
  rotulo?: string;
  texto_original?: string;
  texto_simples?: string;
  identificador?: string;
}

export interface CasoDiaDia {
  id: string;
  titulo: string;
  subtitulo?: string;
  categoria: CategoriaCase;
  ativo?: boolean;
  criado_em?: string;
  pergunta?: string;
  situacao?: string;
  resposta?: string;
  veredicto_positivo?: string;
  veredicto_negativo?: string;
  artigo_id?: string;
}

export interface ProgressoConcurso {
  concurso_id: string;
  total_respondidas: number;
  total_corretas: number;
  sequencia_atual: number;
  ultima_sessao?: string;
}
