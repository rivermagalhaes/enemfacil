// src/pages/admin/AdminDashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

const CORES = {
  bg: "#F4F6FB", card: "#FFFFFF", primary: "#0057FF",
  text: "#1a1a2e", sub: "#64748B", border: "#E2E8F0",
};

const ABAS = [
  { id: "visao",     label: "Visão Geral", emoji: "📊" },
  { id: "materiais", label: "Materiais",   emoji: "📁" },
  { id: "questoes",  label: "Questões",    emoji: "📝" },
  { id: "usuarios",  label: "Usuários",    emoji: "👥" },
  { id: "ranking",   label: "Rankings",    emoji: "🏆" },
];

const ESTADOS_REGIOES: Record<string, string> = {
  AC:"Norte",AP:"Norte",AM:"Norte",PA:"Norte",RO:"Norte",RR:"Norte",TO:"Norte",
  AL:"Nordeste",BA:"Nordeste",CE:"Nordeste",MA:"Nordeste",PB:"Nordeste",
  PE:"Nordeste",PI:"Nordeste",RN:"Nordeste",SE:"Nordeste",
  DF:"Centro-Oeste",GO:"Centro-Oeste",MS:"Centro-Oeste",MT:"Centro-Oeste",
  ES:"Sudeste",MG:"Sudeste",RJ:"Sudeste",SP:"Sudeste",
  PR:"Sul",RS:"Sul",SC:"Sul",
};

interface Usuario {
  id: string; nome: string | null; plano: string; role: string;
  xp_total: number; sequencia: number; estado: string | null; criado_em: string;
}
interface Material {
  id: string; titulo: string; tipo: string; url: string;
  vestibular: string | null; materia: string | null; criado_em: string;
}

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

  useEffect(() => {
    if (!profile) return;
    if ((profile as any).role !== "admin") { navigate("/"); return; }
    carregarTudo();
  }, [profile]);

  async function carregarTudo() {
    setLoading(true);
    const [{ data: profs }, { data: mats }] = await Promise.all([
      supabase.from("profiles").select("id,nome,plano,role,xp_total,sequencia,estado,criado_em").order("xp_total", { ascending: false }),
      supabase.from("materiais").select("*").order("criado_em", { ascending: false }),
    ]);
    if (profs) setUsuarios(profs);
    if (mats) setMateriais(mats);
    setLoading(false);
  }

  // Métricas calculadas
  const total = usuarios.length;
  const assinantes = usuarios.filter(u => u.plano && u.plano !== "gratis").length;
  const ativos = usuarios.filter(u => u.xp_total > 0).length;
  const xpTotal = usuarios.reduce((acc, u) => acc + (u.xp_total ?? 0), 0);
  const xpMedio = total ? Math.floor(xpTotal / total) : 0;
  const conversao = total ? Math.round(assinantes / total * 100) : 0;

  // Rankings
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
  async function deletarMaterial(id: string) { await supabase.from("materiais").delete().eq("id", id); setMateriais(p => p.filter(m => m.id !== id)); }

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

        {/* VISÃO GERAL */}
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

        {/* MATERIAIS */}
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
            <p style={{ fontSize:11,fontWeight:700,color:CORES.sub,textTransform:"uppercase",margin:"0 0 8px" }}>Cadastrados ({materiais.length})</p>
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

        {/* QUESTÕES */}
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

        {/* USUÁRIOS */}
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
                      {["aluno","professor","admin"].map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RANKING */}
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
      </div>
    </div>
  );
}
