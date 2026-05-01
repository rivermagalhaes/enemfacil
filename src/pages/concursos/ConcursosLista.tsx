// src/pages/concursos/ConcursosLista.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useProgresso } from "@/hooks/useProgresso";
import BottomNav from "@/components/layout/BottomNav";
import CartaoConcurso from "@/components/concursos/CartaoConcurso";
import PaywallModal from "@/components/ui/PaywallModal";
import type { Concurso, CargoArea } from "@/types";

const LOGO_STYLE: React.CSSProperties = {
  height: 36, objectFit: "contain",
  background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "2px 4px",
};

const AREAS: { valor: CargoArea | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "federal", label: "Federal" },
  { valor: "estadual", label: "Estadual" },
  { valor: "judiciario", label: "Judiciário" },
  { valor: "policial", label: "Policial" },
];

export default function ConcursosLista() {
  const { profile } = useAuth();
  const { getPctAcerto, getPorConcurso } = useProgresso(profile?.id);
  const navigate = useNavigate();
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [area, setArea] = useState<CargoArea | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [paywallAberto, setPaywallAberto] = useState(false);

  const isFree = !profile || profile.plano === "gratis";

  useEffect(() => {
    supabase.from("concursos").select("*").eq("ativo", true).order("nome")
      .then(({ data }) => { setConcursos((data as Concurso[]) ?? []); setLoading(false); });
  }, []);

  const filtrados = concursos.filter((c) => {
    const matchArea = area === "todos" || c.area === area;
    const matchBusca = !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || (c.orgao ?? "").toLowerCase().includes(busca.toLowerCase());
    return matchArea && matchBusca;
  });

  // Sempre navega para o detalhe — o paywall fica dentro da página de detalhe
  function handleConcursoClick(concurso: Concurso) {
    navigate(`/concursos/${concurso.id}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div style={{ background: "#1a3a6e", padding: "12px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            {AREAS.map((a) => (
              <button key={String(a.valor)} onClick={() => setArea(a.valor)}
                style={{ padding: "6px 12px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12, fontWeight: area === a.valor ? 700 : 400, background: area === a.valor ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)", color: area === a.valor ? "#1a3a6e" : "rgba(255,255,255,0.8)", transition: "all .2s", whiteSpace: "nowrap" }}>
                {a.label}
              </button>
            ))}
          </div>
          <img src="/logo.png" alt="CFfácil" style={{ ...LOGO_STYLE, marginLeft: 8, flexShrink: 0 }} />
        </div>

        <p style={{ fontSize: 15, fontWeight: 500, color: "#fff", margin: "0 0 2px" }}>Concursos</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "0 0 10px" }}>Direito Constitucional por cargo</p>

        <div style={{ position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="6.5" cy="6.5" r="4" /><line x1="10" y1="10" x2="14" y2="14" />
          </svg>
          <input placeholder="Buscar cargo ou órgão..." value={busca} onChange={(e) => setBusca(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.12)", fontSize: 13, color: "#fff", outline: "none" }} />
        </div>
      </div>

      {/* Banner informativo para free — não bloqueia, só convida */}
      {isFree && (
        <div style={{ background: "#F0F7FF", borderLeft: "4px solid #1a3a6e", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎁</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "#0C447C", margin: "0 0 1px" }}>1 simulado gratuito por concurso</p>
            <p style={{ fontSize: 11, color: "#888", margin: 0 }}>Explore o ranking e os conteúdos. Assine para simulados ilimitados.</p>
          </div>
          <button onClick={() => setPaywallAberto(true)} style={{ padding: "5px 12px", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
            Ver planos
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px" }}>
        {loading && <p style={{ color: "#888", fontSize: 13 }}>Carregando concursos...</p>}
        {!loading && filtrados.length === 0 && <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 32 }}>Nenhum concurso encontrado.</p>}
        {filtrados.map((c) => (
          <div key={c.id} onClick={() => handleConcursoClick(c)} style={{ cursor: "pointer", position: "relative" }}>
            <CartaoConcurso concurso={c} pctAcerto={getPctAcerto(c.id)} totalRespondidas={getPorConcurso(c.id)?.total_respondidas ?? 0} />
            {isFree && (
              <div style={{ position: "absolute", top: 10, right: 10, background: "#E6F1FB", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#0C447C" }}>
                1 grátis
              </div>
            )}
          </div>
        ))}
      </div>

      <PaywallModal
        isOpen={paywallAberto}
        onClose={() => setPaywallAberto(false)}
        contentTitle="simulados ilimitados"
        contentType="simulado"
        onUpgrade={() => { setPaywallAberto(false); navigate("/assinatura"); }}
      />

      <BottomNav />
    </div>
  );
}
