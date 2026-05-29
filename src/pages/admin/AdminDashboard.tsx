// src/pages/admin/AdminDashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import CertificadosAdmin from "@/components/admin/CertificadosAdmin";
import ExtratorPDF from "@/components/admin/ExtratorPDF";
import GestaoConteudoTrilhas from "@/components/admin/GestaoConteudoTrilhas";
import HeroImageManager from "@/components/admin/HeroImageManager";

const CORES = {
  bg: "#F4F6FB", card: "#FFFFFF", primary: "#0057FF",
  text: "#1a1a2e", sub: "#64748B", border: "#E2E8F0",
};

type PeriodoAnalytics = "7d" | "30d" | "90d";

const ABAS = [
  { id: "visao",      label: "Visão Geral", emoji: "📊" },
  { id: "analytics",  label: "Analytics",   emoji: "📈" },
  { id: "materiais",  label: "Materiais",   emoji: "📁" },
  { id: "questoes",   label: "Questões",    emoji: "📝" },
  { id: "gerador",    label: "Gerador IA",  emoji: "🧠" },
  { id: "usuarios",   label: "Usuários",    emoji: "👥" },
  { id: "ranking",       label: "Rankings",      emoji: "🏆" },
  { id: "certificados",  label: "Certificados",  emoji: "📜" },
  { id: "extrator",      label: "Extrator PDF",    emoji: "📄" },
  { id: "conteudo",      label: "Conteúdo Trilhas", emoji: "📖" },
];

const ESTADOS_REGIOES: Record<string, string> = {
  AC:"Norte",AP:"Norte",AM:"Norte",PA:"Norte",RO:"Norte",RR:"Norte",TO:"Norte",
  AL:"Nordeste",BA:"Nordeste",CE:"Nordeste",MA:"Nordeste",PB:"Nordeste",
  PE:"Nordeste",PI:"Nordeste",RN:"Nordeste",SE:"Nordeste",
  DF:"Centro-Oeste",GO:"Centro-Oeste",MS:"Centro-Oeste",MT:"Centro-Oeste",
  ES:"Sudeste",MG:"Sudeste",RJ:"Sudeste",SP:"Sudeste",
  PR:"Sul",RS:"Sul",SC:"Sul",
};

const AREA_META: Record<string, { emoji: string; cor: string; label: string }> = {
  quiz:        { emoji: "🧠", cor: "#0057FF", label: "Quiz" },
  simulado:    { emoji: "📝", cor: "#7C3AED", label: "Simulado" },
  materiais:   { emoji: "📁", cor: "#0ea5e9", label: "Materiais" },
  vestibular:  { emoji: "🎯", cor: "#22c55e", label: "Vestibular" },
  perfil:      { emoji: "👤", cor: "#f59e0b", label: "Perfil" },
  ranking:     { emoji: "🏆", cor: "#ef4444", label: "Ranking" },
  home:        { emoji: "🏠", cor: "#64748B", label: "Home" },
};

