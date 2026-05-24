// src/pages/olimpiadas/CoordenadorDashboard.tsx
// Dashboard exclusivo para coordenador de olimpíadas

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import GestaoConteudoTrilhas from "@/components/admin/GestaoConteudoTrilhas";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";

const C = {
  primary: "#7C3AED", bg: "#F4F6FB", card: "#FFFFFF",
  text: "#1a1a2e", sub: "#64748B", border: "#E2E8F0",
  ok: "#22c55e", erro: "#ef4444",
};

const OLIMPIADAS = [
  { id: "OBQ", nome: "OBQ", nomeCompleto: "Olimpíada Brasileira de Química", emoji: "🥇", cor: "#7C3AED" },
  { id: "OTQ", nome: "OTQ", nomeCompleto: "Olimpíada Tocantinense de Química", emoji: "🧪", cor: "#0A7C4B" },
];

const ABAS = [
  { id: "visao",      label: "Visão Geral",   emoji: "📊" },
  { id: "questoes",   label: "Questões PDF",  emoji: "📝" },
  { id: "conteudo",   label: "Conteúdo",      emoji: "📖" },
  { id: "provas",     label: "Provas",        emoji: "📋" },
  { id: "resultados", label: "Resultados",    emoji: "🏆" },
  { id: "certificados",label:"Certificados",  emoji: "📜" },
  { id: "trilhas",     label: "Trilhas Quím.", emoji: "🧪" },
];

const AREAS_OLIMPIADA: Record<string, { id: string; titulo: string }[]> = {
  OBQ: [
    { id: "quimica-geral",     titulo: "Química Geral e Inorgânica" },
    { id: "fisicoquimica",     titulo: "Físico-Química" },
    { id: "quimica-organica",  titulo: "Química Orgânica" },
    { id: "bioquimica",        titulo: "Bioquímica" },
    { id: "quimica-analitica", titulo: "Química Analítica" },
  ],
  OTQ: [
    { id: "hidrocarbonetos",      titulo: "Hidrocarbonetos" },
    { id: "funcoes-organicas",    titulo: "Funções Oxigenadas" },
    { id: "funcoes-nitrogenadas", titulo: "Funções Nitrogenadas" },
    { id: "isomeria",             titulo: "Isomeria" },
    { id: "reacoes-organicas",    titulo: "Reações Orgânicas" },
    { id: "polimeros",            titulo: "Polímeros" },
  ],
};



