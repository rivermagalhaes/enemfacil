// src/pages/auth/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { CORES } from "@/styles/theme";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [sucesso, setSucesso] = useState(false);
  const [codigoConvite, setCodigoConvite] = useState("");

  async function handleSubmit() {
    if (!email || !senha) { setErro("Preencha todos os campos."); return; }
    setLoading(true); setErro(null);

    if (modo === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) { setErro("Email ou senha incorretos."); setLoading(false); return; }
      navigate("/");
    } else {
      // Detecta e-mail institucional .edu.br
      const isEduBr = email.toLowerCase().endsWith(".edu.br");

      // Valida código de convite se não for .edu.br
      let roleDefinido: string = "student";
      if (isEduBr) {
        roleDefinido = "professor";
      } else if (codigoConvite.trim()) {
        const { data: convite } = await supabase
          .from("codigos_convite")
          .select("id, usado")
          .eq("codigo", codigoConvite.trim().toUpperCase())
          .eq("usado", false)
          .single();
        if (!convite) {
          setErro("Código de convite inválido ou já utilizado.");
          setLoading(false);
          return;
        }
        roleDefinido = "professor";
        // Marca código como usado
        await supabase.from("codigos_convite").update({ usado: true, usado_em: new Date().toISOString() }).eq("id", convite.id);
      }

      const { data: authData, error } = await supabase.auth.signUp({ email, password: senha });
      if (error) { setErro("Erro ao criar conta. Tente outro email."); setLoading(false); return; }

      // Atualiza role no profile se for professor
      if (roleDefinido === "professor" && authData.user) {
        await supabase.from("profiles").update({ role: "professor" }).eq("id", authData.user.id);
      }

      setSucesso(true);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: CORES.bg }}>
      {/* Header visual */}
      <div style={{
        background: `linear-gradient(135deg, ${CORES.bgDark} 0%, #0A1628 60%, #0D1F3C 100%)`,
        padding: "48px 24px 40px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        {/* Efeito de fundo */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 80%, ${CORES.primary}30 0%, transparent 60%)`, pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          {/* Logo */}
          <div style={{ width: 72, height: 72, borderRadius: 20, background: CORES.primary, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 36, boxShadow: `0 8px 32px ${CORES.primary}60` }}>
            🎯
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
            ENEM<span style={{ color: CORES.primary }}>fácil</span>
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0 }}>
            Sua aprovação começa aqui ⚡
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div style={{ flex: 1, padding: "24px 20px 32px", display: "flex", flexDirection: "column", maxWidth: 440, margin: "0 auto", width: "100%" }}>

        {sucesso ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ fontSize: 48, margin: "0 0 16px" }}>✅</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: CORES.text, margin: "0 0 8px" }}>Conta criada!</p>
            <p style={{ fontSize: 14, color: CORES.textSub, margin: "0 0 24px" }}>Verifique seu email para ativar a conta.</p>
            <button onClick={() => setModo("login")} style={{ padding: "12px 32px", background: CORES.primary, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Fazer login →
            </button>
          </div>
        ) : (
          <>
            {/* Toggle login/cadastro */}
            <div style={{ display: "flex", background: "#fff", borderRadius: 12, padding: 4, marginBottom: 24, border: `1px solid ${CORES.border}` }}>
              <button onClick={() => setModo("login")} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: modo === "login" ? CORES.primary : "transparent", color: modo === "login" ? "#fff" : CORES.textSub, transition: "all 0.2s" }}>
                Entrar
              </button>
              <button onClick={() => setModo("cadastro")} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: modo === "cadastro" ? CORES.primary : "transparent", color: modo === "cadastro" ? "#fff" : CORES.textSub, transition: "all 0.2s" }}>
                Criar conta
              </button>
            </div>

            {erro && (
              <div style={{ background: "#FFF1F1", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: CORES.error }}>
                {erro}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: CORES.textSub, display: "block", marginBottom: 6 }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${CORES.border}`, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", color: CORES.text }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: CORES.textSub, display: "block", marginBottom: 6 }}>Senha</label>
                <input
                  type="password" value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${CORES.border}`, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", color: CORES.text }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>

              {modo === "cadastro" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: CORES.textSub, display: "block", marginBottom: 6 }}>
                    Código de convite <span style={{ fontWeight: 400, color: CORES.textSub }}>(opcional — para professores)</span>
                  </label>
                  <input
                    type="text" value={codigoConvite} onChange={e => setCodigoConvite(e.target.value.toUpperCase())}
                    placeholder="Ex: PROF2026"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${CORES.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" as const, background: "#fff", color: CORES.text, letterSpacing: "0.1em", fontWeight: 600 }}
                  />
                  <p style={{ fontSize: 11, color: CORES.textSub, margin: "4px 0 0" }}>
                    Ou use seu e-mail <strong>.edu.br</strong> para acesso automático como professor
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit} disabled={loading}
              style={{ width: "100%", padding: "13px 0", background: loading ? "#ccc" : CORES.primary, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginBottom: 12, boxShadow: loading ? "none" : `0 4px 16px ${CORES.primary}40` }}
            >
              {loading ? "Aguarde..." : modo === "login" ? "Entrar →" : "Criar conta →"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: CORES.border }} />
              <span style={{ fontSize: 12, color: CORES.textSub }}>ou</span>
              <div style={{ flex: 1, height: 1, background: CORES.border }} />
            </div>

            <button onClick={handleGoogle} style={{ width: "100%", padding: "12px 0", background: "#fff", color: CORES.text, border: `1.5px solid ${CORES.border}`, borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continuar com Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}
