// src/pages/olimpiadas/AdminOlimpiada.tsx
// Painel admin da olimpíada — gerenciar provas e questões

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { CORES } from "@/styles/theme";
import BottomNav from "@/components/layout/BottomNav";

export default function AdminOlimpiada() {
  const { id = "OTQ" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = (profile as any)?.role === "admin" || (profile as any)?.role === "super_admin";

  const [aba, setAba] = useState<"prova"|"questoes"|"resultados">("prova");
  const [evento, setEvento] = useState<any>(null);
  const [prova, setProva] = useState<any>(null);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [tentativas, setTentativas] = useState<any[]>([]);
  const [msg, setMsg] = useState<{tipo:"ok"|"erro"; texto:string}|null>(null);
  const [salvando, setSalvando] = useState(false);

  // Form prova
  const [fProva, setFProva] = useState({ titulo:"", duracao_minutos:120, total_questoes:30, nota_aprovacao:60, data_inicio:"", data_fim:"" });

  // Form questão
  const [fQ, setFQ] = useState({ enunciado:"", alternativas:[{texto:""},{texto:""},{texto:""},{texto:""},{texto:""}], resposta_correta:0, explicacao:"", assunto:"", dificuldade:"medio" });
  const [adicionandoQ, setAdicionandoQ] = useState(false);

  useEffect(() => { if (isAdmin) carregarDados(); else navigate(-1); }, [id]);

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
          {(["prova","questoes","resultados"] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              style={{ flex:1, padding:"7px 0", borderRadius:8, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                background: aba===a ? "#fff" : "rgba(255,255,255,0.15)", color: aba===a ? "#1a3a6e" : "#fff" }}>
              {a==="prova"?"📋 Prova":a==="questoes"?`📝 Questões (${questoes.length})`:`🏆 Resultados (${tentativas.length})`}
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
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{ fontSize:13, fontWeight:700, margin:0 }}>{questoes.length} / {prova?.total_questoes ?? 30} questões</p>
              <button onClick={() => setAdicionandoQ(true)}
                style={{ padding:"7px 14px", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                + Adicionar
              </button>
            </div>

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
