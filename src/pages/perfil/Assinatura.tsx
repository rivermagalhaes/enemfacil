// src/pages/perfil/Assinatura.tsx
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

type Plano = "cidadao" | "concurseiro" | "ouro";

const PLANOS = [
  {
    id: "cidadao" as Plano,
    nome: "Estudante",
    precoMensal: "19,90",
    precoAnual: "14,90",
    cor: "#2563eb",
    destaque: false,
    badge: null,
    desc: "Para quem quer aprender a CF/88 sem pressão.",
    itens: [
      "Questões ilimitadas (CESPE + FCC)",
      "Artigos simplificados completos",
      "Casos do dia a dia",
      "Simulados básicos",
      "Trilha progressiva CF/88",
    ],
  },
  {
    id: "concurseiro" as Plano,
    nome: "Premium",
    precoMensal: "29,90",
    precoAnual: "24,90",
    cor: "#7c3aed",
    destaque: false,
    badge: "Mais popular",
    desc: "Foco total em PRF, PF, Juiz e demais cargos.",
    itens: [
      "Tudo do plano Estudante",
      "Filtros por cargo e banca",
      "Questões geradas por IA",
      "Estatísticas detalhadas",
      "Simulados completos",
      "Ranking entre usuários",
    ],
  },
  {
    id: "ouro" as Plano,
    nome: "Ouro",
    precoMensal: "49,90",
    precoAnual: "36,90",
    cor: "#b45309",
    destaque: true,
    badge: "✦ Novo",
    desc: "Para quem precisa de petições e peças processuais.",
    itens: [
      "Tudo do plano Premium",
      "Gerador de petições com IA",
      "Seleção de artigos e jurisprudências",
      "Cabeçalho personalizado por juízo",
      "Exportação em PDF profissional",
      "Histórico de petições salvas",
    ],
  },
];

