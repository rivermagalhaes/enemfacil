// src/pages/cadastro/InscricaoOlimpiada.tsx
// Rota pública: /inscricao/:sigla
// Aluno lê o QR Code → faz cadastro ou login → é inscrito automaticamente

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type Aba = "criar" | "entrar";

const COR = "#1B3A1B";
const DOURADO = "#C9A84C";

export default function InscricaoOlimpiada() {
  const { sigla = "OQCMTO" } = useParams<{ sigla: string }>();
  const navigate = useNavigate();

  const [evento, setEvento] = useState<any>(null);
  const [aba, setAba] = useState<Aba>("criar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  // Carrega dados do evento pelo sigla
  useEffect(() => {
    supabase
      .from("eventos_certificaveis")
      .select("id, nome, sigla, ano, edicao, disciplina")
      .eq("sigla", sigla.toUpperCase())
      .single()
      .then(({ data }) => setEvento(data));
  }, [sigla]);

  // Se já está logado, inscreve direto e redireciona
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && evento) {
        await inscrever(session.user.id);
      }
    });
  }, [evento]);

  async function inscrever(userId: string) {
    if (!evento) return;
    await supabase.from("inscricoes_olimpiada").upsert(
      { user_id: userId, evento_id: evento.id, origem: "qrcode" },
      { onConflict: "user_id,evento_id" }
    );
    setSucesso(true);
    setTimeout(() => navigate(`/olimpiada/${sigla.toUpperCase()}`), 2500);
  }

  async function handleCriar() {
    setErro("");
    if (!nome.trim()) { setErro("Informe seu nome."); return; }
    if (!email || !senha) { setErro("Preencha email e senha."); return; }
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    if (senha.length < 6) { setErro("Senha mínima: 6 caracteres."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { full_name: nome.trim() } },
    });
    if (error) { setErro(error.message); setLoading(false); return; }
    if (data.user) await inscrever(data.user.id);
    setLoading(false);
  }

  async function handleEntrar() {
    setErro("");
    if (!email || !senha) { setErro("Preencha email e senha."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setErro("Email ou senha incorretos."); setLoading(false); return; }
    if (data.user) await inscrever(data.user.id);
    setLoading(false);
  }

  async function handleGoogle() {
    // Salva sigla no localStorage para inscrever após o redirect OAuth
    localStorage.setItem("inscricao_pendente", sigla.toUpperCase());
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + `/inscricao/${sigla}` },
    });
  }

  if (sucesso) {
    return (
      <div style={{ minHeight:"100vh", background:"#f0f4f0", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ background:"#fff", borderRadius:24, padding:40, textAlign:"center", maxWidth:360, width:"100%", boxShadow:"0 8px 40px rgba(0,0,0,0.12)" }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🎖️</div>
          <p style={{ fontSize:22, fontWeight:800, color:COR, margin:"0 0 8px" }}>Inscrição confirmada!</p>
          <p style={{ fontSize:14, color:"#555", margin:"0 0 20px", lineHeight:1.6 }}>
            Você está inscrito na <strong>{evento?.nome}</strong>.<br/>
            Redirecionando para a olimpíada...
          </p>
          <div style={{ width:"100%", height:6, background:"#e5e7eb", borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", background:DOURADO, borderRadius:99, animation:"progress 2.5s linear forwards" }} />
          </div>
          <style>{`@keyframes progress { from { width:0% } to { width:100% } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f0", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:400 }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, ${COR}, #2d5a2d)`, borderRadius:"20px 20px 0 0", padding:"28px 24px 24px", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🎖️</div>
          <p style={{ fontSize:11, color:DOURADO, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", margin:"0 0 4px" }}>
            Inscrição via QR Code
          </p>
          <p style={{ fontSize:18, fontWeight:800, color:"#fff", margin:"0 0 6px", lineHeight:1.3 }}>
            {evento?.nome ?? "Carregando..."}
          </p>
          {evento && (
            <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginTop:10 }}>
              {[
                { emoji:"📅", label: evento.edicao },
                { emoji:"🧪", label: evento.disciplina },
                { emoji:"📅", label:"02/10/2025" },
              ].map((item, i) => (
                <span key={i} style={{ background:"rgba(255,255,255,0.15)", borderRadius:20, padding:"3px 10px", fontSize:11, color:"#fff", fontWeight:600 }}>
                  {item.emoji} {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ background:"#fff", borderRadius:"0 0 20px 20px", padding:24, boxShadow:"0 8px 30px rgba(0,0,0,0.10)" }}>

          {/* Tabs */}
          <div style={{ display:"flex", background:"#f1f5f9", borderRadius:10, padding:3, marginBottom:20 }}>
            {(["criar","entrar"] as Aba[]).map(t => (
              <button key={t} onClick={() => { setAba(t); setErro(""); }}
                style={{ flex:1, padding:"9px 0", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer",
                  background: aba === t ? COR : "transparent",
                  color: aba === t ? "#fff" : "#64748b",
                  transition:"all 0.2s" }}>
                {t === "criar" ? "Criar conta" : "Já tenho conta"}
              </button>
            ))}
          </div>

          {aba === "criar" && (
            <>
              <label style={{ fontSize:12, color:"#475569", fontWeight:600, display:"block", marginBottom:4 }}>Nome completo</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome"
                style={{ width:"100%", padding:"11px 13px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, marginBottom:12, outline:"none", boxSizing:"border-box" }} />
            </>
          )}

          <label style={{ fontSize:12, color:"#475569", fontWeight:600, display:"block", marginBottom:4 }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu@email.com"
            style={{ width:"100%", padding:"11px 13px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, marginBottom:12, outline:"none", boxSizing:"border-box" }} />

          <label style={{ fontSize:12, color:"#475569", fontWeight:600, display:"block", marginBottom:4 }}>Senha</label>
          <input value={senha} onChange={e => setSenha(e.target.value)} type="password" placeholder="••••••••"
            style={{ width:"100%", padding:"11px 13px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, marginBottom:12, outline:"none", boxSizing:"border-box" }} />

          {aba === "criar" && (
            <>
              <label style={{ fontSize:12, color:"#475569", fontWeight:600, display:"block", marginBottom:4 }}>Confirmar senha</label>
              <input value={confirmar} onChange={e => setConfirmar(e.target.value)} type="password" placeholder="Repita a senha"
                style={{ width:"100%", padding:"11px 13px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, marginBottom:12, outline:"none", boxSizing:"border-box" }} />
            </>
          )}

          {erro && <p style={{ color:"#dc2626", fontSize:13, marginBottom:10, background:"#fef2f2", borderRadius:8, padding:"8px 12px" }}>{erro}</p>}

          <button onClick={aba === "criar" ? handleCriar : handleEntrar} disabled={loading}
            style={{ width:"100%", padding:13, background: loading ? "#9ca3af" : COR, color:"#fff", border:"none", borderRadius:10,
              fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", marginBottom:12 }}>
            {loading ? "Aguarde..." : aba === "criar" ? "Criar conta e me inscrever →" : "Entrar e me inscrever →"}
          </button>

          <div style={{ textAlign:"center", fontSize:12, color:"#94a3b8", marginBottom:12 }}>ou</div>

          <button onClick={handleGoogle}
            style={{ width:"100%", padding:11, background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:13,
              color:"#334155", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <svg width="16" height="16" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continuar com Google
          </button>

          <p style={{ fontSize:11, color:"#94a3b8", textAlign:"center", marginTop:16, lineHeight:1.5 }}>
            Ao se inscrever você concorda com os termos da olimpíada.<br/>
            Sua inscrição é gratuita.
          </p>
        </div>
      </div>
    </div>
  );
}
