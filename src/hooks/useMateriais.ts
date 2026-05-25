// src/hooks/useMateriais.ts
// Hook para upload, listagem e seleção de PDFs salvos no banco

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface Material {
  id: string
  titulo: string
  descricao?: string
  tipo: string
  url: string
  materia?: string
  topic?: string
  vestibular?: string
  criado_em: string
}

const BUCKET = 'materiais-pdf'

// ── Upload de PDF para Storage + salva em materiais ──────────
export async function uploadMaterial(
  file: File,
  titulo: string,
  materia: string,
  topic?: string,
  vestibular?: string
): Promise<Material> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // Nome único no Storage
  const ext = file.name.split('.').pop()
  const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  // Upload para o Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

  // URL pública
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = urlData.publicUrl

  // Salva referência na tabela materiais
  const { data, error: insertError } = await supabase
    .from('materiais')
    .insert({
      titulo,
      tipo: ext === 'pdf' ? 'pdf' : 'imagem',
      url,
      materia,
      topic: topic ?? null,
      vestibular: vestibular ?? null,
      criado_por: user.id,
      ativo: true,
    })
    .select()
    .single()

  if (insertError) throw new Error(`Erro ao salvar: ${insertError.message}`)
  return data
}

// ── Hook para listar PDFs salvos ─────────────────────────────
export function useMateriais(materia?: string) {
  const [materiais, setMateriais] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('materiais')
      .select('*')
      .in('tipo', ['pdf', 'imagem'])
      .eq('ativo', true)
      .order('criado_em', { ascending: false })

    if (materia) query = query.eq('materia', materia)

    const { data } = await query
    setMateriais(data ?? [])
    setLoading(false)
  }, [materia])

  useEffect(() => { load() }, [load])

  async function deletar(id: string, url: string) {
    // Remove do Storage
    const path = url.split(`${BUCKET}/`)[1]
    if (path) await supabase.storage.from(BUCKET).remove([path])
    // Remove do banco
    await supabase.from('materiais').delete().eq('id', id)
    await load()
  }

  return { materiais, loading, reload: load, deletar }
}
