// src/pages/perfil/Perfil.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import MetricCard from "@/components/ui/MetricCard";
import StreakWidget from "@/components/ui/StreakWidget";
import ModalPeticao from "@/components/ui/ModalPeticao";
import { supabase } from "@/lib/supabaseClient";

const LOGO_STYLE: React.CSSProperties = {
  height: 36, objectFit: "contain",
  background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "2px 4px",
};

const PLANO_CONFIG: Record<string, { label: string; cor: string; bg: string; emoji: string }> = {
  gratis:      { label: "Gratuito",  cor: "#888",    bg: "#f4f6fb", emoji: "🆓" },
  cidadao:     { label: "Estudante", cor: "#2563eb", bg: "#E6F1FB", emoji: "📚" },
  concurseiro: { label: "Premium",   cor: "#7c3aed", bg: "#EEEDFE", emoji: "⭐" },
  ouro:        { label: "Ouro",      cor: "#b45309", bg: "#FFF8E6", emoji: "👑" },
  cursinho:    { label: "Cursinho",  cor: "#0f6e56", bg: "#E1F5EE", emoji: "🎓" },
  premium:     { label: "Premium",   cor: "#7c3aed", bg: "#EEEDFE", emoji: "⭐" },
};

// Limites diários por plano
const LIMITES_DIA: Record<string, number> = {
  gratis: 1, cidadao: 2, concurseiro: 4, premium: 4, cursinho: 4, ouro: Infinity,
};

// Dias de trava progressiva: nível 1 = 3 dias, 2 = 21 dias, 3 = 90 dias
const TRAVA_DIAS = [3, 21, 90];

const FUNCIONALIDADES_LIMITADAS = ["peticao", "mapa_visual", "mapa_mental", "mapa_educacional"];

const FUNCIONALIDADES = [
  { id: "artigos",          emoji: "📖", titulo: "Artigos simplificados",   desc: "CF/88, CDC e ECA em linguagem fácil",                       planos: ["cidadao","concurseiro","ouro","cursinho","premium"], acao: "/cf88" },
  { id: "quiz",             emoji: "🧠", titulo: "Quiz ilimitado",           desc: "Questões CESPE e FCC por artigo",                           planos: ["cidadao","concurseiro","ouro","cursinho","premium"], acao: "/" },
  { id: "casos",            emoji: "⚖️", titulo: "Casos do dia a dia",       desc: "Situações reais explicadas juridicamente",                  planos: ["cidadao","concurseiro","ouro","cursinho","premium"], acao: "/casos" },
  { id: "simulados",        emoji: "📝", titulo: "Simulados completos",       desc: "Por concurso com cronômetro e ranking",                     planos: ["concurseiro","ouro","cursinho","premium"],            acao: "/concursos" },
  { id: "ranking",          emoji: "🏆", titulo: "Ranking entre usuários",    desc: "Compare seu desempenho com outros",                         planos: ["concurseiro","ouro","cursinho","premium"],            acao: "/cf88" },
  { id: "jurisprudencia",   emoji: "🏛️", titulo: "Jurisprudências por artigo",desc: "STF, STJ e mais por artigo estudado",                      planos: ["concurseiro","ouro","cursinho","premium"],            acao: "/cf88" },
  { id: "mapa_visual",      emoji: "🌳", titulo: "Mapa Mental Visual",        desc: "Árvore interativa de artigos e jurisprudências",            planos: ["gratis","cidadao","concurseiro","ouro","cursinho","premium"], acao: "/mapa-mental-visual",    destaque: true, limitado: true },
  { id: "mapa_educacional", emoji: "🎓", titulo: "Mapa Mental de Estudo",     desc: "Organize qualquer tema jurídico para provas",               planos: ["gratis","cidadao","concurseiro","ouro","cursinho","premium"], acao: "/mapa-mental-educacional",destaque: true, limitado: true },
  { id: "mapa_mental",      emoji: "🗺️", titulo: "Mapa Mental Jurídico",      desc: "IA organiza o raciocínio do caso penal",                   planos: ["gratis","cidadao","concurseiro","ouro","cursinho","premium"], acao: "/mapa-mental",           destaque: true, limitado: true },
  { id: "peticao",          emoji: "📄", titulo: "Gerador de petições",       desc: "Monte petições com artigos e jurisprudências",              planos: ["gratis","cidadao","concurseiro","ouro","cursinho","premium"], acao: "peticao",                destaque: true, limitado: true },
];

