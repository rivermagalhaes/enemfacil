// src/pages/admin/ProcessarMaterial.tsx
// Fluxo: Upload PDF → Extrai → Preview → Gera conteúdo → Publica

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface TopicoIdentificado {
  titulo: string;
  materia: string;
  resumo: string;
  selecionado: boolean;
  status: "idle" | "gerando" | "ok" | "erro";
  erro?: string;
}

interface PreviewData {
  material_id: string | null;
  texto_extraido: string;
  topicos: TopicoIdentificado[];
  materia_principal: string;
  nivel: string;
  palavras_chave: string[];
  tokens_usados: number;
}

type Etapa = "upload" | "extraindo" | "preview" | "gerando" | "concluido";

export default function ProcessarMaterial() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });

  async function handleExtrair() {
    if (!arquivo || !titulo) return;
    setEtapa("extraindo");
    setErro(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Não autenticado");

      // 1. Faz upload do arquivo no Storage
      const ext = arquivo.name.split(".").pop();
      const path = `processados/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("materiais-vestibular").upload(path, arquivo);
      if (upErr) throw new Error("Erro no upload: " + upErr.message);

      const { data: { publicUrl } } = supabase.storage
        .from("materiais-vestibular").getPublicUrl(path);

      // 2. Salva na tabela materiais
      const { data: mat, error: dbErr } = await supabase.from("materiais").insert({
        titulo, materia, tipo: "pdf", url: publicUrl, vestibular: "ENEM",
        criado_por: session.user.id,
      }).select("id").single();
      if (dbErr || !mat) throw new Error("Erro ao salvar material: " + dbErr?.message);

      // 3. Converte para base64
      const base64Data = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = () => rej(new Error("Erro ao ler arquivo"));
        r.readAsDataURL(arquivo);
      });

      // 4. Chama processar-material
      const res = await fetch(`${SUPABASE_URL}/functions/v1/processar-material`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ material_id: mat.id, base64Data, mimeType: arquivo.type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar material");

      setPreview({
        material_id: mat.id,
        texto_extraido: data.texto_extraido,
        topicos: (data.topicos_identificados ?? []).map((t: any) => ({
          ...t,
          materia: t.materia || materia || data.materia_principal,
          selecionado: true,
          status: "idle",
        })),
        materia_principal: data.materia_principal,
        nivel: data.nivel,
        palavras_chave: data.palavras_chave ?? [],
        tokens_usados: data.tokens_usados ?? 0,
      });
      setEtapa("preview");

    } catch (err: any) {
      setErro(err.message);
      setEtapa("upload");
    }
  }

  function toggleTopico(i: number) {
    if (!preview) return;
    const topicos = [...preview.topicos];
    topicos[i] = { ...topicos[i], selecionado: !topicos[i].selecionado };
    setPreview({ ...preview, topicos });
  }

  async function handlePublicar() {
    if (!preview) return;
    const selecionados = preview.topicos.filter(t => t.selecionado);
    if (!selecionados.length) return;

    setEtapa("gerando");
    setProgresso({ feitos: 0, total: selecionados.length });

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    // Busca trilhas disponíveis
    const { data: trilhas } = await supabase.from("trilhas").select("id, titulo, materia");

    let feitos = 0;
    const topicosAtualizados = [...preview.topicos];

    for (let i = 0; i < preview.topicos.length; i++) {
      const topico = preview.topicos[i];
      if (!topico.selecionado) continue;

      topicosAtualizados[i] = { ...topico, status: "gerando" };
      setPreview(p => p ? { ...p, topicos: topicosAtualizados.map(t => ({ ...t })) } : p);

      try {
        // Busca trilha correspondente
        const trilha = (trilhas ?? []).find(
          t => t.titulo?.toLowerCase() === topico.materia?.toLowerCase() ||
               t.materia?.toLowerCase() === topico.materia?.toLowerCase()
        );

        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-topic-content`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            materia: topico.materia || preview.materia_principal,
            trilha: trilha?.titulo ?? topico.materia,
            topico: topico.titulo,
            trilha_id: trilha?.id ?? null,
            material_id: preview.material_id,
          }),
        });

        const data = await res.json();
        topicosAtualizados[i] = { ...topicosAtualizados[i], status: res.ok ? "ok" : "erro", erro: data.error };
      } catch (err: any) {
        topicosAtualizados[i] = { ...topicosAtualizados[i], status: "erro", erro: err.message };
      }

      feitos++;
      setProgresso({ feitos, total: selecionados.length });
      setPreview(p => p ? { ...p, topicos: topicosAtualizados.map(t => ({ ...t })) } : p);
    }

    setEtapa("concluido");
  }

  const CORES = {
    bg: "#f8f9fa", card: "#ffffff", border: "#e5e7eb",
    verde: "#0A7C4B", verdeClaro: "#EDFAF3",
    azul: "#3b82f6", azulClaro: "#eff6ff",
    roxo: "#7c3aed", roxoClaro: "#f5f3ff",
    cinza: "#6b7280", cinzaClaro: "#f3f4f6",
    erro: "#ef4444", erroClaro: "#fef2f2",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: 0 }}>
          📚 Processar Material
        </h1>
        <p style={{ fontSize: 13, color: CORES.cinza, margin: "4px 0 0" }}>
          Importe um PDF e gere conteúdo pedagógico automaticamente
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {[
          { id: "upload", label: "Upload" },
          { id: "extraindo", label: "Extraindo" },
          { id: "preview", label: "Preview" },
          { id: "gerando", label: "Gerando" },
          { id: "concluido", label: "Publicado" },
        ].map((s, i, arr) => {
          const etapas = ["upload", "extraindo", "preview", "gerando", "concluido"];
          const atual = etapas.indexOf(etapa);
          const este = etapas.indexOf(s.id);
          const ativo = este === atual;
          const feito = este < atual;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, fontWeight: 700,
                  background: feito ? CORES.verde : ativo ? CORES.azul : CORES.cinzaClaro,
                  color: feito || ativo ? "#fff" : CORES.cinza,
                }}>
                  {feito ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 10, color: ativo ? CORES.azul : CORES.cinza, fontWeight: ativo ? 700 : 400, whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div style={{ flex: 1, height: 2, background: feito ? CORES.verde : CORES.border, margin: "0 6px", marginBottom: 16 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ETAPA: UPLOAD */}
      {etapa === "upload" && (
        <div style={{ background: CORES.card, borderRadius: 14, padding: 20, border: `1px solid ${CORES.border}` }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>📤 Enviar Material</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Título do material *"
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${CORES.border}`, fontSize: 13 }}
            />
            <input
              value={materia} onChange={e => setMateria(e.target.value)}
              placeholder="Matéria (ex: Química Geral)"
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${CORES.border}`, fontSize: 13 }}
            />
            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }}
              onChange={e => setArquivo(e.target.files?.[0] ?? null)} />
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${arquivo ? CORES.verde : CORES.border}`,
                borderRadius: 10, padding: 20, textAlign: "center", cursor: "pointer",
                background: arquivo ? CORES.verdeClaro : CORES.cinzaClaro,
              }}>
              {arquivo ? (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: CORES.verde, margin: 0 }}>📄 {arquivo.name}</p>
                  <p style={{ fontSize: 11, color: CORES.cinza, margin: "4px 0 0" }}>
                    {(arquivo.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: CORES.cinza, margin: 0 }}>
                  Clique para selecionar PDF ou imagem
                </p>
              )}
            </div>
            {erro && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: CORES.erroClaro, color: CORES.erro, fontSize: 13 }}>
                ⚠️ {erro}
              </div>
            )}
            <button
              onClick={handleExtrair}
              disabled={!arquivo || !titulo}
              style={{
                padding: "12px", borderRadius: 10, border: "none", cursor: "pointer",
                background: !arquivo || !titulo ? CORES.cinzaClaro : CORES.verde,
                color: !arquivo || !titulo ? CORES.cinza : "#fff",
                fontWeight: 700, fontSize: 14, transition: "all 0.2s",
              }}>
              🔍 Extrair e Analisar
            </button>
          </div>
        </div>
      )}

      {/* ETAPA: EXTRAINDO */}
      {etapa === "extraindo" && (
        <div style={{ background: CORES.card, borderRadius: 14, padding: 40, border: `1px solid ${CORES.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: 0 }}>Analisando material...</p>
          <p style={{ fontSize: 13, color: CORES.cinza, margin: "8px 0 0" }}>
            Claude está lendo e organizando o conteúdo pedagogicamente
          </p>
        </div>
      )}

      {/* ETAPA: PREVIEW */}
      {etapa === "preview" && preview && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Info geral */}
          <div style={{ background: CORES.card, borderRadius: 14, padding: 16, border: `1px solid ${CORES.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>📊 Material Analisado</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ padding: "4px 10px", borderRadius: 99, background: CORES.verdeClaro, color: CORES.verde, fontSize: 12, fontWeight: 600 }}>
                📚 {preview.materia_principal}
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 99, background: CORES.azulClaro, color: CORES.azul, fontSize: 12, fontWeight: 600 }}>
                🎯 {preview.nivel}
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 99, background: CORES.roxoClaro, color: CORES.roxo, fontSize: 12, fontWeight: 600 }}>
                🪙 {preview.tokens_usados.toLocaleString()} tokens
              </span>
            </div>
            {preview.palavras_chave.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {preview.palavras_chave.map(p => (
                  <span key={p} style={{ padding: "2px 8px", borderRadius: 99, background: CORES.cinzaClaro, color: CORES.cinza, fontSize: 11 }}>
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Texto extraído (preview) */}
          <div style={{ background: CORES.card, borderRadius: 14, padding: 16, border: `1px solid ${CORES.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>📄 Texto Extraído (preview)</p>
            <div style={{
              maxHeight: 150, overflowY: "auto", fontSize: 12, color: CORES.cinza,
              lineHeight: 1.6, padding: 10, background: CORES.cinzaClaro, borderRadius: 8,
            }}>
              {preview.texto_extraido.slice(0, 800)}...
            </div>
          </div>

          {/* Tópicos identificados */}
          <div style={{ background: CORES.card, borderRadius: 14, padding: 16, border: `1px solid ${CORES.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                🎓 Tópicos Identificados ({preview.topicos.filter(t => t.selecionado).length}/{preview.topicos.length})
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPreview(p => p ? { ...p, topicos: p.topicos.map(t => ({ ...t, selecionado: true })) } : p)}
                  style={{ fontSize: 11, color: CORES.azul, background: "none", border: "none", cursor: "pointer" }}>
                  Todos
                </button>
                <button onClick={() => setPreview(p => p ? { ...p, topicos: p.topicos.map(t => ({ ...t, selecionado: false })) } : p)}
                  style={{ fontSize: 11, color: CORES.cinza, background: "none", border: "none", cursor: "pointer" }}>
                  Nenhum
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {preview.topicos.map((t, i) => (
                <div key={i}
                  onClick={() => toggleTopico(i)}
                  style={{
                    padding: 12, borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${t.selecionado ? CORES.verde : CORES.border}`,
                    background: t.selecionado ? CORES.verdeClaro : CORES.cinzaClaro,
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: t.selecionado ? CORES.verde : CORES.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {t.selecionado && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: t.selecionado ? CORES.verde : "#111" }}>
                      {t.titulo}
                    </p>
                    <p style={{ fontSize: 11, color: CORES.cinza, margin: "2px 0 0" }}>{t.materia}</p>
                    <p style={{ fontSize: 11, color: CORES.cinza, margin: "4px 0 0", lineHeight: 1.5 }}>{t.resumo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handlePublicar}
            disabled={!preview.topicos.some(t => t.selecionado)}
            style={{
              padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
              background: preview.topicos.some(t => t.selecionado) ? CORES.verde : CORES.cinzaClaro,
              color: preview.topicos.some(t => t.selecionado) ? "#fff" : CORES.cinza,
              fontWeight: 700, fontSize: 15,
            }}>
            🚀 Gerar e Publicar {preview.topicos.filter(t => t.selecionado).length} tópico(s)
          </button>
        </div>
      )}

      {/* ETAPA: GERANDO */}
      {(etapa === "gerando" || etapa === "concluido") && preview && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Barra de progresso */}
          {etapa === "gerando" && (
            <div style={{ background: CORES.card, borderRadius: 14, padding: 16, border: `1px solid ${CORES.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Gerando conteúdo... {progresso.feitos}/{progresso.total}
                </span>
                <span style={{ fontSize: 13, color: CORES.cinza }}>
                  {Math.round((progresso.feitos / progresso.total) * 100)}%
                </span>
              </div>
              <div style={{ height: 8, background: CORES.cinzaClaro, borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99, background: CORES.verde,
                  width: `${(progresso.feitos / progresso.total) * 100}%`,
                  transition: "width 0.5s",
                }} />
              </div>
            </div>
          )}

          {etapa === "concluido" && (
            <div style={{ background: CORES.verdeClaro, borderRadius: 14, padding: 16, border: `1px solid ${CORES.verde}`, textAlign: "center" }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: CORES.verde, margin: 0 }}>
                ✅ Conteúdo publicado com sucesso!
              </p>
              <p style={{ fontSize: 13, color: CORES.cinza, margin: "6px 0 0" }}>
                {preview.topicos.filter(t => t.status === "ok").length} tópicos gerados •{" "}
                {preview.topicos.filter(t => t.status === "erro").length} erros
              </p>
              <button
                onClick={() => { setEtapa("upload"); setArquivo(null); setTitulo(""); setMateria(""); setPreview(null); }}
                style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: CORES.verde, color: "#fff", fontWeight: 600, fontSize: 13 }}>
                Processar outro material
              </button>
            </div>
          )}

          {/* Lista de tópicos com status */}
          <div style={{ background: CORES.card, borderRadius: 14, border: `1px solid ${CORES.border}`, overflow: "hidden" }}>
            {preview.topicos.filter(t => t.selecionado).map((t, i) => (
              <div key={i} style={{
                padding: "12px 16px", borderBottom: `1px solid ${CORES.border}`,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ fontSize: 16 }}>
                  {t.status === "idle" ? "○" : t.status === "gerando" ? "⟳" : t.status === "ok" ? "✅" : "❌"}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t.titulo}</p>
                  <p style={{ fontSize: 11, color: CORES.cinza, margin: "2px 0 0" }}>
                    {t.status === "gerando" ? "Gerando..." : t.status === "ok" ? "Publicado" : t.status === "erro" ? t.erro?.slice(0, 60) : "Aguardando"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
