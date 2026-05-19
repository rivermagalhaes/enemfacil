// src/components/admin/CertificadosAdmin.tsx
// Aba de gestão de certificados no AdminDashboard

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CORES } from "@/styles/theme";

interface Evento { id: string; nome: string; sigla: string; ano: number; }
interface Regra  { id: string; tipo_certificado: string; titulo_cert: string; nota_minima?: number; }
interface CertEmitido { id: string; codigo: string; nome_aluno: string; tipo_certificado: string; emitido_em: string; downloads: number; }

export default function CertificadosAdmin() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoSel, setEventoSel] = useState("");
  const [regras, setRegras] = useState<Regra[]>([]);
  const [certificados, setCertificados] = useState<CertEmitido[]>([]);
  const [loading, setLoading] = useState(false);
  const [emitindo, setEmitindo] = useState(false);
  const [msg, setMsg] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);

  // Form novo evento
  const [novoEvento, setNovoEvento] = useState({ nome:"", sigla:"", edicao:"", ano: new Date().getFullYear(), tipo:"olimpiada", disciplina:"" });
  const [novaRegra, setNovaRegra] = useState({ tipo_certificado:"participacao", titulo_cert:"Certificado de Participação", nota_minima:"", percentual_min:"", carga_horaria:"", texto_cert:"" });

  useEffect(() => { carregarEventos(); }, []);
  useEffect(() => { if (eventoSel) { carregarRegras(); carregarCertificados(); } }, [eventoSel]);

  async function carregarEventos() {
    const { data } = await supabase.from("eventos_certificaveis").select("id,nome,sigla,ano").order("created_at", { ascending:false });
    setEventos(data ?? []);
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

      {/* Criar Evento */}
      <div style={{ background:CORES.card, borderRadius:14, padding:16, border:`1px solid ${CORES.border}`, marginBottom:12 }}>
        <p style={{ fontSize:13, fontWeight:700, margin:"0 0 12px" }}>🏆 Novo Evento Certificável</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <input value={novoEvento.nome} onChange={e => setNovoEvento(p => ({...p, nome:e.target.value}))} placeholder="Nome do evento *" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:13, gridColumn:"1/-1" }} />
          <input value={novoEvento.sigla} onChange={e => setNovoEvento(p => ({...p, sigla:e.target.value.toUpperCase()}))} placeholder="Sigla (ex: OTQ)" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:13 }} />
          <input value={novoEvento.edicao} onChange={e => setNovoEvento(p => ({...p, edicao:e.target.value}))} placeholder="Edição (ex: 1ª)" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:13 }} />
          <input value={novoEvento.disciplina} onChange={e => setNovoEvento(p => ({...p, disciplina:e.target.value}))} placeholder="Disciplina" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:13 }} />
          <input type="number" value={novoEvento.ano} onChange={e => setNovoEvento(p => ({...p, ano:parseInt(e.target.value)}))} style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:13 }} />
        </div>
        <button onClick={criarEvento} style={{ marginTop:10, width:"100%", padding:"10px 0", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
          + Criar Evento
        </button>
      </div>

      {/* Seletor de evento */}
      <div style={{ marginBottom:12 }}>
        <p style={{ fontSize:11, color:CORES.sub, margin:"0 0 4px" }}>Selecionar evento</p>
        <select value={eventoSel} onChange={e => setEventoSel(e.target.value)} style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:13 }}>
          <option value="">— Selecione um evento —</option>
          {eventos.map(e => <option key={e.id} value={e.id}>{e.sigla} — {e.nome} ({e.ano})</option>)}
        </select>
      </div>

      {eventoSel && (
        <>
          {/* Regras */}
          <div style={{ background:CORES.card, borderRadius:14, padding:16, border:`1px solid ${CORES.border}`, marginBottom:12 }}>
            <p style={{ fontSize:13, fontWeight:700, margin:"0 0 12px" }}>📋 Regras de Emissão</p>
            {regras.map(r => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:CORES.bg, borderRadius:8, marginBottom:6 }}>
                <span style={{ flex:1, fontSize:13, fontWeight:500 }}>{r.titulo_cert}</span>
                <span style={{ fontSize:11, color:CORES.sub }}>{TIPO_LABEL[r.tipo_certificado] ?? r.tipo_certificado}</span>
                <button onClick={() => emitirEmLote(r.id)} disabled={emitindo}
                  style={{ padding:"5px 10px", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                  {emitindo ? "..." : "Emitir em lote"}
                </button>
              </div>
            ))}

            {/* Nova regra */}
            <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${CORES.border}` }}>
              <p style={{ fontSize:11, color:CORES.sub, margin:"0 0 8px", fontWeight:600 }}>Nova regra</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <select value={novaRegra.tipo_certificado} onChange={e => setNovaRegra(p => ({...p, tipo_certificado:e.target.value}))} style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:12 }}>
                  {["participacao","conclusao","desempenho","ouro","prata","bronze","mencao_honrosa","organizador","professor"].map(t => (
                    <option key={t} value={t}>{TIPO_LABEL[t] ?? t}</option>
                  ))}
                </select>
                <input value={novaRegra.titulo_cert} onChange={e => setNovaRegra(p => ({...p, titulo_cert:e.target.value}))} placeholder="Título do certificado" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:12 }} />
                <input value={novaRegra.nota_minima} onChange={e => setNovaRegra(p => ({...p, nota_minima:e.target.value}))} placeholder="Nota mínima (opcional)" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:12 }} />
                <input value={novaRegra.percentual_min} onChange={e => setNovaRegra(p => ({...p, percentual_min:e.target.value}))} placeholder="% mínimo (opcional)" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${CORES.border}`, fontSize:12 }} />
              </div>
              <button onClick={criarRegra} style={{ marginTop:8, width:"100%", padding:"9px 0", background:CORES.primary, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                + Adicionar regra
              </button>
            </div>
          </div>

          {/* Certificados emitidos */}
          <div style={{ background:CORES.card, borderRadius:14, padding:16, border:`1px solid ${CORES.border}` }}>
            <p style={{ fontSize:13, fontWeight:700, margin:"0 0 12px" }}>📜 Certificados Emitidos ({certificados.length})</p>
            {loading && <p style={{ color:CORES.sub, fontSize:13, textAlign:"center" }}>Carregando...</p>}
            {certificados.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:CORES.bg, borderRadius:8, marginBottom:6 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nome_aluno}</p>
                  <p style={{ fontSize:11, color:CORES.sub, margin:0 }}>{c.codigo} · {new Date(c.emitido_em).toLocaleDateString("pt-BR")}</p>
                </div>
                <span style={{ fontSize:11, color:CORES.sub }}>⬇️ {c.downloads}</span>
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