const PROXIMO_PLANO: Record<string, string | null> = {
  gratis: "cidadao", cidadao: "concurseiro", concurseiro: "ouro", ouro: null, premium: "ouro", cursinho: "ouro",
};

// ── Badge de uso ──────────────────────────────────────────────
function BadgeUso({ usosHoje, limite, travadoAte, loading, plano }: {
  usosHoje: number; limite: number; travadoAte: Date | null; loading: boolean; plano: string;
}) {
  if (loading) return <span style={{ fontSize: 10, color: "#bbb" }}>...</span>;

  if (travadoAte && travadoAte > new Date()) {
    const diasRestantes = Math.ceil((travadoAte.getTime() - Date.now()) / 86400000);
    const label = diasRestantes >= 30
      ? `${Math.ceil(diasRestantes / 30)}m bloqueado`
      : diasRestantes >= 7
      ? `${Math.ceil(diasRestantes / 7)}sem bloqueado`
      : `${diasRestantes}d bloqueado`;
    return (
      <span style={{ fontSize: 10, fontWeight: 700, background: "#fee2e2", color: "#b91c1c", borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>
        🔒 {label}
      </span>
    );
  }

  const restantes = Math.max(0, limite - usosHoje);

  if (limite >= 999) return (
    <span style={{ fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#b45309", borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>
      👑 ilimitado
    </span>
  );

  const cor = restantes === 0 ? "#b91c1c" : restantes === 1 ? "#d97706" : "#15803d";
  const bg  = restantes === 0 ? "#fee2e2" : restantes === 1 ? "#fef3c7" : "#dcfce7";
  const label = plano === "gratis" ? `amostra ${restantes}/${limite}` : `${restantes}/${limite} hoje`;

  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: bg, color: cor, borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>
      {label}
    </span>
  );
}

// ── Hook de uso ───────────────────────────────────────────────
function useUso(userId: string | undefined, plano: string, funcId: string) {
  const limite = plano === "ouro" ? 999 : (LIMITES_DIA[plano] ?? 0);
  const [usosHoje, setUsosHoje]   = useState(0);
  const [travadoAte, setTravadoAte] = useState<Date | null>(null);
  const [travaNivel, setTravaNivel] = useState(0);
  const [loading, setLoading]     = useState(true);

  const carregar = useCallback(async () => {
    if (!userId || !FUNCIONALIDADES_LIMITADAS.includes(funcId)) { setLoading(false); return; }
    const hoje = new Date().toISOString().split("T")[0];

    const [{ data: usos }, { data: trava }] = await Promise.all([
      supabase.from("uso_funcionalidades").select("id").eq("user_id", userId).eq("funcionalidade", funcId).eq("usado_em", hoje),
      supabase.from("travas_usuario").select("travado_ate, nivel").eq("user_id", userId).eq("funcionalidade", funcId).maybeSingle(),
    ]);

    setUsosHoje(usos?.length ?? 0);
    setTravadoAte(trava?.travado_ate ? new Date(trava.travado_ate) : null);
    setTravaNivel(trava?.nivel ?? 0);
    setLoading(false);
  }, [userId, funcId]);

  useEffect(() => { carregar(); }, [carregar]);

  const registrar = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    if (plano === "ouro") return true; // ilimitado

    const hoje = new Date().toISOString().split("T")[0];

    // checar trava
    if (travadoAte && travadoAte > new Date()) return false;

    // checar limite
    if (usosHoje >= limite) {
      const proximoNivel = Math.min(travaNivel + 1, TRAVA_DIAS.length);
      const dias = TRAVA_DIAS[proximoNivel - 1] ?? 90;
      const ate = new Date();
      ate.setDate(ate.getDate() + dias);
      await supabase.from("travas_usuario").upsert(
        { user_id: userId, funcionalidade: funcId, nivel: proximoNivel, travado_ate: ate.toISOString().split("T")[0] },
        { onConflict: "user_id,funcionalidade" }
      );
      await carregar();
      return false;
    }

    await supabase.from("uso_funcionalidades").insert({ user_id: userId, funcionalidade: funcId, usado_em: hoje });
    await carregar();
    return true;
  }, [userId, plano, funcId, usosHoje, limite, travadoAte, travaNivel, carregar]);

  return { usosHoje, limite, travadoAte, loading, registrar };
}

// ── Item de funcionalidade ────────────────────────────────────
function FuncItem({ f, plano, userId, onClick }: {
  f: typeof FUNCIONALIDADES[0]; plano: string; userId: string | undefined;
  onClick: (f: typeof FUNCIONALIDADES[0], podeUsar: boolean) => void;
}) {
  const { usosHoje, limite, travadoAte, loading, registrar } = useUso(userId, plano, f.id);
  const travado = travadoAte && travadoAte > new Date();
  const semUsos  = !loading && limite < 999 && usosHoje >= limite && !travado;
  const bloqueado = travado || semUsos;

  async function handleClick() {
    if (f.limitado) {
      // Mapas registram o uso internamente — só navega
      if (["mapa_visual", "mapa_educacional", "mapa_mental"].includes(f.id)) {
        onClick(f, true);
        return;
      }
      const ok = await registrar();
      onClick(f, ok);
    } else {
      onClick(f, true);
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "11px 14px", borderRadius: 10, cursor: "pointer",
        background: f.destaque
          ? bloqueado ? "#fff8f8" : "linear-gradient(135deg, #fffbeb, #fef3c7)"
          : "#fff",
        border: f.destaque
          ? bloqueado ? "1.5px solid #fca5a5" : "1.5px solid #f0c040"
          : "0.5px solid rgba(0,0,0,0.08)",
        textAlign: "left", width: "100%",
        opacity: bloqueado ? 0.85 : 1,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: f.destaque ? (bloqueado ? "#fee2e2" : "#FFF8E6") : "#f4f6fb",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        border: f.destaque ? (bloqueado ? "1px solid #fca5a5" : "1px solid #f0c04044") : "none",
      }}>
        {bloqueado ? "🔒" : f.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 1px", color: f.destaque ? (bloqueado ? "#b91c1c" : "#92400e") : "#1a1a1a" }}>
          {f.titulo}
        </p>
        <p style={{ fontSize: 11, color: bloqueado ? "#f87171" : "#888", margin: 0 }}>
          {bloqueado && travado ? `Desbloqueio: ${travadoAte!.toLocaleDateString("pt-BR")}` : f.desc}
        </p>
      </div>
      {f.limitado ? (
        <BadgeUso usosHoje={usosHoje} limite={limite} travadoAte={travadoAte} loading={loading} plano={plano} />
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={f.destaque ? "#b45309" : "#bbb"} strokeWidth="1.5">
          <path d="M6 4l4 4-4 4" />
        </svg>
      )}
    </button>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function Perfil() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [peticaoAberta, setPeticaoAberta] = useState(false);
  const [editandoEscritorio, setEditandoEscritorio] = useState(false);
  const [escritorio, setEscritorio] = useState({ nome: "", oab: "" });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const [bloqueioMsg, setBloqueioMsg] = useState<string | null>(null);

  // Carregar dados do escritório
  useEffect(() => {
    if (!profile) return;
    supabase.from("profiles").select("logo_url, nome_escritorio, oab").eq("id", profile.id).single()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
        if (data?.nome_escritorio || data?.oab) setEscritorio({ nome: data.nome_escritorio ?? "", oab: data.oab ?? "" });
      });
  }, [profile?.id]);

  async function uploadLogo(file: File) {
    if (!profile) return;
    setUploadando(true);
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/logo.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      await supabase.from("profiles").update({ logo_url: data.publicUrl }).eq("id", profile.id);
      setLogoUrl(data.publicUrl);
    }
    setUploadando(false);
  }

  async function salvarEscritorio() {
    if (!profile) return;
    await supabase.from("profiles").update({ nome_escritorio: escritorio.nome, oab: escritorio.oab }).eq("id", profile.id);
    setEditandoEscritorio(false);
  }

  async function removerLogo() {
    if (!profile) return;
    await supabase.from("profiles").update({ logo_url: null }).eq("id", profile.id);
    setLogoUrl(null);
  }

  if (!profile) return null;

  const plano = String(profile.plano ?? "gratis");
  const config = PLANO_CONFIG[plano] ?? PLANO_CONFIG.gratis;
  const proximoPlano = PROXIMO_PLANO[plano];
  const proximoConfig = proximoPlano ? PLANO_CONFIG[proximoPlano] : null;

  const funcAtivas     = FUNCIONALIDADES.filter(f => f.planos.includes(plano));
  const funcBloqueadas = FUNCIONALIDADES.filter(f => !f.planos.includes(plano));

  function handleFuncClick(f: typeof FUNCIONALIDADES[0], podeUsar: boolean) {
    if (!podeUsar) {
      setBloqueioMsg("Limite diário atingido. Aguarde o período de bloqueio ou faça upgrade de plano.");
      setTimeout(() => setBloqueioMsg(null), 4000);
      return;
    }
    if (f.acao === "peticao") setPeticaoAberta(true);
    else navigate(f.acao);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* Header */}
      <div style={{ background: "#1a3a6e", padding: "12px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: config.bg, border: `2px solid ${config.cor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: config.cor }}>
              {(profile.nome ?? "U")[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 3px" }}>{profile.nome ?? "Usuário"}</p>
              <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "2px 10px", background: plano === "ouro" ? "linear-gradient(90deg, #b45309, #d97706)" : config.bg, color: plano === "ouro" ? "#fff" : config.cor }}>
                {config.emoji} {config.label}
              </span>
            </div>
          </div>
          <img src="/logo.png" alt="CFfácil" style={LOGO_STYLE} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 24px" }}>

        {/* Toast de bloqueio */}
        {bloqueioMsg && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#b91c1c", fontWeight: 500 }}>
            🔒 {bloqueioMsg}
          </div>
        )}

        {/* Legenda dos limites */}
        <div style={{ background: "#f0f6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Usos diários por plano</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "🆓 Gratuito", usos: "1/dia" },
              { label: "📚 Estudante", usos: "2/dia" },
              { label: "⭐ Premium", usos: "4/dia" },
              { label: "👑 Ouro", usos: "∞" },
            ].map(p => (
              <div key={p.label} style={{ background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 11, display: "flex", gap: 4, alignItems: "center", border: "0.5px solid #bfdbfe" }}>
                <span>{p.label}</span>
                <span style={{ fontWeight: 700, color: "#1d4ed8" }}>{p.usos}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: "#6b7280", margin: "6px 0 0" }}>
            ⚠️ Ao ultrapassar o limite: bloqueio progressivo de 3 dias → 3 semanas → 3 meses
          </p>
        </div>

        {/* Streak */}
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
          <StreakWidget />
        </div>

        {/* Métricas */}
        <p style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Seu desempenho</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <MetricCard label="XP total" value={profile.xp_total.toLocaleString("pt-BR")} />
          <MetricCard label="Sequência" value={profile.sequencia} sub="dias seguidos" />
        </div>

        {/* Funcionalidades ativas */}
        {funcAtivas.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Seu plano inclui</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
              {funcAtivas.map(f => (
                <FuncItem key={f.id} f={f} plano={plano} userId={profile.id} onClick={handleFuncClick} />
              ))}
            </div>
          </>
        )}

        {/* Funcionalidades bloqueadas */}
        {funcBloqueadas.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Disponível em planos superiores</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
              {funcBloqueadas.map(f => (
                <div key={f.id} onClick={() => navigate("/assinatura")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, cursor: "pointer", background: "#fafafa", border: "0.5px solid rgba(0,0,0,0.06)", opacity: 0.7 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, filter: "grayscale(1)" }}>{f.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 1px", color: "#888" }}>{f.titulo}</p>
                    <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>{f.desc}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#f0f0f0", color: "#999", borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>
                    🔒 {f.planos.includes("ouro") ? "Ouro" : "Premium"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Upgrade banner */}
        {proximoPlano && proximoConfig && (
          <div style={{ background: proximoPlano === "ouro" ? "linear-gradient(135deg, #fffbeb, #fef3c7)" : "#E6F1FB", border: `1.5px solid ${proximoConfig.cor}33`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{proximoConfig.emoji}</span>
              <p style={{ fontSize: 14, fontWeight: 600, color: proximoConfig.cor, margin: 0 }}>Upgrade para {proximoConfig.label}</p>
            </div>
            <p style={{ fontSize: 12, color: "#555", margin: "0 0 12px", lineHeight: 1.5 }}>
              {proximoPlano === "ouro" ? "Petições e mapas mentais ilimitados, em PDF profissional." : proximoPlano === "concurseiro" ? "Simulados ilimitados, ranking e filtros por cargo e banca." : "Artigos, quizzes e casos do dia a dia sem limitações."}
            </p>
            <button onClick={() => navigate("/assinatura")} style={{ padding: "9px 20px", background: proximoPlano === "ouro" ? "linear-gradient(90deg, #b45309, #d97706)" : proximoConfig.cor, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Ver planos →
            </button>
          </div>
        )}

        {/* ── Dados do escritório (todos os planos) ── */}
        <div style={{ background: "#fffbeb", border: "1.5px solid #f0c040", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", margin: 0 }}>🏛️ Dados do escritório</p>
              <button
                onClick={() => editandoEscritorio ? salvarEscritorio() : setEditandoEscritorio(true)}
                style={{ fontSize: 12, fontWeight: 600, color: "#b45309", background: "none", border: "1px solid #f0c040", borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}
              >
                {editandoEscritorio ? "💾 Salvar" : "✏️ Editar"}
              </button>
            </div>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: 10, background: "#fff", border: "1px solid #f0c040", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {logoUrl
                  ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: 24 }}>🏛️</span>
                }
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  onClick={() => inputLogoRef.current?.click()}
                  disabled={uploadando}
                  style={{ fontSize: 12, fontWeight: 600, color: "#b45309", background: "#fff", border: "1px solid #f0c040", borderRadius: 8, padding: "6px 14px", cursor: uploadando ? "not-allowed" : "pointer", opacity: uploadando ? 0.7 : 1 }}
                >
                  {uploadando ? "Enviando..." : logoUrl ? "🔄 Trocar logo" : "📤 Enviar logo"}
                </button>
                {logoUrl && (
                  <button
                    onClick={removerLogo}
                    style={{ fontSize: 11, color: "#b91c1c", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                  >
                    🗑️ Remover logo
                  </button>
                )}
              </div>
              <input
                ref={inputLogoRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
            </div>

            {/* Campos nome e OAB */}
            {editandoEscritorio ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  placeholder="Nome do escritório"
                  value={escritorio.nome}
                  onChange={e => setEscritorio(s => ({ ...s, nome: e.target.value }))}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #f0c040", fontSize: 13, outline: "none", background: "#fff", width: "100%", boxSizing: "border-box" }}
                />
                <input
                  placeholder="Número OAB (ex: 12345/TO)"
                  value={escritorio.oab}
                  onChange={e => setEscritorio(s => ({ ...s, oab: e.target.value }))}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #f0c040", fontSize: 13, outline: "none", background: "#fff", width: "100%", boxSizing: "border-box" }}
                />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: escritorio.nome ? "#1a1a1a" : "#bbb" }}>
                  {escritorio.nome || "Nome do escritório não informado"}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: escritorio.oab ? "#888" : "#bbb" }}>
                  {escritorio.oab ? `OAB nº ${escritorio.oab}` : "OAB não informada"}
                </p>
              </div>
            )}
          </div>

        {(profile.role === "super_admin" || profile.role === "admin") && (
          <button onClick={() => navigate("/admin")} style={{ width: "100%", padding: "11px 0", marginBottom: 8, border: "0.5px solid #1a3a6e", background: "#f0f4ff", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#1a3a6e" }}>⚙️ Painel Admin</button>
        )}
        {(plano as string) !== "gratis" && (
          <button onClick={() => navigate("/assinatura")} style={{ width: "100%", padding: "11px 0", marginBottom: 8, border: "0.5px solid rgba(0,0,0,0.12)", background: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#555" }}>Gerenciar assinatura</button>
        )}
        <button onClick={() => signOut().then(() => navigate("/login"))} style={{ width: "100%", padding: "11px 0", border: "0.5px solid rgba(0,0,0,0.12)", background: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#A32D2D" }}>Sair da conta</button>
      </div>

      <BottomNav />
      <ModalPeticao isOpen={peticaoAberta} onClose={() => setPeticaoAberta(false)} />
    </div>
  );
}