export default function CoordenadorDashboard() {
  const navigate = useNavigate();
  const { profile, isProfessor, isAdmin, loading } = useAuth();
  const [aba, setAba] = useState("visao");
  const [olimpiadaSel, setOlimpiadaSel] = useState("OBQ");
  const [areaSel, setAreaSel] = useState(0);
  const [stats, setStats] = useState({ questoes: 0, provas: 0, participantes: 0, certificados: 0 });
const [tentativas, setTentativas] = useState<any[]>([]);
// Conteúdo
  const pdfRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [formConteudo, setFormConteudo] = useState({ titulo: "", conteudo: "", exemplos: "", formulas: "" });
  const [existeId, setExisteId] = useState<string | null>(null);
  const [salvandoC, setSalvandoC] = useState(false);
  const [msgC, setMsgC] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Extrator PDF questões
  const pdfQuestoesRef = useRef<HTMLInputElement>(null);
  const [extraindo, setExtraindo] = useState(false);
  const [questoesExtraidas, setQuestoesExtraidas] = useState<any[]>([]);
  const [salvandoQ, setSalvandoQ] = useState(false);
  const [provaDestino, setProvaDestino] = useState("");
  const [criandoProva, setCriandoProva] = useState(false);
  const [salvandoProva, setSalvandoProva] = useState(false);
  const [editandoProva, setEditandoProva] = useState<string|null>(null);
  const [formProva, setFormProva] = useState({ titulo:"", descricao:"", tempo_limite:120, data_inicio:"", data_fim:"", ativa:false });
  const [msgProva, setMsgProva] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);

  // Trilhas de química
  const [provas, setProvas] = useState<any[]>([]);
  const [msgQ, setMsgQ] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isProfessor && !isAdmin) { navigate("/"); return; }
    carregarStats();
    carregarProvas();
  }, [olimpiadaSel, loading, isProfessor, isAdmin]);

  useEffect(() => {
    if (aba === "conteudo") carregarConteudo(areaSel);
    if (aba === "resultados") carregarResultados();
  }, [aba, areaSel, olimpiadaSel]);

  async function criarOuAtualizarProva() {
    if (!formProva.titulo.trim()) { setMsgProva({ tipo:"erro", texto:"Título obrigatório" }); return; }
    setSalvandoProva(true);
    const { data: ev } = await supabase.from("eventos_certificaveis").select("id").eq("sigla", olimpiadaSel).maybeSingle();
    if (!ev) { setMsgProva({ tipo:"erro", texto:"Evento não encontrado. Crie o evento OBQ/OTQ primeiro." }); setSalvandoProva(false); return; }

    const payload = {
      evento_id: (ev as any).id,
      titulo: formProva.titulo.trim(),
      descricao: formProva.descricao || null,
      tempo_limite_min: formProva.tempo_limite,
      data_inicio: formProva.data_inicio || null,
      data_fim: formProva.data_fim || null,
      ativa: formProva.ativa,
    };

    const { error } = editandoProva
      ? await supabase.from("provas_olimpiada").update(payload).eq("id", editandoProva)
      : await supabase.from("provas_olimpiada").insert(payload);

    if (error) { setMsgProva({ tipo:"erro", texto:"Erro: "+error.message }); }
    else {
      setMsgProva({ tipo:"ok", texto: editandoProva ? "✅ Prova atualizada!" : "✅ Prova criada!" });
      setCriandoProva(false); setEditandoProva(null);
      setFormProva({ titulo:"", descricao:"", tempo_limite:120, data_inicio:"", data_fim:"", ativa:false });
      carregarProvas();
      setTimeout(()=>setMsgProva(null), 3000);
    }
    setSalvandoProva(false);
  }

  async function toggleAtivarProva(id: string, ativa: boolean) {
    await supabase.from("provas_olimpiada").update({ ativa: !ativa }).eq("id", id);
    carregarProvas();
  }

  async function deletarProva(id: string) {
    if (!confirm("Tem certeza? Isso remove a prova e todas as questões vinculadas.")) return;
    await supabase.from("questoes_prova").delete().eq("prova_id", id);
    await supabase.from("provas_olimpiada").delete().eq("id", id);
    carregarProvas();
    setMsgProva({ tipo:"ok", texto:"🗑 Prova removida." });
    setTimeout(()=>setMsgProva(null), 3000);
  }

  async function carregarStats() {
    const { data: ev } = await supabase.from("eventos_certificaveis").select("id").eq("sigla", olimpiadaSel).maybeSingle();
    if (!ev) return;
    const [{ count: q }, { count: p }, { count: t }, { count: c }] = await Promise.all([
      supabase.from("questoes_prova").select("id", { count: "exact", head: true }),
      supabase.from("provas_olimpiada").select("id", { count: "exact", head: true }).eq("evento_id", (ev as any).id),
      supabase.from("tentativas_prova").select("id", { count: "exact", head: true }),
      supabase.from("certificados").select("id", { count: "exact", head: true }).eq("evento_id", (ev as any).id),
    ]);
    setStats({ questoes: q ?? 0, provas: p ?? 0, participantes: t ?? 0, certificados: c ?? 0 });
  }

  async function carregarProvas() {
    const { data: ev } = await supabase.from("eventos_certificaveis").select("id").eq("sigla", olimpiadaSel).maybeSingle();
    if (!ev) return;
    const { data } = await supabase.from("provas_olimpiada").select("id,titulo,ativa").eq("evento_id", (ev as any).id);
    setProvas(data ?? []);
    if (data?.[0]) setProvaDestino(data[0].id);
  }

  async function carregarResultados() {
    const { data: ev } = await supabase.from("eventos_certificaveis").select("id").eq("sigla", olimpiadaSel).maybeSingle();
    if (!ev) return;
    const { data: p } = await supabase.from("provas_olimpiada").select("id").eq("evento_id", (ev as any).id).maybeSingle();
    if (!p) return;
    const { data } = await supabase.from("tentativas_prova").select("*, profiles(nome,email)").eq("prova_id", (p as any).id).order("nota", { ascending: false }).limit(50);
    setTentativas(data ?? []);
  }

  async function carregarConteudo(idx: number) {
    const areas = AREAS_OLIMPIADA[olimpiadaSel] ?? [];
    const area = areas[idx];
    if (!area) return;
    setFormConteudo({ titulo: "", conteudo: "", exemplos: "", formulas: "" });
    setExisteId(null);
    const { data } = await supabase.from("trilha_conteudos")
      .select("id,titulo,conteudo,exemplos,formulas")
      .eq("materia", `olimpiada_${olimpiadaSel.toLowerCase()}`)
      .eq("unidade_id", area.id)
      .maybeSingle();
    if (data) {
      setExisteId((data as any).id);
      setFormConteudo({ titulo: (data as any).titulo || "", conteudo: (data as any).conteudo || "", exemplos: (data as any).exemplos || "", formulas: (data as any).formulas || "" });
    } else {
      setFormConteudo({ titulo: area.titulo, conteudo: "", exemplos: "", formulas: "" });
    }
  }

  async function salvarConteudo() {
    const areas = AREAS_OLIMPIADA[olimpiadaSel] ?? [];
    const area = areas[areaSel];
    if (!formConteudo.conteudo.trim()) { setMsgC({ tipo: "erro", texto: "Conteúdo obrigatório" }); return; }
    setSalvandoC(true);
    const payload = { materia: `olimpiada_${olimpiadaSel.toLowerCase()}`, unidade_id: area.id, titulo: formConteudo.titulo || area.titulo, conteudo: formConteudo.conteudo, exemplos: formConteudo.exemplos || null, formulas: formConteudo.formulas || null };
    const { error } = existeId
      ? await supabase.from("trilha_conteudos").update(payload).eq("id", existeId)
      : await supabase.from("trilha_conteudos").insert(payload);
    setMsgC(error ? { tipo: "erro", texto: "Erro: " + error.message } : { tipo: "ok", texto: "✅ Salvo!" });
    setSalvandoC(false);
    setTimeout(() => setMsgC(null), 3000);
  }

  async function gerarConteudoIA() {
    const areas = AREAS_OLIMPIADA[olimpiadaSel] ?? [];
    const area = areas[areaSel];
    setImportando(true); setMsgC({ tipo: "ok", texto: "⏳ Gerando com IA..." });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("https://iuziweujszfiaulltzqv.supabase.co/functions/v1/converter-questoes-objetivas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ questoes: [{ question: `Gere conteúdo educacional COMPLETO para "${area.titulo}" da olimpíada ${olimpiadaSel}. JSON: { "options": ["CONTEUDO_400_600_PALAVRAS", "EXEMPLOS_2_3", "FORMULAS_E_DICAS", "TITULO_CURTO"], "answer_index": 0, "explanation": "" }`, area: "natureza", difficulty: "dificil" }] }),
      });
      const data = await r.json();
      const res = data.resultados?.[0];
      if (res?.options?.length >= 3) {
        setFormConteudo({ titulo: res.options[3] || area.titulo, conteudo: res.options[0] || "", exemplos: res.options[1] || "", formulas: res.options[2] || "" });
        setMsgC({ tipo: "ok", texto: "✅ Gerado! Revise e salve." });
      } else throw new Error("Resposta inválida");
    } catch (e: any) { setMsgC({ tipo: "erro", texto: "Erro: " + e.message }); }
    setImportando(false);
  }

  async function importarPdfConteudo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const areas = AREAS_OLIMPIADA[olimpiadaSel] ?? [];
    const area = areas[areaSel];
    setImportando(true); setMsgC({ tipo: "ok", texto: "⏳ Extraindo do arquivo..." });
    try {
      const base64Data = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("https://iuziweujszfiaulltzqv.supabase.co/functions/v1/extrair-conteudo-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ base64Data, mimeType: file.type || "application/pdf", unidadeTitulo: area.titulo, materia: `${olimpiadaSel} — ${area.titulo}` }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Erro");
      const c = data.conteudo;
      setFormConteudo({ titulo: c.titulo || area.titulo, conteudo: c.conteudo || "", exemplos: c.exemplos || "", formulas: c.formulas || "" });
      setMsgC({ tipo: "ok", texto: "✅ Extraído! Revise e salve." });
    } catch (e: any) { setMsgC({ tipo: "erro", texto: "Erro: " + e.message }); }
    setImportando(false);
    if (pdfRef.current) pdfRef.current.value = "";
  }

  async function extrairQuestoesPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtraindo(true); setMsgQ({ tipo: "ok", texto: "⏳ Extraindo questões..." });
    try {
      const base64Data = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("https://iuziweujszfiaulltzqv.supabase.co/functions/v1/extrair-questoes-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ base64Data, mimeType: file.type || "application/pdf" }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Erro");
      setQuestoesExtraidas((data.questoes || []).map((q: any, i: number) => ({ ...q, _id: i, _sel: q.options?.length >= 2 })));
      setMsgQ({ tipo: "ok", texto: `✅ ${data.questoes?.length} questões extraídas. Revise e salve.` });
    } catch (e: any) { setMsgQ({ tipo: "erro", texto: "Erro: " + e.message }); }
    setExtraindo(false);
    if (pdfQuestoesRef.current) pdfQuestoesRef.current.value = "";
  }

  async function salvarQuestoesExtraidas() {
    if (!provaDestino) { setMsgQ({ tipo: "erro", texto: "Selecione a prova de destino" }); return; }
    const selecionadas = questoesExtraidas.filter(q => q._sel);
    if (!selecionadas.length) { setMsgQ({ tipo: "erro", texto: "Selecione ao menos uma questão" }); return; }
    setSalvandoQ(true);
    let ok = 0, err = 0;
    for (const q of selecionadas) {
      const { data: inserted, error } = await supabase.from("questoes_prova").insert({
        prova_id: provaDestino,
        enunciado: q.question,
        explicacao: q.explanation || "",
        assunto: q.topic || "",
        dificuldade: q.difficulty || "medio",
        alternativas: (q.options || []).map((texto: string, i: number) => ({ texto, correta: i === (q.answer_index ?? 0) })),
        resposta_correta: q.answer_index ?? 0,
        ordem: ok + 1,
      }).select("id").single();
      if (error || !inserted) { err++; } else { ok++; }
    }
    setMsgQ({ tipo: ok > 0 ? "ok" : "erro", texto: `✅ ${ok} questão(ões) salva(s)${err > 0 ? ` · ⚠️ ${err} com erro` : ""}` });
    if (ok > 0) setQuestoesExtraidas([]);
    setSalvandoQ(false);
  }






  const olimpiadaAtual = OLIMPIADAS.find(o => o.id === olimpiadaSel)!;
  const areasOlimpiada = AREAS_OLIMPIADA[olimpiadaSel] ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: C.bg }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${olimpiadaAtual.cor}, ${olimpiadaAtual.cor}cc)`, padding: "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "#fff", padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>← Início</button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 2px" }}>🏆 Coordenação de Olimpíadas</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{profile?.nome}</p>
          </div>
          {/* Seletor de olimpíada */}
          <div style={{ display: "flex", gap: 4 }}>
            {OLIMPIADAS.map(o => (
              <button key={o.id} onClick={() => { setOlimpiadaSel(o.id); setAreaSel(0); }}
                style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                  background: olimpiadaSel === o.id ? "#fff" : "rgba(255,255,255,0.15)",
                  color: olimpiadaSel === o.id ? olimpiadaAtual.cor : "#fff" }}>
                {o.emoji} {o.id}
              </button>
            ))}
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              style={{ flexShrink: 0, padding: "8px 12px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: aba === a.id ? C.bg : "rgba(255,255,255,0.15)",
                color: aba === a.id ? olimpiadaAtual.cor : "#fff" }}>
              {a.emoji} {a.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 90px" }}>

        {/* ── VISÃO GERAL ── */}
        {aba === "visao" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Questões", valor: stats.questoes, emoji: "📝", cor: "#0057FF" },
                { label: "Provas",   valor: stats.provas,   emoji: "📋", cor: "#7C3AED" },
                { label: "Alunos",   valor: stats.participantes, emoji: "👥", cor: "#0A7C4B" },
                { label: "Certificados", valor: stats.certificados, emoji: "📜", cor: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 22, margin: "0 0 4px" }}>{s.emoji}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: s.cor, margin: "0 0 2px" }}>{s.valor}</p>
                  <p style={{ fontSize: 11, color: C.sub, margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>🚀 Ações rápidas</p>
              {[
                { label: "Importar questões de PDF",  emoji: "📄", aba: "questoes" },
                { label: "Adicionar conteúdo por área", emoji: "📖", aba: "conteudo" },
                { label: "Gerenciar provas",           emoji: "📋", aba: "provas" },
                { label: "Ver resultados e ranking",   emoji: "🏆", aba: "resultados" },
              ].map(a => (
                <button key={a.aba} onClick={() => setAba(a.aba)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#F8FAFC", border: `1px solid ${C.border}`, marginBottom: 8, cursor: "pointer", textAlign: "left" as const }}>
                  <span style={{ fontSize: 20 }}>{a.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.label}</span>
                  <span style={{ marginLeft: "auto", color: C.sub }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── QUESTÕES PDF ── */}
        {aba === "questoes" && (
          <div>
            <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>📄 Importar Questões via PDF</p>
              <p style={{ fontSize: 12, color: C.sub, margin: "0 0 14px" }}>Envie uma prova da {olimpiadaSel} — a IA extrai todas as questões automaticamente.</p>

              {/* Prova de destino */}
              <div style={{ marginBottom: 12 }}>
                <p style={sL}>Prova de destino</p>
                {provas.length > 0 ? (
                  <select value={provaDestino} onChange={e => setProvaDestino(e.target.value)} style={sI}>
                    {provas.map(p => <option key={p.id} value={p.id}>{p.titulo} {p.ativa ? "✅" : "⭕"}</option>)}
                  </select>
                ) : (
                  <p style={{ fontSize: 12, color: C.erro }}>⚠️ Nenhuma prova criada. Crie uma na aba Provas primeiro.</p>
                )}
              </div>

              <input ref={pdfQuestoesRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={extrairQuestoesPdf} style={{ display: "none" }} />
              <button onClick={() => pdfQuestoesRef.current?.click()} disabled={extraindo}
                style={{ width: "100%", padding: "11px 0", background: extraindo ? "#e2e8f0" : olimpiadaAtual.cor, color: extraindo ? C.sub : "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {extraindo ? "⏳ Extraindo..." : "📄 Selecionar PDF ou imagem"}
              </button>
            </div>

            {msgQ && <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: msgQ.tipo === "ok" ? "#EDFAF3" : "#FFF1F1", color: msgQ.tipo === "ok" ? "#15803d" : "#b91c1c", fontSize: 12, fontWeight: 600 }}>{msgQ.texto}</div>}

            {questoesExtraidas.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{questoesExtraidas.length} questões extraídas</p>
                  <button onClick={salvarQuestoesExtraidas} disabled={salvandoQ}
                    style={{ padding: "8px 16px", background: olimpiadaAtual.cor, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {salvandoQ ? "Salvando..." : `💾 Salvar ${questoesExtraidas.filter(q => q._sel).length} selecionadas`}
                  </button>
                </div>
                {questoesExtraidas.map((q, i) => (
                  <div key={q._id} style={{ background: C.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${q._sel ? olimpiadaAtual.cor : C.border}`, marginBottom: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <input type="checkbox" checked={q._sel} onChange={e => setQuestoesExtraidas(p => p.map((x, j) => j === i ? { ...x, _sel: e.target.checked } : x))} style={{ marginTop: 3 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{q.question}</p>
                      <div style={{ display: "flex", gap: 4 }}>
                        <span style={{ fontSize: 10, background: "#F1F5F9", color: C.sub, borderRadius: 4, padding: "1px 6px" }}>{q.difficulty || "medio"}</span>
                        {q.topic && <span style={{ fontSize: 10, background: "#F1F5F9", color: C.sub, borderRadius: 4, padding: "1px 6px" }}>{q.topic}</span>}
                        {(!q.options || q.options.length < 2) && <span style={{ fontSize: 10, background: "#FFF1F1", color: C.erro, borderRadius: 4, padding: "1px 6px" }}>⚠️ Sem alternativas</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CONTEÚDO ── */}
        {aba === "conteudo" && (
          <div>
            {/* Seletor de área */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {areasOlimpiada.map((a, i) => (
                <button key={a.id} onClick={() => setAreaSel(i)}
                  style={{ padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: areaSel === i ? olimpiadaAtual.cor : "#F1F5F9",
                    color: areaSel === i ? "#fff" : C.sub }}>
                  {a.titulo}
                </button>
              ))}
            </div>

            <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>{areasOlimpiada[areaSel]?.titulo}</p>
                  <p style={{ fontSize: 11, color: C.sub, margin: 0 }}>{existeId ? "✅ Conteúdo cadastrado" : "⚠️ Sem conteúdo"}</p>
                </div>
                <button onClick={gerarConteudoIA} disabled={importando}
                  style={{ padding: "7px 14px", background: importando ? "#e2e8f0" : "linear-gradient(135deg,#6D28D9,#4C1D95)", color: importando ? C.sub : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {importando ? "⏳..." : "🤖 Gerar com IA"}
                </button>
              </div>

              <input ref={pdfRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={importarPdfConteudo} style={{ display: "none" }} />
              <button onClick={() => pdfRef.current?.click()} disabled={importando}
                style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: `1.5px dashed ${C.border}`, background: "#FAFBFF", color: olimpiadaAtual.cor, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
                📄 Importar de PDF, apostila ou foto
              </button>

              {msgC && <div style={{ marginBottom: 10, padding: "7px 12px", borderRadius: 7, background: msgC.tipo === "ok" ? "#EDFAF3" : "#FFF1F1", color: msgC.tipo === "ok" ? "#15803d" : "#b91c1c", fontSize: 12, fontWeight: 600 }}>{msgC.texto}</div>}

              <div style={{ marginBottom: 8 }}><p style={sL}>Título</p><input value={formConteudo.titulo} onChange={e => setFormConteudo(p => ({ ...p, titulo: e.target.value }))} style={sI} /></div>
              <div style={{ marginBottom: 8 }}><p style={sL}>Conteúdo principal *</p><textarea rows={7} value={formConteudo.conteudo} onChange={e => setFormConteudo(p => ({ ...p, conteudo: e.target.value }))} placeholder="Texto didático..." style={{ ...sI, resize: "vertical" as const, lineHeight: 1.6 }} /></div>
              <div style={{ marginBottom: 8 }}><p style={sL}>Exemplos práticos</p><textarea rows={3} value={formConteudo.exemplos} onChange={e => setFormConteudo(p => ({ ...p, exemplos: e.target.value }))} style={{ ...sI, resize: "vertical" as const }} /></div>
              <div style={{ marginBottom: 14 }}><p style={sL}>Fórmulas / Dicas</p><textarea rows={2} value={formConteudo.formulas} onChange={e => setFormConteudo(p => ({ ...p, formulas: e.target.value }))} style={{ ...sI, resize: "vertical" as const }} /></div>

              <button onClick={salvarConteudo} disabled={salvandoC}
                style={{ width: "100%", padding: "11px 0", background: salvandoC ? "#e2e8f0" : olimpiadaAtual.cor, color: salvandoC ? C.sub : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {salvandoC ? "Salvando..." : existeId ? "💾 Atualizar" : "💾 Salvar conteúdo"}
              </button>
            </div>
          </div>
        )}

        {/* ── PROVAS ── */}
        {aba === "provas" && (
          <div>
            {msgProva && <div style={{ marginBottom:10, padding:"8px 12px", borderRadius:8, background:msgProva.tipo==="ok"?"#EDFAF3":"#FFF1F1", color:msgProva.tipo==="ok"?"#15803d":"#b91c1c", fontSize:12, fontWeight:600 }}>{msgProva.texto}</div>}

            {/* Formulário criar/editar */}
            {(criandoProva || editandoProva) ? (
              <div style={{ background:C.card, borderRadius:14, padding:16, border:`1.5px solid ${olimpiadaAtual.cor}`, marginBottom:12 }}>
                <p style={{ fontSize:14, fontWeight:700, margin:"0 0 14px" }}>{editandoProva ? "✏️ Editar Prova" : "➕ Nova Prova"}</p>

                <div style={{ marginBottom:8 }}><p style={sL}>Título *</p><input value={formProva.titulo} onChange={e=>setFormProva(p=>({...p,titulo:e.target.value}))} placeholder="Ex: OBQ 2025 — Fase Nacional" style={sI} /></div>
                <div style={{ marginBottom:8 }}><p style={sL}>Descrição</p><textarea rows={2} value={formProva.descricao} onChange={e=>setFormProva(p=>({...p,descricao:e.target.value}))} placeholder="Descrição opcional da prova..." style={{ ...sI, resize:"vertical" as const }} /></div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <div><p style={sL}>Tempo limite (min)</p><input type="number" value={formProva.tempo_limite} onChange={e=>setFormProva(p=>({...p,tempo_limite:Number(e.target.value)}))} style={sI} /></div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:18 }}>
                    <input type="checkbox" checked={formProva.ativa} onChange={e=>setFormProva(p=>({...p,ativa:e.target.checked}))} />
                    <span style={{ fontSize:13, fontWeight:600 }}>Prova ativa</span>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                  <div><p style={sL}>Data início</p><input type="datetime-local" value={formProva.data_inicio} onChange={e=>setFormProva(p=>({...p,data_inicio:e.target.value}))} style={sI} /></div>
                  <div><p style={sL}>Data fim</p><input type="datetime-local" value={formProva.data_fim} onChange={e=>setFormProva(p=>({...p,data_fim:e.target.value}))} style={sI} /></div>
                </div>

                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { setCriandoProva(false); setEditandoProva(null); setFormProva({ titulo:"", descricao:"", tempo_limite:120, data_inicio:"", data_fim:"", ativa:false }); }}
                    style={{ flex:1, padding:"10px 0", background:"#F1F5F9", color:C.sub, border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={criarOuAtualizarProva} disabled={salvandoProva}
                    style={{ flex:2, padding:"10px 0", background:salvandoProva?"#e2e8f0":olimpiadaAtual.cor, color:salvandoProva?C.sub:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    {salvandoProva ? "Salvando..." : editandoProva ? "💾 Atualizar prova" : "💾 Criar prova"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCriandoProva(true)}
                style={{ width:"100%", padding:"12px 0", background:olimpiadaAtual.cor, color:"#fff", border:"none", borderRadius:12, fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:12 }}>
                ➕ Nova Prova — {olimpiadaSel}
              </button>
            )}

            {/* Lista de provas */}
            {provas.length === 0 && !criandoProva ? (
              <div style={{ textAlign:"center", padding:"32px 20px", color:C.sub }}>
                <p style={{ fontSize:32, margin:"0 0 8px" }}>📋</p>
                <p style={{ fontSize:13 }}>Nenhuma prova criada ainda.</p>
              </div>
            ) : provas.map(p => (
              <div key={p.id} style={{ background:C.card, borderRadius:12, border:`1px solid ${p.ativa ? olimpiadaAtual.cor+"44" : C.border}`, marginBottom:8, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, margin:"0 0 2px", color:C.text }}>{p.titulo}</p>
                    <div style={{ display:"flex", gap:6 }}>
                      <span style={{ fontSize:10, background:p.ativa?"#EDFAF3":"#F1F5F9", color:p.ativa?C.ok:C.sub, borderRadius:4, padding:"1px 6px", fontWeight:600 }}>
                        {p.ativa ? "✅ Ativa" : "⭕ Inativa"}
                      </span>
                      {p.tempo_limite_min && <span style={{ fontSize:10, background:"#F1F5F9", color:C.sub, borderRadius:4, padding:"1px 6px" }}>⏱ {p.tempo_limite_min}min</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => toggleAtivarProva(p.id, p.ativa)}
                      style={{ padding:"5px 10px", background:p.ativa?"#FFF8E6":"#EDFAF3", color:p.ativa?"#92400e":C.ok, border:"none", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                      {p.ativa ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => { setEditandoProva(p.id); setFormProva({ titulo:p.titulo, descricao:p.descricao||"", tempo_limite:p.tempo_limite_min||120, data_inicio:p.data_inicio||"", data_fim:p.data_fim||"", ativa:p.ativa }); }}
                      style={{ padding:"5px 10px", background:"#E6EEFF", color:"#0057FF", border:"none", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => deletarProva(p.id)}
                      style={{ padding:"5px 10px", background:"#FFF1F1", color:C.erro, border:"none", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RESULTADOS ── */}
        {aba === "resultados" && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>🏆 {tentativas.length} participantes — {olimpiadaSel}</p>
            {tentativas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: C.sub }}>
                <p style={{ fontSize: 32, margin: "0 0 8px" }}>🏆</p>
                <p>Nenhuma tentativa ainda.</p>
              </div>
            ) : tentativas.map((t, i) => (
              <div key={t.id} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}`, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: i === 0 ? "#fef08a" : i === 1 ? "#e2e8f0" : i === 2 ? "#fed7aa" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(t.profiles as any)?.nome || (t.profiles as any)?.email}</p>
                  <p style={{ fontSize: 11, color: C.sub, margin: 0 }}>{t.acertos} acertos · {t.status}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: (t.nota ?? 0) >= 60 ? C.ok : C.erro, margin: 0 }}>{(t.nota ?? 0).toFixed(1)}</p>
                  <p style={{ fontSize: 10, color: C.sub, margin: 0 }}>pontos</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TRILHAS DE QUÍMICA ── reutiliza GestaoConteudoTrilhas com filtro só de química */}
        {aba === "trilhas" && (
          <GestaoConteudoTrilhas
            areasProf={["quimica","organica","fisicoquimica","inorganica","analitica","bioquimica-q"]}
          />
        )}

        {/* ── CERTIFICADOS ── */}
        {aba === "certificados" && (
          <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, textAlign: "center" }}>
            <p style={{ fontSize: 32, margin: "0 0 12px" }}>📜</p>
            <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>Certificados — {olimpiadaSel}</p>
            <p style={{ fontSize: 12, color: C.sub, margin: "0 0 20px" }}>{stats.certificados} certificados emitidos</p>
            <button onClick={() => navigate(`/olimpiada/${olimpiadaSel}/admin`)}
              style={{ padding: "11px 24px", background: olimpiadaAtual.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ⚙️ Gerenciar certificados
            </button>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}

const sL: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" };
const sI: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 13, color: "#1a1a2e", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
