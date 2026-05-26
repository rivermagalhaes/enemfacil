// src/pages/cadastro/CadastroConvite.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type Aba = "entrar" | "criar";

export default function CadastroConvite() {
  const [aba, setAba] = useState<Aba>("criar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  async function handleCriar() {
    setErro("");
    if (!email || !senha) return;
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    if (senha.length < 6) { setErro("A senha precisa ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: senha });
    if (error) setErro(error.message);
    else navigate("/");
    setLoading(false);
  }

  async function handleEntrar() {
    setErro("");
    if (!email || !senha) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro("Email ou senha incorretos.");
    else navigate("/");
    setLoading(false);
  }

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f0f2f5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" },
    wrap: { width: "100%", maxWidth: 420 },
    header: { background: "#0a0f1e", borderRadius: "0 0 24px 24px", padding: "2.5rem 1.5rem 2rem", textAlign: "center" },
    logoBox: { width: 72, height: 72, background: "#1d6ef5", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" },
    appName: { fontSize: 24, fontWeight: 500, color: "#fff", letterSpacing: -0.5 },
    span: { color: "#f5a623" },
    tagline: { fontSize: 13, color: "#8892a4", marginTop: 4 },
    body: { padding: "1.5rem", background: "#f0f2f5" },
    tabs: { display: "flex", background: "#fff", borderRadius: 12, padding: 4, marginBottom: "1.5rem", border: "0.5px solid #e2e8f0" },
    tabInactive: { flex: 1, padding: "10px", border: "none", background: "transparent", borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#64748b" },
    tabActive: { flex: 1, padding: "10px", border: "none", background: "#1d6ef5", borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#fff" },
    label: { display: "block", fontSize: 13, color: "#475569", marginBottom: 6, fontWeight: 500 },
    input: { width: "100%", padding: "12px 14px", border: "0.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, background: "#fff", color: "#0f172a", outline: "none", marginBottom: "1rem" },
    btnPrimary: { width: "100%", padding: 13, background: "#1d6ef5", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: "pointer", marginTop: 4 },
    divider: { textAlign: "center", fontSize: 13, color: "#94a3b8", margin: "1rem 0" },
    btnGoogle: { width: "100%", padding: 12, background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    erro: { color: "#dc2626", fontSize: 13, marginBottom: 8 },
  };

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  );

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/" },
    });
  }

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.header}>
          <div style={s.logoBox}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke="white" strokeWidth="2.5"/>
              <circle cx="20" cy="20" r="9" stroke="white" strokeWidth="2.5"/>
              <circle cx="20" cy="20" r="3" fill="white"/>
              <line x1="20" y1="4" x2="28" y2="8" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={s.appName}>ENEM<span style={s.span}>fácil</span></div>
          <div style={s.tagline}>Sua aprovação começa aqui ⚡</div>
        </div>

        <div style={s.body}>
          <div style={s.tabs}>
            <button style={aba === "entrar" ? s.tabActive : s.tabInactive} onClick={() => { setAba("entrar"); setErro(""); }}>Entrar</button>
            <button style={aba === "criar" ? s.tabActive : s.tabInactive} onClick={() => { setAba("criar"); setErro(""); }}>Criar conta</button>
          </div>

          <label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />

          <label style={s.label}>Senha</label>
          <input style={s.input} type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} />

          {aba === "criar" && (
            <>
              <label style={s.label}>Confirmar senha</label>
              <input style={s.input} type="password" placeholder="Repita a senha" value={confirmar} onChange={e => setConfirmar(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCriar()} />
            </>
          )}

          {erro && <p style={s.erro}>{erro}</p>}

          <button style={s.btnPrimary} disabled={loading} onClick={aba === "criar" ? handleCriar : handleEntrar}>
            {loading ? "Aguarde..." : aba === "criar" ? "Criar conta →" : "Entrar →"}
          </button>

          <div style={s.divider}>ou</div>

          <button style={s.btnGoogle} onClick={handleGoogle}>
            <GoogleIcon /> Continuar com Google
          </button>
        </div>
      </div>
    </div>
  );
}