interface Usuario {
  id: string; nome: string | null; plano: string; role: string;
  xp_total: number; sequencia: number; estado: string | null; criado_em: string;
}
interface Material {
  id: string; titulo: string; tipo: string; url: string;
  vestibular: string | null; materia: string | null; criado_em: string;
}
interface EventoUso {
  id: string; user_id: string | null; area: string; acao: string;
  referencia_texto: string | null; criado_em: string;
  profiles?: { nome: string | null };
}
interface AreaStat { area: string; total: number; emoji: string; cor: string; }
interface UsuarioAtivo { user_id: string; nome: string | null; total: number; ultima_atividade: string; }
interface ItemPopular { referencia_texto: string | null; total: number; }

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState("visao");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadando, setUploadando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ titulo: "", descricao: "", tipo: "pdf", vestibular: "ENEM", materia: "", topic: "" });
  const [filtroVestibular, setFiltroVestibular] = useState("TODOS");

  // Analytics
  const [periodo, setPeriodo] = useState<PeriodoAnalytics>("30d");
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [areaStats, setAreaStats] = useState<AreaStat[]>([]);
  const [usuariosAtivos, setUsuariosAtivos] = useState<UsuarioAtivo[]>([]);
  const [itensPopulares, setItensPopulares] = useState<ItemPopular[]>([]);
  const [totalEventos, setTotalEventos] = useState(0);
  const [usuariosUnicos, setUsuariosUnicos] = useState(0);
  const [eventoRecentes, setEventosRecentes] = useState<EventoUso[]>([]);

  // ── Gerador IA ──────────────────────────────────────────────────────────
  const [genDiscursiva, setGenDiscursiva]     = useState("");
  const [genResposta, setGenResposta]         = useState("");
  const [genDisciplina, setGenDisciplina]     = useState("Química");
  const [genTema, setGenTema]                 = useState("");
  const [genDificuldade, setGenDificuldade]   = useState("medio");
  const [genContexto, _setGenContexto]        = useState("");
  const [genNModelos, setGenNModelos]         = useState(3);
  const [genLoading, setGenLoading]           = useState(false);
  const [genLoadingMsg, setGenLoadingMsg]     = useState("");
  const [genQuestoes, setGenQuestoes]         = useState<any[]>([]);
  const [genAnalise, setGenAnalise]           = useState<any>(null);
  const [genErro, setGenErro]                 = useState<string | null>(null);
  const [genSalvoMsg, setGenSalvoMsg]         = useState<string | null>(null);
  const [genSalvando, setGenSalvando]         = useState(false);
  const [trilhas, setTrilhas]                 = useState<{id:string;titulo:string;area_enem:string}[]>([]);
  const [simulados, setSimulados]             = useState<{id:string;titulo:string}[]>([]);
  const [trilhaSel, setTrilhaSel]             = useState("");
  const [simuladoSel, setSimuladoSel]         = useState("");
  const [novoSimTitulo, setNovoSimTitulo]     = useState("");
  const [criandoSimulado, setCriandoSimulado] = useState(false);
  // Destino das questões
  const [genDestino, setGenDestino]           = useState<"simulado"|"banco">("banco");
  const [genVestibular, setGenVestibular]     = useState("ENEM");
  const [genAno, setGenAno]                   = useState(new Date().getFullYear());

  useEffect(() => {
    if (!profile) return;
    if ((profile as any).role !== "admin") { navigate("/"); return; }
    carregarTudo();
  }, [profile]);

  useEffect(() => {
    if (aba === "analytics") carregarAnalytics();
    if (aba === "gerador") carregarTrilhas();
  }, [aba, periodo]);

  function periodoData(): string {
    const d = new Date();
    if (periodo === "7d") d.setDate(d.getDate() - 7);
    else if (periodo === "30d") d.setDate(d.getDate() - 30);
    else d.setDate(d.getDate() - 90);
    return d.toISOString();
  }

  async function carregarAnalytics() {
    setLoadingAnalytics(true);
    const desde = periodoData();

    const { data: eventos } = await supabase
      .from("eventos_uso")
      .select("id, user_id, area, acao, referencia_texto, criado_em, profiles(nome)")
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(500);

    if (!eventos) { setLoadingAnalytics(false); return; }

    setTotalEventos(eventos.length);

    const uids = new Set(eventos.map((e: any) => e.user_id).filter(Boolean));
    setUsuariosUnicos(uids.size);

    const porArea: Record<string, number> = {};
    eventos.forEach((e: any) => { porArea[e.area] = (porArea[e.area] ?? 0) + 1; });
    setAreaStats(
      Object.entries(porArea).sort((a, b) => b[1] - a[1]).map(([area, total]) => ({
        area, total,
        emoji: AREA_META[area]?.emoji ?? "📱",
        cor: AREA_META[area]?.cor ?? "#64748B",
      }))
    );

    const porUser: Record<string, { total: number; nome: string | null; ultima: string }> = {};
    eventos.forEach((e: any) => {
      if (!e.user_id) return;
      if (!porUser[e.user_id]) porUser[e.user_id] = { total: 0, nome: (e.profiles as any)?.nome ?? null, ultima: e.criado_em };
      porUser[e.user_id].total++;
      if (e.criado_em > porUser[e.user_id].ultima) porUser[e.user_id].ultima = e.criado_em;
    });
    setUsuariosAtivos(
      Object.entries(porUser).sort((a, b) => b[1].total - a[1].total).slice(0, 20)
        .map(([uid, v]) => ({ user_id: uid, nome: v.nome, total: v.total, ultima_atividade: v.ultima }))
    );

    const itens = eventos
      .filter((e: any) => e.referencia_texto)
      .reduce((acc: Record<string, number>, e: any) => {
        acc[e.referencia_texto] = (acc[e.referencia_texto] ?? 0) + 1;
        return acc;
      }, {});
    setItensPopulares(
      Object.entries(itens).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([t, total]) => ({ referencia_texto: t, total }))
    );

    setEventosRecentes((eventos as unknown as EventoUso[]).slice(0, 50));
    setLoadingAnalytics(false);
  }

  async function carregarTudo() {
    setLoading(true);
    const [{ data: profs }, { data: mats }] = await Promise.all([
      supabase.rpc("get_admin_profiles"),
      supabase.from("materiais").select("*").order("criado_em", { ascending: false }),
    ]);
    if (profs) setUsuarios(profs);
    if (mats) setMateriais(mats);
    setLoading(false);
  }

  const total = usuarios.length;
  const assinantes = usuarios.filter(u => u.plano && !["gratis","free","estudante","student",""].includes(u.plano)).length;
  const ativos = usuarios.filter(u => u.xp_total > 0).length;
  const xpTotal = usuarios.reduce((acc, u) => acc + (u.xp_total ?? 0), 0);
  const xpMedio = total ? Math.floor(xpTotal / total) : 0;
  const conversao = total ? Math.round(assinantes / total * 100) : 0;

  const porEstado = Object.entries(
    usuarios.reduce((acc: Record<string, {total:number;assinantes:number}>, u) => {
      const e = u.estado || "Não informado";
      if (!acc[e]) acc[e] = { total: 0, assinantes: 0 };
      acc[e].total++;
      if (u.plano !== "gratis") acc[e].assinantes++;
      return acc;
    }, {})
  ).map(([estado, d]) => ({ estado, ...d })).sort((a, b) => b.total - a.total);

  const porRegiao = Object.entries(
    usuarios.reduce((acc: Record<string, {total:number;assinantes:number}>, u) => {
      const r = (u as any).regiao || ESTADOS_REGIOES[u.estado || ""] || "Não informado";
      if (!acc[r]) acc[r] = { total: 0, assinantes: 0 };
      acc[r].total++;
      if (u.plano !== "gratis") acc[r].assinantes++;
      return acc;
    }, {})
  ).map(([regiao, d]) => ({ regiao, ...d })).sort((a, b) => b.total - a.total);

  async function uploadMaterial(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !user || !form.titulo) return;
    const file = e.target.files[0];
    setUploadando(true);
    const ext = file.name.split(".").pop();
    const path = `${form.vestibular}/${form.materia || "geral"}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("materiais-vestibular").upload(path, file);
    if (upErr) { setMsg({ tipo: "erro", texto: "Erro no upload: " + upErr.message }); setUploadando(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("materiais-vestibular").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("materiais").insert({
      titulo: form.titulo, descricao: form.descricao, tipo: form.tipo,
      url: publicUrl, vestibular: form.vestibular, materia: form.materia, topic: form.topic, criado_por: user.id,
    });
    if (dbErr) setMsg({ tipo: "erro", texto: "Erro ao salvar: " + dbErr.message });
    else { setMsg({ tipo: "ok", texto: "✅ Material enviado!" }); setForm({ titulo:"", descricao:"", tipo:"pdf", vestibular:"ENEM", materia:"", topic:"" }); carregarTudo(); }
    setUploadando(false);
    setTimeout(() => setMsg(null), 4000);
  }

  async function importarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setImportando(true);
    try {
      const buffer = await file.arrayBuffer();
      const { read, utils } = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs" as any);
      const wb = read(buffer, { type: "array" });
      const rows: any[] = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let ok = 0, err = 0;
      for (const row of rows) {
        if (!row.question || row.answer_index === undefined || !row.vestibular) { err++; continue; }
        const { data: q, error } = await supabase.from("questions").insert({
          question: row.question, explanation: row.explanation ?? "",
          answer_index: Number(row.answer_index), vestibular: row.vestibular,
          topic: row.topic ?? null, area: row.area ?? null,
          difficulty: row.difficulty ?? "medio", ano: row.ano ? Number(row.ano) : null,
        }).select("id").single();
        if (error || !q) { err++; continue; }
        const opts = [row.option_0, row.option_1, row.option_2, row.option_3, row.option_4].filter(Boolean);
        if (opts.length >= 2) await supabase.from("question_options").insert(opts.map((label: string, i: number) => ({ question_id: q.id, option_index: i, label })));
        ok++;
      }
      setMsg({ tipo: "ok", texto: `✅ ${ok} questões importadas${err > 0 ? `. ⚠️ ${err} com erro` : ""}` });
    } catch (ex: any) { setMsg({ tipo: "erro", texto: "Erro: " + ex.message }); }
    setImportando(false);
    setTimeout(() => setMsg(null), 6000);
  }

  async function alterarPlano(userId: string, v: string) { await supabase.from("profiles").update({ plano: v }).eq("id", userId); carregarTudo(); }
  async function alterarRole(userId: string, v: string) { await supabase.from("profiles").update({ role: v }).eq("id", userId); carregarTudo(); }
  async function carregarTrilhas() {
    const { data } = await supabase.from("trilhas").select("id,titulo,area_enem").eq("ativa", true).order("titulo");
    if (data) setTrilhas(data);
  }

  async function carregarSimulados(tId: string) {
    setTrilhaSel(tId);
    setSimuladoSel("");
    const { data } = await supabase.from("mini_simulados").select("id,titulo").eq("trilha_id", tId);
    if (data) setSimulados(data);
  }

  async function criarSimulado() {
    if (!trilhaSel || !novoSimTitulo.trim()) return;
    setCriandoSimulado(true);
    const { data, error } = await supabase
      .from("mini_simulados").insert({ trilha_id: trilhaSel, titulo: novoSimTitulo })
      .select("id,titulo").single();
    if (!error && data) {
      setSimulados(p => [...p, data]);
      setSimuladoSel(data.id);
      setNovoSimTitulo("");
    }
    setCriandoSimulado(false);
  }

  const GEN_MSGS = [
    "Analisando questão discursiva...",
    "Identificando habilidades e competências...",
    "Gerando alternativas inteligentes...",
    "Criando distratores pedagógicos...",
    "Validando coerência das questões...",
  ];

  async function gerarQuestoes(estiloExtra?: string, difOverride?: string) {
    if (!genDiscursiva.trim()) { setGenErro("Insira a questão discursiva."); return; }
    setGenErro(null); setGenLoading(true); setGenSalvoMsg(null);
    let mi = 0;
    setGenLoadingMsg(GEN_MSGS[0]);
    const t = setInterval(() => { mi = (mi + 1) % GEN_MSGS.length; setGenLoadingMsg(GEN_MSGS[mi]); }, 1800);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-objetivas", {
        body: {
          discursiva: genDiscursiva,
          resposta_esperada: genResposta,
          disciplina: genDisciplina,
          tema: genTema,
          dificuldade: difOverride ?? genDificuldade,
          contexto: genContexto,
          n_modelos: genNModelos,
          estilo_extra: estiloExtra ?? null,
          simulado_id: simuladoSel || null,
        },
      });
      if (error) throw error;
      setGenQuestoes(data.questoes ?? []);
      setGenAnalise(data.analise ?? null);
      if (data.questoes_salvas > 0) setGenSalvoMsg(`✅ ${data.questoes_salvas} questões salvas no simulado!`);
    } catch (e: any) {
      setGenErro(e.message ?? "Erro ao gerar questões.");
    } finally {
      clearInterval(t);
      setGenLoading(false);
    }
  }

  async function salvarQuestoes() {
    if (genDestino === "simulado" && !simuladoSel) { setGenErro("Selecione um simulado para salvar."); return; }
    setGenSalvando(true); setGenErro(null);
    let ok = 0;

    if (genDestino === "simulado") {
      // Salva em questoes_simulado
      for (const q of genQuestoes) {
        const { data: qd, error: qe } = await supabase.from("questoes_simulado").insert({
          simulado_id: simuladoSel,
          enunciado: q.enunciado,
          texto_base: q.texto_base && q.texto_base !== "null" ? q.texto_base : null,
          explicacao: `${q.explicacao}\n\nDistratores: ${q.analise_distratores ?? ""}`,
          assunto_tag: q.assunto_tag,
          competencia: q.competencia,
          habilidade: q.habilidade,
          dificuldade: q.dificuldade,
          fonte: "ia",
        }).select("id").single();
        if (qe || !qd) continue;
        await supabase.from("alternativas_simulado").insert(
          q.alternativas.map((a: any, i: number) => ({ questao_id: qd.id, letra: a.letra, texto: a.texto, correta: a.correta, ordem: i }))
        );
        ok++;
      }
    } else {
      // Salva em questions + question_options
      for (const q of genQuestoes) {
        const corrIdx = q.alternativas.findIndex((a: any) => a.correta);
        const { data: qd, error: qe } = await supabase.from("questions").insert({
          question:     q.enunciado,
          explanation:  `${q.explicacao}\n\nDistratores: ${q.analise_distratores ?? ""}`,
          answer_index: corrIdx >= 0 ? corrIdx : 0,
          difficulty:   q.dificuldade === "olimpico" ? "dificil" : q.dificuldade,
          vestibular:   genVestibular,
          ano:          genAno,
          topic:        q.assunto_tag,
          area:         "natureza",
        }).select("id").single();
        if (qe || !qd) continue;
        await supabase.from("question_options").insert(
          q.alternativas.map((a: any, i: number) => ({
            question_id:  qd.id,
            option_index: i,
            label:        a.texto,
          }))
        );
        ok++;
      }
    }

    setGenSalvoMsg(`✅ ${ok} questões salvas em ${genDestino === "simulado" ? "mini simulado" : genVestibular}!`);
    setGenSalvando(false);
  }

  async function deletarMaterial(id: string) { await supabase.from("materiais").delete().eq("id", id); setMateriais(p => p.filter(m => m.id !== id)); }

  function formatarDataCurta(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  const maxArea = areaStats.length > 0 ? areaStats[0].total : 1;
  const maxAtivo = usuariosAtivos.length > 0 ? usuariosAtivos[0].total : 1;

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh",background:CORES.bg}}><p style={{color:CORES.sub}}>Carregando painel...</p></div>;

  return (
    <div style={{ minHeight: "100dvh", background: CORES.bg, fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0a0f1e,#1a1a2e)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => navigate("/")} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize:16,fontWeight:700,color:"#fff",margin:0 }}>🛡️ Painel Admin</p>
          <p style={{ fontSize:11,color:"rgba(255,255,255,0.5)",margin:0 }}>EnemFácil — Acesso restrito</p>
        </div>
        <span style={{ fontSize:11,background:"#ef4444",color:"#fff",borderRadius:99,padding:"3px 10px",fontWeight:700 }}>ADMIN</span>
      </div>

      {msg && (
        <div style={{ margin:"12px 20px 0",padding:"10px 14px",borderRadius:10,background:msg.tipo==="ok"?"#EDFAF3":"#FFF1F1",border:`1px solid ${msg.tipo==="ok"?"#22c55e":"#ef4444"}`,color:msg.tipo==="ok"?"#15803d":"#b91c1c",fontSize:13,fontWeight:600 }}>
          {msg.texto}
        </div>
      )}

      {/* Abas */}
      <div style={{ display:"flex",gap:4,padding:"12px 20px 0",overflowX:"auto" }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ flexShrink:0,padding:"8px 14px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:aba===a.id?CORES.primary:CORES.card,color:aba===a.id?"#fff":CORES.sub,boxShadow:aba===a.id?`0 4px 14px ${CORES.primary}40`:"0 1px 4px rgba(0,0,0,0.06)" }}>
            {a.emoji} {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:"16px 20px 60px" }}>

        {/* ── VISÃO GERAL ── */}
        {aba === "visao" && (
          <div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20 }}>
              {[
                { label:"Usuários",    valor:total,      emoji:"👥", cor:CORES.primary },
                { label:"Assinantes",  valor:assinantes, emoji:"⚡", cor:"#22c55e" },
                { label:"Gratuitos",   valor:total-assinantes, emoji:"🆓", cor:CORES.sub },
                { label:"Ativos",      valor:ativos,     emoji:"🔥", cor:"#f59e0b" },
                { label:"XP Total",    valor:xpTotal.toLocaleString("pt-BR"), emoji:"⚡", cor:"#7C3AED" },
                { label:"XP Médio",    valor:xpMedio,    emoji:"📊", cor:"#0ea5e9" },
              ].map((m,i) => (
                <div key={i} style={{ background:CORES.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${CORES.border}`,textAlign:"center" }}>
                  <p style={{ fontSize:20,margin:"0 0 4px" }}>{m.emoji}</p>
                  <p style={{ fontSize:18,fontWeight:700,color:m.cor,margin:"0 0 2px" }}>{m.valor}</p>
                  <p style={{ fontSize:11,color:CORES.sub,margin:0 }}>{m.label}</p>
                </div>
              ))}
            </div>
            <div style={{ background:CORES.card,borderRadius:12,padding:16,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 10px" }}>📈 Taxa de Conversão — {conversao}%</p>
              <div style={{ height:12,background:CORES.bg,borderRadius:6,overflow:"hidden" }}>
                <div style={{ width:`${conversao}%`,height:"100%",background:`linear-gradient(90deg,${CORES.primary},#22c55e)`,borderRadius:6 }} />
              </div>
            </div>
            <div style={{ background:CORES.card,borderRadius:12,padding:16,border:`1px solid ${CORES.border}` }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 10px" }}>🏆 Top 5 por XP</p>
              {usuarios.slice(0,5).map((u,i) => (
                <div key={u.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<4?`1px solid ${CORES.border}`:"none" }}>
                  <span style={{ fontSize:14,fontWeight:700,color:i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7c2f":CORES.sub,width:20 }}>#{i+1}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13,fontWeight:600,margin:0 }}>{u.nome||"Sem nome"}</p>
                    <p style={{ fontSize:11,color:CORES.sub,margin:0 }}>{u.estado||"—"} · {u.plano}</p>
                  </div>
                  <span style={{ fontSize:12,fontWeight:700,color:"#7C3AED" }}>⚡ {u.xp_total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {aba === "analytics" && (
          <div>
            {/* Seletor de período */}
            <div style={{ display:"flex",background:CORES.card,borderRadius:10,padding:3,gap:3,marginBottom:16,border:`1px solid ${CORES.border}` }}>
              {(["7d","30d","90d"] as PeriodoAnalytics[]).map(p => (
                <button key={p} onClick={() => setPeriodo(p)} style={{
                  flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",
                  background:periodo===p?CORES.primary:"transparent",
                  color:periodo===p?"#fff":CORES.sub,
                  fontSize:12,fontWeight:600,transition:"all 0.2s",
                }}>
                  {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
                </button>
              ))}
            </div>

            {loadingAnalytics ? (
              <div style={{ textAlign:"center",padding:40 }}>
                <p style={{ fontSize:13,color:CORES.sub }}>Carregando analytics...</p>
              </div>
            ) : totalEventos === 0 ? (
              <div style={{ textAlign:"center",padding:40,background:CORES.card,borderRadius:12,border:`1px solid ${CORES.border}` }}>
                <p style={{ fontSize:32,margin:"0 0 8px" }}>📊</p>
                <p style={{ fontSize:14,fontWeight:600,color:CORES.text,margin:"0 0 6px" }}>Nenhum dado ainda</p>
                <p style={{ fontSize:12,color:CORES.sub,margin:0 }}>
                  Adicione o hook <code style={{ background:CORES.bg,padding:"1px 5px",borderRadius:4 }}>useEventoUso</code> nas páginas para coletar dados.
                </p>
              </div>
            ) : (
              <>
                {/* Cards resumo */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16 }}>
                  {[
                    { val:totalEventos, lbl:"Interações", cor:CORES.primary, emoji:"⚡" },
                    { val:usuariosUnicos, lbl:"Usuários ativos", cor:"#22c55e", emoji:"👥" },
                    { val:areaStats.length>0?(AREA_META[areaStats[0].area]?.label??areaStats[0].area):"—", lbl:"Área top", cor:"#7C3AED", emoji:"🏆" },
                  ].map(s => (
                    <div key={s.lbl} style={{ background:CORES.card,borderRadius:12,padding:"12px 8px",textAlign:"center",border:`1px solid ${CORES.border}` }}>
                      <p style={{ fontSize:18,margin:"0 0 2px" }}>{s.emoji}</p>
                      <p style={{ fontSize:16,fontWeight:700,color:s.cor,margin:"0 0 2px",lineHeight:1.1 }}>{s.val}</p>
                      <p style={{ fontSize:10,color:CORES.sub,margin:0 }}>{s.lbl}</p>
                    </div>
                  ))}
                </div>

                {/* Áreas mais usadas */}
                <div style={{ background:CORES.card,borderRadius:12,padding:16,border:`1px solid ${CORES.border}`,marginBottom:14 }}>
                  <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>📱 Áreas mais usadas</p>
                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {areaStats.map(a => {
                      const pct = Math.round((a.total / maxArea) * 100);
                      return (
                        <div key={a.area}>
                          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                            <span style={{ fontSize:13,fontWeight:500,color:CORES.text }}>{a.emoji} {AREA_META[a.area]?.label ?? a.area}</span>
                            <span style={{ fontSize:13,fontWeight:700,color:a.cor }}>{a.total} <span style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height:6,background:CORES.bg,borderRadius:99,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${pct}%`,background:a.cor,borderRadius:99,transition:"width 0.6s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Usuários mais ativos */}
                <div style={{ background:CORES.card,borderRadius:12,padding:16,border:`1px solid ${CORES.border}`,marginBottom:14 }}>
                  <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>🔥 Usuários mais ativos</p>
                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {usuariosAtivos.slice(0,10).map((u,i) => (
                      <div key={u.user_id} style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div style={{ width:28,height:28,borderRadius:"50%",flexShrink:0,background:i===0?"#FFF9E6":i===1?"#F5F5F5":i===2?"#FFF0E6":CORES.bg,border:`1.5px solid ${i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":CORES.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:CORES.sub }}>
                          {i < 3 ? ["🥇","🥈","🥉"][i] : i+1}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <p style={{ fontSize:13,fontWeight:600,margin:"0 0 1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{u.nome ?? "Anônimo"}</p>
                          <div style={{ height:4,background:CORES.bg,borderRadius:99,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${Math.round((u.total/maxAtivo)*100)}%`,background:CORES.primary,borderRadius:99 }} />
                          </div>
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0 }}>
                          <p style={{ fontSize:13,fontWeight:700,color:CORES.primary,margin:0 }}>{u.total}</p>
                          <p style={{ fontSize:10,color:CORES.sub,margin:0 }}>ações</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conteúdos mais acessados */}
                {itensPopulares.length > 0 && (
                  <div style={{ background:CORES.card,borderRadius:12,padding:16,border:`1px solid ${CORES.border}`,marginBottom:14 }}>
                    <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>🎯 Conteúdos mais acessados</p>
                    <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                      {itensPopulares.map((item,i) => (
                        <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:i<itensPopulares.length-1?`1px solid ${CORES.border}`:"none" }}>
                          <span style={{ fontSize:12,color:CORES.text,fontWeight:500 }}>{item.referencia_texto}</span>
                          <span style={{ fontSize:12,fontWeight:700,color:CORES.primary,background:"#E6EEFF",borderRadius:99,padding:"2px 8px" }}>{item.total}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feed de atividade recente */}
                <div style={{ background:CORES.card,borderRadius:12,padding:16,border:`1px solid ${CORES.border}` }}>
                  <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>🕐 Atividade recente</p>
                  <div style={{ display:"flex",flexDirection:"column" }}>
                    {eventoRecentes.map((e,i) => {
                      const meta = AREA_META[e.area];
                      return (
                        <div key={e.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<eventoRecentes.length-1?`1px solid ${CORES.bg}`:"none" }}>
                          <div style={{ width:28,height:28,borderRadius:"50%",flexShrink:0,background:meta?.cor?`${meta.cor}18`:CORES.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13 }}>
                            {meta?.emoji ?? "📱"}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <p style={{ fontSize:12,fontWeight:500,color:CORES.text,margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                              {(e.profiles as any)?.nome ?? "Anônimo"}
                              <span style={{ fontWeight:400,color:CORES.sub }}> · {meta?.label ?? e.area}</span>
                            </p>
                            {e.referencia_texto && (
                              <p style={{ fontSize:11,color:"#aaa",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{e.referencia_texto}</p>
                            )}
                          </div>
                          <span style={{ fontSize:10,color:"#bbb",flexShrink:0 }}>{formatarDataCurta(e.criado_em)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── MATERIAIS ── */}
        {aba === "materiais" && (
          <div>
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>📤 Novo Material</p>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                <input value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Título *" style={{ padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }} />
                <input value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} placeholder="Descrição" style={{ padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }} />
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  <select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))} style={{ padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                    <option value="pdf">📄 PDF</option>
                    <option value="ppt">📊 PowerPoint</option>
                    <option value="video">🎥 Vídeo</option>
                    <option value="excel">📗 Excel</option>
                    <option value="lista">📝 Lista</option>
                    <option value="outro">📦 Outro</option>
                  </select>
                  <select value={form.vestibular} onChange={e=>setForm(p=>({...p,vestibular:e.target.value}))} style={{ padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                    {["ENEM","ITA","IME","FUVEST","UNICAMP","UNB"].map(v=><option key={v}>{v}</option>)}
                  </select>
                  <input value={form.materia} onChange={e=>setForm(p=>({...p,materia:e.target.value}))} placeholder="Matéria (ex: quimica)" style={{ padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }} />
                  <input value={form.topic} onChange={e=>setForm(p=>({...p,topic:e.target.value}))} placeholder="Tópico (ex: termoquimica)" style={{ padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }} />
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.ppt,.pptx,.xlsx,.xls,.doc,.docx,.mp4,.zip" onChange={uploadMaterial} style={{ display:"none" }} />
                <button onClick={()=>fileRef.current?.click()} disabled={!form.titulo||uploadando} style={{ padding:"10px 0",background:!form.titulo||uploadando?"#e2e8f0":CORES.primary,color:!form.titulo||uploadando?CORES.sub:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:!form.titulo||uploadando?"not-allowed":"pointer" }}>
                  {uploadando ? "Enviando..." : "📤 Selecionar e enviar"}
                </button>
              </div>
            </div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:10 }}>
              {["TODOS","ENEM","ITA","IME","FUVEST","UNICAMP","UNB"].map(v => (
                <button key={v} onClick={() => setFiltroVestibular(v)}
                  style={{ padding:"5px 12px",borderRadius:99,fontSize:12,fontWeight:500,cursor:"pointer",border:"none",
                    background: filtroVestibular === v ? CORES.primary : CORES.bg,
                    color: filtroVestibular === v ? "#fff" : CORES.sub }}>
                  {v}
                </button>
              ))}
            </div>
            <p style={{ fontSize:11,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"0 0 8px" }}>
              Cadastrados ({materiais.filter(m => filtroVestibular === "TODOS" || m.vestibular === filtroVestibular).length})
            </p>
            {materiais.filter(m => filtroVestibular === "TODOS" || m.vestibular === filtroVestibular).map(m => (
              <div key={m.id} style={{ background:CORES.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${CORES.border}`,marginBottom:8,display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:22 }}>{m.tipo==="pdf"?"📄":m.tipo==="video"?"🎥":m.tipo==="ppt"?"📊":m.tipo==="excel"?"📗":"📦"}</span>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontSize:13,fontWeight:600,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{m.titulo}</p>
                  <p style={{ fontSize:11,color:CORES.sub,margin:0 }}>{m.vestibular} · {m.materia||"geral"}</p>
                </div>
                <a href={m.url} target="_blank" rel="noreferrer" style={{ padding:"5px 10px",background:"#E6EEFF",color:CORES.primary,borderRadius:6,fontSize:11,fontWeight:600,textDecoration:"none" }}>Ver</a>
                <button onClick={()=>deletarMaterial(m.id)} style={{ padding:"5px 10px",background:"#FFF1F1",color:"#ef4444",border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer" }}>Del</button>
              </div>
            ))}
          </div>
        )}

        {/* ── GERADOR IA ── */}
        {aba === "gerador" && (
          <div>
            {/* Seletor de destino */}
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:12 }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>🎯 Destino das questões</p>

              {/* Tabs destino */}
              <div style={{ display:"flex",gap:8,marginBottom:12 }}>
                {[
                  { id:"banco",   label:"📚 Banco de vestibular" },
                  { id:"simulado",label:"🎯 Mini simulado" },
                ].map(d => (
                  <button key={d.id} onClick={() => setGenDestino(d.id as any)}
                    style={{ flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${genDestino===d.id?CORES.primary:CORES.border}`,
                      background:genDestino===d.id?"#eef2ff":"transparent",
                      color:genDestino===d.id?CORES.primary:CORES.sub,
                      fontSize:13,fontWeight:genDestino===d.id?600:400,cursor:"pointer" }}>
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Banco de vestibular */}
              {genDestino === "banco" && (
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  <div>
                    <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Vestibular</p>
                    <select value={genVestibular} onChange={e => setGenVestibular(e.target.value)}
                      style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                      {["ENEM","ITA","IME","FUVEST","UNICAMP","UNB","PASS_UNB","OUTRO","PROPRIO"].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Ano</p>
                    <input type="number" value={genAno} onChange={e => setGenAno(Number(e.target.value))}
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }} />
                  </div>
                  <p style={{ gridColumn:"1/-1",fontSize:11,color:"#22c55e",background:"#EDFAF3",padding:"6px 10px",borderRadius:6,margin:0 }}>
                    ✅ As questões serão salvas em <strong>questions</strong> e aparecerão na seção {genVestibular}.
                  </p>
                </div>
              )}

              {/* Mini simulado */}
              {genDestino === "simulado" && (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <div>
                    <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Trilha</p>
                    <select value={trilhaSel} onChange={e => carregarSimulados(e.target.value)}
                      style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                      <option value="">— Selecione uma trilha —</option>
                      {trilhas.map(t => <option key={t.id} value={t.id}>{t.titulo} ({t.area_enem})</option>)}
                    </select>
                  </div>
                  {trilhaSel && (
                    <div>
                      <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Simulado</p>
                      {simulados.length > 0 && (
                        <select value={simuladoSel} onChange={e => setSimuladoSel(e.target.value)}
                          style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,marginBottom:8 }}>
                          <option value="">— Selecione —</option>
                          {simulados.map(s => <option key={s.id} value={s.id}>{s.titulo}</option>)}
                        </select>
                      )}
                      <div style={{ display:"flex",gap:8 }}>
                        <input value={novoSimTitulo} onChange={e => setNovoSimTitulo(e.target.value)}
                          placeholder="Novo simulado..." style={{ flex:1,padding:"8px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }} />
                        <button onClick={criarSimulado} disabled={criandoSimulado || !novoSimTitulo.trim()}
                          style={{ padding:"8px 14px",background:CORES.primary,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>
                          {criandoSimulado ? "..." : "+ Criar"}
                        </button>
                      </div>
                    </div>
                  )}
                  {simuladoSel && (
                    <p style={{ fontSize:11,color:"#22c55e",background:"#EDFAF3",padding:"6px 10px",borderRadius:6,margin:0 }}>
                      ✅ Simulado selecionado — questões salvas automaticamente ao gerar.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Formulário */}
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:12 }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>📝 Questão discursiva</p>
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                <div>
                  <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Questão discursiva *</p>
                  <textarea value={genDiscursiva} onChange={e => setGenDiscursiva(e.target.value)} rows={3}
                    placeholder="Ex: Explique por que o aumento da temperatura acelera as reações químicas."
                    style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,resize:"vertical",fontFamily:"inherit" }} />
                </div>
                <div>
                  <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Resposta esperada</p>
                  <textarea value={genResposta} onChange={e => setGenResposta(e.target.value)} rows={2}
                    placeholder="O que o aluno deveria responder..."
                    style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,resize:"vertical",fontFamily:"inherit" }} />
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                  <div>
                    <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Disciplina</p>
                    <select value={genDisciplina} onChange={e => setGenDisciplina(e.target.value)}
                      style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                      {["Química","Física","Biologia","Matemática","História","Geografia","Português","Filosofia","Sociologia"].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Dificuldade</p>
                    <select value={genDificuldade} onChange={e => setGenDificuldade(e.target.value)}
                      style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                      <option value="facil">Fácil</option>
                      <option value="medio">Médio</option>
                      <option value="dificil">Difícil</option>
                      <option value="olimpico">Olímpico</option>
                    </select>
                  </div>
                  <div>
                    <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Modelos</p>
                    <select value={genNModelos} onChange={e => setGenNModelos(Number(e.target.value))}
                      style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                      <option value={2}>2 modelos</option>
                      <option value={3}>3 modelos</option>
                      <option value={4}>4 modelos</option>
                    </select>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Tema / assunto</p>
                  <input value={genTema} onChange={e => setGenTema(e.target.value)}
                    placeholder="Ex: Cinética química, teoria das colisões"
                    style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }} />
                </div>

                {/* Botão principal */}
                <button onClick={() => gerarQuestoes()} disabled={genLoading}
                  style={{ padding:"12px 0",background:genLoading?"#e2e8f0":CORES.primary,color:genLoading?CORES.sub:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:genLoading?"not-allowed":"pointer" }}>
                  {genLoading ? genLoadingMsg : "🪄 Gerar questões objetivas"}
                </button>

                {/* Botões de estilo */}
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {[
                    { label:"Estilo ENEM",    estilo:"ENEM contextualizado com situação-problema real" },
                    { label:"Olímpico",       estilo:"olímpico com raciocínio aprofundado" },
                    { label:"Contextualizada",estilo:"contextualizada com situação do cotidiano" },
                    { label:"+ Difícil",      estilo:undefined, acao:() => {
                      const ordem = ["facil","medio","dificil","olimpico"];
                      const nova = ordem[Math.min(ordem.indexOf(genDificuldade)+1,3)];
                      setGenDificuldade(nova); gerarQuestoes(undefined, nova);
                    }},
                  ].map((btn,i) => (
                    <button key={i} disabled={genLoading}
                      onClick={() => btn.acao ? btn.acao() : gerarQuestoes(btn.estilo)}
                      style={{ padding:"6px 12px",background:"#F4F6FB",border:`1px solid ${CORES.border}`,borderRadius:8,fontSize:12,color:CORES.sub,cursor:"pointer" }}>
                      {btn.label}
                    </button>
                  ))}
                </div>

                {genErro && <p style={{ color:"#ef4444",fontSize:12,background:"#FFF1F1",padding:"8px 12px",borderRadius:8,margin:0 }}>{genErro}</p>}
                {genSalvoMsg && <p style={{ color:"#15803d",fontSize:12,background:"#EDFAF3",padding:"8px 12px",borderRadius:8,margin:0 }}>{genSalvoMsg}</p>}
              </div>
            </div>

            {/* Análise automática */}
            {genAnalise && (
              <div style={{ background:CORES.card,borderRadius:12,padding:14,border:`1px solid ${CORES.border}`,marginBottom:12 }}>
                <p style={{ fontSize:12,fontWeight:700,color:CORES.sub,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px" }}>📊 Análise automática</p>
                {[
                  { l:"Conceito",           v:genAnalise.conceito_principal },
                  { l:"Habilidade",         v:genAnalise.habilidade_cognitiva },
                  { l:"Área",               v:genAnalise.area_tematica },
                  { l:"Competência",        v:genAnalise.competencia },
                  { l:"Habilidade ENEM",    v:genAnalise.habilidade_enem },
                ].map(({ l, v }) => v && (
                  <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${CORES.bg}` }}>
                    <span style={{ fontSize:12,color:CORES.sub }}>{l}</span>
                    <span style={{ fontSize:12,color:CORES.text,fontWeight:600,textAlign:"right",maxWidth:"60%" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Questões geradas */}
            {genQuestoes.length > 0 && (
              <>
                {genQuestoes.map((q, i) => {
                  const CORES_MODELO = ["#3b82f6","#10b981","#f59e0b","#ef4444"];
                  const BG_MODELO    = ["#eff6ff","#ecfdf5","#fffbeb","#fef2f2"];
                  const cor = CORES_MODELO[i % 4];
                  const bg  = BG_MODELO[i % 4];
                  const DIF_COR: Record<string,string> = { facil:"#22c55e",medio:"#f59e0b",dificil:"#ef4444",olimpico:"#8b5cf6" };
                  return (
                    <div key={i} style={{ background:CORES.card,borderRadius:14,border:`1px solid ${CORES.border}`,overflow:"hidden",marginBottom:12 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:"#fafafa",borderBottom:`2px solid ${cor}` }}>
                        <span style={{ fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:99,background:bg,color:cor }}>{q.modelo}</span>
                        <span style={{ fontSize:11,fontWeight:600,color:DIF_COR[q.dificuldade]??CORES.sub,marginLeft:"auto" }}>{q.dificuldade}</span>
                      </div>
                      <div style={{ padding:14 }}>
                        {q.texto_base && q.texto_base !== "null" && (
                          <div style={{ background:CORES.bg,borderLeft:"3px solid #cbd5e1",padding:"8px 12px",borderRadius:"0 8px 8px 0",marginBottom:10 }}>
                            <p style={{ fontSize:10,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"0 0 4px" }}>Texto de apoio</p>
                            <p style={{ fontSize:12,color:CORES.sub,lineHeight:1.65,margin:0,fontStyle:"italic" }}>{q.texto_base}</p>
                          </div>
                        )}
                        <p style={{ fontSize:13,color:CORES.text,lineHeight:1.75,marginBottom:12 }}>{q.enunciado}</p>
                        <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
                          {q.alternativas.map((a: any) => (
                            <div key={a.letra} style={{ display:"flex",alignItems:"flex-start",gap:8,padding:"9px 11px",borderRadius:8,
                              background:a.correta?"#EDFAF3":CORES.bg, border:`1px solid ${a.correta?"#86efac":CORES.border}` }}>
                              <span style={{ width:20,height:20,borderRadius:"50%",background:a.correta?"#22c55e":"#e5e7eb",color:a.correta?"#fff":CORES.sub,
                                display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>{a.letra}</span>
                              <span style={{ fontSize:12,color:CORES.text,lineHeight:1.5 }}>{a.texto}</span>
                              {a.correta && <span style={{ marginLeft:"auto",color:"#22c55e",fontWeight:700,flexShrink:0 }}>✓</span>}
                            </div>
                          ))}
                        </div>
                        <div style={{ background:"#EDFAF3",border:"1px solid #86efac",borderRadius:8,padding:"10px 12px",marginBottom:8 }}>
                          <p style={{ fontSize:10,fontWeight:700,color:"#15803d",textTransform:"uppercase",margin:"0 0 4px" }}>Gabarito</p>
                          <p style={{ fontSize:12,color:"#166534",lineHeight:1.6,margin:0 }}>{q.gabarito_justificativa}</p>
                        </div>
                        <div style={{ background:CORES.bg,borderRadius:8,padding:"10px 12px",marginBottom:q.analise_distratores?8:0 }}>
                          <p style={{ fontSize:10,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"0 0 4px" }}>Explicação</p>
                          <p style={{ fontSize:12,color:CORES.text,lineHeight:1.6,margin:0 }}>{q.explicacao}</p>
                        </div>
                        {q.analise_distratores && (
                          <div style={{ background:"#fffbeb",borderLeft:"3px solid #fcd34d",borderRadius:"0 8px 8px 0",padding:"10px 12px" }}>
                            <p style={{ fontSize:10,fontWeight:700,color:"#92400e",textTransform:"uppercase",margin:"0 0 4px" }}>Distratores</p>
                            <p style={{ fontSize:12,color:"#78350f",lineHeight:1.6,margin:0 }}>{q.analise_distratores}</p>
                          </div>
                        )}
                      </div>
                      <div style={{ display:"flex",gap:6,flexWrap:"wrap",padding:"10px 14px",borderTop:`1px solid ${CORES.border}` }}>
                        {[q.assunto_tag, q.habilidade, genDisciplina].filter(Boolean).map((t: string) => (
                          <span key={t} style={{ fontSize:10,padding:"2px 8px",borderRadius:99,background:CORES.bg,color:CORES.sub,border:`1px solid ${CORES.border}` }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Salvar no banco */}
                {!simuladoSel && genDestino === "simulado" && (
                  <div style={{ background:"#FFF8E6",border:"1px solid #fcd34d",borderRadius:12,padding:14,marginBottom:12 }}>
                    <p style={{ fontSize:12,fontWeight:600,color:"#92400e",margin:"0 0 4px" }}>⚠️ Simulado não selecionado</p>
                    <p style={{ fontSize:12,color:"#78350f",margin:0 }}>Selecione uma trilha e um simulado acima para salvar as questões no banco.</p>
                  </div>
                )}
                <button onClick={salvarQuestoes} disabled={genSalvando || (genDestino === "simulado" && !simuladoSel)}
                  style={{ width:"100%",padding:"13px 0",background:genSalvando?"#e2e8f0":"#0f172a",color:genSalvando?CORES.sub:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:8,opacity:(genDestino==="simulado"&&!simuladoSel)?0.5:1 }}>
                  {genSalvando ? "Salvando..." : `💾 Salvar ${genQuestoes.length} questões em ${genDestino === "banco" ? genVestibular : "mini simulado"}`}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── QUESTÕES ── */}
        {aba === "questoes" && (
          <div>
            <div style={{ background:CORES.card,borderRadius:14,padding:20,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:15,fontWeight:700,margin:"0 0 6px" }}>📊 Importar Questões via Excel</p>
              <p style={{ fontSize:12,color:CORES.sub,margin:"0 0 16px",lineHeight:1.6 }}>Use o template para preencher e importe em massa. O sistema cria automaticamente as alternativas.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                <a href="/template_questoes.xlsx" download style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 0",background:"#EDFAF3",color:"#15803d",borderRadius:10,fontSize:13,fontWeight:600,textDecoration:"none",border:"1.5px solid #22c55e" }}>
                  📥 Baixar template Excel
                </a>
                <input ref={excelRef} type="file" accept=".xlsx,.xls" onChange={importarExcel} style={{ display:"none" }} />
                <button onClick={()=>excelRef.current?.click()} disabled={importando} style={{ padding:"11px 0",background:importando?"#e2e8f0":CORES.primary,color:importando?CORES.sub:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:importando?"not-allowed":"pointer" }}>
                  {importando ? "⏳ Importando..." : "📤 Selecionar Excel e importar"}
                </button>
              </div>
            </div>
            <div style={{ background:"#FFF8E6",borderRadius:12,padding:"12px 14px",border:"1px solid #fcd34d" }}>
              <p style={{ fontSize:12,fontWeight:600,color:"#92400e",margin:"0 0 6px" }}>⚠️ Instruções</p>
              <p style={{ fontSize:12,color:"#78350f",margin:0,lineHeight:1.7 }}>
                • Campos obrigatórios: question, answer_index (0=A…4=E), explanation, vestibular, option_0 a option_3<br/>
                • Campos recomendados: topic, area, difficulty (facil/medio/dificil), ano<br/>
                • Não altere os cabeçalhos · Máximo 500 questões por importação
              </p>
            </div>
          </div>
        )}

        {/* ── USUÁRIOS ── */}
        {aba === "usuarios" && (
          <div>
            <p style={{ fontSize:11,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"0 0 8px" }}>Usuários ({total})</p>
            {usuarios.map(u => (
              <div key={u.id} style={{ background:CORES.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${CORES.border}`,marginBottom:8 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:CORES.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14 }}>
                    {(u.nome||"?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13,fontWeight:600,margin:0 }}>{u.nome||"Sem nome"}</p>
                    <p style={{ fontSize:11,color:CORES.sub,margin:0 }}>{u.estado||"—"} · ⚡{u.xp_total} · 🔥{u.sequencia}d</p>
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                  <div>
                    <p style={{ fontSize:10,color:CORES.sub,margin:"0 0 3px" }}>PLANO</p>
                    <select value={u.plano} onChange={e=>alterarPlano(u.id,e.target.value)} style={{ width:"100%",padding:"5px 8px",borderRadius:6,border:`1px solid ${CORES.border}`,fontSize:12 }}>
                      {["gratis","estudante","pro","premium","ouro"].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <p style={{ fontSize:10,color:CORES.sub,margin:"0 0 3px" }}>ROLE</p>
                    <select value={u.role||"aluno"} onChange={e=>alterarRole(u.id,e.target.value)} style={{ width:"100%",padding:"5px 8px",borderRadius:6,border:`1px solid ${CORES.border}`,fontSize:12 }}>
                      {["student","professor","admin"].map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RANKING ── */}
        {aba === "ranking" && (
          <div>
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>🗺️ Por Região</p>
              {porRegiao.map((r,i) => (
                <div key={r.regiao} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<porRegiao.length-1?`1px solid ${CORES.border}`:"none" }}>
                  <span style={{ fontSize:16,width:24,textAlign:"center" }}>
                    {r.regiao==="Sudeste"?"🏙️":r.regiao==="Nordeste"?"🌵":r.regiao==="Sul"?"🌲":r.regiao==="Norte"?"🌿":"🏜️"}
                  </span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13,fontWeight:600,margin:0 }}>{r.regiao}</p>
                    <p style={{ fontSize:11,color:CORES.sub,margin:0 }}>{r.assinantes} assinantes · {Math.round(r.assinantes/(r.total||1)*100)}% conversão</p>
                  </div>
                  <span style={{ fontSize:14,fontWeight:700,color:CORES.primary }}>{r.total}</span>
                </div>
              ))}
            </div>
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}` }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>📍 Por Estado</p>
              {porEstado.slice(0,15).map((e,i) => (
                <div key={e.estado} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<14?`1px solid ${CORES.border}`:"none" }}>
                  <span style={{ fontSize:12,fontWeight:700,color:CORES.sub,width:24 }}>#{i+1}</span>
                  <p style={{ flex:1,fontSize:13,fontWeight:500,margin:0 }}>{e.estado}</p>
                  <span style={{ fontSize:11,color:CORES.sub }}>{e.assinantes} ass.</span>
                  <span style={{ fontSize:13,fontWeight:700,color:CORES.primary }}>{e.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CERTIFICADOS ── */}
        {aba === "certificados" && (
          <CertificadosAdmin />
        )}

        {aba === "extrator" && (
          <div style={{ padding: "4px 0" }}><ExtratorPDF /></div>
        )}

        {aba === "conteudo" && <><div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><a href="/admin/gerar-conteudo" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 16px",background:"#7c3aed",color:"#fff",borderRadius:8,fontSize:13,fontWeight:600,textDecoration:"none"}}>⚡ Gerar conteúdo em lote</a></div><GestaoConteudoTrilhas /><div style={{marginTop:24}}><HeroImageManager /></div></>}

      </div>
    </div>
  );
}
