// src/components/admin/CertificadosAdmin.tsx
// Aba de gestão de certificados no AdminDashboard

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CORES } from "@/styles/theme";
import * as XLSX from "xlsx";

interface Evento { id: string; nome: string; sigla: string; ano: number; edicao?: string; disciplina?: string; carga_horaria?: number; }
interface Regra  { id: string; tipo_certificado: string; titulo_cert: string; nota_minima?: number; }
interface CertEmitido { id: string; codigo: string; nome_aluno: string; tipo_certificado: string; emitido_em: string; downloads: number; }
interface AlunoImportado { nome: string; email: string; nota?: number; medalha?: string; encontrado?: boolean; user_id?: string; }
interface Template { id: string; nome: string; cor_primaria: string; cor_secundaria: string; assinatura1_nome?: string; assinatura1_cargo?: string; assinatura1_url?: string; assinatura2_nome?: string; assinatura2_cargo?: string; logo_url?: string; brasao_url?: string; }

export default function CertificadosAdmin() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoSel, setEventoSel] = useState("");
  const [regras, setRegras] = useState<Regra[]>([]);
  const [certificados, setCertificados] = useState<CertEmitido[]>([]);
  const [loading, setLoading] = useState(false);
  const [emitindo, setEmitindo] = useState(false);
  const [msg, setMsg] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);
  // Importação
  const [alunosImportados, setAlunosImportados] = useState<AlunoImportado[]>([]);
  const [importando, setImportando] = useState(false);
  const [emitindoLote, setEmitindoLote] = useState(false);
  const [progressoEmissao, setProgressoEmissao] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const assinatura1Ref = useRef<HTMLInputElement>(null);
  const brasaoRef = useRef<HTMLInputElement>(null);
  const assinatura2Ref = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  // Template
  const [template, setTemplate] = useState<Template | null>(null);
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [tForm, setTForm] = useState({
    nome: "", cor_primaria: "#1a3a6e", cor_secundaria: "#fbbf24",
    assinatura1_nome: "", assinatura1_cargo: "",
    assinatura2_nome: "", assinatura2_cargo: "",
  });
  const [assinatura1Preview, setAssinatura1Preview] = useState("");
  const [assinatura2Preview, setAssinatura2Preview] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [brasaoPreview, setBrasaoPreview] = useState("");

  // Form novo evento
  const [novoEvento, setNovoEvento] = useState({ nome:"", sigla:"", edicao:"", ano: new Date().getFullYear(), tipo:"olimpiada", disciplina:"" });
  const [novaRegra, setNovaRegra] = useState({ tipo_certificado:"participacao", titulo_cert:"Certificado de Participação", nota_minima:"", percentual_min:"", carga_horaria:"", texto_cert:"" });
  const [editandoEvento, setEditandoEvento] = useState(false);
  const [formEvento, setFormEvento] = useState({ nome:"", sigla:"", edicao:"", ano: new Date().getFullYear(), disciplina:"", carga_horaria:"" });

  useEffect(() => { carregarEventos(); }, []);
  useEffect(() => {
    if (eventoSel) {
      carregarRegras(); carregarCertificados(); carregarTemplate();
      const ev = eventos.find(e => e.id === eventoSel) as any;
      if (ev) setFormEvento({ nome: ev.nome??'', sigla: ev.sigla??'', edicao: ev.edicao??'', ano: ev.ano??new Date().getFullYear(), disciplina: ev.disciplina??'', carga_horaria: ev.carga_horaria??'' });
    }
  }, [eventoSel]);

  async function carregarEventos() {
    const { data } = await supabase.from("eventos_certificaveis").select("id,nome,sigla,ano,edicao,disciplina,carga_horaria").order("created_at", { ascending:false });
    setEventos(data ?? []);
  }

  async function salvarEvento() {
    if (!eventoSel) return;
    const payload = {
      nome: formEvento.nome, sigla: formEvento.sigla, edicao: formEvento.edicao,
      ano: Number(formEvento.ano), disciplina: formEvento.disciplina,
      carga_horaria: formEvento.carga_horaria ? Number(formEvento.carga_horaria) : null,
    };
    const { error } = await supabase.from("eventos_certificaveis").update(payload).eq("id", eventoSel);
    if (error) { setMsg({ tipo:"erro", texto: error.message }); return; }
    setMsg({ tipo:"ok", texto:"✅ Evento atualizado!" });
    setEditandoEvento(false);
    carregarEventos();
  }

  async function deletarEvento(id: string) {
    if (!confirm("Excluir este evento? Isso não remove certificados já emitidos.")) return;
    await supabase.from("eventos_certificaveis").delete().eq("id", id);
    if (eventoSel === id) setEventoSel("");
    carregarEventos();
  }

  async function carregarRegras() {
    const { data } = await supabase.from("regras_certificado").select("id,tipo_certificado,titulo_cert,nota_minima").eq("evento_id", eventoSel);
    setRegras(data ?? []);
  }

  async function carregarCertificados() {
    setLoading(true);
    const { data } = await supabase.from("certificados")
      .select("id,codigo,nome_aluno,tipo_certificado,emitido_em,downloads")
      .eq("evento_id", eventoSel).order("emitido_em", { ascending:false }).limit(50);
    setCertificados(data ?? []);
    setLoading(false);
  }

  async function carregarTemplate() {
    // Busca template vinculado à regra do evento
    const { data: regrasEvento } = await supabase
      .from("regras_certificado").select("template_id").eq("evento_id", eventoSel).limit(1);
    const templateId = regrasEvento?.[0]?.template_id;
    if (!templateId) { setTemplate(null); return; }
    const { data } = await supabase.from("templates_certificado").select("*").eq("id", templateId).single();
    if (data) {
      setTemplate(data);
      setTForm({
        nome: data.nome ?? "", cor_primaria: data.cor_primaria ?? "#1a3a6e",
        cor_secundaria: data.cor_secundaria ?? "#fbbf24",
        assinatura1_nome: data.assinatura1_nome ?? "", assinatura1_cargo: data.assinatura1_cargo ?? "",
        assinatura2_nome: data.assinatura2_nome ?? "", assinatura2_cargo: data.assinatura2_cargo ?? "",
      });
      setAssinatura1Preview(data.assinatura1_url ?? "");
      setAssinatura2Preview(data.assinatura2_url ?? "");
      setLogoPreview(data.logo_url ?? "");
      setBrasaoPreview(data.brasao_url ?? "");
    }
  }

  async function uploadImagem(file: File, pasta: string): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${pasta}/${Date.now()}.${ext}`;
    await supabase.storage.from("certificados").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("certificados").getPublicUrl(path);
    return data.publicUrl;
  }

  async function salvarTemplate() {
    setSalvandoTemplate(true);
    try {
      let assinatura1_url = assinatura1Preview;
      let assinatura2_url = assinatura2Preview;
      let logo_url = logoPreview;
      let brasao_url = brasaoPreview;

      if (assinatura1Ref.current?.files?.[0])
        assinatura1_url = await uploadImagem(assinatura1Ref.current.files[0], "assinaturas");
      if (assinatura2Ref.current?.files?.[0])
        assinatura2_url = await uploadImagem(assinatura2Ref.current.files[0], "assinaturas");
      if (logoRef.current?.files?.[0])
        logo_url = await uploadImagem(logoRef.current.files[0], "logos");
      if (brasaoRef.current?.files?.[0])
        brasao_url = await uploadImagem(brasaoRef.current.files[0], "brasoes");

      const payload = {
        nome: tForm.nome || "Template padrão",
        cor_primaria: tForm.cor_primaria, cor_secundaria: tForm.cor_secundaria,
        assinatura1_nome: tForm.assinatura1_nome, assinatura1_cargo: tForm.assinatura1_cargo,
        assinatura1_url,
        assinatura2_nome: tForm.assinatura2_nome, assinatura2_cargo: tForm.assinatura2_cargo,
        assinatura2_url,
        logo_url, brasao_url, ativo: true,
      };

      let templateId = template?.id;
      if (templateId) {
        await supabase.from("templates_certificado").update(payload).eq("id", templateId);
      } else {
        const { data: novo } = await supabase.from("templates_certificado").insert(payload).select("id").single();
        templateId = novo?.id;
        // Vincula às regras do evento
        if (templateId)
          await supabase.from("regras_certificado").update({ template_id: templateId }).eq("evento_id", eventoSel);
      }

      setMsg({ tipo: "ok", texto: "✅ Template salvo! Próximos certificados usarão estas assinaturas." });
      carregarTemplate();
    } catch (e) {
      setMsg({ tipo: "erro", texto: "Erro ao salvar template: " + String(e) });
    }
    setSalvandoTemplate(false);
  }

  async function criarEvento() {
    const { error } = await supabase.from("eventos_certificaveis").insert(novoEvento);
    if (error) { setMsg({ tipo:"erro", texto: error.message }); return; }
    setMsg({ tipo:"ok", texto:"✅ Evento criado!" });
    carregarEventos();
    setNovoEvento({ nome:"", sigla:"", edicao:"", ano: new Date().getFullYear(), tipo:"olimpiada", disciplina:"" });
  }

  async function criarRegra() {
    if (!eventoSel) return;
    const { error } = await supabase.from("regras_certificado").insert({
      evento_id: eventoSel,
      tipo_certificado: novaRegra.tipo_certificado,
      titulo_cert: novaRegra.titulo_cert,
      nota_minima: novaRegra.nota_minima ? parseFloat(novaRegra.nota_minima) : null,
      percentual_min: novaRegra.percentual_min ? parseInt(novaRegra.percentual_min) : null,
      carga_horaria: novaRegra.carga_horaria ? parseInt(novaRegra.carga_horaria) : null,
      texto_cert: novaRegra.texto_cert || null,
    });
    if (error) { setMsg({ tipo:"erro", texto: error.message }); return; }
    setMsg({ tipo:"ok", texto:"✅ Regra criada!" });
    carregarRegras();
  }

  async function emitirEmLote(regraId: string) {
    setEmitindo(true);
    // Busca todos os usuários que deveriam receber (simplificado — emite para todos do evento)
    const { data: usuarios } = await supabase.from("profiles").select("id").limit(100);
    let ok = 0;
    for (const u of usuarios ?? []) {
      const { error } = await supabase.functions.invoke("gerar-certificado", {
        body: { user_id: u.id, evento_id: eventoSel, regra_id: regraId, tipo_certificado: regras.find(r => r.id === regraId)?.tipo_certificado }
      });
      if (!error) ok++;
    }
    setMsg({ tipo:"ok", texto:`✅ ${ok} certificados emitidos!` });
    carregarCertificados();
    setEmitindo(false);
  }

  async function cancelarCertificado(id: string) {
    if (!confirm("Cancelar este certificado?")) return;
    await supabase.from("certificados").update({ valido: false, cancelado_em: new Date().toISOString() }).eq("id", id);
    carregarCertificados();
  }

  async function processarPlanilha(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setAlunosImportados([]);
    setMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Lê todas as linhas como array para detectar onde começa o cabeçalho real
      const todasLinhas: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // Acha a linha que contém "nome" ou "email" ou "aluno" (cabeçalho real)
      let headerRow = 0;
      for (let i = 0; i < Math.min(todasLinhas.length, 10); i++) {
        const linha = todasLinhas[i].map((c: any) => String(c).toLowerCase().trim());
        if (linha.some(c =>
          c === "nome" || c === "email" || c === "nome do aluno *" || c === "e-mail *" ||
          c.includes("aluno - nome") || c.includes("aluno - email") || c.startsWith("nome")
        )) {
          headerRow = i;
          break;
        }
      }

      // Recria com o header correto
      const headers = todasLinhas[headerRow].map((h: any) =>
        String(h).toLowerCase().trim()
          .replace(/\*/g, "").trim()  // remove asteriscos
          .replace("nome do aluno", "nome")
          .replace("e-mail", "email")
          .replace("nota (0-100)", "nota")
      );
      // Pula linha 4 se for legenda (não tem email válido)
      const dataRows = todasLinhas.slice(headerRow + 1).filter(r => {
        const vals = r.map((c: any) => String(c ?? "").toLowerCase());
        // Ignora linhas de legenda (ex: "medalhas automáticas...")
        return r.some((c: any) => c !== "") && !vals[0]?.includes("medalha") && !vals[0]?.includes("automátic");
      });

      const alunos: AlunoImportado[] = dataRows.map(row => {
        const k: Record<string, any> = {};
        headers.forEach((h, i) => { k[h] = row[i] ?? ""; });

        // Aceita tanto planilha modelo (nome, email) quanto original da olimpíada (aluno - nome, aluno - email)
        const nome  = String(k["nome"] || k["aluno - nome"] || k["name"] || k["nome completo"] || "").trim();
        const email = String(k["email"] || k["aluno - email"] || k["e-mail"] || "").trim().toLowerCase();
        const notaRaw = k["nota"] || k["nota final"] || "";
        const nota = notaRaw !== "" ? parseFloat(String(notaRaw)) : undefined;
        const medalha = String(k["medalha"] || k["medal"] || "").trim().toLowerCase() || undefined;

        return { nome, email, nota, medalha };
      }).filter(a => a.nome || a.email);

      if (alunos.length === 0) {
        setMsg({ tipo: "erro", texto: "Nenhum aluno encontrado. Verifique se a planilha tem colunas 'nome' e 'email'." });
        setImportando(false);
        return;
      }

      // Cruza com profiles pelo email (só quem tem email)
      const emails = alunos.filter(a => a.email).map(a => a.email);
      const emailMap: Record<string, string> = {};
      if (emails.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles").select("id, email").in("email", emails);
        (profiles ?? []).forEach((p: any) => { emailMap[p.email.toLowerCase()] = p.id; });
      }

      const comMatch = alunos.map(a => ({
        ...a,
        encontrado: !!emailMap[a.email],
        user_id: emailMap[a.email],
      }));

      setAlunosImportados(comMatch);
      const encontrados = comMatch.filter(a => a.encontrado).length;
      const naoEncontrados = comMatch.filter(a => !a.encontrado).length;
      setMsg({ tipo: encontrados > 0 ? "ok" : "erro",
        texto: `📊 ${comMatch.length} alunos lidos · ${encontrados} encontrados no sistema · ${naoEncontrados} não cadastrados` });
    } catch (err) {
      setMsg({ tipo: "erro", texto: "Erro ao ler planilha: " + String(err) });
    }
    setImportando(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function emitirPorPlanilha() {
    if (!eventoSel || alunosImportados.length === 0 || regras.length === 0) return;
    setEmitindoLote(true);
    setMsg(null);
    let ok = 0, pulados = 0;

    // Separa cadastrados e não cadastrados
    const cadastrados   = alunosImportados.filter(a => a.encontrado && a.user_id);
    const naoCadastrados = alunosImportados.filter(a => !a.encontrado && a.email);

    // 1. Emite para os já cadastrados diretamente
    for (let i = 0; i < cadastrados.length; i++) {
      const aluno = cadastrados[i];
      setProgressoEmissao(`Emitindo cadastrados ${i + 1}/${cadastrados.length}...`);
      let regra = regras.find(r => aluno.medalha && r.tipo_certificado === aluno.medalha);
      if (!regra) regra = regras.find(r =>
        !r.nota_minima || (aluno.nota !== undefined && aluno.nota >= r.nota_minima)
      );
      if (!regra) { pulados++; continue; }
      const { error } = await supabase.functions.invoke("gerar-certificado", {
        body: {
          user_id: aluno.user_id, evento_id: eventoSel, regra_id: regra.id,
          tipo_certificado: regra.tipo_certificado, nome_aluno: aluno.nome,
          nota: aluno.nota, medalha: aluno.medalha,
        }
      });
      if (!error) ok++; else pulados++;
    }

    // 2. Cria contas + emite para não cadastrados via Edge Function
    if (naoCadastrados.length > 0) {
      setProgressoEmissao(`Criando ${naoCadastrados.length} contas e emitindo certificados...`);
      const { data, error } = await supabase.functions.invoke("criar-alunos-lote", {
        body: {
          alunos: naoCadastrados,
          evento_id: eventoSel,
          regras: regras.map(r => ({ id: r.id, tipo_certificado: r.tipo_certificado, nota_minima: r.nota_minima })),
        }
      });
      if (!error && data) {
        ok += data.ok ?? 0;
        pulados += (data.pulados ?? 0) + (data.erros ?? 0);
      }
    }

    setProgressoEmissao("");
    setMsg({ tipo: "ok", texto: `✅ ${ok} certificados emitidos · ${pulados} pulados` });
    setAlunosImportados([]);
    carregarCertificados();
    setEmitindoLote(false);
  }

  const TIPO_LABEL: Record<string,string> = {
    participacao:"Participação", conclusao:"Conclusão", desempenho:"Desempenho",
    ouro:"🥇 Ouro", prata:"🥈 Prata", bronze:"🥉 Bronze", mencao_honrosa:"⭐ Menção",
  };

  return (
    <div>
      {msg && (
        <div style={{ marginBottom:12, padding:"8px 12px", borderRadius:8, background:msg.tipo==="ok"?"#EDFAF3":"#FFF1F1", color:msg.tipo==="ok"?"#15803d":"#b91c1c", fontSize:12, fontWeight:600 }}>
          {msg.texto}
        </div>
      )}

      {/* Seletor + gestão de evento */}
      <div style={{ background:CORES.bgCard, borderRadius:14, padding:16, border:`1px solid rgba(0,0,0,0.08)`, marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <p style={{ fontSize:13, fontWeight:700, margin:0 }}>🏆 Evento</p>
          <button onClick={() => { setEventoSel(""); setEditandoEvento(false); }}
            style={{ fontSize:11, color:CORES.textSub, background:"none", border:"none", cursor:"pointer" }}>
            + Novo evento
          </button>
        </div>

        {/* Seletor */}
        <select value={eventoSel} onChange={e => { setEventoSel(e.target.value); setEditandoEvento(false); }}
          style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:13, marginBottom: eventoSel ? 10 : 0 }}>
          <option value="">— Selecione um evento —</option>
          {eventos.filter(e => e.nome).map(e => (
            <option key={e.id} value={e.id}>{(e as any).sigla ? `${(e as any).sigla} — ` : ""}{e.nome} ({e.ano})</option>
          ))}
        </select>

        {/* Card do evento selecionado */}
        {eventoSel && !editandoEvento && (
          <div style={{ background:"#f8fafc", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div>
                <p style={{ fontSize:14, fontWeight:700, margin:"0 0 2px", color:"#1a3a6e" }}>
                  {(eventos.find(e=>e.id===eventoSel) as any)?.sigla} — {eventos.find(e=>e.id===eventoSel)?.nome}
                </p>
                <p style={{ fontSize:11, color:CORES.textSub, margin:0 }}>
                  {(eventos.find(e=>e.id===eventoSel) as any)?.edicao} · {eventos.find(e=>e.id===eventoSel)?.ano}
                  {(eventos.find(e=>e.id===eventoSel) as any)?.disciplina ? ` · ${(eventos.find(e=>e.id===eventoSel) as any).disciplina}` : ""}
                </p>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => setEditandoEvento(true)}
                  style={{ padding:"4px 10px", background:"#eef2ff", color:"#1a3a6e", border:"none", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                  ✏️ Editar
                </button>
                <button onClick={() => deletarEvento(eventoSel)}
                  style={{ padding:"4px 10px", background:"#fff1f1", color:"#ef4444", border:"none", borderRadius:6, fontSize:11, cursor:"pointer" }}>
                  🗑️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formulário edição/criação */}
        {(editandoEvento || !eventoSel) && (
          <div style={{ marginTop: eventoSel ? 10 : 0 }}>
            <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 8px", fontWeight:600 }}>
              {eventoSel ? "✏️ Editar evento" : "➕ Novo evento"}
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <input value={eventoSel ? formEvento.nome : novoEvento.nome}
                onChange={e => eventoSel ? setFormEvento(p=>({...p,nome:e.target.value})) : setNovoEvento(p=>({...p,nome:e.target.value}))}
                placeholder="Nome do evento *" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12, gridColumn:"1/-1" }} />
              <input value={eventoSel ? formEvento.sigla : novoEvento.sigla}
                onChange={e => eventoSel ? setFormEvento(p=>({...p,sigla:e.target.value.toUpperCase()})) : setNovoEvento(p=>({...p,sigla:e.target.value.toUpperCase()}))}
                placeholder="Sigla (ex: OTQ)" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
              <input value={eventoSel ? formEvento.edicao : novoEvento.edicao}
                onChange={e => eventoSel ? setFormEvento(p=>({...p,edicao:e.target.value})) : setNovoEvento(p=>({...p,edicao:e.target.value}))}
                placeholder="Edição (ex: 1ª)" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
              <input value={eventoSel ? formEvento.disciplina : novoEvento.disciplina}
                onChange={e => eventoSel ? setFormEvento(p=>({...p,disciplina:e.target.value})) : setNovoEvento(p=>({...p,disciplina:e.target.value}))}
                placeholder="Disciplina" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
              <input type="number" value={eventoSel ? formEvento.ano : novoEvento.ano}
                onChange={e => eventoSel ? setFormEvento(p=>({...p,ano:parseInt(e.target.value)})) : setNovoEvento(p=>({...p,ano:parseInt(e.target.value)}))}
                placeholder="Ano" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
              <input type="number" value={eventoSel ? formEvento.carga_horaria : ""}
                onChange={e => setFormEvento(p=>({...p,carga_horaria:e.target.value}))}
                placeholder="Carga horária (h)" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
            </div>
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              {eventoSel && (
                <button onClick={() => setEditandoEvento(false)}
                  style={{ flex:1, padding:"9px 0", background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  Cancelar
                </button>
              )}
              <button onClick={eventoSel ? salvarEvento : criarEvento}
                style={{ flex:2, padding:"9px 0", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {eventoSel ? "💾 Salvar alterações" : "+ Criar Evento"}
              </button>
            </div>
          </div>
        )}
      </div>

      {eventoSel && (
        <>
          {/* Regras */}
          <div style={{ background:CORES.bgCard, borderRadius:14, padding:16, border:`1px solid ${"rgba(0,0,0,0.08)"}`, marginBottom:12 }}>
            <p style={{ fontSize:13, fontWeight:700, margin:"0 0 12px" }}>📋 Regras de Emissão</p>
            {regras.map(r => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:CORES.bg, borderRadius:8, marginBottom:6 }}>
                <span style={{ fontSize:18 }}>
                  {r.tipo_certificado==="ouro"?"🥇":r.tipo_certificado==="prata"?"🥈":r.tipo_certificado==="bronze"?"🥉":r.tipo_certificado==="mencao_honrosa"?"⭐":"📜"}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, margin:0 }}>{r.titulo_cert}</p>
                  <p style={{ fontSize:10, color:CORES.textSub, margin:0 }}>
                    {r.nota_minima ? `nota ≥ ${r.nota_minima}` : "todos os participantes"}
                    {" · "}{TIPO_LABEL[r.tipo_certificado] ?? r.tipo_certificado}
                  </p>
                </div>
                <button onClick={() => emitirEmLote(r.id)} disabled={emitindo}
                  style={{ padding:"5px 10px", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", flexShrink:0 }}>
                  {emitindo ? "..." : "Emitir em lote"}
                </button>
              </div>
            ))}

            {/* Nova regra */}
            <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid rgba(0,0,0,0.08)` }}>
              <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 10px", fontWeight:600 }}>➕ Nova regra de corte</p>

              {/* Presets rápidos */}
              <p style={{ fontSize:10, color:CORES.textSub, margin:"0 0 6px" }}>Atalhos:</p>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                {[
                  { tipo:"ouro",          label:"🥇 Ouro",          nota:"85", titulo:"Medalha de Ouro" },
                  { tipo:"prata",         label:"🥈 Prata",         nota:"75", titulo:"Medalha de Prata" },
                  { tipo:"bronze",        label:"🥉 Bronze",        nota:"60", titulo:"Medalha de Bronze" },
                  { tipo:"mencao_honrosa",label:"⭐ Menção",        nota:"50", titulo:"Menção Honrosa" },
                  { tipo:"participacao",  label:"📜 Participação",  nota:"",   titulo:"Certificado de Participação" },
                ].map(p => (
                  <button key={p.tipo} onClick={() => setNovaRegra(r => ({...r, tipo_certificado:p.tipo, nota_minima:p.nota, titulo_cert:p.titulo}))}
                    style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${novaRegra.tipo_certificado===p.tipo?"#1a3a6e":"rgba(0,0,0,0.1)"}`,
                      background:novaRegra.tipo_certificado===p.tipo?"#eef2ff":"#f8fafc",
                      color:novaRegra.tipo_certificado===p.tipo?"#1a3a6e":"#64748b",
                      fontSize:11, fontWeight:novaRegra.tipo_certificado===p.tipo?700:400, cursor:"pointer" }}>
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <p style={{ fontSize:10, color:CORES.textSub, margin:"0 0 3px" }}>Título do certificado</p>
                  <input value={novaRegra.titulo_cert} onChange={e => setNovaRegra(p => ({...p, titulo_cert:e.target.value}))}
                    placeholder="Ex: Medalha de Ouro — OTQ 2025"
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
                </div>
                <div>
                  <p style={{ fontSize:10, color:CORES.textSub, margin:"0 0 3px" }}>Nota mínima (0–100)</p>
                  <input type="number" value={novaRegra.nota_minima} onChange={e => setNovaRegra(p => ({...p, nota_minima:e.target.value}))}
                    placeholder="Ex: 85"
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
                </div>
                <div>
                  <p style={{ fontSize:10, color:CORES.textSub, margin:"0 0 3px" }}>Carga horária (h)</p>
                  <input type="number" value={novaRegra.carga_horaria} onChange={e => setNovaRegra(p => ({...p, carga_horaria:e.target.value}))}
                    placeholder="Ex: 4"
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
                </div>
              </div>

              {/* Preview da regra */}
              {novaRegra.tipo_certificado && (
                <div style={{ marginTop:8, padding:"8px 12px", background:"#f0f9ff", borderRadius:8, border:"1px solid #bae6fd", fontSize:11, color:"#0369a1" }}>
                  <strong>Regra:</strong> emitir <strong>{novaRegra.titulo_cert || TIPO_LABEL[novaRegra.tipo_certificado]}</strong>
                  {novaRegra.nota_minima ? ` para alunos com nota ≥ ${novaRegra.nota_minima}` : " para todos os participantes"}
                  {novaRegra.carga_horaria ? ` (${novaRegra.carga_horaria}h)` : ""}
                </div>
              )}

              <button onClick={criarRegra} style={{ marginTop:8, width:"100%", padding:"9px 0", background:CORES.primary, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                + Adicionar regra
              </button>
            </div>
          </div>

          {/* Template — assinaturas e identidade visual */}
          <div style={{ background:CORES.bgCard, borderRadius:14, padding:16, border:`1px solid rgba(0,0,0,0.08)`, marginBottom:12 }}>
            <p style={{ fontSize:13, fontWeight:700, margin:"0 0 4px" }}>🎨 Template do Certificado</p>
            <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 12px" }}>Assinaturas, cores e logo aparecem em todos os certificados deste evento</p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
              <div>
                <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px" }}>Cor principal</p>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input type="color" value={tForm.cor_primaria} onChange={e => setTForm(p => ({...p, cor_primaria:e.target.value}))}
                    style={{ width:36, height:36, borderRadius:6, border:"none", cursor:"pointer", padding:2 }} />
                  <span style={{ fontSize:12, color:CORES.textSub }}>{tForm.cor_primaria}</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px" }}>Cor secundária</p>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input type="color" value={tForm.cor_secundaria} onChange={e => setTForm(p => ({...p, cor_secundaria:e.target.value}))}
                    style={{ width:36, height:36, borderRadius:6, border:"none", cursor:"pointer", padding:2 }} />
                  <span style={{ fontSize:12, color:CORES.textSub }}>{tForm.cor_secundaria}</span>
                </div>
              </div>
            </div>

            {/* Brasão */}
            <div style={{ marginBottom:10 }}>
              <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px", fontWeight:600 }}>Brasão (ex: Estado do Tocantins)</p>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {brasaoPreview && <img src={brasaoPreview} style={{ height:48, borderRadius:6, border:"1px solid rgba(0,0,0,0.08)" }} />}
                <input ref={brasaoRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if(f) setBrasaoPreview(URL.createObjectURL(f)); }} style={{ display:"none" }} />
                <button onClick={() => brasaoRef.current?.click()} style={{ padding:"6px 12px", background:"#f1f5f9", border:"1px solid rgba(0,0,0,0.08)", borderRadius:6, fontSize:12, cursor:"pointer" }}>
                  {brasaoPreview ? "Trocar brasão" : "📂 Enviar brasão"}
                </button>
              </div>
            </div>

            {/* Logo */}
            <div style={{ marginBottom:10 }}>
              <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 4px", fontWeight:600 }}>Logo do evento</p>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {logoPreview && <img src={logoPreview} style={{ height:40, borderRadius:6, border:"1px solid rgba(0,0,0,0.08)" }} />}
                <input ref={logoRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if(f) setLogoPreview(URL.createObjectURL(f)); }} style={{ display:"none" }} />
                <button onClick={() => logoRef.current?.click()} style={{ padding:"6px 12px", background:"#f1f5f9", border:"1px solid rgba(0,0,0,0.08)", borderRadius:6, fontSize:12, cursor:"pointer" }}>
                  {logoPreview ? "Trocar logo" : "📂 Enviar logo"}
                </button>
              </div>
            </div>

            {/* Assinatura 1 — Coordenador */}
            <div style={{ paddingTop:10, borderTop:"1px solid rgba(0,0,0,0.06)", marginBottom:10 }}>
              <p style={{ fontSize:11, fontWeight:700, color:CORES.textSub, margin:"0 0 8px" }}>✍️ Assinatura 1 (Coordenador)</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                <input value={tForm.assinatura1_nome} onChange={e => setTForm(p => ({...p, assinatura1_nome:e.target.value}))}
                  placeholder="Nome completo" style={{ padding:"8px 10px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
                <input value={tForm.assinatura1_cargo} onChange={e => setTForm(p => ({...p, assinatura1_cargo:e.target.value}))}
                  placeholder="Cargo (ex: Coordenador Geral)" style={{ padding:"8px 10px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {assinatura1Preview && (
                  <div style={{ background:"#f8fafc", borderRadius:8, padding:"8px 16px", border:"1px solid rgba(0,0,0,0.08)" }}>
                    <img src={assinatura1Preview} style={{ height:36, display:"block" }} />
                  </div>
                )}
                <input ref={assinatura1Ref} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if(f) setAssinatura1Preview(URL.createObjectURL(f)); }} style={{ display:"none" }} />
                <button onClick={() => assinatura1Ref.current?.click()} style={{ padding:"6px 12px", background:"#f1f5f9", border:"1px solid rgba(0,0,0,0.08)", borderRadius:6, fontSize:12, cursor:"pointer" }}>
                  {assinatura1Preview ? "Trocar imagem" : "📂 Enviar assinatura"}
                </button>
                {assinatura1Preview && <span style={{ fontSize:10, color:"#22c55e" }}>✅ imagem carregada</span>}
              </div>
            </div>

            {/* Assinatura 2 — Opcional */}
            <div style={{ paddingTop:10, borderTop:"1px solid rgba(0,0,0,0.06)", marginBottom:12 }}>
              <p style={{ fontSize:11, fontWeight:700, color:CORES.textSub, margin:"0 0 8px" }}>✍️ Assinatura 2 (opcional)</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                <input value={tForm.assinatura2_nome} onChange={e => setTForm(p => ({...p, assinatura2_nome:e.target.value}))}
                  placeholder="Nome completo" style={{ padding:"8px 10px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
                <input value={tForm.assinatura2_cargo} onChange={e => setTForm(p => ({...p, assinatura2_cargo:e.target.value}))}
                  placeholder="Cargo" style={{ padding:"8px 10px", borderRadius:8, border:`1px solid rgba(0,0,0,0.08)`, fontSize:12 }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {assinatura2Preview && (
                  <div style={{ background:"#f8fafc", borderRadius:8, padding:"8px 16px", border:"1px solid rgba(0,0,0,0.08)" }}>
                    <img src={assinatura2Preview} style={{ height:36, display:"block" }} />
                  </div>
                )}
                <input ref={assinatura2Ref} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if(f) setAssinatura2Preview(URL.createObjectURL(f)); }} style={{ display:"none" }} />
                <button onClick={() => assinatura2Ref.current?.click()} style={{ padding:"6px 12px", background:"#f1f5f9", border:"1px solid rgba(0,0,0,0.08)", borderRadius:6, fontSize:12, cursor:"pointer" }}>
                  {assinatura2Preview ? "Trocar imagem" : "📂 Enviar assinatura"}
                </button>
              </div>
            </div>

            <button onClick={salvarTemplate} disabled={salvandoTemplate}
              style={{ width:"100%", padding:"11px 0", background:salvandoTemplate?"#e2e8f0":"#1a3a6e", color:salvandoTemplate?CORES.textSub:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              {salvandoTemplate ? "Salvando..." : "💾 Salvar template"}
            </button>
          </div>

          {/* Importar planilha */}
          <div style={{ background:CORES.bgCard, borderRadius:14, padding:16, border:`1px solid rgba(0,0,0,0.08)`, marginBottom:12 }}>
            <p style={{ fontSize:13, fontWeight:700, margin:"0 0 4px" }}>📥 Importar Resultados (Excel / CSV)</p>
            <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 12px" }}>
              Colunas esperadas: <strong>nome</strong>, <strong>email</strong>, <strong>nota</strong> (opcional), <strong>medalha</strong> (opcional: ouro/prata/bronze)
            </p>

            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={processarPlanilha}
              style={{ display:"none" }} />
            <button onClick={() => fileRef.current?.click()} disabled={importando}
              style={{ width:"100%", padding:"10px 0", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:10 }}>
              {importando ? "Lendo planilha..." : "📂 Selecionar planilha"}
            </button>

            {alunosImportados.length > 0 && (
              <>
                {/* Preview */}
                <div style={{ maxHeight:200, overflowY:"auto", marginBottom:10 }}>
                  {alunosImportados.map((a, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:a.encontrado?"#EDFAF3":"#FFF1F1", borderRadius:6, marginBottom:4 }}>
                      <span style={{ fontSize:13 }}>{a.encontrado ? "✅" : "❌"}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:600, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.nome || a.email}</p>
                        <p style={{ fontSize:10, color:CORES.textSub, margin:0 }}>{a.email}{a.nota !== undefined ? ` · nota: ${a.nota}` : ""}{a.medalha ? ` · ${a.medalha}` : ""}</p>
                      </div>
                      {!a.encontrado && <span style={{ fontSize:10, color:"#b91c1c" }}>não cadastrado</span>}
                    </div>
                  ))}
                </div>

                <button onClick={emitirPorPlanilha} disabled={emitindoLote || regras.length === 0}
                  style={{ width:"100%", padding:"11px 0", background: regras.length===0?"#e2e8f0":"#0A7C4B", color: regras.length===0?CORES.textSub:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor: regras.length===0?"not-allowed":"pointer" }}>
                  {emitindoLote ? progressoEmissao : (() => {
                    const enc = alunosImportados.filter(a=>a.encontrado).length;
                    const novos = alunosImportados.filter(a=>!a.encontrado && a.email).length;
                    return `🎓 Emitir certificados (${enc} cadastrados + ${novos} novos contas)`;
                  })()}
                </button>
                {regras.length === 0 && (
                  <p style={{ fontSize:11, color:"#b91c1c", margin:"6px 0 0", textAlign:"center" }}>⚠️ Cadastre pelo menos uma regra de emissão antes de importar</p>
                )}
              </>
            )}
          </div>

          {/* Certificados emitidos */}
          <div style={{ background:CORES.bgCard, borderRadius:14, padding:16, border:`1px solid ${"rgba(0,0,0,0.08)"}` }}>
            <p style={{ fontSize:13, fontWeight:700, margin:"0 0 12px" }}>📜 Certificados Emitidos ({certificados.length})</p>
            {loading && <p style={{ color:CORES.textSub, fontSize:13, textAlign:"center" }}>Carregando...</p>}
            {certificados.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:CORES.bg, borderRadius:8, marginBottom:6 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nome_aluno}</p>
                  <p style={{ fontSize:11, color:CORES.textSub, margin:0 }}>{c.codigo} · {new Date(c.emitido_em).toLocaleDateString("pt-BR")}</p>
                </div>
                <span style={{ fontSize:11, color:CORES.textSub }}>⬇️ {c.downloads}</span>
                <button onClick={() => cancelarCertificado(c.id)} style={{ padding:"4px 8px", background:"#FFF1F1", color:"#ef4444", border:"none", borderRadius:6, fontSize:11, cursor:"pointer" }}>
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
