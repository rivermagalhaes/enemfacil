// src/pages/perfil/Assinatura.tsx
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { CORES } from "@/styles/theme";

type Plano = "basico" | "premium" | "completo" | "professor";

const PLANOS = [
  {
    id: "basico" as Plano,
    nome: "Básico",
    emoji: "📚",
    precoMensal: "9,90",
    precoAnual: "7,40",
    cor: "#3b82f6",
    desc: "Questões ENEM ilimitadas, sem IA.",
    destaque: false,
    badge: null,
    itens: [
      "Quiz e simulados ilimitados",
      "Todas as questões do ENEM",
      "Histórico de desempenho",
      "Estatísticas básicas",
    ],
  },
  {
    id: "premium" as Plano,
    nome: "Premium",
    emoji: "⭐",
    precoMensal: "19,90",
    precoAnual: "14,90",
    cor: "#7C3AED",
    desc: "ENEM completo com IA, trilhas e mapa mental.",
    destaque: true,
    badge: "Mais popular",
    itens: [
      "Tudo do plano Básico",
      "Agente IA ilimitado",
      "Trilhas de estudo por matéria",
      "Mapa mental por área",
      "Simulados por área",
      "Ranking entre usuários",
    ],
  },
  {
    id: "completo" as Plano,
    nome: "Completo",
    emoji: "👑",
    precoMensal: "29,90",
    precoAnual: "22,40",
    cor: "#B45309",
    desc: "Tudo ilimitado. Foco máximo no ENEM.",
    destaque: false,
    badge: "✦ Tudo incluído",
    itens: [
      "Tudo do plano Premium",
      "Redação com correção por IA",
      "Plano de estudos personalizado",
      "Suporte prioritário",
      "Acesso antecipado a novidades",
    ],
  },
  {
    id: "professor" as Plano,
    nome: "Professor",
    emoji: "👨‍🏫",
    precoMensal: "9,90",
    precoAnual: "7,40",
    cor: "#0A7C4B",
    desc: "Para professores criarem e gerenciarem turmas.",
    destaque: false,
    badge: "Para educadores",
    itens: [
      "Painel do professor",
      "Importar questões via PDF/Excel",
      "Criar questões personalizadas",
      "Salas virtuais ao vivo",
      "Simulados agendados para alunos",
      "Relatórios de desempenho da turma",
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
          success_url: `${window.location.origin}/?checkout=success`,
          cancel_url: `${window.location.origin}/assinatura?checkout=cancelled`,
        },
      });
      if (fnErr || !data?.ok) { setErro(data?.error ?? "Erro ao iniciar checkout."); return; }
      window.location.href = data.url;
    } catch { setErro("Erro de conexão. Tente novamente."); }
    finally { setLoading(null); }
  }

  const planoAtual = String((profile as any)?.plan ?? (profile as any)?.plano ?? "free");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${CORES.bgDark}, #0D1F3C)`, padding: "12px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => window.history.back()} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0, flex: 1 }}>🎯 Planos ENEMfácil</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 14px 32px" }}>

        {checkoutSuccess && (
          <div style={{ background: "#EDFAF3", borderRadius: 12, padding: 14, marginBottom: 20, border: "1px solid #6EE7B7" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#065F46", margin: "0 0 2px" }}>Assinatura ativada! 🎉</p>
            <p style={{ fontSize: 12, color: "#047857", margin: 0 }}>Seu plano foi atualizado. Bons estudos!</p>
          </div>
        )}
        {checkoutCancelled && (
          <div style={{ background: "#FFF8E6", borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: "#92400E", margin: 0 }}>Checkout cancelado. Escolha um plano quando quiser.</p>
          </div>
        )}

        <p style={{ fontSize: 20, fontWeight: 700, color: CORES.text, margin: "0 0 4px" }}>Escolha seu plano</p>
        <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 20px" }}>Cancele quando quiser, sem multas.</p>

        {/* Toggle mensal/anual */}
        <div style={{ display: "flex", background: "#fff", borderRadius: 12, padding: 4, marginBottom: 20, border: `1px solid ${CORES.border}`, gap: 4 }}>
          <button onClick={() => setAnual(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: !anual ? CORES.primary : "transparent", color: !anual ? "#fff" : CORES.textSub, transition: "all 0.2s" }}>
            Mensal
          </button>
          <button onClick={() => setAnual(true)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: anual ? "#16a34a" : "transparent", color: anual ? "#fff" : CORES.textSub, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            Anual
            <span style={{ fontSize: 10, background: anual ? "#bbf7d0" : "#e5f5e0", color: "#15803d", borderRadius: 99, padding: "1px 7px", fontWeight: 700 }}>-25%</span>
          </button>
        </div>

        {erro && (
          <div style={{ background: "#FFF1F1", borderRadius: 10, padding: "10px 12px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: CORES.error, margin: 0 }}>{erro}</p>
          </div>
        )}

        {PLANOS.map(p => {
          const atual = planoAtual === p.id;
          const key = `${p.id}_${anual ? "anual" : "mensal"}`;
          const isLoading = loading === key;
          const preco = anual ? p.precoAnual : p.precoMensal;

          return (
            <div key={p.id} style={{
              background: p.destaque ? "linear-gradient(135deg, #fffbeb, #fef3c7)" : "#fff",
              border: p.destaque ? `2px solid ${p.cor}` : atual ? `2px solid ${p.cor}` : `1px solid ${CORES.border}`,
              borderRadius: 16, padding: 18, marginBottom: 14, position: "relative",
              boxShadow: p.destaque ? `0 8px 32px ${p.cor}20` : "0 2px 8px rgba(0,0,0,0.06)",
            }}>
              {p.badge && (
                <span style={{ fontSize: 11, fontWeight: 600, background: p.destaque ? "linear-gradient(90deg, #b45309, #d97706)" : p.cor, color: "#fff", borderRadius: 99, padding: "3px 10px", display: "inline-block", marginBottom: 10 }}>
                  {p.badge}
                </span>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 2px", color: p.destaque ? "#92400e" : CORES.text }}>
                    {p.emoji} {p.nome}
                  </p>
                  <p style={{ fontSize: 12, color: CORES.textSub, margin: 0 }}>{p.desc}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  {anual && <p style={{ margin: "0 0 1px", fontSize: 11, color: "#999", textDecoration: "line-through" }}>R${p.precoMensal}/mês</p>}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: p.cor }}>R${preco}</span>
                    <span style={{ fontSize: 12, color: CORES.textSub }}>/mês</span>
                  </div>
                  {anual && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#16a34a", fontWeight: 500 }}>cobrado anualmente</p>}
                </div>
              </div>

              <div style={{ height: 1, background: p.destaque ? "rgba(180,83,9,0.15)" : CORES.border, margin: "12px 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                {p.itens.map(it => (
                  <div key={it} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${p.cor}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke={p.cor} strokeWidth="2" strokeLinecap="round"><polyline points="1.5 5 4 7.5 8.5 2"/></svg>
                    </div>
                    <span style={{ fontSize: 13, color: p.destaque ? "#78350f" : CORES.text }}>{it}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={atual || isLoading}
                onClick={() => assinar(p.id, anual ? "anual" : "mensal")}
                style={{
                  width: "100%", padding: "12px 0",
                  background: atual ? CORES.bg : isLoading ? `${p.cor}99` : p.destaque ? "linear-gradient(90deg, #b45309, #d97706)" : p.cor,
                  color: atual ? CORES.textSub : "#fff", border: "none", borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: atual || isLoading ? "not-allowed" : "pointer",
                  boxShadow: p.destaque && !atual ? `0 4px 16px ${p.cor}40` : "none",
                }}
              >
                {atual ? "✓ Plano atual" : isLoading ? "Aguarde..." : `Assinar ${p.nome} — R$${preco}/mês`}
              </button>
            </div>
          );
        })}

        <p style={{ fontSize: 11, color: CORES.textSub, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
          Pagamento seguro · Cancele a qualquer momento · Sem fidelidade
        </p>
      </div>
    </div>
  );
}
