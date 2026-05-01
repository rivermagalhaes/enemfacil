// src/pages/auth/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const LOGO_STYLE: React.CSSProperties = {
  height: 36, objectFit: "contain",
  background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "2px 4px",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit() {
    setLoading(true); setErro(null);
    if (modo === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setErro("E-mail ou senha incorretos.");
      else navigate("/");
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha });
      if (error) setErro("Não foi possível criar a conta. Tente outro e-mail.");
      else setEnviado(true);
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoadingGoogle(true); setErro(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setErro("Não foi possível entrar com o Google."); setLoadingGoogle(false); }
  }

  if (enviado) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <img src="/logo.png" alt="CFfácil" style={{ height: 64, marginBottom: 16 }} />
        <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Confirme seu e-mail</p>
        <p style={{ fontSize: 13, color: "#666" }}>
          Enviamos um link de confirmação para <strong>{email}</strong>. Verifique sua caixa de entrada.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#1a3a6e", padding: "12px 16px 16px" }}>
        {/* Logo + título na mesma linha */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#fff", margin: "0 0 2px" }}>ConstituiçãoFácil</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>Direito que você entende</p>
          </div>
          <img src="/logo.png" alt="CFfácil" style={LOGO_STYLE} />
        </div>
      </div>

      <div style={{ padding: "28px 24px", flex: 1 }}>
        <div style={{ display: "flex", background: "#f4f6fb", borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
          {(["login", "cadastro"] as const).map((m) => (
            <button key={m} onClick={() => setModo(m)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
              background: modo === m ? "#fff" : "transparent",
              fontWeight: 500, fontSize: 13, cursor: "pointer",
              color: modo === m ? "#1a3a6e" : "#888",
            }}>
              {m === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.15)", fontSize: 14, outline: "none" }} />
          <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{ padding: "10px 14px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.15)", fontSize: 14, outline: "none" }} />
          {erro && <p style={{ fontSize: 12, color: "#A32D2D", margin: 0 }}>{erro}</p>}
          <button onClick={handleSubmit} disabled={loading || !email || !senha}
            style={{ padding: "12px 0", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
            <span style={{ fontSize: 12, color: "#aaa" }}>ou</span>
            <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
          </div>

          <button onClick={handleGoogleLogin} disabled={loadingGoogle}
            style={{ padding: "11px 0", background: "#fff", color: "#3c4043", border: "0.5px solid rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loadingGoogle ? "not-allowed" : "pointer", opacity: loadingGoogle ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            {loadingGoogle ? "Aguarde..." : "Continuar com Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
