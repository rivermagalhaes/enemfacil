// src/pages/admin/ProfessorDashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";

const CORES = { bg:"#F4F6FB",card:"#FFFFFF",primary:"#0057FF",text:"#1a1a2e",sub:"#64748B",border:"#E2E8F0" };
const ABAS = [
  { id:"materiais",  label:"Meus Materiais", emoji:"📁" },
  { id:"questoes",   label:"Questões",       emoji:"📝" },
  { id:"cadastrar",  label:"Nova Questão",   emoji:"➕" },
  { id:"gerador",    label:"Gerador IA",     emoji:"🧠" },
  { id:"turmas",     label:"Turmas",         emoji:"🏫" },
  { id:"impressao",  label:"Imprimir Prova", emoji:"🖨️" },
  { id:"qrcode",     label:"QR Correção",    emoji:"📷" },
  { id:"salas",      label:"Salas Virtuais", emoji:"🏫" },
];

interface Material { id:string; titulo:string; tipo:string; url:string; vestibular:string|null; materia:string|null; }

export default function ProfessorDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState("materiais");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  // Estados QR Code
  const [minhasTurmas, setMinhasTurmas] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>("");
  const [alunosDaTurma, setAlunosDaTurma] = useState<any[]>([]);
  const [minhasAvaliacoes, setMinhasAvaliacoes] = useState<any[]>([]);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<string>("");
  const [loadingQR, setLoadingQR] = useState(false);
  const [alunoQRAberto, setAlunoQRAberto] = useState<string | null>(null);

  // Estados Gerador IA
  const [genDiscursiva, setGenDiscursiva]   = useState("");
  const [genResposta, setGenResposta]       = useState("");
  const [genDisciplina, setGenDisciplina]   = useState("Química");
  const [genTema, setGenTema]               = useState("");
  const [genDificuldade, setGenDificuldade] = useState("medio");
  const [genNModelos, setGenNModelos]       = useState(3);
  const [genLoading, setGenLoading]         = useState(false);
  const [genLoadingMsg, setGenLoadingMsg]   = useState("");
  const [genQuestoes, setGenQuestoes]       = useState<any[]>([]);
  const [genAnalise, setGenAnalise]         = useState<any>(null);
  const [genErro, setGenErro]               = useState<string|null>(null);
  const [genSalvoMsg, setGenSalvoMsg]       = useState<string|null>(null);
  const [genSalvando, setGenSalvando]       = useState(false);
  const [genVestibular, setGenVestibular]   = useState("ENEM");
  const [genAno, setGenAno]                 = useState(new Date().getFullYear());
  // Destino das questões
  const [genDestino, setGenDestino]         = useState<"banco"|"simulado"|"olimpiada">("banco");
  const [trilhas, setTrilhas]               = useState<{id:string;titulo:string;area_enem:string}[]>([]);
  const [simulados, setSimulados]           = useState<{id:string;titulo:string}[]>([]);
  const [trilhaSel, setTrilhaSel]           = useState("");
  const [simuladoSel, setSimuladoSel]       = useState("");
  const [novoSimTitulo, setNovoSimTitulo]   = useState("");
  const [criandoSimulado, setCriandoSimulado] = useState(false);
  // Prova de olimpíada
  const [provas, setProvas]                 = useState<{id:string;titulo:string;evento:string}[]>([]);
  const [provaSel, setProvaSel]             = useState("");

  // Estados Turmas
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [novaTurma, setNovaTurma] = useState({ nome: "", descricao: "" });
  const [criandoTurma, setCriandoTurma] = useState(false);
  const [turmaMsg, setTurmaMsg] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);
  const [turmaExpandida, setTurmaExpandida] = useState<string|null>(null);
  const [alunosTurma, setAlunosTurma] = useState<Record<string,any[]>>({});
  const [buscaAluno, setBuscaAluno] = useState<Record<string,string>>({});
  const [resultadoBusca, setResultadoBusca] = useState<Record<string,any[]>>({});
  const [adicionandoAluno, setAdicionandoAluno] = useState<string|null>(null);
  const [uploadando, setUploadando] = useState(false);
  const [importando, setImportando] = useState(false);

  // Estado para cadastro manual de questão
  const [qForm, setQForm] = useState({
    question: "", explanation: "", answer_index: 0,
    vestibular: "ENEM", topic: "", area: "ciencias_natureza", difficulty: "medio", ano: new Date().getFullYear(),
    options: ["", "", "", "", ""],
  });
  const [salvandoQ, setSalvandoQ] = useState(false);
  const [qMsg, setQMsg] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);
  const [questoesCadastradas, setQuestoesCadastradas] = useState<any[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);

  // Estado para impressão de provas
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string>((profile as any)?.logo_url ?? "");
  const [uploadandoLogo, setUploadandoLogo] = useState(false);
  const [cabecalho, setCabecalho] = useState({
    escola: (profile as any)?.nome_escola ?? "",
    professor: (profile as any)?.nome_professor ?? "",
    disciplina: "", turma: "", data: new Date().toLocaleDateString("pt-BR"), titulo: "Avaliação",
  });
  const [filtroImpressao, setFiltroImpressao] = useState({ materia: "", topico: "", dificuldade: "", vestibular: "" });
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState<any[]>([]);
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<Set<string>>(new Set());
  const [qtdVersoes, setQtdVersoes] = useState(1);
  const [buscandoQ, setBuscandoQ] = useState(false);
  const [impressaoMsg, setImpressaoMsg] = useState<string>("");
  const [msg, setMsg] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);

  // Estado para importação via PDF com IA
  const pdfRef = useRef<HTMLInputElement>(null);
  const [processandoPdf, setProcessandoPdf] = useState(false);
  const [questoesExtraidas, setQuestoesExtraidas] = useState<any[]>([]);
  const [pdfMsg, setPdfMsg] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);
  const [salvandoExtraidas, setSalvandoExtraidas] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ titulo:"", descricao:"", tipo:"pdf", vestibular:"ENEM", materia:"", topic:"" });

  useEffect(() => {
    if (!profile) return;
    const role = (profile as any).role;
    if (role !== "professor" && role !== "admin") { navigate("/"); return; }
    carregarMateriais();
    carregarQuestoes();
    carregarTurmas();
    carregarTrilhas();
    carregarProvas();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    setLogoUrl((profile as any)?.logo_url ?? "");
    setCabecalho(p => ({
      ...p,
      escola: (profile as any)?.nome_escola ?? "",
      professor: (profile as any)?.nome_professor ?? "",
    }));
  }, [profile]);

  async function carregarQuestoes() {
    setLoadingQ(true);
    const { data } = await supabase.from("questions").select("id, question, vestibular, area, difficulty, ano, topic, answer_index, explanation").order("created_at", { ascending: false }).limit(20);
    if (data) setQuestoesCadastradas(data);
    setLoadingQ(false);
  }

  async function carregarMateriais() {
    setLoading(true);
    const { data } = await supabase.from("materiais").select("*")
      .eq("criado_por", user!.id).order("criado_em", { ascending: false });
    if (data) setMateriais(data);
    setLoading(false);
  }

  async function uploadMaterial(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !user || !form.titulo) return;
    const file = e.target.files[0];
    setUploadando(true);
    const ext = file.name.split(".").pop();
    const path = `${form.vestibular}/${form.materia||"geral"}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("materiais-vestibular").upload(path, file);
    if (upErr) { setMsg({ tipo:"erro", texto:"Erro no upload: "+upErr.message }); setUploadando(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("materiais-vestibular").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("materiais").insert({
      titulo: form.titulo, descricao: form.descricao, tipo: form.tipo,
      url: publicUrl, vestibular: form.vestibular, materia: form.materia, topic: form.topic, criado_por: user.id,
    });
    if (dbErr) setMsg({ tipo:"erro", texto:"Erro ao salvar: "+dbErr.message });
    else { setMsg({ tipo:"ok", texto:"✅ Material enviado!" }); setForm({ titulo:"",descricao:"",tipo:"pdf",vestibular:"ENEM",materia:"",topic:"" }); carregarMateriais(); }
    setUploadando(false);
    setTimeout(() => setMsg(null), 4000);
  }

  async function processarPdfComIA(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setProcessandoPdf(true);
    setPdfMsg(null);
    setQuestoesExtraidas([]);
    try {
      const base64Data = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = () => rej(new Error("Erro ao ler arquivo"));
        r.readAsDataURL(file);
      });
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        "https://iuziweujszfiaulltzqv.supabase.co/functions/v1/extrair-questoes-pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ base64Data }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao processar PDF");
      const questoes = data.questoes;
      setQuestoesExtraidas(questoes.map((q: any, i: number) => ({ ...q, selecionada: true, _id: i })));
      setPdfMsg({ tipo:"ok", texto:`✅ ${questoes.length} questões extraídas! Revise e salve.` });
    } catch (err: any) {
      setPdfMsg({ tipo:"erro", texto:"Erro ao processar PDF: " + err.message });
    }
    setProcessandoPdf(false);
    if (e.target) e.target.value = "";
  }

  async function salvarQuestoesExtraidas() {
    const selecionadas = questoesExtraidas.filter(q => q.selecionada);
    if (selecionadas.length === 0) { setPdfMsg({ tipo:"erro", texto:"Selecione ao menos uma questão" }); return; }
    setSalvandoExtraidas(true);
    let ok = 0, err = 0;
    for (const q of selecionadas) {
      const { data: qSalva, error } = await supabase.from("questions").insert({
        question: q.question, explanation: q.explanation || "",
        answer_index: q.answer_index ?? 0, vestibular: q.vestibular || "PROPRIO",
        topic: q.topic || null, area: q.area || "ciencias_natureza",
        difficulty: q.difficulty || "medio", ano: q.ano || new Date().getFullYear(),
      }).select("id").single();
      if (error || !qSalva) { err++; continue; }
      const opts = (q.options || []).filter(Boolean).map((label: string, i: number) => ({ question_id: qSalva.id, option_index: i, label }));
      if (opts.length >= 2) await supabase.from("question_options").insert(opts);
      ok++;
    }
    setPdfMsg({ tipo:"ok", texto:`✅ ${ok} questões salvas${err > 0 ? `. ⚠️ ${err} com erro` : ""}` });
    setQuestoesExtraidas([]);
    carregarQuestoes();
    setSalvandoExtraidas(false);
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
      setMsg({ tipo:"ok", texto:`✅ ${ok} questões importadas${err>0?`. ⚠️ ${err} com erro`:""}` });
    } catch (ex: any) { setMsg({ tipo:"erro", texto:"Erro: "+ex.message }); }
    setImportando(false);
    setTimeout(() => setMsg(null), 6000);
  }

  async function salvarQuestao() {
    if (!qForm.question.trim()) { setQMsg({ tipo:"erro", texto:"Pergunta é obrigatória" }); return; }
    const filledOptions = qForm.options.filter(o => o.trim());
    if (filledOptions.length < 2) { setQMsg({ tipo:"erro", texto:"Adicione pelo menos 2 opções" }); return; }
    if (qForm.answer_index >= filledOptions.length) { setQMsg({ tipo:"erro", texto:"Índice da resposta inválido" }); return; }
    setSalvandoQ(true);
    const { data: q, error } = await supabase.from("questions").insert({
      question: qForm.question, explanation: qForm.explanation,
      answer_index: qForm.answer_index, vestibular: qForm.vestibular,
      topic: qForm.topic || null, area: qForm.area,
      difficulty: qForm.difficulty, ano: qForm.ano,
    }).select("id").single();
    if (error || !q) { setQMsg({ tipo:"erro", texto:"Erro ao salvar: " + error?.message }); setSalvandoQ(false); return; }
    const opts = filledOptions.map((label, i) => ({ question_id: q.id, option_index: i, label }));
    await supabase.from("question_options").insert(opts);
    setQMsg({ tipo:"ok", texto:"✅ Questão cadastrada com sucesso!" });
    setQForm({ question:"", explanation:"", answer_index:0, vestibular:"ENEM", topic:"", area:"ciencias_natureza", difficulty:"medio", ano:new Date().getFullYear(), options:["","","","",""] });
    carregarQuestoes();
    setSalvandoQ(false);
    setTimeout(() => setQMsg(null), 4000);
  }

  async function deletarQuestao(id: string) {
    await supabase.from("question_options").delete().eq("question_id", id);
    await supabase.from("questions").delete().eq("id", id);
    setQuestoesCadastradas(p => p.filter(q => q.id !== id));
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !user) return;
    const file = e.target.files[0];
    setUploadandoLogo(true);
    const path = `logos/${user.id}.${file.name.split(".").pop()}`;
    await supabase.storage.from("materiais-vestibular").upload(path, file, { upsert: true });
    const { data: { publicUrl } } = supabase.storage.from("materiais-vestibular").getPublicUrl(path);
    setLogoUrl(publicUrl);
    await supabase.from("profiles").update({ logo_url: publicUrl }).eq("id", user.id);
    setUploadandoLogo(false);
  }

  async function salvarCabecalho() {
    if (!user) return;
    await supabase.from("profiles").update({
      nome_escola: cabecalho.escola,
      nome_professor: cabecalho.professor,
    }).eq("id", user.id);
    setImpressaoMsg("✅ Cabeçalho salvo!");
    setTimeout(() => setImpressaoMsg(""), 3000);
  }

  async function buscarQuestoesParaImpressao() {
    setBuscandoQ(true);
    let query = supabase.from("questions").select("id, question, answer_index, explanation, topic, area, difficulty, vestibular, ano");
    if (filtroImpressao.vestibular) query = query.eq("vestibular", filtroImpressao.vestibular);
    if (filtroImpressao.dificuldade) query = query.eq("difficulty", filtroImpressao.dificuldade);
    if (filtroImpressao.topico) query = query.ilike("topic", `%${filtroImpressao.topico}%`);
    const { data, error } = await query.limit(100);
    console.log("Busca questoes:", { data, error, filtro: filtroImpressao });
    // Load options for each question
    const ids = (data ?? []).map((q: any) => q.id);
    const { data: opts } = await supabase.from("question_options").select("*").in("question_id", ids);
    const questoesComOpts = (data ?? []).map((q: any) => ({
      ...q,
      options: (opts ?? []).filter((o: any) => o.question_id === q.id).sort((a: any, b: any) => a.option_index - b.option_index),
    }));
    setQuestoesDisponiveis(questoesComOpts);
    setQuestoesSelecionadas(new Set(questoesComOpts.map((q: any) => q.id)));
    setBuscandoQ(false);
  }

  function gerarHTML(versao: number, questoes: any[], embaralhar: boolean) {
    const qs = embaralhar ? [...questoes].sort(() => Math.random() - 0.5) : questoes;
    const letras = ["A","B","C","D","E"];
    const versaoLabel = ["A","B","C","D","E","F"][versao] ?? String(versao+1);
    const questoesHTML = qs.map((q, qi) => {
      const optsEmbaralhadas = embaralhar
        ? q.options.map((o: any, i: number) => ({ ...o, originalIndex: i })).sort(() => Math.random() - 0.5)
        : q.options.map((o: any, i: number) => ({ ...o, originalIndex: i }));
      return `
        <div style="margin-bottom:24px;page-break-inside:avoid">
          <p style="margin:0 0 8px;font-weight:600;font-size:14px">${qi+1}. ${q.question}</p>
          ${optsEmbaralhadas.map((o: any, oi: number) => `
            <p style="margin:2px 0 2px 16px;font-size:13px">( ) ${letras[oi]}) ${o.label}</p>
          `).join("")}
        </div>`;
    }).join("");

    const gabaritoHTML = qs.map((q, qi) => {
      const optsEmbaralhadas = embaralhar
        ? q.options.map((o: any, i: number) => ({ ...o, originalIndex: i })).sort(() => Math.random() - 0.5)
        : q.options.map((o: any, i: number) => ({ ...o, originalIndex: i }));
      const respostaIdx = optsEmbaralhadas.findIndex((o: any) => o.originalIndex === q.answer_index);
      return `<span style="margin-right:12px;font-size:12px">${qi+1}.${letras[respostaIdx]??"-"}</span>`;
    }).join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Prova ${versaoLabel}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px}
    @media print{body{padding:0}}</style></head><body>
    <div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:20px">
      ${logoUrl ? `<img src="${logoUrl}" style="height:60px;object-fit:contain" />` : ""}
      <div style="flex:1">
        <p style="margin:0;font-size:16px;font-weight:700">${cabecalho.escola}</p>
        <p style="margin:2px 0;font-size:13px">Professor(a): ${cabecalho.professor} &nbsp;|&nbsp; Disciplina: ${cabecalho.disciplina}</p>
        <p style="margin:2px 0;font-size:13px">Turma: ${cabecalho.turma} &nbsp;|&nbsp; Data: ${cabecalho.data}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0;font-size:20px;font-weight:900;border:2px solid #000;padding:6px 12px">VERSÃO ${versaoLabel}</p>
      </div>
    </div>
    <p style="text-align:center;font-size:18px;font-weight:700;margin:0 0 4px">${cabecalho.titulo}</p>
    <div style="border:1px solid #ccc;padding:8px 12px;margin-bottom:20px">
      <span style="font-size:12px">Nome: __________________________________________ &nbsp;&nbsp; Nota: _______</span>
    </div>
    ${questoesHTML}
    <div style="border-top:2px dashed #000;margin-top:32px;padding-top:12px">
      <p style="font-size:11px;font-weight:700;margin:0 0 4px">GABARITO — VERSÃO ${versaoLabel}</p>
      <div>${gabaritoHTML}</div>
    </div>
    </body></html>`;
  }

  function imprimirProvas() {
    const selecionadas = questoesDisponiveis.filter(q => questoesSelecionadas.has(q.id));
    if (selecionadas.length === 0) { setImpressaoMsg("⚠️ Selecione ao menos uma questão"); return; }
    for (let v = 0; v < qtdVersoes; v++) {
      const html = gerarHTML(v, selecionadas, qtdVersoes > 1);
      const win = window.open("", "_blank");
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
    }
  }

  const GEN_MSGS = ["Analisando questão discursiva...","Identificando habilidades...","Gerando alternativas...","Criando distratores pedagógicos...","Validando questões..."];

  async function gerarQuestoes(estiloExtra?: string, difOverride?: string) {
    if (!genDiscursiva.trim()) { setGenErro("Insira a questão discursiva."); return; }
    setGenErro(null); setGenLoading(true); setGenSalvoMsg(null);
    let mi = 0; setGenLoadingMsg(GEN_MSGS[0]);
    const t = setInterval(() => { mi = (mi+1) % GEN_MSGS.length; setGenLoadingMsg(GEN_MSGS[mi]); }, 1800);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-objetivas", {
        body: { discursiva: genDiscursiva, resposta_esperada: genResposta, disciplina: genDisciplina, tema: genTema, dificuldade: difOverride ?? genDificuldade, n_modelos: genNModelos, estilo_extra: estiloExtra ?? null },
      });
      if (error) throw error;
      setGenQuestoes(data.questoes ?? []);
      setGenAnalise(data.analise ?? null);
    } catch(e:any) { setGenErro(e.message ?? "Erro ao gerar questões."); }
    finally { clearInterval(t); setGenLoading(false); }
  }

  function carregarTrilhas() {
    setTrilhas([
      { id: "fundamentos-mat",        titulo: "Fundamentos (Mat)",       area_enem: "matematica" },
      { id: "algebra",                titulo: "Álgebra Linear",          area_enem: "matematica" },
      { id: "geometria",              titulo: "Geometria",               area_enem: "matematica" },
      { id: "probabilidade",          titulo: "Probabilidade",           area_enem: "matematica" },
      { id: "calculo",                titulo: "Cálculo",                 area_enem: "matematica" },
      { id: "numeros-complexos",      titulo: "Números Complexos",       area_enem: "matematica" },
      { id: "introducao-cinematica",  titulo: "Intro Cinemática",        area_enem: "fisica" },
      { id: "posicao-deslocamento",   titulo: "Posição/Deslocamento",    area_enem: "fisica" },
      { id: "velocidade",             titulo: "Velocidade",              area_enem: "fisica" },
      { id: "aceleracao",             titulo: "Aceleração e MUV",        area_enem: "fisica" },
      { id: "queda-livre",            titulo: "Queda Livre",             area_enem: "fisica" },
      { id: "movimento-circular",     titulo: "Mov. Circular",           area_enem: "fisica" },
      { id: "lancamento-projeteis",   titulo: "Lançamento Projéteis",    area_enem: "fisica" },
      { id: "analise-grafica",        titulo: "Análise Gráfica",         area_enem: "fisica" },
      { id: "ondulatoria",            titulo: "Ondulatória & Óptica",    area_enem: "fisica" },
      { id: "eletromagnetismo",       titulo: "Eletromagnetismo",        area_enem: "fisica" },
      { id: "termodinamica",          titulo: "Termodinâmica",           area_enem: "fisica" },
      { id: "fisica-moderna",         titulo: "Física Moderna",          area_enem: "fisica" },
      { id: "introducao",             titulo: "Intro Química",           area_enem: "quimica" },
      { id: "estrutura-atomica",      titulo: "Estrutura Atômica",       area_enem: "quimica" },
      { id: "tabela-periodica",       titulo: "Tabela Periódica",        area_enem: "quimica" },
      { id: "ligacoes-quimicas",      titulo: "Ligações Químicas",       area_enem: "quimica" },
      { id: "funcoes-inorganicas",    titulo: "Funções Inorgânicas",     area_enem: "quimica" },
      { id: "reacoes-quimicas",       titulo: "Reações Químicas",        area_enem: "quimica" },
      { id: "estequiometria",         titulo: "Estequiometria",          area_enem: "quimica" },
      { id: "gases",                  titulo: "Gases",                   area_enem: "quimica" },
      { id: "solucoes",               titulo: "Soluções",                area_enem: "quimica" },
      { id: "introducao-fisicoquimica", titulo: "Intro FQ",              area_enem: "fisicoquimica" },
      { id: "termoquimica",           titulo: "Termoquímica",            area_enem: "fisicoquimica" },
      { id: "cinetica-quimica",       titulo: "Cinética Química",        area_enem: "fisicoquimica" },
      { id: "equilibrio-quimico",     titulo: "Equilíbrio Químico",      area_enem: "fisicoquimica" },
      { id: "equilibrio-ionico",      titulo: "Equilíbrio Iônico",       area_enem: "fisicoquimica" },
      { id: "eletroquimica",          titulo: "Eletroquímica",           area_enem: "fisicoquimica" },
      { id: "propriedades-coligativas", titulo: "Prop. Coligativas",     area_enem: "fisicoquimica" },
      { id: "gases-fisicoquimica",    titulo: "Gases (FQ)",              area_enem: "fisicoquimica" },
      { id: "aplicacoes-cotidiano",   titulo: "Aplicações Cotidiano",    area_enem: "fisicoquimica" },
      { id: "pre-historia",           titulo: "Pré-História",            area_enem: "humanas" },
      { id: "idade-media",            titulo: "Idade Média",             area_enem: "humanas" },
      { id: "idade-moderna",          titulo: "Idade Moderna",           area_enem: "humanas" },
      { id: "revolucoes",             titulo: "Revoluções",              area_enem: "humanas" },
      { id: "brasil-colonial",        titulo: "Brasil Colonial",         area_enem: "humanas" },
      { id: "brasil-imperio",         titulo: "Brasil Império",          area_enem: "humanas" },
      { id: "guerras-mundiais",       titulo: "Guerras Mundiais",        area_enem: "humanas" },
      { id: "brasil-republica",       titulo: "Brasil República",        area_enem: "humanas" },
      { id: "geografia-fisica",       titulo: "Geografia Física",        area_enem: "humanas" },
      { id: "geografia-humana",       titulo: "Geografia Humana",        area_enem: "humanas" },
      { id: "filosofia-sociologia",   titulo: "Filosofia/Sociologia",    area_enem: "humanas" },
      { id: "interpretacao",          titulo: "Interpretação",           area_enem: "portugues" },
      { id: "gramatica",              titulo: "Gramática",               area_enem: "portugues" },
      { id: "literatura",             titulo: "Literatura Brasileira",   area_enem: "portugues" },
      { id: "literatura-portuguesa",  titulo: "Lit. Portuguesa",         area_enem: "portugues" },
      { id: "redacao",                titulo: "Redação",                 area_enem: "portugues" },
      { id: "linguistica",            titulo: "Linguística",             area_enem: "portugues" },
      { id: "reading-comprehension",  titulo: "Reading Comprehension",   area_enem: "ingles" },
      { id: "grammar",                titulo: "Grammar & Structure",     area_enem: "ingles" },
      { id: "vocabulary",             titulo: "Vocabulary & Idioms",     area_enem: "ingles" },
      { id: "scientific-english",     titulo: "Scientific English",      area_enem: "ingles" },
      { id: "writing",                titulo: "Writing & Essay",         area_enem: "ingles" },
    ]);
  }

  async function carregarProvas() {
    const { data } = await supabase
      .from("provas_olimpiada")
      .select("id, titulo, eventos_certificaveis(sigla)")
      .eq("ativa", true)
      .order("created_at", { ascending: false });
    if (data) setProvas(data.map((p: any) => ({ id: p.id, titulo: p.titulo, evento: p.eventos_certificaveis?.sigla ?? "" })));
  }

  async function carregarSimulados(tId: string) {
    setTrilhaSel(tId); setSimuladoSel("");
    const { data } = await supabase.from("mini_simulados").select("id,titulo").eq("trilha_id", tId);
    if (data) setSimulados(data);
  }

  async function criarSimulado() {
    if (!novoSimTitulo.trim() || !trilhaSel) return;
    setCriandoSimulado(true);
    const { data } = await supabase.from("mini_simulados").insert({ titulo: novoSimTitulo.trim(), trilha_id: trilhaSel, criado_por: user?.id }).select("id,titulo").single();
    if (data) { setSimulados(p => [...p, data]); setSimuladoSel(data.id); setNovoSimTitulo(""); }
    setCriandoSimulado(false);
  }

  async function salvarQuestoesGeradas() {
    if (genDestino === "simulado" && !simuladoSel) { setGenErro("Selecione um simulado para salvar."); return; }
    if (genDestino === "olimpiada" && !provaSel) { setGenErro("Selecione uma prova de olimpíada."); return; }
    setGenSalvando(true); setGenErro(null);
    let ok = 0;

    // Conta questões já existentes na prova para definir ordem
    let ordemBase = 0;
    if (genDestino === "olimpiada") {
      const { count } = await supabase.from("questoes_prova").select("*", { count:"exact", head:true }).eq("prova_id", provaSel);
      ordemBase = count ?? 0;
    }

    for (const q of genQuestoes) {
      const corrIdx = q.alternativas.findIndex((a:any) => a.correta);
      if (genDestino === "olimpiada") {
        const { error: qe } = await supabase.from("questoes_prova").insert({
          prova_id: provaSel,
          enunciado: q.enunciado,
          alternativas: q.alternativas.map((a:any) => ({ texto: a.texto })),
          resposta_correta: corrIdx >= 0 ? corrIdx : 0,
          explicacao: `${q.explicacao}\n\nDistratores: ${q.analise_distratores ?? ""}`,
          assunto: q.assunto_tag,
          dificuldade: q.dificuldade,
          ordem: ordemBase + ok + 1,
        });
        if (!qe) ok++;
      } else if (genDestino === "simulado") {
        const { data: qd, error: qe } = await supabase.from("questoes_simulado").insert({
          simulado_id: simuladoSel, enunciado: q.enunciado,
          explicacao: `${q.explicacao}\n\nDistratores: ${q.analise_distratores ?? ""}`,
          dificuldade: q.dificuldade === "olimpico" ? "dificil" : q.dificuldade,
          assunto_tag: q.assunto_tag,
          ordem: 1,
          ativa: true,
        }).select("id").single();
        if (qe || !qd) continue;
        const letras = ["A","B","C","D","E"];
        await supabase.from("alternativas_simulado").insert(
          q.alternativas.map((a:any, i:number) => ({
            questao_id: qd.id,
            letra: letras[i] ?? String(i+1),
            texto: a.texto,
            correta: a.correta ?? false,
            ordem: i + 1,
          }))
        );
        ok++;
      } else {
        const { data: qd, error: qe } = await supabase.from("questions").insert({
          question: q.enunciado, explanation: `${q.explicacao}\n\nDistratores: ${q.analise_distratores ?? ""}`,
          answer_index: corrIdx >= 0 ? corrIdx : 0,
          difficulty: q.dificuldade === "olimpico" ? "dificil" : q.dificuldade,
          vestibular: genVestibular, ano: genAno, topic: q.assunto_tag, area: "ciencias_natureza",
        }).select("id").single();
        if (qe || !qd) continue;
        await supabase.from("question_options").insert(
          q.alternativas.map((a:any, i:number) => ({ question_id: qd.id, option_index: i, label: a.texto }))
        );
        ok++;
      }
    }
    const destLabel = genDestino === "olimpiada" ? `prova ${provas.find(p=>p.id===provaSel)?.evento}` : genDestino === "simulado" ? "mini simulado" : genVestibular;
    setGenSalvoMsg(`✅ ${ok} questões salvas em ${destLabel}!`);
    setGenSalvando(false);
    setTimeout(() => setGenSalvoMsg(null), 3000);
    carregarQuestoes();
  }

  async function carregarTurmas() {
    if (!user?.id) return;
    setLoadingTurmas(true);
    const { data, error } = await supabase.from("classrooms")
      .select("id, nome, descricao, codigo, ativa, created_at")
      .eq("professor_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setTurmas(data ?? []);
    setLoadingTurmas(false);
  }

  function gerarCodigo() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async function criarTurma() {
    if (!novaTurma.nome.trim()) { setTurmaMsg({ tipo:"erro", texto:"Nome da turma é obrigatório" }); return; }
    setCriandoTurma(true);
    const { error } = await supabase.from("classrooms").insert({
      professor_id: user!.id,
      nome: novaTurma.nome.trim(),
      descricao: novaTurma.descricao.trim() || null,
      codigo: gerarCodigo(),
      ativa: true,
    });
    if (error) {
      setTurmaMsg({ tipo:"erro", texto:"Erro ao criar turma: " + error.message });
    } else {
      setTurmaMsg({ tipo:"ok", texto:"✅ Turma criada com sucesso!" });
      setNovaTurma({ nome: "", descricao: "" });
      carregarTurmas();
      // Recarrega também para o QR
      carregarTurmasEAvaliacoes();
    }
    setCriandoTurma(false);
    setTimeout(() => setTurmaMsg(null), 4000);
  }

  async function toggleTurma(id: string, ativa: boolean) {
    await supabase.from("classrooms").update({ ativa: !ativa }).eq("id", id);
    setTurmas(p => p.map(t => t.id === id ? { ...t, ativa: !ativa } : t));
  }

  async function carregarAlunosDaTurmaLocal(turmaId: string) {
    const { data: membros } = await supabase.from("classroom_members")
      .select("student_id, ingressou_em").eq("classroom_id", turmaId);
    if (!membros?.length) { setAlunosTurma(p => ({ ...p, [turmaId]: [] })); return; }
    const ids = membros.map((m: any) => m.student_id);
    const { data: perfis } = await supabase.from("profiles")
      .select("id, nome, email").in("id", ids);
    setAlunosTurma(p => ({ ...p, [turmaId]: perfis ?? [] }));
  }

  async function buscarAlunoPorEmail(turmaId: string, email: string) {
    if (!email.trim()) return;
    const { data } = await supabase.from("profiles")
      .select("id, nome, email").ilike("email", `%${email.trim()}%`).limit(5);
    setResultadoBusca(p => ({ ...p, [turmaId]: data ?? [] }));
  }

  async function adicionarAluno(turmaId: string, studentId: string) {
    setAdicionandoAluno(studentId);
    const { error } = await supabase.from("classroom_members").upsert({
      classroom_id: turmaId, student_id: studentId,
    }, { onConflict: "classroom_id,student_id" });
    if (!error) {
      setResultadoBusca(p => ({ ...p, [turmaId]: [] }));
      setBuscaAluno(p => ({ ...p, [turmaId]: "" }));
      carregarAlunosDaTurmaLocal(turmaId);
    }
    setAdicionandoAluno(null);
  }

  async function removerAluno(turmaId: string, studentId: string) {
    await supabase.from("classroom_members")
      .delete().eq("classroom_id", turmaId).eq("student_id", studentId);
    setAlunosTurma(p => ({ ...p, [turmaId]: p[turmaId]?.filter((a: any) => a.id !== studentId) ?? [] }));
  }

  async function deletarTurma(id: string) {
    if (!confirm("Deletar turma? Os alunos serão removidos.")) return;
    await supabase.from("classroom_members").delete().eq("classroom_id", id);
    await supabase.from("classrooms").delete().eq("id", id);
    setTurmas(p => p.filter(t => t.id !== id));
  }

  async function deletarMaterial(id: string) { await supabase.from("materiais").delete().eq("id", id); setMateriais(p=>p.filter(m=>m.id!==id)); }


  useEffect(() => {
    if (aba === "qrcode" && user) carregarTurmasEAvaliacoes();
    if (aba === "turmas" && user) carregarTurmas();
  }, [aba, user]);

  useEffect(() => {
    if (turmaSelecionada) carregarAlunosDaTurma(turmaSelecionada);
    else setAlunosDaTurma([]);
  }, [turmaSelecionada]);

  async function carregarTurmasEAvaliacoes() {
    setLoadingQR(true);
    const { data: turmas } = await supabase.from("classrooms").select("id, nome, codigo").eq("professor_id", user!.id).eq("ativa", true);
    setMinhasTurmas(turmas ?? []);
    const { data: avs } = await supabase.from("assignments").select("id, titulo, created_at").eq("professor_id", user!.id).eq("ativo", true).order("created_at", { ascending: false });
    setMinhasAvaliacoes(avs ?? []);
    setLoadingQR(false);
  }

  async function carregarAlunosDaTurma(classroomId: string) {
    const { data: membros } = await supabase.from("classroom_members").select("student_id").eq("classroom_id", classroomId);
    if (!membros || membros.length === 0) { setAlunosDaTurma([]); return; }
    const ids = membros.map((m: any) => m.student_id);
    const { data: perfis } = await supabase.from("profiles").select("id, nome, email, avatar_url").in("id", ids).order("nome");
    setAlunosDaTurma(perfis ?? []);
  }

  function gerarUrlCorrecao(studentId: string) {
    return `${window.location.origin}/correcao/${avaliacaoSelecionada}/${studentId}`;
  }

  function imprimirQRCodes() {
    if (!avaliacaoSelecionada || alunosDaTurma.length === 0) return;
    const avaliacao = minhasAvaliacoes.find(a => a.id === avaliacaoSelecionada);
    const turma = minhasTurmas.find(t => t.id === turmaSelecionada);
    const cartoes = alunosDaTurma.map(aluno => {
      const url = gerarUrlCorrecao(aluno.id);
      return `<div style="border:1.5px solid #ccc;border-radius:12px;padding:16px;margin-bottom:16px;page-break-inside:avoid;display:flex;align-items:center;gap:20px;font-family:Arial,sans-serif"><div id="qr-${aluno.id}" style="width:100px;height:100px;flex-shrink:0"></div><div style="flex:1"><p style="font-size:16px;font-weight:700;margin:0 0 4px">${aluno.nome || aluno.email}</p><p style="font-size:12px;color:#64748B;margin:0 0 2px">📋 ${avaliacao?.titulo || "Avaliação"}</p><p style="font-size:12px;color:#64748B;margin:0 0 2px">🏫 ${turma?.nome || ""}</p><p style="font-size:10px;color:#94a3b8;margin:0;word-break:break-all">${url}</p></div><div style="text-align:center;flex-shrink:0"><p style="font-size:10px;color:#94a3b8;margin:0 0 4px">Nota:</p><div style="width:60px;height:32px;border:1.5px solid #ccc;border-radius:6px"></div></div></div>`;
    }).join("");
    const urlsJson = JSON.stringify(alunosDaTurma.map(a => ({ id: a.id, url: gerarUrlCorrecao(a.id) })));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Codes</title><script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script><style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px}@media print{.no-print{display:none}}</style></head><body><div class="no-print" style="text-align:center;margin-bottom:20px"><button onclick="window.print()" style="padding:10px 24px;background:#0A7C4B;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Imprimir</button></div><h2>${avaliacao?.titulo || "Avaliação"}</h2><p style="color:#64748B">${turma?.nome || ""} · ${alunosDaTurma.length} alunos</p>${cartoes}<script>const urls=${urlsJson};urls.forEach(function(item){var el=document.getElementById("qr-"+item.id);if(el)QRCode.toCanvas(document.createElement("canvas"),item.url,{width:100,margin:1},function(err,canvas){if(!err&&canvas)el.appendChild(canvas);});});setTimeout(function(){window.print();},1200);</script></body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh"}}><p>Carregando...</p></div>;

  return (
    <div style={{ minHeight:"100dvh",background:CORES.bg,fontFamily:"system-ui,sans-serif" }}>

      {/* Toast de sucesso */}
      {genSalvoMsg && (
        <div style={{
          position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",
          zIndex:9999,background:"#15803d",color:"#fff",
          padding:"12px 20px",borderRadius:12,fontSize:14,fontWeight:600,
          boxShadow:"0 4px 20px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:10,
          maxWidth:"90vw",
        }}>
          <span>✅</span>
          <span>{genSalvoMsg}</span>
          <button onClick={()=>setGenSalvoMsg(null)}
            style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:12,marginLeft:4}}>
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#065C37,#0A7C4B)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12 }}>
        <button onClick={()=>navigate("/")} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:16,fontWeight:700,color:"#fff",margin:0 }}>👨‍🏫 Painel Professor</p>
          <p style={{ fontSize:11,color:"rgba(255,255,255,0.6)",margin:0 }}>EnemFácil</p>
        </div>
        <span style={{ fontSize:11,background:"rgba(255,255,255,0.2)",color:"#fff",borderRadius:99,padding:"3px 10px",fontWeight:700 }}>PROFESSOR</span>
      </div>

      {msg && (
        <div style={{ margin:"12px 20px 0",padding:"10px 14px",borderRadius:10,background:msg.tipo==="ok"?"#EDFAF3":"#FFF1F1",border:`1px solid ${msg.tipo==="ok"?"#22c55e":"#ef4444"}`,color:msg.tipo==="ok"?"#15803d":"#b91c1c",fontSize:13,fontWeight:600 }}>
          {msg.texto}
        </div>
      )}

      {/* Abas */}
      <div style={{ display:"flex",gap:4,padding:"12px 20px 0",overflowX:"auto",scrollbarWidth:"none" }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={()=>setAba(a.id)} style={{ padding:"6px 10px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:600,fontSize:11,background:aba===a.id?"#0A7C4B":CORES.card,color:aba===a.id?"#fff":CORES.sub }}>
            {a.emoji} {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:"16px 20px 60px" }}>

        {/* MATERIAIS */}
        {aba === "materiais" && (
          <div>
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>📤 Enviar Material</p>
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
                <button onClick={()=>fileRef.current?.click()} disabled={!form.titulo||uploadando} style={{ padding:"10px 0",background:!form.titulo||uploadando?"#e2e8f0":"#0A7C4B",color:!form.titulo||uploadando?CORES.sub:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:!form.titulo||uploadando?"not-allowed":"pointer" }}>
                  {uploadando ? "Enviando..." : "📤 Selecionar e enviar"}
                </button>
              </div>
            </div>

            <p style={{ fontSize:11,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"0 0 8px" }}>Meus materiais ({materiais.length})</p>
            {materiais.length === 0 && <p style={{ color:CORES.sub,fontSize:13,textAlign:"center",padding:24 }}>Nenhum material enviado ainda.</p>}
            {materiais.map(m => (
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

        {/* CADASTRAR QUESTÃO */}
        {aba === "cadastrar" && (
          <div>
            {qMsg && (
              <div style={{ marginBottom:12,padding:"10px 14px",borderRadius:10,background:qMsg.tipo==="ok"?"#EDFAF3":"#FFF1F1",border:`1px solid ${qMsg.tipo==="ok"?"#22c55e":"#ef4444"}`,color:qMsg.tipo==="ok"?"#15803d":"#b91c1c",fontSize:13,fontWeight:600 }}>
                {qMsg.texto}
              </div>
            )}

            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:14,fontWeight:700,margin:"0 0 14px" }}>➕ Cadastrar Nova Questão</p>

              {/* Pergunta */}
              <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 4px",textTransform:"uppercase" }}>Pergunta *</p>
              <textarea value={qForm.question} onChange={e=>setQForm(p=>({...p,question:e.target.value}))} placeholder="Digite a pergunta..." rows={3}
                style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,resize:"vertical",boxSizing:"border-box",marginBottom:12 }} />

              {/* Opções */}
              <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 8px",textTransform:"uppercase" }}>Opções de resposta</p>
              {qForm.options.map((opt, i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:qForm.answer_index===i?"#0A7C4B":"#e2e8f0",color:qForm.answer_index===i?"#fff":CORES.sub,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0,cursor:"pointer",border:`2px solid ${qForm.answer_index===i?"#0A7C4B":"transparent"}` }}
                    onClick={()=>setQForm(p=>({...p,answer_index:i}))}>
                    {String.fromCharCode(65+i)}
                  </div>
                  <input value={opt} onChange={e=>{ const o=[...qForm.options]; o[i]=e.target.value; setQForm(p=>({...p,options:o})); }}
                    placeholder={`Opção ${String.fromCharCode(65+i)}${qForm.answer_index===i?" (correta)":""}`}
                    style={{ flex:1,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${qForm.answer_index===i?"#0A7C4B":CORES.border}`,fontSize:13,background:qForm.answer_index===i?"#EDFAF3":"#fff" }} />
                </div>
              ))}
              <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 12px" }}>Clique na letra para marcar como correta</p>

              {/* Explicação */}
              <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 4px",textTransform:"uppercase" }}>Explicação / Gabarito</p>
              <textarea value={qForm.explanation} onChange={e=>setQForm(p=>({...p,explanation:e.target.value}))} placeholder="Explique a resposta correta..." rows={2}
                style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,resize:"vertical",boxSizing:"border-box",marginBottom:12 }} />

              {/* Metadados */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 }}>
                <div>
                  <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 4px",textTransform:"uppercase" }}>Vestibular</p>
                  <select value={qForm.vestibular} onChange={e=>setQForm(p=>({...p,vestibular:e.target.value}))}
                    style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                    {["ENEM","ITA","IME","FUVEST","UNICAMP","UNB"].map(v=><option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 4px",textTransform:"uppercase" }}>Dificuldade</p>
                  <select value={qForm.difficulty} onChange={e=>setQForm(p=>({...p,difficulty:e.target.value}))}
                    style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                    <option value="facil">🟢 Fácil</option>
                    <option value="medio">🟡 Médio</option>
                    <option value="dificil">🔴 Difícil</option>
                  </select>
                </div>
                <div>
                  <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 4px",textTransform:"uppercase" }}>Área</p>
                  <select value={qForm.area} onChange={e=>setQForm(p=>({...p,area:e.target.value}))}
                    style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                    <option value="ciencias_natureza">🔬 Ciências da Natureza</option>
                    <option value="ciencias_humanas">🌍 Ciências Humanas</option>
                    <option value="linguagens">📚 Linguagens</option>
                    <option value="matematica">📐 Matemática</option>
                  </select>
                </div>
                <div>
                  <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 4px",textTransform:"uppercase" }}>Ano</p>
                  <input type="number" value={qForm.ano} onChange={e=>setQForm(p=>({...p,ano:Number(e.target.value)}))} min={2000} max={2030}
                    style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,boxSizing:"border-box" }} />
                </div>
              </div>

              <div>
                <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 4px",textTransform:"uppercase" }}>Tópico</p>
                <input value={qForm.topic} onChange={e=>setQForm(p=>({...p,topic:e.target.value}))} placeholder="Ex: termoquimica, funções, romantismo..."
                  style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,boxSizing:"border-box",marginBottom:14 }} />
              </div>

              <button onClick={salvarQuestao} disabled={salvandoQ}
                style={{ width:"100%",padding:"12px 0",background:salvandoQ?"#e2e8f0":"#0A7C4B",color:salvandoQ?CORES.sub:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:salvandoQ?"not-allowed":"pointer" }}>
                {salvandoQ ? "Salvando..." : "✅ Salvar Questão"}
              </button>
            </div>

            {/* Lista de questões cadastradas */}
            <p style={{ fontSize:11,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"0 0 8px" }}>
              Últimas questões cadastradas
              <button onClick={carregarQuestoes} style={{ marginLeft:8,fontSize:10,background:"none",border:"none",color:CORES.primary,cursor:"pointer",fontWeight:600 }}>↻ Atualizar</button>
            </p>
            {loadingQ && <p style={{ color:CORES.sub,fontSize:13,textAlign:"center",padding:16 }}>Carregando...</p>}
            {!loadingQ && questoesCadastradas.length === 0 && <p style={{ color:CORES.sub,fontSize:13,textAlign:"center",padding:16 }}>Nenhuma questão cadastrada ainda.</p>}
            {questoesCadastradas.map(q => (
              <div key={q.id} style={{ background:CORES.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${CORES.border}`,marginBottom:8 }}>
                <div style={{ display:"flex",alignItems:"flex-start",gap:8 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:600,margin:"0 0 4px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>{q.question}</p>
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                      <span style={{ fontSize:10,background:"#E6EEFF",color:CORES.primary,borderRadius:4,padding:"2px 6px",fontWeight:600 }}>{q.vestibular}</span>
                      <span style={{ fontSize:10,background:"#f1f5f9",color:CORES.sub,borderRadius:4,padding:"2px 6px" }}>{q.difficulty}</span>
                      {q.topic && <span style={{ fontSize:10,background:"#f1f5f9",color:CORES.sub,borderRadius:4,padding:"2px 6px" }}>{q.topic}</span>}
                      <span style={{ fontSize:10,background:"#f1f5f9",color:CORES.sub,borderRadius:4,padding:"2px 6px" }}>{q.ano}</span>
                    </div>
                  </div>
                  <button onClick={()=>deletarQuestao(q.id)} style={{ padding:"5px 10px",background:"#FFF1F1",color:"#ef4444",border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0 }}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* IMPRESSÃO DE PROVAS */}
        {aba === "impressao" && (
          <div>
            {impressaoMsg && (
              <div style={{ marginBottom:12,padding:"10px 14px",borderRadius:10,background:"#EDFAF3",border:"1px solid #22c55e",color:"#15803d",fontSize:13,fontWeight:600 }}>{impressaoMsg}</div>
            )}

            {/* Logo e cabeçalho */}
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:14 }}>
              <p style={{ fontSize:14,fontWeight:700,margin:"0 0 12px" }}>🏫 Cabeçalho da Prova</p>

              {/* Logo */}
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14,padding:"10px 14px",background:"#f8fafc",borderRadius:10,border:`1px solid ${CORES.border}` }}>
                {logoUrl
                  ? <img src={logoUrl} style={{ height:52,objectFit:"contain",borderRadius:6 }} />
                  : <div style={{ width:52,height:52,background:"#e2e8f0",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>🏫</div>
                }
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13,fontWeight:600,margin:"0 0 2px" }}>{logoUrl ? "Logo carregada" : "Sem logo"}</p>
                  <p style={{ fontSize:11,color:CORES.sub,margin:0 }}>Aparece no cabeçalho de todas as provas</p>
                </div>
                <input ref={logoRef} type="file" accept="image/*" onChange={uploadLogo} style={{ display:"none" }} />
                <button onClick={()=>logoRef.current?.click()} disabled={uploadandoLogo}
                  style={{ padding:"6px 12px",background:CORES.primary,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0 }}>
                  {uploadandoLogo ? "..." : logoUrl ? "Trocar" : "Upload"}
                </button>
              </div>

              {/* Campos do cabeçalho */}
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {[
                  { key:"escola", label:"Nome da Escola" },
                  { key:"professor", label:"Professor(a)" },
                  { key:"disciplina", label:"Disciplina" },
                  { key:"turma", label:"Turma" },
                  { key:"titulo", label:"Título da Avaliação" },
                  { key:"data", label:"Data" },
                ].map(f => (
                  <div key={f.key}>
                    <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 3px",textTransform:"uppercase" }}>{f.label}</p>
                    <input value={(cabecalho as any)[f.key]} onChange={e=>setCabecalho(p=>({...p,[f.key]:e.target.value}))}
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,boxSizing:"border-box" as const }} />
                  </div>
                ))}
              </div>
              <button onClick={salvarCabecalho} style={{ marginTop:12,width:"100%",padding:"9px 0",background:"#0A7C4B",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>
                💾 Salvar escola e professor
              </button>
            </div>

            {/* Filtros */}
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:14 }}>
              <p style={{ fontSize:14,fontWeight:700,margin:"0 0 12px" }}>🔍 Filtrar Questões</p>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10 }}>
                <div>
                  <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 3px",textTransform:"uppercase" }}>Vestibular</p>
                  <select value={filtroImpressao.vestibular} onChange={e=>setFiltroImpressao(p=>({...p,vestibular:e.target.value}))}
                    style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                    <option value="">Todos</option>
                    {["ENEM","ITA","IME","FUVEST","UNICAMP","UNB","PROPRIO"].map(v=><option key={v} value={v}>{v==="PROPRIO"?"Minhas questões":v}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 3px",textTransform:"uppercase" }}>Dificuldade</p>
                  <select value={filtroImpressao.dificuldade} onChange={e=>setFiltroImpressao(p=>({...p,dificuldade:e.target.value}))}
                    style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                    <option value="">Todas</option>
                    <option value="facil">🟢 Fácil</option>
                    <option value="medio">🟡 Médio</option>
                    <option value="dificil">🔴 Difícil</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:10 }}>
                <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 3px",textTransform:"uppercase" }}>Tópico / Assunto</p>
                <select value={filtroImpressao.topico} onChange={e=>setFiltroImpressao(p=>({...p,topico:e.target.value}))}
                  style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                  <option value="">— Todos os tópicos —</option>
                  {[
                    { label:"Reações Químicas",     value:"reacoes-quimicas" },
                    { label:"Estequiometria",        value:"estequiometria" },
                    { label:"Gases",                 value:"gases" },
                    { label:"Soluções",              value:"solucoes" },
                    { label:"Termodinâmica",         value:"termodinamica" },
                    { label:"Tabela Periódica",      value:"tabela-periodica" },
                    { label:"Estrutura Atômica",     value:"estrutura-atomica" },
                    { label:"Ligações Químicas",     value:"ligacoes-quimicas" },
                    { label:"Mecânica",              value:"mecanica" },
                    { label:"Eletromagnetismo",      value:"eletromagnetismo" },
                    { label:"Ondulatória",           value:"ondulatoria" },
                    { label:"Queda Livre",           value:"queda-livre" },
                    { label:"Movimento Circular",    value:"movimento-circular" },
                    { label:"Álgebra",               value:"algebra" },
                    { label:"Geometria",             value:"geometria" },
                    { label:"Cálculo",               value:"calculo" },
                    { label:"Probabilidade",         value:"probabilidade" },
                  ].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <button onClick={buscarQuestoesParaImpressao} disabled={buscandoQ}
                style={{ width:"100%",padding:"10px 0",background:buscandoQ?"#e2e8f0":CORES.primary,color:buscandoQ?CORES.sub:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:buscandoQ?"not-allowed":"pointer" }}>
                {buscandoQ ? "Buscando..." : "🔍 Buscar questões"}
              </button>
            </div>

            {/* Questões encontradas */}
            {questoesDisponiveis.length > 0 && (
              <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:14 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <p style={{ fontSize:14,fontWeight:700,margin:0 }}>{questoesDisponiveis.length} questões encontradas</p>
                  <label style={{ fontSize:12,color:CORES.primary,cursor:"pointer",fontWeight:600 }}>
                    <input type="checkbox" checked={questoesDisponiveis.every(q=>questoesSelecionadas.has(q.id))}
                      onChange={e=>setQuestoesSelecionadas(e.target.checked ? new Set(questoesDisponiveis.map(q=>q.id)) : new Set())}
                      style={{ marginRight:4 }} />
                    Todas
                  </label>
                </div>
                <div style={{ maxHeight:300,overflowY:"auto",display:"flex",flexDirection:"column",gap:6 }}>
                  {questoesDisponiveis.map(q => (
                    <label key={q.id} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:10,border:`1px solid ${questoesSelecionadas.has(q.id)?CORES.primary:CORES.border}`,background:questoesSelecionadas.has(q.id)?"#E6EEFF":"#f8fafc",cursor:"pointer" }}>
                      <input type="checkbox" checked={questoesSelecionadas.has(q.id)}
                        onChange={e=>setQuestoesSelecionadas(prev=>{const n=new Set(prev);e.target.checked?n.add(q.id):n.delete(q.id);return n;})}
                        style={{ marginTop:2,flexShrink:0 }} />
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ fontSize:12,fontWeight:600,margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as const }}>{q.question}</p>
                        <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                          {q.topic&&<span style={{ fontSize:10,background:"#f1f5f9",color:CORES.sub,borderRadius:4,padding:"1px 6px" }}>{q.topic}</span>}
                          <span style={{ fontSize:10,background:"#f1f5f9",color:CORES.sub,borderRadius:4,padding:"1px 6px" }}>{q.difficulty}</span>
                          <span style={{ fontSize:10,background:"#E6EEFF",color:CORES.primary,borderRadius:4,padding:"1px 6px",fontWeight:600 }}>{q.vestibular}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Versões e imprimir */}
            {questoesSelecionadas.size > 0 && (
              <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}` }}>
                <p style={{ fontSize:14,fontWeight:700,margin:"0 0 12px" }}>🖨️ Gerar Provas</p>
                <div style={{ marginBottom:12 }}>
                  <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 6px",textTransform:"uppercase" }}>Quantas versões diferentes?</p>
                  <div style={{ display:"flex",gap:8 }}>
                    {[1,2,3,4].map(n=>(
                      <button key={n} onClick={()=>setQtdVersoes(n)}
                        style={{ flex:1,padding:"10px 0",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:qtdVersoes===n?CORES.primary:"#f1f5f9",color:qtdVersoes===n?"#fff":CORES.sub }}>
                        {n}x {["","(A)","(A/B)","(A/B/C)","(A/B/C/D)"][n]}
                      </button>
                    ))}
                  </div>
                  {qtdVersoes > 1 && <p style={{ fontSize:11,color:CORES.sub,margin:"8px 0 0" }}>As questões e alternativas serão embaralhadas em cada versão.</p>}
                </div>
                <div style={{ background:"#FFF8E6",borderRadius:10,padding:"10px 14px",marginBottom:12,border:"1px solid #fcd34d" }}>
                  <p style={{ fontSize:12,color:"#92400e",margin:0 }}>📋 <strong>{questoesSelecionadas.size} questões</strong> · <strong>{qtdVersoes} versão(ões)</strong> · Gabarito separado</p>
                </div>
                <button onClick={imprimirProvas}
                  style={{ width:"100%",padding:"12px 0",background:"linear-gradient(90deg,#0057FF,#0041CC)",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer" }}>
                  🖨️ Imprimir {qtdVersoes > 1 ? `${qtdVersoes} versões` : "prova"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* SALAS VIRTUAIS */}

        {/* QR CODE DE CORREÇÃO */}
        {/* GERADOR IA */}
        {aba === "gerador" && (
          <div>
            {/* Seletor de destino */}
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:12 }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>🎯 Destino das questões</p>
              <div style={{ display:"flex",gap:8,marginBottom:12 }}>
                {[
                  { id:"banco",     label:"📚 Banco de vestibular" },
                  { id:"simulado",  label:"🎯 Mini simulado" },
                  { id:"olimpiada", label:"🏆 Prova de Olimpíada" },
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
                      {["ENEM","ITA","IME","FUVEST","UNICAMP","UNB","OUTRO"].map(v => (
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

              {/* Prova de olimpíada */}
              {genDestino === "olimpiada" && (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <div>
                    <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Prova ativa</p>
                    <select value={provaSel} onChange={e => setProvaSel(e.target.value)}
                      style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}>
                      <option value="">— Selecione a prova —</option>
                      {provas.map(p => <option key={p.id} value={p.id}>{p.evento} — {p.titulo}</option>)}
                    </select>
                  </div>
                  {provaSel && (
                    <p style={{ fontSize:11,color:"#22c55e",background:"#EDFAF3",padding:"6px 10px",borderRadius:6,margin:0 }}>
                      ✅ As questões serão adicionadas diretamente à prova de olimpíada selecionada.
                    </p>
                  )}
                  {provas.length === 0 && (
                    <p style={{ fontSize:11,color:"#f59e0b",background:"#fffbeb",padding:"6px 10px",borderRadius:6,margin:0 }}>
                      ⚠️ Nenhuma prova ativa. Ative uma prova no Admin da Olimpíada primeiro.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:12 }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>🧠 Converter questão discursiva em objetiva</p>
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                <div>
                  <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Questão discursiva *</p>
                  <textarea value={genDiscursiva} onChange={e => setGenDiscursiva(e.target.value)} rows={3}
                    placeholder="Ex: Explique por que o aumento da temperatura acelera as reações químicas."
                    style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,resize:"vertical" as const,fontFamily:"inherit" }} />
                </div>
                <div>
                  <p style={{ fontSize:11,color:CORES.sub,margin:"0 0 4px" }}>Resposta esperada</p>
                  <textarea value={genResposta} onChange={e => setGenResposta(e.target.value)} rows={2}
                    placeholder="O que o aluno deveria responder..."
                    style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13,resize:"vertical" as const,fontFamily:"inherit" }} />
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
                <button onClick={() => gerarQuestoes()} disabled={genLoading}
                  style={{ padding:"12px 0",background:genLoading?"#e2e8f0":"#0A7C4B",color:genLoading?CORES.sub:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:genLoading?"not-allowed":"pointer",fontFamily:"inherit" }}>
                  {genLoading ? genLoadingMsg : "🪄 Gerar questões objetivas"}
                </button>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" as const }}>
                  {[
                    { label:"Estilo ENEM",    estilo:"ENEM contextualizado" },
                    { label:"Olímpico",       estilo:"olímpico com raciocínio aprofundado" },
                    { label:"Contextualizada",estilo:"contextualizada com situação do cotidiano" },
                  ].map((btn,i) => (
                    <button key={i} disabled={genLoading} onClick={() => gerarQuestoes(btn.estilo)}
                      style={{ padding:"6px 12px",background:CORES.bg,border:`1px solid ${CORES.border}`,borderRadius:8,fontSize:12,color:CORES.sub,cursor:"pointer",fontFamily:"inherit" }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
                {genErro && <p style={{ color:"#ef4444",fontSize:12,background:"#FFF1F1",padding:"8px 12px",borderRadius:8,margin:0 }}>{genErro}</p>}
                {genSalvoMsg && <p style={{ color:"#15803d",fontSize:12,background:"#EDFAF3",padding:"8px 12px",borderRadius:8,margin:0 }}>{genSalvoMsg}</p>}
              </div>
            </div>

            {/* Análise */}
            {genAnalise && (
              <div style={{ background:CORES.card,borderRadius:12,padding:14,border:`1px solid ${CORES.border}`,marginBottom:12 }}>
                <p style={{ fontSize:11,fontWeight:700,color:CORES.sub,textTransform:"uppercase" as const,margin:"0 0 8px" }}>📊 Análise automática</p>
                {[["Conceito",genAnalise.conceito_principal],["Habilidade",genAnalise.habilidade_cognitiva],["Área",genAnalise.area_tematica]].map(([l,v]) => v && (
                  <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${CORES.bg}` }}>
                    <span style={{ fontSize:12,color:CORES.sub }}>{l}</span>
                    <span style={{ fontSize:12,color:CORES.text,fontWeight:600,textAlign:"right" as const,maxWidth:"60%" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Questões geradas */}
            {genQuestoes.map((q,i) => {
              const CORS = ["#3b82f6","#10b981","#f59e0b","#ef4444"];
              const cor = CORS[i%4];
              return (
                <div key={i} style={{ background:CORES.card,borderRadius:12,border:`1px solid ${CORES.border}`,overflow:"hidden",marginBottom:10 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:CORES.bg,borderBottom:`2px solid ${cor}` }}>
                    <span style={{ fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:99,background:`${cor}20`,color:cor }}>{q.modelo}</span>
                    <span style={{ fontSize:11,color:CORES.sub,marginLeft:"auto" }}>{q.dificuldade}</span>
                  </div>
                  <div style={{ padding:14 }}>
                    {q.texto_base && q.texto_base !== "null" && (
                      <div style={{ background:CORES.bg,borderLeft:`3px solid #cbd5e1`,padding:"8px 12px",marginBottom:10,borderRadius:"0 8px 8px 0" }}>
                        <p style={{ fontSize:11,color:CORES.sub,margin:0,fontStyle:"italic" as const }}>{q.texto_base}</p>
                      </div>
                    )}
                    <p style={{ fontSize:13,color:CORES.text,lineHeight:1.75,marginBottom:12 }}>{q.enunciado}</p>
                    <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
                      {q.alternativas.map((a:any) => (
                        <div key={a.letra} style={{ display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",borderRadius:8,background:a.correta?"#EDFAF3":CORES.bg,border:`1px solid ${a.correta?"#86efac":CORES.border}` }}>
                          <span style={{ width:20,height:20,borderRadius:"50%",background:a.correta?"#22c55e":"#e5e7eb",color:a.correta?"#fff":"#666",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>{a.letra}</span>
                          <span style={{ fontSize:12,color:CORES.text,lineHeight:1.5 }}>{a.texto}</span>
                          {a.correta && <span style={{ marginLeft:"auto",color:"#22c55e",fontWeight:700,flexShrink:0 }}>✓</span>}
                        </div>
                      ))}
                    </div>
                    <div style={{ background:"#EDFAF3",border:"1px solid #86efac",borderRadius:8,padding:"10px 12px",marginBottom:8 }}>
                      <p style={{ fontSize:10,fontWeight:700,color:"#15803d",textTransform:"uppercase" as const,margin:"0 0 4px" }}>Gabarito</p>
                      <p style={{ fontSize:12,color:"#166534",lineHeight:1.6,margin:0 }}>{q.gabarito_justificativa}</p>
                    </div>
                    <div style={{ background:CORES.bg,borderRadius:8,padding:"10px 12px" }}>
                      <p style={{ fontSize:10,fontWeight:700,color:CORES.sub,textTransform:"uppercase" as const,margin:"0 0 4px" }}>Explicação</p>
                      <p style={{ fontSize:12,color:CORES.text,lineHeight:1.6,margin:0 }}>{q.explicacao}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {genQuestoes.length > 0 && (
              <button onClick={salvarQuestoesGeradas} disabled={genSalvando}
                style={{ width:"100%",padding:"13px 0",background:genSalvando?"#e2e8f0":"#0f172a",color:genSalvando?CORES.sub:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:8 }}>
                {genSalvando ? "Salvando..." : `💾 Salvar ${genQuestoes.length} questões em ${genDestino === "banco" ? genVestibular : genDestino === "olimpiada" ? "prova de olimpíada" : "mini simulado"}`}
              </button>
            )}
          </div>
        )}

        {/* TURMAS */}
        {aba === "turmas" && (
          <div>
            {/* Criar nova turma */}
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:13,fontWeight:700,margin:"0 0 12px" }}>➕ Nova Turma</p>
              {turmaMsg && (
                <div style={{ marginBottom:10,padding:"8px 12px",borderRadius:8,background:turmaMsg.tipo==="ok"?"#EDFAF3":"#FFF1F1",border:`1px solid ${turmaMsg.tipo==="ok"?"#22c55e":"#ef4444"}`,color:turmaMsg.tipo==="ok"?"#15803d":"#b91c1c",fontSize:12,fontWeight:600 }}>
                  {turmaMsg.texto}
                </div>
              )}
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                <input
                  value={novaTurma.nome}
                  onChange={e => setNovaTurma(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome da turma *  (ex: 3º Ano A — ITA 2025)"
                  style={{ padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}
                />
                <input
                  value={novaTurma.descricao}
                  onChange={e => setNovaTurma(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descrição (opcional)"
                  style={{ padding:"9px 12px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:13 }}
                />
                <button onClick={criarTurma} disabled={criandoTurma || !novaTurma.nome.trim()}
                  style={{ padding:"11px 0",background:criandoTurma||!novaTurma.nome.trim()?"#e2e8f0":"#0A7C4B",color:criandoTurma||!novaTurma.nome.trim()?CORES.sub:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:criandoTurma||!novaTurma.nome.trim()?"not-allowed":"pointer" }}>
                  {criandoTurma ? "Criando..." : "🏫 Criar turma"}
                </button>
              </div>
            </div>

            {/* Lista de turmas */}
            <p style={{ fontSize:11,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"0 0 8px" }}>
              Minhas turmas ({turmas.length})
            </p>
            {loadingTurmas && <p style={{ color:CORES.sub,fontSize:13,textAlign:"center",padding:16 }}>Carregando...</p>}
            {!loadingTurmas && turmas.length === 0 && (
              <div style={{ background:CORES.card,borderRadius:12,padding:32,border:`1px solid ${CORES.border}`,textAlign:"center" }}>
                <p style={{ fontSize:36,margin:"0 0 8px" }}>🏫</p>
                <p style={{ color:CORES.sub,fontSize:13 }}>Nenhuma turma criada ainda.</p>
              </div>
            )}
            {turmas.map(t => (
              <div key={t.id} style={{ background:CORES.card,borderRadius:12,border:`1px solid ${t.ativa?"#22c55e33":CORES.border}`,marginBottom:8,overflow:"hidden" }}>
                {/* Header da turma */}
                <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px" }}>
                  <div style={{ width:40,height:40,borderRadius:10,background:t.ativa?"#EDFAF3":"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>
                    🏫
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:700,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.nome}</p>
                    <div style={{ display:"flex",gap:6,alignItems:"center",marginTop:2 }}>
                      <span style={{ fontSize:10,fontWeight:700,background:"#E6EEFF",color:CORES.primary,borderRadius:4,padding:"1px 6px" }}>
                        Código: {t.codigo}
                      </span>
                      <span style={{ fontSize:10,fontWeight:600,color:t.ativa?"#22c55e":"#9ca3af" }}>
                        {t.ativa ? "● Ativa" : "○ Inativa"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                    <button onClick={() => {
                      const abrindo = turmaExpandida !== t.id;
                      setTurmaExpandida(abrindo ? t.id : null);
                      if (abrindo && !alunosTurma[t.id]) carregarAlunosDaTurmaLocal(t.id);
                    }} style={{ padding:"5px 10px",background:"#E6EEFF",color:CORES.primary,border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer" }}>
                      {turmaExpandida === t.id ? "Fechar" : "👥 Alunos"}
                    </button>
                    <button onClick={() => toggleTurma(t.id, t.ativa)}
                      style={{ padding:"5px 10px",background:t.ativa?"#FFF8E6":"#EDFAF3",color:t.ativa?"#92400e":"#15803d",border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer" }}>
                      {t.ativa ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => deletarTurma(t.id)}
                      style={{ padding:"5px 10px",background:"#FFF1F1",color:"#ef4444",border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer" }}>
                      Del
                    </button>
                  </div>
                </div>

                {/* Painel de alunos */}
                {turmaExpandida === t.id && (
                  <div style={{ borderTop:`1px solid ${CORES.border}`,padding:"12px 14px",background:"#f8fafc" }}>
                    {/* Buscar aluno */}
                    <p style={{ fontSize:11,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"0 0 8px" }}>Adicionar aluno</p>
                    <div style={{ display:"flex",gap:8,marginBottom:8 }}>
                      <input
                        value={buscaAluno[t.id] ?? ""}
                        onChange={e => setBuscaAluno(p => ({ ...p, [t.id]: e.target.value }))}
                        placeholder="Buscar por email..."
                        style={{ flex:1,padding:"8px 10px",borderRadius:8,border:`1px solid ${CORES.border}`,fontSize:12 }}
                        onKeyDown={e => e.key === "Enter" && buscarAlunoPorEmail(t.id, buscaAluno[t.id] ?? "")}
                      />
                      <button onClick={() => buscarAlunoPorEmail(t.id, buscaAluno[t.id] ?? "")}
                        style={{ padding:"8px 12px",background:CORES.primary,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer" }}>
                        Buscar
                      </button>
                    </div>

                    {/* Resultados da busca */}
                    {(resultadoBusca[t.id] ?? []).map((aluno: any) => (
                      <div key={aluno.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#fff",borderRadius:8,border:`1px solid ${CORES.border}`,marginBottom:6 }}>
                        <div style={{ width:28,height:28,borderRadius:"50%",background:CORES.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0 }}>
                          {(aluno.nome?.[0] ?? aluno.email?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <p style={{ fontSize:12,fontWeight:600,margin:0 }}>{aluno.nome ?? "Sem nome"}</p>
                          <p style={{ fontSize:11,color:CORES.sub,margin:0 }}>{aluno.email}</p>
                        </div>
                        <button onClick={() => adicionarAluno(t.id, aluno.id)} disabled={adicionandoAluno === aluno.id}
                          style={{ padding:"4px 10px",background:"#0A7C4B",color:"#fff",border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer" }}>
                          {adicionandoAluno === aluno.id ? "..." : "+ Adicionar"}
                        </button>
                      </div>
                    ))}

                    {/* Lista de alunos da turma */}
                    <p style={{ fontSize:11,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"12px 0 8px" }}>
                      Alunos ({(alunosTurma[t.id] ?? []).length})
                    </p>
                    {(alunosTurma[t.id] ?? []).length === 0 ? (
                      <p style={{ fontSize:12,color:CORES.sub,textAlign:"center",padding:"8px 0" }}>Nenhum aluno ainda.</p>
                    ) : (
                      (alunosTurma[t.id] ?? []).map((aluno: any) => (
                        <div key={aluno.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#fff",borderRadius:8,border:`1px solid ${CORES.border}`,marginBottom:6 }}>
                          <div style={{ width:28,height:28,borderRadius:"50%",background:"#e0f2fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#0284c7",flexShrink:0 }}>
                            {(aluno.nome?.[0] ?? aluno.email?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <p style={{ fontSize:12,fontWeight:600,margin:0 }}>{aluno.nome ?? "Sem nome"}</p>
                            <p style={{ fontSize:11,color:CORES.sub,margin:0 }}>{aluno.email}</p>
                          </div>
                          <button onClick={() => removerAluno(t.id, aluno.id)}
                            style={{ padding:"4px 8px",background:"#FFF1F1",color:"#ef4444",border:"none",borderRadius:6,fontSize:11,cursor:"pointer" }}>
                            Remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {aba === "qrcode" && (
          <div>
            <div style={{ background:CORES.card,borderRadius:14,padding:16,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:15,fontWeight:700,margin:"0 0 4px" }}>📷 Gerar QR Codes para Correção</p>
              <p style={{ fontSize:12,color:CORES.sub,margin:"0 0 16px",lineHeight:1.6 }}>
                Selecione uma avaliação e uma turma. Cada aluno recebe um QR Code único. O professor escaneia a folha e corrige direto no celular.
              </p>
              {loadingQR ? (
                <p style={{ color:CORES.sub,fontSize:13,textAlign:"center",padding:16 }}>Carregando...</p>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  <div>
                    <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 4px",textTransform:"uppercase" }}>Avaliação</p>
                    <select value={avaliacaoSelecionada} onChange={e => setAvaliacaoSelecionada(e.target.value)}
                      style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${CORES.border}`,fontSize:13,background:"#fff" }}>
                      <option value="">Selecione uma avaliação...</option>
                      {minhasAvaliacoes.map(a => (<option key={a.id} value={a.id}>{a.titulo}</option>))}
                    </select>
                    {minhasAvaliacoes.length === 0 && (
                      <p style={{ fontSize:11,color:"#f59e0b",margin:"4px 0 0" }}>⚠️ Nenhuma avaliação ativa encontrada.</p>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize:11,fontWeight:600,color:CORES.sub,margin:"0 0 4px",textTransform:"uppercase" }}>Turma</p>
                    <select value={turmaSelecionada} onChange={e => setTurmaSelecionada(e.target.value)}
                      style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${CORES.border}`,fontSize:13,background:"#fff" }}>
                      <option value="">Selecione uma turma...</option>
                      {minhasTurmas.map(t => (<option key={t.id} value={t.id}>{t.nome} {t.codigo ? `(${t.codigo})` : ""}</option>))}
                    </select>
                    {minhasTurmas.length === 0 && (
                      <p style={{ fontSize:11,color:"#f59e0b",margin:"4px 0 0" }}>⚠️ Nenhuma turma ativa.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {alunosDaTurma.length > 0 && avaliacaoSelecionada && (
              <div>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
                  <p style={{ fontSize:13,fontWeight:700,margin:0 }}>{alunosDaTurma.length} alunos encontrados</p>
                  <button onClick={imprimirQRCodes}
                    style={{ padding:"8px 16px",background:"linear-gradient(90deg,#065C37,#0A7C4B)",color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer" }}>
                    🖨️ Imprimir QR Codes
                  </button>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {alunosDaTurma.map(aluno => {
                    const url = gerarUrlCorrecao(aluno.id);
                    const aberto = alunoQRAberto === aluno.id;
                    return (
                      <div key={aluno.id} style={{ background:CORES.card,borderRadius:14,border:`1px solid ${CORES.border}`,overflow:"hidden" }}>
                        <div onClick={() => setAlunoQRAberto(aberto ? null : aluno.id)}
                          style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",cursor:"pointer" }}>
                          <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#065C37,#0A7C4B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>👤</div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <p style={{ fontSize:13,fontWeight:700,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{aluno.nome || aluno.email}</p>
                            <p style={{ fontSize:11,color:CORES.sub,margin:0 }}>{aluno.email}</p>
                          </div>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <button onClick={e => { e.stopPropagation(); navigate(`/correcao/${avaliacaoSelecionada}/${aluno.id}`); }}
                              style={{ padding:"5px 10px",background:"#E6EEFF",color:CORES.primary,border:"none",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer" }}>
                              ✏️ Corrigir
                            </button>
                            <span style={{ fontSize:11,color:CORES.sub,display:"inline-block",transform:aberto?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s" }}>▼</span>
                          </div>
                        </div>
                        {aberto && (
                          <div style={{ borderTop:`1px solid ${CORES.border}`,padding:"16px",display:"flex",alignItems:"center",gap:20,background:"#f8fafc" }}>
                            <div style={{ flexShrink:0,padding:8,background:"#fff",borderRadius:10,border:`1px solid ${CORES.border}` }}>
                              <QRCodeSVG value={url} size={100} level="M" />
                            </div>
                            <div style={{ flex:1,minWidth:0 }}>
                              <p style={{ fontSize:12,fontWeight:700,margin:"0 0 4px" }}>QR Code de correção</p>
                              <p style={{ fontSize:10,color:CORES.sub,margin:"0 0 10px",wordBreak:"break-all",lineHeight:1.4 }}>{url}</p>
                              <button onClick={() => navigate(`/correcao/${avaliacaoSelecionada}/${aluno.id}`)}
                                style={{ padding:"8px 16px",background:"linear-gradient(90deg,#065C37,#0A7C4B)",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer" }}>
                                Abrir correção →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {turmaSelecionada && alunosDaTurma.length === 0 && !loadingQR && (
              <div style={{ background:CORES.card,borderRadius:14,padding:32,border:`1px solid ${CORES.border}`,textAlign:"center" }}>
                <p style={{ fontSize:40,margin:"0 0 8px" }}>🏫</p>
                <p style={{ color:CORES.sub,fontSize:13 }}>Nenhum aluno nesta turma ainda.</p>
              </div>
            )}
          </div>
        )}

        {aba === "salas" && (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",gap:16 }}>
            <div style={{ fontSize:52 }}>🏫</div>
            <p style={{ fontSize:18,fontWeight:800,color:CORES.text,margin:0,textAlign:"center" }}>Salas Virtuais</p>
            <p style={{ fontSize:13,color:CORES.sub,margin:0,textAlign:"center",lineHeight:1.6 }}>
              Crie e gerencie salas ao vivo para seus alunos. Compartilhe o código e inicie quizzes em tempo real.
            </p>
            <button
              onClick={() => navigate("/sala/professor")}
              style={{ marginTop:8,padding:"14px 32px",background:"linear-gradient(90deg,#065C37,#0A7C4B)",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer" }}
            >
              🚀 Acessar Salas Virtuais
            </button>
          </div>
        )}

        {/* QUESTÕES */}
        {aba === "questoes" && (
          <div>
            {/* PDF com IA */}
            <div style={{ background:CORES.card,borderRadius:14,padding:20,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:15,fontWeight:700,margin:"0 0 4px" }}>🤖 Importar PDF com IA</p>
              <p style={{ fontSize:12,color:CORES.sub,margin:"0 0 14px",lineHeight:1.6 }}>Envie um PDF com questões e a IA extrai automaticamente todas as perguntas, alternativas e respostas.</p>
              {pdfMsg && (
                <div style={{ marginBottom:12,padding:"10px 14px",borderRadius:10,background:pdfMsg.tipo==="ok"?"#EDFAF3":"#FFF1F1",border:`1px solid ${pdfMsg.tipo==="ok"?"#22c55e":"#ef4444"}`,color:pdfMsg.tipo==="ok"?"#15803d":"#b91c1c",fontSize:13,fontWeight:600 }}>
                  {pdfMsg.texto}
                </div>
              )}
              <input ref={pdfRef} type="file" accept=".pdf" onChange={processarPdfComIA} style={{ display:"none" }} />
              <button onClick={()=>pdfRef.current?.click()} disabled={processandoPdf}
                style={{ width:"100%",padding:"12px 0",background:processandoPdf?"#e2e8f0":"linear-gradient(135deg,#6D28D9,#4C1D95)",color:processandoPdf?CORES.sub:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:processandoPdf?"not-allowed":"pointer",marginBottom:8 }}>
                {processandoPdf ? "⏳ Processando com IA..." : "📄 Selecionar PDF e extrair questões"}
              </button>

              {/* Questões extraídas */}
              {questoesExtraidas.length > 0 && (
                <div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",margin:"16px 0 8px" }}>
                    <p style={{ fontSize:13,fontWeight:700,margin:0 }}>Questões extraídas — revise antes de salvar</p>
                    <label style={{ fontSize:12,color:CORES.primary,cursor:"pointer",fontWeight:600 }}>
                      <input type="checkbox" checked={questoesExtraidas.every(q=>q.selecionada)}
                        onChange={e=>setQuestoesExtraidas(prev=>prev.map(q=>({...q,selecionada:e.target.checked})))}
                        style={{ marginRight:4 }} />
                      Todas
                    </label>
                  </div>
                  <div style={{ maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
                    {questoesExtraidas.map((q,i) => (
                      <div key={i} style={{ background:q.selecionada?"#EDFAF3":"#f8fafc",borderRadius:10,padding:"10px 12px",border:`1px solid ${q.selecionada?"#22c55e":CORES.border}` }}>
                        <div style={{ display:"flex",alignItems:"flex-start",gap:8 }}>
                          <input type="checkbox" checked={q.selecionada}
                            onChange={e=>setQuestoesExtraidas(prev=>prev.map((x,j)=>j===i?{...x,selecionada:e.target.checked}:x))}
                            style={{ marginTop:2,flexShrink:0 }} />
                          <div style={{ flex:1,minWidth:0 }}>
                            <p style={{ fontSize:12,fontWeight:600,margin:"0 0 4px",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{q.question}</p>
                            <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                              {(q.options||[]).slice(0,5).map((opt:string,oi:number)=>(
                                <span key={oi} style={{ fontSize:10,padding:"1px 6px",borderRadius:4,background:oi===q.answer_index?"#DCFCE7":"#f1f5f9",color:oi===q.answer_index?"#15803d":CORES.sub,fontWeight:oi===q.answer_index?700:400 }}>
                                  {String.fromCharCode(65+oi)}: {opt?.substring(0,20)}{opt?.length>20?"...":""}
                                </span>
                              ))}
                            </div>
                            <div style={{ display:"flex",gap:4,marginTop:4 }}>
                              <span style={{ fontSize:10,background:"#E6EEFF",color:CORES.primary,borderRadius:4,padding:"1px 6px",fontWeight:600 }}>{q.vestibular||"PROPRIO"}</span>
                              <span style={{ fontSize:10,background:"#f1f5f9",color:CORES.sub,borderRadius:4,padding:"1px 6px" }}>{q.difficulty||"medio"}</span>
                              {q.topic&&<span style={{ fontSize:10,background:"#f1f5f9",color:CORES.sub,borderRadius:4,padding:"1px 6px" }}>{q.topic}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={salvarQuestoesExtraidas} disabled={salvandoExtraidas}
                    style={{ width:"100%",padding:"12px 0",background:salvandoExtraidas?"#e2e8f0":"#0A7C4B",color:salvandoExtraidas?CORES.sub:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:salvandoExtraidas?"not-allowed":"pointer" }}>
                    {salvandoExtraidas ? "Salvando..." : `✅ Salvar ${questoesExtraidas.filter(q=>q.selecionada).length} questões selecionadas`}
                  </button>
                </div>
              )}
            </div>

            {/* Excel */}
            <div style={{ background:CORES.card,borderRadius:14,padding:20,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:15,fontWeight:700,margin:"0 0 6px" }}>📊 Importar via Excel</p>
              <p style={{ fontSize:12,color:CORES.sub,margin:"0 0 14px",lineHeight:1.6 }}>Preencha o template e importe em massa.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                <a href="/template_questoes.xlsx" download style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 0",background:"#EDFAF3",color:"#15803d",borderRadius:10,fontSize:13,fontWeight:600,textDecoration:"none",border:"1.5px solid #22c55e" }}>
                  📥 Baixar template Excel
                </a>
                <input ref={excelRef} type="file" accept=".xlsx,.xls" onChange={importarExcel} style={{ display:"none" }} />
                <button onClick={()=>excelRef.current?.click()} disabled={importando} style={{ padding:"11px 0",background:importando?"#e2e8f0":"#0A7C4B",color:importando?CORES.sub:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:importando?"not-allowed":"pointer" }}>
                  {importando ? "⏳ Importando..." : "📤 Selecionar Excel e importar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
