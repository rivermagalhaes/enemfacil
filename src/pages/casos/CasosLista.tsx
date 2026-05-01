// src/pages/casos/CasosLista.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import CartaoCaso from "@/components/casos/CartaoCaso";
import PaywallModal from "@/components/ui/PaywallModal";
import type { CasoDiaDia, CategoriaCase } from "@/types";

const LOGO_STYLE: React.CSSProperties = {
  height: 36, objectFit: "contain",
  background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "2px 4px",
};

const CATEGORIAS: { valor: CategoriaCase | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "escola", label: "Escola" },
  { valor: "trabalho", label: "Trabalho" },
  { valor: "saude", label: "Saúde" },
  { valor: "policia", label: "Polícia" },
  { valor: "familia", label: "Família" },
  { valor: "consumidor", label: "Consumidor" },
];

export default function CasosLista() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [casos, setCasos] = useState<CasoDiaDia[]>([]);
  const [cat, setCat] = useState<CategoriaCase | "todos">("todos");
  const [loading, setLoading] = useState(true);
  const [paywallAberto, setPaywallAberto] = useState(false);

  const isFree = !profile || profile.plano === "gratis";

  useEffect(() => {
    let query = supabase.from("casos_dia_a_dia").select("*").eq("ativo", true).order("criado_em", { ascending: false });
    if (cat !== "todos") query = query.eq("categoria", cat);
    query.then(({ data }) => { setCasos((data as CasoDiaDia[]) ?? []); setLoading(false); });
  }, [cat]);

  function handleCasoClick(caso: CasoDiaDia) {
    if (isFree) { setPaywallAberto(true); return; }
    navigate(`/casos/${caso.id}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div style={{ background: "#1a3a6e", padding: "12px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIAS.map((c) => (
              <button key={c.valor} onClick={() => { setCat(c.valor); setLoading(true); }}
                style={{ padding: "6px 12px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12, fontWeight: cat === c.valor ? 700 : 400, background: cat === c.valor ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)", color: cat === c.valor ? "#1a3a6e" : "rgba(255,255,255,0.8)", transition: "all .2s", whiteSpace: "nowrap" }}>
                {c.label}
              </button>
            ))}
          </div>
          <img src="/logo.png" alt="CFfácil" style={{ ...LOGO_STYLE, marginLeft: 8, flexShrink: 0 }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 500, color: "#fff", margin: "0 0 2px" }}>Casos do dia a dia</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>A Constituição na sua vida real</p>
      </div>

      {/* Banner de acesso bloqueado para free */}
      {isFree && (
        <div style={{ background: "#FFF8E6", borderLeft: "4px solid #f0c040", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "#633806", margin: "0 0 1px" }}>Conteúdo Premium</p>
            <p style={{ fontSize: 11, color: "#888", margin: 0 }}>Assine para acessar todos os casos</p>
          </div>
          <button onClick={() => setPaywallAberto(true)} style={{ padding: "5px 12px", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
            Ver planos
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px" }}>
        {loading && <p style={{ color: "#888", fontSize: 13 }}>Carregando casos...</p>}
        {!loading && casos.length === 0 && <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 32 }}>Nenhum caso encontrado.</p>}
        {casos.map((caso) => (
          <div key={caso.id} onClick={() => handleCasoClick(caso)} style={{ cursor: "pointer", position: "relative" }}>
            <CartaoCaso caso={caso} />
            {isFree && (
              <div style={{ position: "absolute", top: 10, right: 10, background: "#f0c040", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#633806" }}>
                PREMIUM
              </div>
            )}
          </div>
        ))}
      </div>

      <PaywallModal
        isOpen={paywallAberto}
        onClose={() => setPaywallAberto(false)}
        contentTitle="os casos do dia a dia"
        contentType="artigo"
        onUpgrade={() => { setPaywallAberto(false); navigate("/assinatura"); }}
      />

      <BottomNav />
    </div>
  );
}
