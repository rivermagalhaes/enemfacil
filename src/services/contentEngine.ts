// src/services/contentEngine.ts
// EnemFácil — Content Engine Service
// Uso: import { generateTopicContent, getTopicContent } from '@/services/contentEngine'

import { supabase } from '@/lib/supabase' // seu cliente Supabase existente

// ── Tipos ────────────────────────────────────────────────────

export interface ContentGenerationRequest {
  materia: string
  trilha: string
  topico: string
  topico_id: string
  trilha_id?: string
}

export interface ContentGenerationResult {
  ok: boolean
  topico_id: string
  tokens_usados: number
  duracao_ms: number
  distribuicao: Record<string, any>
  content: TopicContent
}

export interface TopicContent {
  materia: string
  trilha: string
  topico: string
  resumo: {
    introducao: string
    explicacao: string
    conceitos_principais: string[]
    erros_comuns: string[]
    dicas_enem: string[]
  }
  mapa_mental: {
    titulo: string
    nodos: any[]
  }
  imagens: ContentHero[]
  flashcards: Flashcard[]
  exercicios: Exercicio[]
  questoes_enem: QuestaoEnem[]
  mini_simulado: {
    titulo: string
    questoes: any[]
  }
  revisao_inteligente: {
    dia_1: string[]
    dia_7: string[]
    dia_15: string[]
    dia_30: string[]
  }
  pptx: {
    slides: any[]
  }
}

export interface ContentHero {
  id?: string
  titulo: string
  tipo: 'hero' | 'banner' | 'thumbnail' | 'card'
  prompt: string
  image_url?: string
  status?: 'pending' | 'generating' | 'done' | 'error'
}

export interface Flashcard {
  id?: string
  pergunta: string
  resposta: string
  ordem?: number
}

export interface Exercicio {
  id?: string
  nivel: 'facil' | 'medio' | 'dificil'
  pergunta: string
  resposta: string
  explicacao: string
}

export interface QuestaoEnem {
  id?: string
  dificuldade: string
  enunciado: string
  alternativas: { A: string; B: string; C: string; D: string; E: string }
  gabarito: string
  comentario: string
  habilidade_bncc: string
}

// ── Função principal de geração ──────────────────────────────

/**
 * Gera o pacote completo de conteúdo para um tópico.
 * Chama a Edge Function, que por sua vez chama a Claude API
 * e distribui o resultado para todas as tabelas do banco.
 *
 * Exemplo:
 *   const result = await generateTopicContent({
 *     materia: 'Química',
 *     trilha: 'Química Geral',
 *     topico: 'Modelo Atômico de Bohr',
 *     topico_id: 'uuid-do-topico',
 *     trilha_id: 'uuid-da-trilha',
 *   })
 */
export async function generateTopicContent(
  req: ContentGenerationRequest
): Promise<ContentGenerationResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  if (!token) throw new Error('Usuário não autenticado')

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-topic-content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(req),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao gerar conteúdo')
  }

  return res.json()
}

// ── Funções de leitura (sem chamar IA) ───────────────────────

/** Retorna flashcards de um tópico */
export async function getFlashcards(topicoId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('topico_id', topicoId)
    .eq('ativo', true)
    .order('ordem')

  if (error) throw error
  return data ?? []
}

/** Retorna exercícios resolvidos de um tópico */
export async function getExercicios(
  topicoId: string,
  nivel?: 'facil' | 'medio' | 'dificil'
): Promise<Exercicio[]> {
  let query = supabase
    .from('exercicios_topico')
    .select('*')
    .eq('topico_id', topicoId)
    .eq('ativo', true)
    .order('ordem')

  if (nivel) query = query.eq('nivel', nivel)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/** Retorna o hero/banner de uma entidade qualquer */
export async function getContentHero(
  entityType: 'trilha' | 'topico' | 'material' | 'modulo' | 'simulado',
  entityId: string,
  tipo: 'hero' | 'banner' | 'thumbnail' | 'card' = 'hero'
): Promise<ContentHero | null> {
  const { data, error } = await supabase
    .from('content_heroes')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('tipo', tipo)
    .maybeSingle()

  if (error) throw error
  return data
}

/** Retorna o resumo e mapa mental do tópico */
export async function getTopicoContent(topicoId: string) {
  const { data, error } = await supabase
    .from('topicos')
    .select('id, resumo_gerado, mapa_mental, revisao_schedule, content_gerado_em')
    .eq('id', topicoId)
    .single()

  if (error) throw error
  return data
}

/** Verifica se um tópico já tem conteúdo gerado */
export async function hasGeneratedContent(topicoId: string): Promise<boolean> {
  const { data } = await supabase
    .from('topicos')
    .select('content_gerado_em')
    .eq('id', topicoId)
    .single()

  return !!data?.content_gerado_em
}

// ── Hook React (opcional, se usar Next.js/React) ─────────────

/**
 * Hook para verificar e disparar geração de conteúdo.
 *
 * Exemplo de uso no componente:
 *   const { loading, content, generate } = useTopicContent(topicoId)
 */
export function useTopicContent(topicoId: string, req?: ContentGenerationRequest) {
  // Implementação com useState/useEffect omitida intencionalmente
  // para não criar dependência de framework.
  // Adapte conforme seu setup (React Query, SWR, Zustand, etc.)
  throw new Error('Adapte este hook para seu framework. Ver comentários no arquivo.')
}
