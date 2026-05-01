// src/components/ui/PaywallModal.tsx
import { useState, useEffect } from "react";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentTitle?: string;
  contentType?: "artigo" | "quiz" | "curso" | "simulado" | "peticao";
  onUpgrade?: (plan: "basico" | "premium" | "ouro") => void;
}

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="4" y="9" width="12" height="9" rx="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="13.5" r="1.5" fill="currentColor"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="currentColor" fillOpacity="0.8"/>
  </svg>
);

const PRECOS = {
  basico:  { mensal: "19,90", anual: "14,90" },
  premium: { mensal: "29,90", anual: "24,90" },
  ouro:    { mensal: "49,90", anual: "36,90" },
};

const benefits: Record<string, { basico: string[]; premium: string[]; ouro: string[] }> = {
  artigo: {
    basico:  ["Todos os artigos desbloqueados", "Leitura sem interrupções", "Casos do dia a dia"],
    premium: ["IA explica cada artigo", "Simulados CESPE/FCC", "Ranking entre usuários"],
    ouro:    ["Tudo do Premium", "Gerador de petições", "Jurisprudências por artigo", "Exportação PDF"],
  },
  quiz: {
    basico:  ["Quizzes ilimitados", "Ver gabarito comentado", "Histórico de acertos"],
    premium: ["Simulados estilo CESPE/FCC", "Análise de desempenho por tema", "Questões de provas reais"],
    ouro:    ["Tudo do Premium", "Gerador de petições", "Jurisprudências selecionáveis", "Exportação PDF"],
  },
  simulado: {
    basico:  ["Simulados básicos disponíveis", "Gabarito com comentários", "Pontuação histórica"],
    premium: ["Simulados ilimitados CESPE/FCC", "Cronômetro e condições reais", "Ranking entre usuários"],
    ouro:    ["Tudo do Premium", "Gerador de petições", "Histórico de petições salvas", "Exportação PDF"],
  },
  curso: {
    basico:  ["Acesso ao conteúdo completo", "Progresso salvo", "Casos do dia a dia"],
    premium: ["Todos os cursos disponíveis", "Trilhas personalizadas por banca", "Suporte ao professor"],
    ouro:    ["Tudo do Premium", "Gerador de petições", "Jurisprudências integradas", "Exportação PDF"],
  },
  peticao: {
    basico:  ["Artigos simplificados", "Casos do dia a dia", "Simulados básicos"],
    premium: ["Simulados ilimitados", "Ranking entre usuários", "Filtros por cargo/banca"],
    ouro:    ["Gerador de petições completo", "Seleção de artigos e jurisprudências", "Cabeçalho por juízo personalizado", "Impressão e export PDF profissional"],
  },
};

