// src/pages/auth/Onboarding.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import type { Concurso } from "@/types";

export default function Onboarding() {
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("concursos").select("*").eq("ativo", true).then(({ data }) => setConcursos(data ?? []));
  }, []);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#1a3a6e", padding: "32px 20px 24px" }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: "#fff", margin: "0 0 4px" }}>Bem-vindo!</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: 0 }}>
          Qual concurso você está preparando?
        </p>
      </div>

      <div style={{ padding: "16px 16px 32px", flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {concursos.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelecionado(c.id)}
              style={{
                padding: "12px 14px", borderRadius: 12,
                border: `${selecionado === c.id ? "2px" : "0.5px"} solid ${selecionado === c.id ? "#1a3a6e" : "rgba(0,0,0,0.08)"}`,
                background: selecionado === c.id ? "#E6F1FB" : "#fff",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 2px", color: selecionado === c.id ? "#0C447C" : "#1a1a1a" }}>{c.nome}</p>
              <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{c.banca} · {c.orgao}</p>
            </div>
          ))}
        </div>

        <button
          disabled={!selecionado}
          onClick={() => navigate("/")}
          style={{
            width: "100%", padding: 12, marginTop: 24,
            background: selecionado ? "#1a3a6e" : "#ccc",
            color: "#fff", border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 500,
            cursor: selecionado ? "pointer" : "not-allowed",
          }}
        >
          Começar estudar
        </button>
      </div>
    </div>
  );
}