export default function Assinatura() {
  const { profile } = useAuth();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [anual, setAnual] = useState(false);

  const checkoutSuccess = params.get("checkout") === "success";
  const checkoutCancelled = params.get("checkout") === "cancelled";

  async function assinar(planoId: Plano, periodo: "mensal" | "anual") {
    const key = `${planoId}_${periodo}`;
    setLoading(key); setErro(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("criar-checkout", {
        body: {
          plano: planoId, periodo,
          success_url: `${window.location.origin}/perfil?checkout=success`,
          cancel_url: `${window.location.origin}/assinatura?checkout=cancelled`,
        },
      });
      if (fnErr || !data?.ok) { setErro(data?.error ?? "Erro ao iniciar checkout."); return; }
      window.location.href = data.url;
    } catch { setErro("Erro de conexão. Tente novamente."); }
    finally { setLoading(null); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#f4f6fb" }}>
      <div style={{ background: "#1a3a6e", padding: "12px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => window.history.back()} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
            </button>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#fff", margin: 0 }}>Planos</p>
          </div>
          <img src="/logo.png" alt="CFfácil" style={{ height: 36, objectFit: "contain", background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "2px 4px" }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 14px 32px" }}>
        {checkoutSuccess && (
          <div style={{ background: "#EAF3DE", borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#27500A", margin: "0 0 2px" }}>Assinatura ativada! 🎉</p>
            <p style={{ fontSize: 12, color: "#3B6D11", margin: 0 }}>Seu plano foi atualizado. Aproveite o acesso completo.</p>
          </div>
        )}
        {checkoutCancelled && (
          <div style={{ background: "#FAEEDA", borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: "#633806", margin: 0 }}>Checkout cancelado. Escolha um plano quando quiser.</p>
          </div>
        )}

        <p style={{ fontSize: 17, fontWeight: 600, margin: "0 0 4px" }}>Escolha seu plano</p>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px" }}>Cancele quando quiser, sem multas.</p>

        {/* Toggle mensal/anual */}
        <div style={{ display: "flex", background: "#fff", borderRadius: 12, padding: 4, marginBottom: 20, border: "0.5px solid rgba(0,0,0,0.08)", gap: 4 }}>
          <button onClick={() => setAnual(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: !anual ? "#1a3a6e" : "transparent", color: !anual ? "#fff" : "#888", transition: "all 0.2s" }}>
            Mensal
          </button>
          <button onClick={() => setAnual(true)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: anual ? "linear-gradient(90deg, #16a34a, #15803d)" : "transparent", color: anual ? "#fff" : "#888", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            Anual
            <span style={{ fontSize: 10, background: anual ? "#bbf7d0" : "#e5f5e0", color: "#15803d", borderRadius: 99, padding: "1px 7px", fontWeight: 700 }}>-25%</span>
          </button>
        </div>

        {anual && (
          <div style={{ background: "linear-gradient(90deg, #dcfce7, #d1fae5)", border: "1.5px solid #86efac", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#15803d", margin: "0 0 1px" }}>Plano anual ativado!</p>
              <p style={{ fontSize: 12, color: "#166534", margin: 0 }}>Economize até R$156,00 por ano em relação ao mensal.</p>
            </div>
          </div>
        )}

        {erro && (
          <div style={{ background: "#FCEBEB", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#791F1F", margin: 0 }}>{erro}</p>
          </div>
        )}

        {PLANOS.map((p) => {
          const atual = profile?.plano === p.id;
          const key = `${p.id}_${anual ? "anual" : "mensal"}`;
          const isLoading = loading === key;
          const preco = anual ? p.precoAnual : p.precoMensal;
          const isOuro = p.id === "ouro";

          return (
            <div key={p.id} style={{
              background: isOuro ? "linear-gradient(135deg, #fffbeb, #fef3c7)" : "#fff",
              border: isOuro ? `2px solid ${p.cor}` : atual ? `2px solid ${p.cor}` : "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: 14, padding: 18, marginBottom: 14, position: "relative",
            }}>
              {p.badge && (
                <span style={{ fontSize: 11, fontWeight: 600, background: isOuro ? "linear-gradient(90deg, #b45309, #d97706)" : p.cor, color: "#fff", borderRadius: 99, padding: "3px 10px", display: "inline-block", marginBottom: 10 }}>
                  {p.badge}
                </span>
              )}

              {isOuro && (
                <div style={{ position: "absolute", top: 12, right: 12, fontSize: 22 }}>👑</div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1, paddingRight: isOuro ? 32 : 0 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, margin: "0 0 2px", color: isOuro ? "#92400e" : "#1a1a1a" }}>{p.nome}</p>
                  <p style={{ fontSize: 12, color: "#666", margin: 0 }}>{p.desc}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {anual && (
                    <p style={{ margin: "0 0 1px", fontSize: 11, color: "#999", textDecoration: "line-through" }}>R${p.precoMensal}/mês</p>
                  )}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: p.cor }}>R${preco}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>/mês</span>
                  </div>
                  {anual && (
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "#16a34a", fontWeight: 500 }}>cobrado anualmente</p>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: isOuro ? "rgba(180,83,9,0.15)" : "rgba(0,0,0,0.06)", margin: "12px 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                {p.itens.map((it) => (
                  <div key={it} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${p.cor}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke={p.cor} strokeWidth="2" strokeLinecap="round"><polyline points="1.5 5 4 7.5 8.5 2" /></svg>
                    </div>
                    <span style={{ fontSize: 13, color: isOuro ? "#78350f" : "#333", fontWeight: isOuro && it.includes("Gerador") ? 600 : 400 }}>{it}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={atual || isLoading}
                onClick={() => assinar(p.id, anual ? "anual" : "mensal")}
                style={{
                  width: "100%", padding: "12px 0",
                  background: atual ? "#f4f6fb" : isLoading ? `${p.cor}99` : isOuro ? "linear-gradient(90deg, #b45309, #d97706)" : p.cor,
                  color: atual ? "#888" : "#fff", border: "none", borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: atual || isLoading ? "not-allowed" : "pointer",
                  boxShadow: isOuro && !atual ? "0 4px 14px rgba(180,83,9,0.35)" : "none",
                }}
              >
                {atual ? "✓ Plano atual" : isLoading ? "Aguarde..." : `Assinar ${p.nome} — R$${preco}/mês`}
              </button>
            </div>
          );
        })}

        <p style={{ fontSize: 11, color: "#999", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
          Pagamento seguro via Stripe · Cancele a qualquer momento · Sem fidelidade
        </p>
      </div>
    </div>
  );
}
