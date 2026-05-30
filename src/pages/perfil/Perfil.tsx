// src/pages/perfil/Perfil.tsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { supabase } from "@/lib/supabaseClient";
import { AREAS, CORES, LIMITES_DIA } from "@/styles/theme";
import CertificadosAdmin from "@/components/admin/CertificadosAdmin";


const FUNCIONALIDADES = [
  { id: "quiz",     emoji: "🧠", titulo: "Quiz por área",        desc: "Questões do ENEM por disciplina",     acao: "/quiz",     limitado: true  },
  { id: "simulado", emoji: "📝", titulo: "Simulado completo",    desc: "45 questões com cronômetro",          acao: "/simulado", limitado: true  },
  { id: "agente",   emoji: "🤖", titulo: "Agente de IA",         desc: "Tire dúvidas sobre qualquer matéria", acao: "/agente",   limitado: true  },
  { id: "redacao",  emoji: "✏️", titulo: "Redação",              desc: "Pratique a dissertação argumentativa",acao: "/redacao",  limitado: false },
];

const PLANO_CONFIG: Record<string, { label: string; cor: string; bg: string; emoji: string }> = {
  gratis:    { label: "Gratuito",  cor: "#64748B", bg: "#F1F5F9", emoji: "🆓" },
  estudante: { label: "Estudante", cor: "#0057FF", bg: "#E6EEFF", emoji: "⚡" },
  free:    { label: "Gratuito", cor: "#64748B", bg: "#F1F5F9", emoji: "🆓" },
  pro:     { label: "Pro",      cor: "#0057FF", bg: "#E6EEFF", emoji: "⚡" },
  premium: { label: "Premium",  cor: "#7C3AED", bg: "#F3F0FF", emoji: "⭐" },
  ouro:    { label: "Ouro",     cor: "#B45309", bg: "#FFF8E6", emoji: "👑" },
};

function useUso(userId: string | undefined, plano: string, funcId: string) {
  const limite = LIMITES_DIA[plano] ?? 3;
  const [usosHoje, setUsosHoje]     = useState(0);
  const [travadoAte, setTravadoAte] = useState<Date | null>(null);
  const [_travaNivel, setTravaNivel] = useState(0);
  const [loading, setLoading]       = useState(true);

  const carregar = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
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

  return { usosHoje, limite, travadoAte, loading };
}

function BadgeUso({ usosHoje, limite, travadoAte, loading }: { usosHoje: number; limite: number; travadoAte: Date | null; loading: boolean }) {
  if (loading) return <span style={{ fontSize: 10, color: "#bbb" }}>...</span>;
  if (travadoAte && travadoAte > new Date()) {
    const dias = Math.ceil((travadoAte.getTime() - Date.now()) / 86400000);
    return <span style={{ fontSize: 10, fontWeight: 700, background: "#fee2e2", color: "#b91c1c", borderRadius: 99, padding: "2px 8px" }}>🔒 {dias}d</span>;
  }
  if (limite >= Infinity) return <span style={{ fontSize: 10, fontWeight: 700, background: "#FFF8E6", color: "#B45309", borderRadius: 99, padding: "2px 8px" }}>👑 ilimitado</span>;
  const restantes = Math.max(0, limite - usosHoje);
  const cor = restantes === 0 ? "#b91c1c" : restantes === 1 ? "#d97706" : "#15803d";
  const bg  = restantes === 0 ? "#fee2e2" : restantes === 1 ? "#fef3c7" : "#dcfce7";
  return <span style={{ fontSize: 10, fontWeight: 700, background: bg, color: cor, borderRadius: 99, padding: "2px 8px" }}>{restantes}/{limite} hoje</span>;
}

