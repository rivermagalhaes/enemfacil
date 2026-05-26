// src/components/admin/HeroImageManager.tsx
// Componente para gerenciar geração de imagens dos tópicos
// Adicionar na aba Conteúdo do AdminDashboard
//
// Uso:
//   import HeroImageManager from '@/components/admin/HeroImageManager'
//   {aba === "conteudo" && <HeroImageManager />}

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

interface Hero {
  id: string
  titulo: string
  tipo: string
  status: 'pending' | 'generating' | 'done' | 'error'
  image_url: string | null
  area_enem: string | null
  prompt: string
  entity_type: string
}

const STATUS_CONFIG = {
  pending:    { label: 'Pendente',   color: '#f59e0b', bg: '#fffbeb' },
  generating: { label: 'Gerando...', color: '#3b82f6', bg: '#eff6ff' },
  done:       { label: 'Pronta',     color: '#22c55e', bg: '#f0fdf4' },
  error:      { label: 'Erro',       color: '#ef4444', bg: '#fef2f2' },
}

export default function HeroImageManager() {
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [filter, setFilter] = useState<'todos' | 'pending' | 'done' | 'error'>('todos')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('content_heroes')
      .select('id, titulo, tipo, status, image_url, area_enem, prompt, entity_type')
      .order('status')
    setHeroes(data ?? [])
    setLoading(false)
  }

  async function processarFila() {
    setProcessando(true)
    setMsg(null)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-hero-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ processar_fila: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg({ tipo: 'ok', texto: `✅ ${data.processados} imagem(ns) gerada(s)!` })
      await carregar()
    } catch (err: any) {
      setMsg({ tipo: 'erro', texto: `Erro: ${err.message}` })
    }
    setProcessando(false)
  }

  async function gerarUma(heroId: string) {
    setHeroes(prev => prev.map(h => h.id === heroId ? { ...h, status: 'generating' } : h))
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-hero-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hero_id: heroId }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error)
      await carregar()
    } catch (err: any) {
      setHeroes(prev => prev.map(h => h.id === heroId ? { ...h, status: 'error' } : h))
    }
  }

  const filtered = heroes.filter(h => filter === 'todos' || h.status === filter)
  const pendentes = heroes.filter(h => h.status === 'pending').length
  const prontas = heroes.filter(h => h.status === 'done').length
  const erros = heroes.filter(h => h.status === 'error').length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#1a1a2e' }}>🖼️ Imagens dos Tópicos</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, background: '#fffbeb', color: '#92400e', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>⏳ {pendentes} pendentes</span>
            <span style={{ fontSize: 11, background: '#f0fdf4', color: '#15803d', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>✓ {prontas} prontas</span>
            {erros > 0 && <span style={{ fontSize: 11, background: '#fef2f2', color: '#b91c1c', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>✗ {erros} erros</span>}
          </div>
        </div>
        <button
          onClick={processarFila}
          disabled={processando || pendentes === 0}
          style={{
            padding: '8px 16px', background: processando || pendentes === 0 ? '#e2e8f0' : 'linear-gradient(135deg,#6D28D9,#4C1D95)',
            color: processando || pendentes === 0 ? '#94a3b8' : '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: processando || pendentes === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {processando ? '⏳ Gerando...' : `🎨 Gerar ${pendentes} pendente${pendentes !== 1 ? 's' : ''}`}
        </button>
      </div>

      {msg && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: msg.tipo === 'ok' ? '#EDFAF3' : '#FFF1F1', color: msg.tipo === 'ok' ? '#15803d' : '#b91c1c', fontSize: 12, fontWeight: 600 }}>
          {msg.texto}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['todos', 'pending', 'done', 'error'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: filter === f ? '#6D28D9' : '#f1f5f9', color: filter === f ? '#fff' : '#64748b' }}>
            {f === 'todos' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'done' ? 'Prontas' : 'Erros'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 24 }}>Carregando...</p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 24 }}>Nenhuma imagem encontrada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(hero => {
            const sc = STATUS_CONFIG[hero.status]
            return (
              <div key={hero.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Preview da imagem */}
                <div style={{ width: 64, height: 40, borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', flexShrink: 0, overflow: 'hidden' }}>
                  {hero.image_url ? (
                    <img src={hero.image_url} alt={hero.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {hero.status === 'generating' ? '⏳' : hero.status === 'error' ? '❌' : '🖼️'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hero.titulo}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                    {hero.entity_type} · {hero.area_enem ?? 'Geral'}
                  </p>
                </div>

                {/* Status */}
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color, fontWeight: 600, flexShrink: 0 }}>
                  {sc.label}
                </span>

                {/* Ação */}
                {(hero.status === 'pending' || hero.status === 'error') && (
                  <button
                    onClick={() => gerarUma(hero.id)}
                    style={{ padding: '5px 10px', background: '#f5f3ff', color: '#6D28D9', border: '1px solid #ddd6fe', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Gerar
                  </button>
                )}
                {hero.status === 'done' && hero.image_url && (
                  <a href={hero.image_url} target="_blank" rel="noreferrer"
                    style={{ padding: '5px 10px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                    Ver
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
