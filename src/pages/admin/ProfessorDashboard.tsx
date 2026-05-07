// src/pages/admin/ProfessorDashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

const CORES = { bg:"#F4F6FB",card:"#FFFFFF",primary:"#0057FF",text:"#1a1a2e",sub:"#64748B",border:"#E2E8F0" };
const ABAS = [
  { id:"materiais", label:"Meus Materiais", emoji:"📁" },
  { id:"questoes",  label:"Questões",       emoji:"📝" },
  { id:"salas",     label:"Salas Virtuais", emoji:"🏫" },
];

interface Material { id:string; titulo:string; tipo:string; url:string; vestibular:string|null; materia:string|null; }

export default function ProfessorDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState("materiais");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadando, setUploadando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState<{tipo:"ok"|"erro";texto:string}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ titulo:"", descricao:"", tipo:"pdf", vestibular:"ENEM", materia:"", topic:"" });

  useEffect(() => {
    if (!profile) return;
    const role = (profile as any).role;
    if (role !== "professor" && role !== "admin") { navigate("/"); return; }
    carregarMateriais();
  }, [profile]);

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

  async function deletarMaterial(id: string) { await supabase.from("materiais").delete().eq("id", id); setMateriais(p=>p.filter(m=>m.id!==id)); }

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh"}}><p>Carregando...</p></div>;

  return (
    <div style={{ minHeight:"100dvh",background:CORES.bg,fontFamily:"system-ui,sans-serif" }}>

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
      <div style={{ display:"flex",gap:4,padding:"12px 20px 0" }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={()=>setAba(a.id)} style={{ padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:aba===a.id?"#0A7C4B":CORES.card,color:aba===a.id?"#fff":CORES.sub }}>
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

        {/* SALAS VIRTUAIS */}
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
            <div style={{ background:CORES.card,borderRadius:14,padding:20,border:`1px solid ${CORES.border}`,marginBottom:16 }}>
              <p style={{ fontSize:15,fontWeight:700,margin:"0 0 6px" }}>📊 Importar Questões via Excel</p>
              <p style={{ fontSize:12,color:CORES.sub,margin:"0 0 16px",lineHeight:1.6 }}>Preencha o template e importe suas questões em massa.</p>
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
            <div style={{ background:"#FFF8E6",borderRadius:12,padding:"12px 14px",border:"1px solid #fcd34d" }}>
              <p style={{ fontSize:12,fontWeight:600,color:"#92400e",margin:"0 0 6px" }}>⚠️ Instruções</p>
              <p style={{ fontSize:12,color:"#78350f",margin:0,lineHeight:1.7 }}>
                • Obrigatórios: question, answer_index (0=A…4=E), explanation, vestibular, option_0 a option_3<br/>
                • Recomendados: topic, area, difficulty, ano<br/>
                • Não altere os cabeçalhos · Máximo 500 por importação
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