function FuncItem({ f, plano, userId, onClick }: { f: typeof FUNCIONALIDADES[0]; plano: string; userId: string | undefined; onClick: (f: typeof FUNCIONALIDADES[0]) => void }) {
  const { usosHoje, limite, travadoAte, loading } = useUso(userId, plano, f.id);
  const travado = travadoAte && travadoAte > new Date();
  const bloqueado = travado || (!loading && limite < Infinity && usosHoje >= limite && !travado);
  return (
    <button onClick={() => onClick(f)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: bloqueado ? "#fff8f8" : CORES.bgCard, border: bloqueado ? "1px solid #fca5a5" : `1px solid ${CORES.border}`, cursor: "pointer", textAlign: "left", width: "100%", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: bloqueado ? "#fee2e2" : CORES.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
        {bloqueado ? "🔒" : f.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 1px", color: bloqueado ? "#b91c1c" : CORES.text }}>{f.titulo}</p>
        <p style={{ fontSize: 11, color: CORES.textSub, margin: 0 }}>{f.desc}</p>
      </div>
      {f.limitado
        ? <BadgeUso usosHoje={usosHoje} limite={limite} travadoAte={travadoAte} loading={loading} />
        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={CORES.textSub} strokeWidth="1.5"><path d="M6 4l4 4-4 4"/></svg>
      }
    </button>
  );
}

export default function Perfil() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [abaAtivo, setAbaAtivo] = useState<string | null>(null);

  if (!profile) return null;

  const plano = String((profile as any).plan ?? (profile as any).plano ?? "free");
  const config = PLANO_CONFIG[plano] ?? PLANO_CONFIG.free;
  const nome = (profile as any).nome ?? (profile as any).username ?? "Estudante";
  const xp = (profile as any).xp_total ?? 0;
  const sequencia = (profile as any).sequencia ?? 0;
  const role = (profile as any).role ?? "student";

  // ── Tela especial para admin e professor ──────────────────
  if (role === "admin" || role === "professor" || role === "super_admin" || role === "teacher") {
    const isCoordenador = role === "super_admin";
    const isAdmin = role === "admin";
    const corRole = isCoordenador ? "#7C3AED" : isAdmin ? "#ef4444" : "#0A7C4B";
    const bgRole  = isCoordenador ? "#F3F0FF" : isAdmin ? "#FFF1F1" : "#EDFAF3";
    return (
      <div style={{ display:"flex",flexDirection:"column",minHeight:"100dvh",background:CORES.bg }}>
        <div style={{ background:`linear-gradient(135deg,${isCoordenador?"#1a0a2e, #3b0764":isAdmin?"#1a0a0a, #3a0a0a":"#0a1a0f, #0a3a1f"})`,padding:"16px 16px 20px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            {abaAtivo && (
              <button onClick={() => setAbaAtivo(null)} style={{ background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:18,cursor:"pointer",lineHeight:1 }}>←</button>
            )}
            <div style={{ width:52,height:52,borderRadius:"50%",background:corRole,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff",border:"2px solid rgba(255,255,255,0.2)" }}>
              {nome[0].toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:16,fontWeight:700,color:"#fff",margin:"0 0 4px" }}>{abaAtivo === "certificados" ? "🎓 Certificados" : nome}</p>
              <span style={{ fontSize:11,fontWeight:700,borderRadius:99,padding:"2px 12px",background:bgRole,color:corRole }}>
                {isCoordenador ? "🏆 Coordenador de Olimpíadas" : isAdmin ? "🛡️ Administrador" : "👨‍🏫 Professor"}
              </span>
            </div>
            {!abaAtivo && (
              <button onClick={() => navigate(isCoordenador ? "/coordenador" : isAdmin ? "/admin" : "/professor")} style={{ padding:"8px 14px",background:corRole,color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer" }}>
                {isCoordenador ? "🏆 Painel" : isAdmin ? "🛡️ Painel" : "📁 Painel"}
              </button>
            )}
          </div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 90px" }}>

          {abaAtivo === "certificados" ? (
            <CertificadosAdmin />
          ) : (
            <>
              {/* Atalhos do painel */}
              <p style={{ fontSize:11,fontWeight:700,color:CORES.textSub,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px" }}>Atalhos</p>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
                {(isCoordenador ? [
                  { emoji:"🏆", label:"Olimpíadas",  path:"/coordenador", cor:"#7C3AED" },
                  { emoji:"📖", label:"Conteúdo",   path:"/coordenador", cor:"#0057FF" },
                  { emoji:"📝", label:"Questões",   path:"/coordenador", cor:"#0A7C4B" },
                  { emoji:"🏅", label:"Resultados", path:"/coordenador", cor:"#f59e0b" },
                ] : isAdmin ? [
                  { emoji:"📁", label:"Materiais",  path:"/admin",       cor:"#0057FF" },
                  { emoji:"📝", label:"Questões",   path:"/admin",       cor:"#7C3AED" },
                  { emoji:"👥", label:"Usuários",   path:"/admin",       cor:"#22c55e" },
                  { emoji:"🏆", label:"Rankings",   path:"/admin",       cor:"#f59e0b" },
                  { emoji:"🎓", label:"Certificados", path:"certificados", cor:"#0A7C4B", inline: true },
                ] : [
                  { emoji:"📁", label:"Materiais",  path:"/professor", cor:"#0A7C4B" },
                  { emoji:"📝", label:"Questões",   path:"/professor", cor:"#0057FF" },
                ]).map((item: any, i: number) => (
                  <button key={i} onClick={() => item.inline ? setAbaAtivo(item.path) : navigate(item.path)} style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"16px 0",borderRadius:14,background:CORES.bgCard,border:`1.5px solid ${item.cor}22`,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                    <span style={{ fontSize:24 }}>{item.emoji}</span>
                    <span style={{ fontSize:12,fontWeight:600,color:item.cor }}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Sair */}
              <button onClick={() => signOut().then(() => navigate("/login"))} style={{ width:"100%",padding:"11px 0",border:`1px solid ${CORES.border}`,background:CORES.bgCard,borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",color:"#EF4444" }}>
                Sair da conta
              </button>
            </>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      <div style={{ background: `linear-gradient(135deg, ${CORES.bgDark}, #0D1F3C)`, padding: "16px 16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: CORES.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", border: "2px solid rgba(255,255,255,0.2)" }}>
            {nome[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{nome}</p>
            <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "2px 10px", background: config.bg, color: config.cor }}>{config.emoji} {config.label}</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>

        {/* Métricas */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, background: CORES.bgCard, borderRadius: 12, padding: "12px 14px", border: `1px solid ${CORES.border}`, textAlign: "center" }}>
            <p style={{ fontSize: 11, color: CORES.textSub, margin: "0 0 4px" }}>XP Total</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: CORES.primary, margin: 0 }}>⚡ {xp.toLocaleString("pt-BR")}</p>
          </div>
          <div style={{ flex: 1, background: CORES.bgCard, borderRadius: 12, padding: "12px 14px", border: `1px solid ${CORES.border}`, textAlign: "center" }}>
            <p style={{ fontSize: 11, color: CORES.textSub, margin: "0 0 4px" }}>Sequência</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b", margin: 0 }}>🔥 {sequencia} dias</p>
          </div>
        </div>

        {/* Limites */}
        <div style={{ background: "#f0f6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: CORES.primary, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Usos diários por plano</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[{ label: "🆓 Gratuito", usos: "3/dia" }, { label: "⚡ Pro", usos: "10/dia" }, { label: "⭐ Premium", usos: "20/dia" }, { label: "👑 Ouro", usos: "∞" }].map(p => (
              <div key={p.label} style={{ background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 11, display: "flex", gap: 4, alignItems: "center", border: "0.5px solid #bfdbfe" }}>
                <span>{p.label}</span><span style={{ fontWeight: 700, color: CORES.primary }}>{p.usos}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Áreas */}
        <p style={{ fontSize: 11, fontWeight: 700, color: CORES.textSub, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Áreas do ENEM</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {AREAS.map(area => (
            <button key={area.id} onClick={() => navigate(`/quiz/${area.id}`)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: CORES.bgCard, border: `1px solid ${area.cor}22`, cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: area.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{area.emoji}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: area.cor, margin: "0 0 1px" }}>{area.label}</p>
                <p style={{ fontSize: 11, color: CORES.textSub, margin: 0 }}>{area.sublabel}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={area.cor} strokeWidth="1.5"><path d="M6 4l4 4-4 4"/></svg>
            </button>
          ))}
        </div>

        {/* Ferramentas */}
        <p style={{ fontSize: 11, fontWeight: 700, color: CORES.textSub, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Ferramentas</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {FUNCIONALIDADES.map(f => (
            <FuncItem key={f.id} f={f} plano={plano} userId={profile.id} onClick={(f) => navigate(f.acao)} />
          ))}
        </div>

        {/* Upgrade */}
        {["free", "gratis"].includes(plano) && (
          <div style={{ background: `linear-gradient(135deg, ${CORES.bgDark}, #0D1F3C)`, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${CORES.primary}33` }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>⚡ Desbloqueie tudo</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "0 0 12px" }}>Simulados ilimitados, agente de IA e muito mais.</p>
            <button onClick={() => navigate("/assinatura")} style={{ padding: "9px 20px", background: CORES.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Ver planos →</button>
          </div>
        )}

        {!["free", "gratis"].includes(plano) && (
          <button onClick={() => navigate("/assinatura")} style={{ width: "100%", padding: "11px 0", marginBottom: 8, border: `1px solid ${CORES.border}`, background: CORES.bgCard, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", color: CORES.textSub }}>Gerenciar assinatura</button>
        )}
        <button onClick={() => signOut().then(() => navigate("/login"))} style={{ width: "100%", padding: "11px 0", border: `1px solid ${CORES.border}`, background: CORES.bgCard, borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#EF4444" }}>Sair da conta</button>
      </div>
      <BottomNav />
    </div>
  );
}
