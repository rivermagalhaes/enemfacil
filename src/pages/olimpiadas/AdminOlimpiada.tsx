// src/pages/olimpiadas/AdminOlimpiada.tsx
// Painel admin da olimpíada — gerenciar provas e questões

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { CORES } from "@/styles/theme";
import BottomNav from "@/components/layout/BottomNav";

export default function AdminOlimpiada() {
  const { id = "OTQ" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const isAdmin = (profile as any)?.role === "admin" || (profile as any)?.role === "super_admin";

  const [aba, setAba] = useState<"prova"|"questoes"|"resultados"|"conteudo">("prova");
  const [evento, setEvento] = useState<any>(null);
  const [prova, setProva] = useState<any>(null);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [tentativas, setTentativas] = useState<any[]>([]);
  const [msg, setMsg] = useState<{tipo:"ok"|"erro"; texto:string}|null>(null);
  const [salvando, setSalvando] = useState(false);

  // Conteúdo por área
  const pdfConteudoRef = useRef<HTMLInputElement>(null);
  const jsonQuestoesRef = useRef<HTMLInputElement>(null);
  const [importandoConteudo, setImportandoConteudo] = useState(false);
  const [importandoQuestoes, setImportandoQuestoes] = useState(false);
  const [questoesImportadas, setQuestoesImportadas] = useState<any[]>([]);
  const [msgImport, setMsgImport] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);
  const [modoImport] = useState<"objetiva"|"converter">("objetiva");

  const [areaSel, setAreaSel] = useState(0);
  const [formConteudo, setFormConteudo] = useState({ titulo:"", conteudo:"", exemplos:"", formulas:"" });
  const [existeConteudoId, setExisteConteudoId] = useState<string|null>(null);
  const [salvandoConteudo, setSalvandoConteudo] = useState(false);
  const [msgConteudo, setMsgConteudo] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);

  // Form prova
  const [fProva, setFProva] = useState({ titulo:"", duracao_minutos:120, total_questoes:30, nota_aprovacao:60, data_inicio:"", data_fim:"" });

  // Form questão
  const [fQ, setFQ] = useState({ enunciado:"", alternativas:[{texto:""},{texto:""},{texto:""},{texto:""},{texto:""}], resposta_correta:0, explicacao:"", assunto:"", dificuldade:"medio" });
  const [adicionandoQ, setAdicionandoQ] = useState(false);


  // Áreas de conteúdo por olimpíada
  const AREAS_OLIMPIADA: Record<string, {id:string; titulo:string}[]> = {
    OBQ: [
      { id:"quimica-geral",    titulo:"Química Geral e Inorgânica" },
      { id:"fisicoquimica",    titulo:"Físico-Química" },
      { id:"quimica-organica", titulo:"Química Orgânica" },
      { id:"bioquimica",       titulo:"Bioquímica" },
      { id:"quimica-analitica",titulo:"Química Analítica" },
    ],
    OTQ: [
      { id:"hidrocarbonetos",      titulo:"Hidrocarbonetos" },
      { id:"funcoes-organicas",    titulo:"Funções Oxigenadas" },
      { id:"funcoes-nitrogenadas", titulo:"Funções Nitrogenadas" },
      { id:"isomeria",             titulo:"Isomeria" },
      { id:"reacoes-organicas",    titulo:"Reações Orgânicas" },
      { id:"polimeros",            titulo:"Polímeros" },
    ],
    ENEM: [
      { id:"ciencias-natureza", titulo:"Ciências da Natureza" },
      { id:"ciencias-humanas",  titulo:"Ciências Humanas" },
      { id:"linguagens",        titulo:"Linguagens" },
      { id:"matematica",        titulo:"Matemática" },
      { id:"redacao",           titulo:"Redação" },
    ],
    ITA: [
      { id:"matematica-ita",   titulo:"Matemática" },
      { id:"fisica-ita",       titulo:"Física" },
      { id:"quimica-ita",      titulo:"Química" },
      { id:"portugues-ita",    titulo:"Português" },
    ],
    IME: [
      { id:"matematica-ime",   titulo:"Matemática" },
      { id:"fisica-ime",       titulo:"Física" },
      { id:"quimica-ime",      titulo:"Química" },
      { id:"portugues-ime",    titulo:"Português" },
    ],
    OQCMTO: [
      { id:"atomistica",           titulo:"Atomística e Tabela Periódica" },
      { id:"ligacoes-quimicas",    titulo:"Ligações Químicas" },
      { id:"funcoes-inorganicas",  titulo:"Funções Inorgânicas" },
      { id:"reacoes-quimicas",     titulo:"Reações Químicas" },
      { id:"estequiometria",       titulo:"Estequiometria" },
      { id:"termoquimica",         titulo:"Termoquímica" },
      { id:"cinetica",             titulo:"Cinética Química" },
      { id:"equilibrio",           titulo:"Equilíbrio Químico" },
      { id:"eletroquimica",        titulo:"Eletroquímica" },
      { id:"quimica-organica",     titulo:"Química Orgânica" },
    ],
    OQIFTO: [
      { id:"atomistica",           titulo:"Atomística e Tabela Periódica" },
      { id:"ligacoes-quimicas",    titulo:"Ligações Químicas" },
      { id:"funcoes-inorganicas",  titulo:"Funções Inorgânicas" },
      { id:"reacoes-quimicas",     titulo:"Reações Químicas" },
      { id:"estequiometria",       titulo:"Estequiometria" },
      { id:"termoquimica",         titulo:"Termoquímica" },
      { id:"quimica-organica",     titulo:"Química Orgânica" },
    ],
    OMCMTO: [
      { id:"conjuntos",            titulo:"Conjuntos e Lógica" },
      { id:"aritmetica",           titulo:"Aritmética e Teoria dos Números" },
      { id:"algebra",              titulo:"Álgebra" },
      { id:"geometria-plana",      titulo:"Geometria Plana" },
      { id:"geometria-espacial",   titulo:"Geometria Espacial" },
      { id:"combinatoria",         titulo:"Combinatória e Probabilidade" },
      { id:"trigonometria",        titulo:"Trigonometria" },
      { id:"funcoes",              titulo:"Funções" },
      { id:"progressoes",          titulo:"Progressões" },
      { id:"estatistica",          titulo:"Estatística" },
    ],
    OFCMTO: [
      { id:"mecanica",             titulo:"Mecânica" },
      { id:"termodinamica",        titulo:"Termodinâmica" },
      { id:"ondulatoria",          titulo:"Ondulatória e Acústica" },
      { id:"otica",                titulo:"Óptica" },
      { id:"eletromagnetismo",     titulo:"Eletromagnetismo" },
      { id:"fisica-moderna",       titulo:"Física Moderna" },
    ],
    OPCMTO: [
      { id:"ortografia",           titulo:"Ortografia e Acentuação" },
      { id:"morfologia",           titulo:"Morfologia" },
      { id:"sintaxe",              titulo:"Sintaxe" },
      { id:"semantica",            titulo:"Semântica e Estilística" },
      { id:"literatura",           titulo:"Literatura Brasileira" },
      { id:"redacao",              titulo:"Redação e Argumentação" },
      { id:"interpretacao",        titulo:"Interpretação de Texto" },
    ],
  };
  const areasOlimpiada = AREAS_OLIMPIADA[id.toUpperCase()] ?? AREAS_OLIMPIADA.OBQ;

  async function carregarConteudoArea(idx: number) {
    const area = areasOlimpiada[idx];
    if (!area || !evento) return;
    setFormConteudo({ titulo:"", conteudo:"", exemplos:"", formulas:"" });
    setExisteConteudoId(null);
    const { data } = await supabase.from("trilha_conteudos")
      .select("id,titulo,conteudo,exemplos,formulas")
      .eq("materia", `olimpiada_${id.toLowerCase()}`)
      .eq("unidade_id", area.id)
      .maybeSingle();
    if (data) {
      setExisteConteudoId((data as any).id);
      setFormConteudo({ titulo:(data as any).titulo||"", conteudo:(data as any).conteudo||"", exemplos:(data as any).exemplos||"", formulas:(data as any).formulas||"" });
    } else {
      setFormConteudo({ titulo: area.titulo, conteudo:"", exemplos:"", formulas:"" });
    }
  }

  async function salvarConteudoArea() {
    const area = areasOlimpiada[areaSel];
    if (!formConteudo.conteudo.trim()) { setMsgConteudo({ tipo:"erro", texto:"Conteúdo obrigatório" }); return; }
    setSalvandoConteudo(true);
    const payload = { materia:`olimpiada_${id.toLowerCase()}`, unidade_id:area.id, titulo:formConteudo.titulo||area.titulo, conteudo:formConteudo.conteudo, exemplos:formConteudo.exemplos||null, formulas:formConteudo.formulas||null };
    const { error } = existeConteudoId
      ? await supabase.from("trilha_conteudos").update(payload).eq("id", existeConteudoId)
      : await supabase.from("trilha_conteudos").insert(payload);
    if (error) { setMsgConteudo({ tipo:"erro", texto:"Erro: "+error.message }); }
    else { setMsgConteudo({ tipo:"ok", texto:"✅ Conteúdo salvo!" }); setTimeout(() => setMsgConteudo(null), 3000); }
    setSalvandoConteudo(false);
  }

  async function gerarConteudoIA() {
    const area = areasOlimpiada[areaSel];
    setImportandoConteudo(true);
    setMsgConteudo({ tipo:"ok", texto:"⏳ Gerando com IA..." });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("https://iuziweujszfiaulltzqv.supabase.co/functions/v1/converter-questoes-objetivas", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${session?.access_token}` },
        body: JSON.stringify({ questoes:[{ question:`Gere conteúdo educacional COMPLETO para "${area.titulo}" no contexto da olimpíada ${id.toUpperCase()}. Retorne JSON: { "options": ["CONTEUDO_400_600_PALAVRAS", "EXEMPLOS_2_3", "FORMULAS_E_DICAS", "TITULO_CURTO"], "answer_index": 0, "explanation": "" }`, area:"natureza", difficulty:"dificil" }] }),
      });
      const data = await r.json();
      const res = data.resultados?.[0];
      if (res?.options?.length >= 3) {
        setFormConteudo({ titulo:res.options[3]||area.titulo, conteudo:res.options[0]||"", exemplos:res.options[1]||"", formulas:res.options[2]||"" });
        setMsgConteudo({ tipo:"ok", texto:"✅ Conteúdo gerado! Revise e salve." });
      } else throw new Error("Resposta inválida");
    } catch(e:any) { setMsgConteudo({ tipo:"erro", texto:"Erro: "+e.message }); }
    setImportandoConteudo(false);
  }

  async function importarPdfConteudo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const area = areasOlimpiada[areaSel];
    setImportandoConteudo(true);
    setMsgConteudo({ tipo:"ok", texto:"⏳ Extraindo conteúdo..." });
    try {
      const base64Data = await new Promise<string>((res,rej) => { const r=new FileReader(); r.onload=()=>res((r.result as string).split(",")[1]); r.onerror=rej; r.readAsDataURL(file); });
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("https://iuziweujszfiaulltzqv.supabase.co/functions/v1/extrair-conteudo-pdf", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${session?.access_token}` },
        body: JSON.stringify({ base64Data, mimeType:file.type||"application/pdf", unidadeTitulo:area.titulo, materia:`${id.toUpperCase()} — ${area.titulo}` }),
      });
      const data = await response.json();
      if (!response.ok||data.error) throw new Error(data.error||"Erro");
      const c = data.conteudo;
      setFormConteudo({ titulo:c.titulo||area.titulo, conteudo:c.conteudo||"", exemplos:c.exemplos||"", formulas:c.formulas||"" });
      setMsgConteudo({ tipo:"ok", texto:"✅ Conteúdo extraído! Revise e salve." });
    } catch(e:any) { setMsgConteudo({ tipo:"erro", texto:"Erro: "+e.message }); }
    setImportandoConteudo(false);
    if (pdfConteudoRef.current) pdfConteudoRef.current.value="";
  }

  async function importarJsonQuestoes(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !prova) return;
    setMsgImport({ tipo:"ok", texto:"⏳ Lendo arquivo JSON..." });
    try {
      const texto = await new Promise<string>((res,rej) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsText(file);
      });
      const parsed = JSON.parse(texto);
      const qs: any[] = Array.isArray(parsed) ? parsed : parsed.questoes ?? [];
      if (qs.length === 0) throw new Error("Nenhuma questão encontrada");

      // Filtra questões com figura
      const temFigura = (q: any) => {
        const txt = (q.enunciado || q.question || "").toLowerCase();
        const figs = q.figuras || q.figures || q.contexto_visual || "";
        return (/figura|imagem|gráfico|grafico|tabela|observe|veja|quadro|diagrama|esquema/.test(txt) &&
                /abaixo|seguinte|ao lado|apresentad/.test(txt)) ||
               (Array.isArray(figs) && figs.length > 0) ||
               (typeof figs === "string" && figs.trim().length > 0);
      };
      const semFigura = qs.filter(q => !temFigura(q));
      const ignoradas = qs.length - semFigura.length;

      const normalizadas = semFigura.map((q: any) => ({
        enunciado: q.enunciado || q.question || "",
        alternativas: q.alternativas
          ? q.alternativas
          : (q.options ?? []).map((t: string) => ({ texto: t })),
        resposta_correta: q.resposta_correta ?? q.answer_index ?? 0,
        assunto: q.assunto || q.topic || "",
        dificuldade: q.dificuldade || q.difficulty || "medio",
        explicacao: q.explicacao || q.explanation || "",
      })).filter((q: any) => q.enunciado && q.alternativas?.length >= 2);

      if (normalizadas.length === 0) throw new Error("Nenhuma questão válida encontrada");
      setQuestoesImportadas(normalizadas);
      const aviso = ignoradas > 0 ? ` · ⚠️ ${ignoradas} ignoradas (têm figura)` : "";
      setMsgImport({ tipo:"ok", texto:`✅ ${normalizadas.length} questões carregadas!${aviso} Revise o gabarito antes de salvar.` });
    } catch(e: any) { setMsgImport({ tipo:"erro", texto:"Erro: " + e.message }); }
    if (jsonQuestoesRef.current) jsonQuestoesRef.current.value = "";
  }

  async function importarPdfQuestoes(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !prova) return;
    setImportandoQuestoes(true);
    setMsgImport({ tipo:"ok", texto:"⏳ Extraindo questões do PDF..." });
    try {
      const base64Data = await new Promise<string>((res,rej) => {
        const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(file);
      });
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` };
      const r1 = await fetch(`${supabaseUrl}/functions/v1/extrair-questoes-pdf`, {
        method: "POST", headers,
        body: JSON.stringify({ base64Data, mimeType: file.type || "application/pdf" })
      });
      const d1 = await r1.json();
      if (!r1.ok || d1.error) throw new Error(d1.error || "Erro ao extrair PDF");
      let qs = (d1.questoes ?? []).filter((q: any) => q.options?.length >= 2);
      const discursivas = qs.filter((q: any) => q.tipo_original === "discursiva");
      if (modoImport === "converter" || discursivas.length > 0) {
        const toConvert = modoImport === "converter" ? qs : discursivas;
        setMsgImport({ tipo:"ok", texto:`⏳ Convertendo ${toConvert.length} questões discursivas...` });
        const r2 = await fetch(`${supabaseUrl}/functions/v1/converter-questoes-objetivas`, {
          method: "POST", headers,
          body: JSON.stringify({ questoes: toConvert.map((q: any) => ({ question: q.question, area: q.area || "ciencias_natureza", difficulty: q.difficulty || "medio", topic: q.topic || "" }) )})
        });
        const d2 = await r2.json();
        if (!r2.ok || d2.error) throw new Error(d2.error || "Erro ao converter");
        const resultados = d2.resultados ?? [];
        if (modoImport === "converter") {
          qs = qs.map((q: any, i: number) => ({ ...q, ...resultados[i], options: resultados[i]?.options ?? q.options, answer_index: resultados[i]?.answer_index ?? q.answer_index ?? 0, explanation: resultados[i]?.explanation ?? q.explanation ?? "" }));
        } else {
          let idx = 0;
          qs = qs.map((q: any) => { if (q.tipo_original === "discursiva") { const r = resultados[idx++]; return { ...q, options: r?.options ?? q.options, answer_index: r?.answer_index ?? 0, explanation: r?.explanation ?? "" }; } return q; });
        }
      }
      if (qs.length === 0) throw new Error("Nenhuma questão encontrada no PDF");
      const normalizadas = qs.map((q: any) => ({
        enunciado: q.question, alternativas: (q.options ?? []).map((t: string) => ({ texto: t })),
        resposta_correta: q.answer_index ?? 0, assunto: q.topic ?? "", dificuldade: q.difficulty ?? "medio", explicacao: q.explanation ?? "",
      }));
      setQuestoesImportadas(normalizadas);
      setMsgImport({ tipo:"ok", texto:`✅ ${normalizadas.length} questões prontas! Revise o gabarito antes de salvar.` });
    } catch(e:any) { setMsgImport({ tipo:"erro", texto:"Erro: " + e.message }); }
    setImportandoQuestoes(false);
    if (e.target) e.target.value = "";
  }

  async function salvarQuestoesImportadas() {
    if (!prova || questoesImportadas.length === 0) return;
    setSalvando(true);
    const inserts = questoesImportadas.map((q, i) => ({
      prova_id: prova.id, enunciado: q.enunciado, alternativas: q.alternativas,
      resposta_correta: q.resposta_correta, explicacao: q.explicacao || "",
      assunto: q.assunto || "", dificuldade: q.dificuldade || "medio", ordem: questoes.length + i + 1,
    }));
    const { error } = await supabase.from("questoes_prova").insert(inserts);
    if (error) { setMsgImport({ tipo:"erro", texto:"Erro ao salvar: " + error.message }); }
    else { setMsgImport({ tipo:"ok", texto:`✅ ${questoesImportadas.length} questões salvas!` }); setQuestoesImportadas([]); carregarDados(); }
    setSalvando(false);
  }

  useEffect(() => {
    if (loading) return;
    if (isAdmin) carregarDados();
    else navigate(-1);
  }, [id, loading]);
  useEffect(() => { if (aba === "conteudo" && evento) carregarConteudoArea(areaSel); }, [aba, areaSel, evento]);

  async function carregarDados() {
    const { data: ev } = await supabase.from("eventos_certificaveis").select("*").eq("sigla", id.toUpperCase()).single();
    setEvento(ev);
    if (!ev) return;

    const { data: p } = await supabase.from("provas_olimpiada").select("*").eq("evento_id", ev.id).single();
    setProva(p);
    if (p) {
      setFProva({ titulo:p.titulo, duracao_minutos:p.duracao_minutos, total_questoes:p.total_questoes, nota_aprovacao:p.nota_aprovacao, data_inicio:p.data_inicio?.slice(0,16)??"", data_fim:p.data_fim?.slice(0,16)??"" });
      const { data: qs } = await supabase.from("questoes_prova").select("*").eq("prova_id", p.id).order("ordem");
      setQuestoes(qs ?? []);
      const { data: ts } = await supabase.from("tentativas_prova").select("*, profiles(nome,email)").eq("prova_id", p.id).order("nota", { ascending:false });
      setTentativas(ts ?? []);
    }
  }

  async function salvarProva() {
    setSalvando(true);
    if (prova) {
      await supabase.from("provas_olimpiada").update({ ...fProva, evento_id: evento.id }).eq("id", prova.id);
    } else {
      const { data } = await supabase.from("provas_olimpiada").insert({ ...fProva, evento_id: evento.id }).select().single();
      setProva(data);
    }
    setMsg({ tipo:"ok", texto:"✅ Prova salva!" });
    carregarDados();
    setSalvando(false);
  }

  async function toggleAtiva() {
    await supabase.from("provas_olimpiada").update({ ativa: !prova.ativa }).eq("id", prova.id);
    setMsg({ tipo:"ok", texto: prova.ativa ? "Prova desativada" : "✅ Prova ativada!" });
    carregarDados();
  }

  async function adicionarQuestao() {
    if (!prova || !fQ.enunciado.trim()) return;
    setSalvando(true);
    await supabase.from("questoes_prova").insert({
      prova_id: prova.id,
      enunciado: fQ.enunciado,
      alternativas: fQ.alternativas,
      resposta_correta: fQ.resposta_correta,
      explicacao: fQ.explicacao,
      assunto: fQ.assunto,
      dificuldade: fQ.dificuldade,
      ordem: questoes.length + 1,
    });
    setFQ({ enunciado:"", alternativas:[{texto:""},{texto:""},{texto:""},{texto:""},{texto:""}], resposta_correta:0, explicacao:"", assunto:"", dificuldade:"medio" });
    setAdicionandoQ(false);
    setMsg({ tipo:"ok", texto:`✅ Questão ${questoes.length + 1} adicionada!` });
    carregarDados();
    setSalvando(false);
  }

  async function excluirQuestao(qId: string) {
    if (!confirm("Excluir esta questão?")) return;
    await supabase.from("questoes_prova").delete().eq("id", qId);
    carregarDados();
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100dvh", background:CORES.bg }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg, #1a3a6e, #0057ff)", padding:"16px 16px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <button onClick={() => navigate(-1)} style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div>
            <p style={{ fontSize:16, fontWeight:700, color:"#fff", margin:0 }}>⚙️ Admin {id.toUpperCase()}</p>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.7)", margin:0 }}>{questoes.length} questões · {tentativas.length} tentativas</p>
          </div>
          {prova && (
            <button onClick={toggleAtiva}
              style={{ marginLeft:"auto", padding:"6px 12px", background: prova.ativa?"#22c55e":"rgba(255,255,255,0.2)", color:"#fff", border:"none", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer" }}>
              {prova.ativa ? "✅ Ativa" : "⭕ Inativa"}
            </button>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {(["prova","questoes","conteudo","resultados"] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              style={{ flex:1, padding:"7px 0", borderRadius:8, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                background: aba===a ? "#fff" : "rgba(255,255,255,0.15)", color: aba===a ? "#1a3a6e" : "#fff" }}>
              {a==="prova"?"📋 Prova":a==="questoes"?`📝 Questões (${questoes.length})`:a==="conteudo"?"📖 Conteúdo":`🏆 Resultados (${tentativas.length})`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 90px" }}>
        {msg && (
          <div style={{ marginBottom:12, padding:"8px 12px", borderRadius:8, background:msg.tipo==="ok"?"#EDFAF3":"#FFF1F1", color:msg.tipo==="ok"?"#15803d":"#b91c1c", fontSize:12, fontWeight:600 }}>
            {msg.texto}
          </div>
        )}

        {/* Aba Prova */}
        {aba === "prova" && (
          <div style={{ background:"#fff", borderRadius:14, padding:16, border:"1px solid rgba(0,0,0,0.08)" }}>
            <p style={{ fontSize:13, fontWeight:700, margin:"0 0 12px" }}>📋 Configuração da Prova</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div>
                <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px" }}>Título</p>
                <input value={fProva.titulo} onChange={e=>setFProva(p=>({...p,titulo:e.target.value}))}
                  placeholder="Ex: OTQ 2025 — Prova Oficial" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)", fontSize:13 }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px" }}>Duração (minutos)</p>
                  <input type="number" value={fProva.duracao_minutos} onChange={e=>setFProva(p=>({...p,duracao_minutos:Number(e.target.value)}))}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)", fontSize:13 }} />
                </div>
                <div>
                  <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px" }}>Nota mínima (%)</p>
                  <input type="number" value={fProva.nota_aprovacao} onChange={e=>setFProva(p=>({...p,nota_aprovacao:Number(e.target.value)}))}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)", fontSize:13 }} />
                </div>
                <div>
                  <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px" }}>Início</p>
                  <input type="datetime-local" value={fProva.data_inicio} onChange={e=>setFProva(p=>({...p,data_inicio:e.target.value}))}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)", fontSize:12 }} />
                </div>
                <div>
                  <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px" }}>Fim</p>
                  <input type="datetime-local" value={fProva.data_fim} onChange={e=>setFProva(p=>({...p,data_fim:e.target.value}))}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)", fontSize:12 }} />
                </div>
              </div>
            </div>
            <button onClick={salvarProva} disabled={salvando}
              style={{ marginTop:12, width:"100%", padding:"11px 0", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              {salvando ? "Salvando..." : prova ? "💾 Salvar alterações" : "+ Criar Prova"}
            </button>
          </div>
        )}

        {/* Aba Questões */}
        {aba === "questoes" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <p style={{ fontSize:13, fontWeight:700, margin:0 }}>{questoes.length} / {prova?.total_questoes ?? 30} questões</p>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => jsonQuestoesRef.current?.click()}
                  style={{ padding:"7px 12px", background:"linear-gradient(135deg,#065C37,#0A7C4B)", color:"#fff", border:"none", borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                  📥 JSON
                </button>
                <button onClick={() => { const i = document.createElement("input"); i.type="file"; i.accept=".pdf"; i.onchange=(e:any)=>importarPdfQuestoes(e); i.click(); }} disabled={importandoQuestoes}
                  style={{ padding:"7px 12px", background:"linear-gradient(135deg,#6D28D9,#4C1D95)", color:"#fff", border:"none", borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                  {importandoQuestoes ? "⏳..." : "📄 PDF"}
                </button>
                <button onClick={() => setAdicionandoQ(true)}
                  style={{ padding:"7px 14px", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  + Adicionar
                </button>
              </div>
            </div>
            <input ref={jsonQuestoesRef} type="file" accept=".json" onChange={importarJsonQuestoes} style={{ display:"none" }} />

            {msgImport && (
              <div style={{ marginBottom:10, padding:"8px 12px", borderRadius:8, background:msgImport.tipo==="ok"?"#EDFAF3":"#FFF1F1", color:msgImport.tipo==="ok"?"#15803d":"#b91c1c", fontSize:12, fontWeight:600 }}>
                {msgImport.texto}
              </div>
            )}

            {questoesImportadas.length > 0 && (
              <div style={{ background:"#F3F0FF", borderRadius:14, padding:14, border:"1px solid #C4B5FD", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#4C1D95", margin:0 }}>📋 {questoesImportadas.length} questões — revise o gabarito</p>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => setQuestoesImportadas([])} style={{ padding:"5px 10px", background:"#fff", color:"#ef4444", border:"1px solid #fca5a5", borderRadius:6, fontSize:11, cursor:"pointer" }}>Descartar</button>
                    <button onClick={salvarQuestoesImportadas} disabled={salvando} style={{ padding:"5px 10px", background:"#4C1D95", color:"#fff", border:"none", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer" }}>{salvando ? "..." : "✅ Salvar todas"}</button>
                  </div>
                </div>
                <div style={{ maxHeight:400, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
                  {questoesImportadas.map((q, i) => (
                    <div key={i} style={{ background:"#fff", borderRadius:10, padding:"10px 12px", border:"1px solid #E9D5FF" }}>
                      <p style={{ fontSize:11, fontWeight:700, color:"#6D28D9", margin:"0 0 4px" }}>Q{i+1} · {q.assunto||"Sem assunto"}</p>
                      <p style={{ fontSize:12, color:"#1e293b", margin:"0 0 8px" }}>{q.enunciado?.slice(0,120)}{q.enunciado?.length>120?"...":""}</p>
                      <div style={{ display:"flex", gap:4 }}>
                        {["A","B","C","D","E"].map((l,idx) => (
                          <button key={idx} onClick={() => { const n=[...questoesImportadas]; n[i]={...n[i],resposta_correta:idx}; setQuestoesImportadas(n); }}
                            style={{ padding:"3px 10px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:q.resposta_correta===idx?"#22c55e":"#f1f5f9", color:q.resposta_correta===idx?"#fff":"#64748b" }}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form nova questão */}
            {adicionandoQ && (
              <div style={{ background:"#fff", borderRadius:14, padding:16, border:"1px solid rgba(0,0,0,0.08)", marginBottom:12 }}>
                <p style={{ fontSize:13, fontWeight:700, margin:"0 0 12px" }}>Nova Questão #{questoes.length + 1}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <textarea value={fQ.enunciado} onChange={e=>setFQ(p=>({...p,enunciado:e.target.value}))} rows={4}
                    placeholder="Enunciado da questão..." style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)", fontSize:13, resize:"vertical" }} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px" }}>Assunto</p>
                      <input value={fQ.assunto} onChange={e=>setFQ(p=>({...p,assunto:e.target.value}))} placeholder="Ex: Cinética Química"
                        style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)", fontSize:12 }} />
                    </div>
                    <div>
                      <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px" }}>Dificuldade</p>
                      <select value={fQ.dificuldade} onChange={e=>setFQ(p=>({...p,dificuldade:e.target.value}))}
                        style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)", fontSize:12 }}>
                        <option value="facil">Fácil</option>
                        <option value="medio">Médio</option>
                        <option value="dificil">Difícil</option>
                        <option value="olimpico">Olímpico</option>
                      </select>
                    </div>
                  </div>
                  <p style={{ fontSize:11, fontWeight:600, color:CORES.textSub, margin:"4px 0 0" }}>Alternativas (marque a correta)</p>
                  {fQ.alternativas.map((alt, i) => (
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <button onClick={() => setFQ(p=>({...p, resposta_correta:i}))}
                        style={{ width:28, height:28, borderRadius:"50%", border:"2px solid", flexShrink:0, cursor:"pointer",
                          borderColor: fQ.resposta_correta===i?"#22c55e":"rgba(0,0,0,0.1)",
                          background: fQ.resposta_correta===i?"#22c55e":"transparent",
                          color: fQ.resposta_correta===i?"#fff":"#64748b", fontSize:11, fontWeight:700 }}>
                        {String.fromCharCode(65+i)}
                      </button>
                      <input value={alt.texto} onChange={e=>{ const alts=[...fQ.alternativas]; alts[i]={texto:e.target.value}; setFQ(p=>({...p,alternativas:alts})); }}
                        placeholder={`Alternativa ${String.fromCharCode(65+i)}`}
                        style={{ flex:1, padding:"7px 10px", borderRadius:8, border:`1px solid ${fQ.resposta_correta===i?"#22c55e":"rgba(0,0,0,0.08)"}`, fontSize:12 }} />
                    </div>
                  ))}
                  <textarea value={fQ.explicacao} onChange={e=>setFQ(p=>({...p,explicacao:e.target.value}))} rows={2}
                    placeholder="Explicação da resposta (opcional)" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)", fontSize:12, resize:"vertical" }} />
                </div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button onClick={() => setAdicionandoQ(false)} style={{ flex:1, padding:"9px 0", background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:8, fontSize:12, cursor:"pointer" }}>Cancelar</button>
                  <button onClick={adicionarQuestao} disabled={salvando} style={{ flex:2, padding:"9px 0", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {salvando ? "..." : "+ Adicionar questão"}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de questões */}
            {questoes.map((q, i) => (
              <div key={q.id} style={{ background:"#fff", borderRadius:12, padding:"12px 14px", border:"1px solid rgba(0,0,0,0.06)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#1a3a6e", flexShrink:0 }}>
                    {i+1}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, color:CORES.text, margin:"0 0 4px", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{q.enunciado}</p>
                    <div style={{ display:"flex", gap:6 }}>
                      {q.assunto && <span style={{ fontSize:10, color:"#64748b", background:"#f1f5f9", borderRadius:4, padding:"1px 6px" }}>{q.assunto}</span>}
                      <span style={{ fontSize:10, color:"#64748b", background:"#f1f5f9", borderRadius:4, padding:"1px 6px" }}>{q.dificuldade}</span>
                    </div>
                  </div>
                  <button onClick={() => excluirQuestao(q.id)} style={{ padding:"4px 8px", background:"#fff1f1", color:"#ef4444", border:"none", borderRadius:6, fontSize:11, cursor:"pointer", flexShrink:0 }}>🗑️</button>
                </div>
              </div>
            ))}

            {questoes.length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 20px", color:CORES.textSub }}>
                <p style={{ fontSize:32, margin:"0 0 8px" }}>📝</p>
                <p style={{ fontSize:13 }}>Nenhuma questão ainda. Adicione as 30 questões da prova.</p>
              </div>
            )}
          </div>
        )}

        {/* Aba Conteúdo */}
        {aba === "conteudo" && (
          <div>
            {/* Seletor de área */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {areasOlimpiada.map((a,i) => (
                <button key={a.id} onClick={() => setAreaSel(i)}
                  style={{ padding:"7px 12px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                    background: areaSel===i ? "#1a3a6e" : "#F1F5F9", color: areaSel===i ? "#fff" : "#64748B" }}>
                  {a.titulo}
                </button>
              ))}
            </div>

            <div style={{ background:"#fff", borderRadius:14, padding:16, border:"1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:700, margin:"0 0 2px" }}>{areasOlimpiada[areaSel]?.titulo}</p>
                  <p style={{ fontSize:11, color:"#64748B", margin:0 }}>{existeConteudoId ? "✅ Conteúdo cadastrado" : "⚠️ Sem conteúdo"}</p>
                </div>
                <button onClick={gerarConteudoIA} disabled={importandoConteudo}
                  style={{ padding:"7px 14px", background:importandoConteudo?"#e2e8f0":"linear-gradient(135deg,#6D28D9,#4C1D95)", color:importandoConteudo?"#64748B":"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:importandoConteudo?"not-allowed":"pointer" }}>
                  {importandoConteudo ? "⏳..." : "🤖 Gerar com IA"}
                </button>
              </div>

              <input ref={pdfConteudoRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={importarPdfConteudo} style={{ display:"none" }} />
              <button onClick={() => pdfConteudoRef.current?.click()} disabled={importandoConteudo}
                style={{ width:"100%", padding:"9px 0", borderRadius:8, border:"1.5px dashed #E2E8F0", background:"#FAFBFF", color:"#0057FF", fontSize:12, fontWeight:600, cursor:"pointer", marginBottom:12 }}>
                📄 Importar de PDF, apostila ou foto
              </button>

              {msgConteudo && (
                <div style={{ marginBottom:10, padding:"7px 12px", borderRadius:7, background:msgConteudo.tipo==="ok"?"#EDFAF3":"#FFF1F1", color:msgConteudo.tipo==="ok"?"#15803d":"#b91c1c", fontSize:12, fontWeight:600 }}>
                  {msgConteudo.texto}
                </div>
              )}

              <div style={{ marginBottom:8 }}>
                <p style={sL}>Título</p>
                <input value={formConteudo.titulo} onChange={e=>setFormConteudo(p=>({...p,titulo:e.target.value}))} style={sI} />
              </div>
              <div style={{ marginBottom:8 }}>
                <p style={sL}>Conteúdo principal *</p>
                <textarea rows={7} value={formConteudo.conteudo} onChange={e=>setFormConteudo(p=>({...p,conteudo:e.target.value}))} placeholder="Texto didático completo..." style={{ ...sI, resize:"vertical" as const, lineHeight:1.6 }} />
              </div>
              <div style={{ marginBottom:8 }}>
                <p style={sL}>Exemplos práticos</p>
                <textarea rows={3} value={formConteudo.exemplos} onChange={e=>setFormConteudo(p=>({...p,exemplos:e.target.value}))} placeholder="Exemplos e exercícios resolvidos..." style={{ ...sI, resize:"vertical" as const }} />
              </div>
              <div style={{ marginBottom:14 }}>
                <p style={sL}>Fórmulas / Dicas</p>
                <textarea rows={2} value={formConteudo.formulas} onChange={e=>setFormConteudo(p=>({...p,formulas:e.target.value}))} placeholder="Fórmulas e macetes..." style={{ ...sI, resize:"vertical" as const }} />
              </div>
              <button onClick={salvarConteudoArea} disabled={salvandoConteudo}
                style={{ width:"100%", padding:"11px 0", background:salvandoConteudo?"#e2e8f0":"#1a3a6e", color:salvandoConteudo?"#64748B":"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>
                {salvandoConteudo ? "Salvando..." : existeConteudoId ? "💾 Atualizar" : "💾 Salvar conteúdo"}
              </button>
            </div>
          </div>
        )}

        {/* Aba Resultados */}
        {aba === "resultados" && (
          <div>
            <p style={{ fontSize:13, fontWeight:700, margin:"0 0 12px" }}>🏆 {tentativas.length} participantes</p>
            {tentativas.map((t, i) => (
              <div key={t.id} style={{ background:"#fff", borderRadius:12, padding:"12px 14px", border:"1px solid rgba(0,0,0,0.06)", marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background: i===0?"#fef08a":i===1?"#e2e8f0":i===2?"#fed7aa":"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0 }}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{(t.profiles as any)?.nome || (t.profiles as any)?.email}</p>
                  <p style={{ fontSize:11, color:CORES.textSub, margin:0 }}>{t.acertos}/{prova?.total_questoes} acertos · {t.status}</p>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <p style={{ fontSize:16, fontWeight:800, color: t.nota >= 60 ? "#0A7C4B" : "#ef4444", margin:0 }}>{t.nota?.toFixed(1)}</p>
                  <p style={{ fontSize:10, color:CORES.textSub, margin:0 }}>pontos</p>
                </div>
              </div>
            ))}
            {tentativas.length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 20px", color:CORES.textSub }}>
                <p style={{ fontSize:32, margin:"0 0 8px" }}>🏆</p>
                <p style={{ fontSize:13 }}>Nenhuma tentativa ainda.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

const sL: React.CSSProperties = { fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 4px" };
const sI: React.CSSProperties = { width:"100%", padding:"8px 10px", border:"1px solid #E2E8F0", borderRadius:7, fontSize:13, color:"#1a1a2e", fontFamily:"inherit", outline:"none", boxSizing:"border-box" as const };
