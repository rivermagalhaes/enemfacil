// src/pages/home/Home.tsx
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

const VESTIBULARES = [
  { id: "ENEM",    nome: "ENEM",    emoji: "🎯", cor: "#0057FF", bg: "#E6EEFF",
    desc: "Exame Nacional do Ensino Médio", foco: "Linguagens · Matemática · Humanas · Natureza",
    dificuldade: "⭐⭐⭐", badge: null },
  { id: "ITA",     nome: "ITA",     emoji: "✈️", cor: "#003D80", bg: "#E6F0FF",
    desc: "Instituto Tecnológico de Aeronáutica", foco: "Matemática · Física · Química · Inglês",
    dificuldade: "⭐⭐⭐⭐⭐", badge: "Top 1" },
  { id: "IME",     nome: "IME",     emoji: "⚙️", cor: "#1a3a6e", bg: "#E6EEFF",
    desc: "Instituto Militar de Engenharia", foco: "Matemática · Física · Química · Desenho",
    dificuldade: "⭐⭐⭐⭐⭐", badge: "Top 2" },
  { id: "FUVEST",  nome: "FUVEST",  emoji: "🎓", cor: "#8B0000", bg: "#FFE6E6",
    desc: "Universidade de São Paulo — USP", foco: "Todas as áreas · Interpretação",
    dificuldade: "⭐⭐⭐⭐", badge: "USP" },
  { id: "UNICAMP", nome: "UNICAMP", emoji: "🔬", cor: "#005C97", bg: "#E6F4FF",
    desc: "Universidade Estadual de Campinas", foco: "Interdisciplinar · Contextualizado",
    dificuldade: "⭐⭐⭐⭐", badge: null },
  { id: "UNB",     nome: "UnB",     emoji: "🏛️", cor: "#006400", bg: "#E6FFE6",
    desc: "Universidade de Brasília + PAS", foco: "Atualidades · PAS · Humanas",
    dificuldade: "⭐⭐⭐", badge: "PAS" },
];

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const plano = String(profile?.plano ?? "free");
  const nome = ((profile as any)?.nome ?? (profile as any)?.username) ?? "Estudante";
  const xp = profile?.xp_total ?? 0;
  const sequencia = profile?.sequencia ?? 0;

  const [salasAbertas, setSalasAbertas] = useState<any[]>([]);
  const [modalSalas, setModalSalas] = useState(false);
  const [entrando, setEntrando] = useState<string | null>(null);

  useEffect(() => {
    if (!modalSalas) return;
    supabase
      .from("salas_virtuais")
      .select("*")
      .in("status", ["aguardando", "ativa"])
      .order("criada_em", { ascending: false })
      .then(({ data }) => setSalasAbertas(data ?? []));
  }, [modalSalas]);

  async function entrarNaSala(sala: any) {
    if (!sala || entrando) return;
    setEntrando(sala.id);
    await supabase.from("sala_participantes").upsert({
      sala_id: sala.id,
      user_id: (profile as any)?.id,
      nome_exibicao: (profile as any)?.nome ?? "Aluno",
    }, { onConflict: "sala_id,user_id" });
    setEntrando(null);
    setModalSalas(false);
    navigate("/sala", { state: { salaId: sala.id, codigo: sala.codigo } });
  }

  const horaAtual = new Date().getHours();
  const saudacao = horaAtual < 12 ? "Bom dia" : horaAtual < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${CORES.bgDark} 0%, #0A1628 60%, #0D1F3C 100%)`,
        padding: "16px 16px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Efeito de fundo */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.15,
          background: `radial-gradient(circle at 80% 20%, ${CORES.primary} 0%, transparent 60%)`,
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative" }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>{saudacao},</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>{nome} 👋</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* XP badge */}
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 99, padding: "6px 12px", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{xp.toLocaleString("pt-BR")} XP</span>
              </div>
              {/* Avatar */}
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: CORES.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
                onClick={() => navigate("/perfil")}>
                {nome[0].toUpperCase()}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px", backdropFilter: "blur(10px)" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>Sequência</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>🔥 {sequencia} dias</p>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px", backdropFilter: "blur(10px)" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>Próximo ENEM</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>📅 Nov/25</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 14px 90px" }}>

        {/* Acesso rápido */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button onClick={() => navigate("/simulado")} style={{
            flex: 1, padding: "14px 12px", borderRadius: 14,
            background: `linear-gradient(135deg, ${CORES.primary}, ${CORES.primaryDark})`,
            border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: `0 8px 24px ${CORES.primary}40`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📝</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Simulado</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>45 questões</p>
          </button>

          <button onClick={() => navigate("/agentes")} style={{
            flex: 1, padding: "14px 12px", borderRadius: 14,
            background: "linear-gradient(135deg, #6D28D9, #4C1D95)",
            border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🤖</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Agente IA</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>Tire dúvidas</p>
          </button>

          <button onClick={() => navigate("/redacao")} style={{
            flex: 1, padding: "14px 12px", borderRadius: 14,
            background: "linear-gradient(135deg, #0A7C4B, #065C37)",
            border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: "0 8px 24px rgba(10,124,75,0.4)",
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>✏️</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Redação</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>Praticar</p>
          </button>

          <button onClick={() => setModalSalas(true)} style={{
            flex: 1, padding: "14px 12px", borderRadius: 14,
            background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
            border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🏫</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Sala</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>Ao vivo</p>
          </button>
        </div>

        {/* Modal salas abertas */}
        {modalSalas && (
          <>
            <div onClick={() => setModalSalas(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000 }} />
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001, background: "#0f172a", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "70dvh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.4)" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>🏫 Salas Abertas</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 16px" }}>Clique para entrar em uma sala ao vivo</p>

              {salasAbertas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <p style={{ fontSize: 32, margin: "0 0 8px" }}>😴</p>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Nenhuma sala aberta no momento</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {salasAbertas.map(sala => (
                    <button
                      key={sala.id}
                      onClick={() => entrarNaSala(sala)}
                      disabled={entrando === sala.id}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, cursor: "pointer", textAlign: "left" }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: sala.status === "ativa" ? "rgba(78,206,154,0.15)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                        {sala.materia === "quimica" ? "🧪" : sala.materia === "fisica" ? "⚡" : sala.materia === "matematica" ? "📐" : sala.materia === "portugues" ? "📝" : sala.materia === "ingles" ? "🌎" : sala.materia === "biologia" ? "🔬" : "🎯"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sala.nome}</p>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px", background: sala.status === "ativa" ? "rgba(78,206,154,0.2)" : "rgba(255,200,0,0.15)", color: sala.status === "ativa" ? "#4ece9a" : "#fbbf24" }}>
                            {sala.status === "ativa" ? "● Ao vivo" : "⏳ Aguardando"}
                          </span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{sala.max_questoes} questões</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#0ea5e9", flexShrink: 0, letterSpacing: "0.05em" }}>
                        {entrando === sala.id ? "⏳" : "→"}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => { setModalSalas(false); navigate("/sala"); }} style={{ width: "100%", marginTop: 14, padding: "11px 0", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>
                Tenho um código → entrar manualmente
              </button>
            </div>
          </>
        )}

        {/* Vestibulares */}
        <p style={{ fontSize: 13, fontWeight: 700, color: CORES.text, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Vestibulares</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {VESTIBULARES.map(v => (
            <button
              key={v.id}
              onClick={() => navigate(`/vestibular/${v.id}`)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 16,
                background: CORES.bgCard, border: `1.5px solid ${v.cor}22`,
                cursor: "pointer", textAlign: "left",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ width: 50, height: 50, borderRadius: 14, background: v.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, border: `1.5px solid ${v.cor}22` }}>
                {v.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: v.cor, margin: 0 }}>{v.nome}</p>
                  {v.badge && <span style={{ fontSize: 9, fontWeight: 700, background: v.cor, color: "#fff", borderRadius: 4, padding: "1px 6px" }}>{v.badge}</span>}
                </div>
                <p style={{ fontSize: 11, color: CORES.textSub, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.desc}</p>
                <p style={{ fontSize: 10, color: v.cor, margin: 0, fontWeight: 500 }}>{v.foco}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 10 }}>{v.dificuldade}</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={v.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
              </div>
            </button>
          ))}
        </div>

                {/* Banner de upgrade se free */}
        {plano === "free" && (
          <div style={{
            background: `linear-gradient(135deg, #0A0F1E, #0D1F3C)`,
            borderRadius: 16, padding: 18,
            border: `1.5px solid ${CORES.primary}33`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `${CORES.primary}20` }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>⚡ Desbloqueie tudo</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Simulados ilimitados, agente de IA e acompanhamento personalizado.
            </p>
            <button
              onClick={() => navigate("/assinatura")}
              style={{
                padding: "9px 20px", background: CORES.primary,
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                boxShadow: `0 4px 14px ${CORES.primary}60`,
              }}
            >
              Ver planos →
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
