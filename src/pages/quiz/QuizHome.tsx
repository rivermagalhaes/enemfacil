// src/pages/quiz/QuizHome.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useProgresso } from "@/hooks/useProgresso";
import BottomNav from "@/components/layout/BottomNav";
import CartaoConcurso from "@/components/concursos/CartaoConcurso";
import type { Concurso } from "@/types";

const LOGO_STYLE: React.CSSProperties = {
  height: 36, objectFit: "contain",
  background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "2px 4px",
};

export default function QuizHome() {
  const { profile } = useAuth();
  const { getPctAcerto, getPorConcurso } = useProgresso(profile?.id);
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("concursos").select("*").eq("ativo", true).then(({ data }) => setConcursos(data ?? []));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div style={{ background: "#1a3a6e", padding: "12px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#fff", margin: "0 0 2px" }}>Quiz</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>Escolha um concurso para estudar</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {profile?.xp_total !== undefined && (
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 99, padding: "4px 10px", fontSize: 12, color: "#fff", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f0c040", display: "inline-block" }} />
                {profile.xp_total} XP
              </span>
            )}
            <img src="/logo.png" alt="CFfácil" style={LOGO_STYLE} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "14px 14px 20px", overflowY: "auto" }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Seus concursos</p>
        {concursos.map((c) => (
          <CartaoConcurso key={c.id} concurso={c} pctAcerto={getPctAcerto(c.id)} totalRespondidas={getPorConcurso(c.id)?.total_respondidas ?? 0} />
        ))}
        <button onClick={() => navigate("/concursos")} style={{ width: "100%", padding: "10px 0", marginTop: 4, border: "0.5px solid rgba(0,0,0,0.12)", background: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#1a1a1a" }}>
          Ver todos os concursos
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