export default function PaywallModal({ isOpen, onClose, contentTitle = "este conteúdo", contentType = "artigo", onUpgrade }: PaywallModalProps) {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<"basico" | "premium" | "ouro">(
    contentType === "peticao" ? "ouro" : "premium"
  );
  const [anual, setAnual] = useState(false);

  useEffect(() => {
    if (isOpen) setTimeout(() => setVisible(true), 10);
    else setVisible(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const b = benefits[contentType] ?? benefits.artigo;
  const precoAtual = anual ? PRECOS[selected].anual : PRECOS[selected].mensal;

  const PLANOS: { key: "basico" | "premium" | "ouro"; label: string; cor: string; rec: boolean }[] = [
    { key: "basico",   label: "Estudante", cor: "#185FA5", rec: false },
    { key: "premium",  label: "Premium",   cor: "#534AB7", rec: contentType !== "peticao" },
    { key: "ouro",     label: "Ouro 👑",    cor: "#b45309", rec: contentType === "peticao" },
  ];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", opacity: visible ? 1 : 0, transition: "opacity 0.25s" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, overflow: "hidden", transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)", transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>

        {/* Header */}
        <div style={{ padding: "1.5rem 1.5rem 1rem", background: "linear-gradient(135deg, rgba(83,74,183,0.3) 0%, rgba(24,95,165,0.2) 100%)", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: "50%", color: "#9CA3AF", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ color: "#AFA9EC", width: 36, height: 36, borderRadius: 10, background: "rgba(83,74,183,0.25)", border: "1px solid rgba(83,74,183,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {contentType === "peticao" ? <span style={{ fontSize: 18 }}>📄</span> : <LockIcon />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "#6B7280", fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {contentType === "peticao" ? "Plano Ouro" : "Conteúdo Premium"}
              </p>
              <p style={{ margin: 0, fontSize: 15, color: "#F9FAFB", fontFamily: "system-ui", fontWeight: 500 }}>Desbloqueie {contentTitle}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <button onClick={() => setAnual(false)} style={{ padding: "5px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: !anual ? "rgba(255,255,255,0.15)" : "transparent", color: !anual ? "#fff" : "#6B7280" }}>Mensal</button>
            <button onClick={() => setAnual(true)} style={{ padding: "5px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: anual ? "linear-gradient(90deg, #16a34a, #15803d)" : "transparent", color: anual ? "#fff" : "#6B7280", display: "flex", alignItems: "center", gap: 6 }}>
              Anual {anual && <span style={{ fontSize: 10, background: "#bbf7d0", color: "#15803d", borderRadius: 99, padding: "1px 6px", fontWeight: 700 }}>-25%</span>}
            </button>
            {!anual && <span style={{ fontSize: 11, color: "#4ece9a" }}>💰 Economize 25% no anual</span>}
          </div>
        </div>

        {/* Planos */}
        <div style={{ padding: "1rem 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PLANOS.map(p => (
              <button key={p.key} onClick={() => setSelected(p.key)} style={{
                width: "100%", padding: "11px 14px",
                border: selected === p.key ? `2px solid ${p.cor}` : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, cursor: "pointer", textAlign: "left",
                background: selected === p.key
                  ? p.key === "ouro" ? "rgba(180,83,9,0.18)" : p.key === "premium" ? "rgba(83,74,183,0.15)" : "rgba(24,95,165,0.12)"
                  : "rgba(255,255,255,0.03)",
                transition: "all 0.15s", position: "relative",
              }}>
                {p.rec && (
                  <div style={{ position: "absolute", top: -10, right: 12, background: p.key === "ouro" ? "linear-gradient(90deg, #b45309, #d97706)" : "linear-gradient(90deg, #534AB7, #185FA5)", color: "#fff", fontSize: 10, padding: "3px 10px", borderRadius: 10 }}>
                    {p.key === "ouro" ? "✦ NOVO" : "RECOMENDADO"}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 14, color: "#F9FAFB", fontWeight: 600 }}>{p.label}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {b[p.key].map((feat, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ color: p.key === "ouro" ? "#fbbf24" : p.key === "premium" ? "#AFA9EC" : "#85B7EB", flexShrink: 0 }}><SparkleIcon /></div>
                          <span style={{ fontSize: 11, color: "#9CA3AF" }}>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: 10 }}>
                    <p style={{ margin: 0, fontSize: 18, color: "#F9FAFB", fontFamily: "Georgia, serif" }}>
                      R${anual ? PRECOS[p.key].anual : PRECOS[p.key].mensal}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: "#6B7280" }}>/mês</p>
                    {anual && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#4ece9a" }}>antes R${PRECOS[p.key].mensal}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "0 1.5rem 1.5rem" }}>
          <button onClick={() => onUpgrade?.(selected)} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: selected === "ouro"
              ? "linear-gradient(90deg, #b45309, #d97706)"
              : selected === "premium"
              ? "linear-gradient(90deg, #534AB7, #185FA5)"
              : "linear-gradient(90deg, #185FA5, #0C447C)",
            color: "#fff", fontSize: 15, cursor: "pointer", fontWeight: 600,
            boxShadow: selected === "ouro" ? "0 4px 16px rgba(180,83,9,0.4)" : "none",
          }}>
            Assinar {selected === "ouro" ? "Ouro 👑" : selected === "premium" ? "Premium" : "Estudante"} — R${precoAtual}/mês{anual ? "*" : ""}
          </button>
          {anual && <p style={{ textAlign: "center", margin: "6px 0 0", fontSize: 11, color: "#4B5563" }}>*cobrado anualmente</p>}
          <p style={{ textAlign: "center", margin: "6px 0 0", fontSize: 11, color: "#4B5563" }}>Cancele quando quiser · Sem fidelidade</p>
        </div>
      </div>
    </div>
  );
}
