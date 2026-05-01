// src/pages/artigos/ArtigosLista.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import type { Artigo } from "@/types";

const TITULOS: Record<number, string> = {
  1: "Princípios fundamentais",
  2: "Direitos e garantias fundamentais",
  3: "Organização do Estado",
  4: "Organização dos Poderes",
  5: "Defesa do Estado e das Instituições",
  6: "Tributação e orçamento",
  7: "Ordem econômica e financeira",
  8: "Ordem social",
  9: "Disposições gerais",
};

export default function ArtigosLista() {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [busca, setBusca] = useState("");
  const [tituloFiltro, setTituloFiltro] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("artigos")
      .select("id, numero, titulo_num, ementa, palavras_chave")
      .order("numero")
      .then(({ data }) => {
        setArtigos((data as Artigo[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtrados = artigos.filter((a) => {
    const matchBusca =
      !busca ||
      a.ementa.toLowerCase().includes(busca.toLowerCase()) ||
      String(a.numero).includes(busca) ||
      (a.palavras_chave ?? []).some((p) =>
        p.toLowerCase().includes(busca.toLowerCase())
      );
    const matchTitulo = tituloFiltro === null || a.titulo_num === tituloFiltro;
    return matchBusca && matchTitulo;
  });

  // Agrupa por título
  const grupos = filtrados.reduce<Record<number, Artigo[]>>((acc, a) => {
    const t = a.titulo_num ?? 0;
    if (!acc[t]) acc[t] = [];
    acc[t].push(a);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <TopBar title="Artigos simplificados" subtitle="CF/88 em linguagem acessível" />

      {/* Busca */}
      <div style={{ padding: "10px 14px 0", background: "#fff" }}>
        <div style={{ position: "relative" }}>
          <svg
            width="14" height="14" viewBox="0 0 16 16" fill="none"
            stroke="#999" strokeWidth="1.5"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="6.5" cy="6.5" r="4" />
            <line x1="10" y1="10" x2="14" y2="14" />
          </svg>
          <input
            placeholder="Buscar por número ou tema..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px 9px 30px",
              borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.12)",
              fontSize: 13, outline: "none", background: "#f4f6fb",
            }}
          />
        </div>
      </div>

      {/* Filtro por título */}
      <div style={{
        display: "flex", gap: 6, overflowX: "auto", padding: "10px 14px",
        background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.06)",
      }}>
        <button
          onClick={() => setTituloFiltro(null)}
          style={{
            padding: "5px 12px", borderRadius: 99, border: "0.5px solid",
            fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer",
            background: tituloFiltro === null ? "#1a3a6e" : "#fff",
            color: tituloFiltro === null ? "#fff" : "#666",
            borderColor: tituloFiltro === null ? "#1a3a6e" : "rgba(0,0,0,0.12)",
          }}
        >
          Todos
        </button>
        {Object.entries(TITULOS).map(([num, _nome]) => (
          <button
            key={num}
            onClick={() => setTituloFiltro(Number(num))}
            style={{
              padding: "5px 12px", borderRadius: 99, border: "0.5px solid",
              fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer",
              background: tituloFiltro === Number(num) ? "#1a3a6e" : "#fff",
              color: tituloFiltro === Number(num) ? "#fff" : "#666",
              borderColor: tituloFiltro === Number(num) ? "#1a3a6e" : "rgba(0,0,0,0.12)",
            }}
          >
            Título {num}
          </button>
        ))}
      </div>

      {/* Lista agrupada */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px" }}>
        {loading && <p style={{ color: "#888", fontSize: 13 }}>Carregando artigos...</p>}

        {Object.entries(grupos)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([tNum, arts]) => (
            <div key={tNum} style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 11, fontWeight: 500, color: "#888",
                textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px",
              }}>
                Título {tNum} — {TITULOS[Number(tNum)] ?? "Outros"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {arts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => navigate(`/artigos/${a.id}`)}
                    style={{
                      background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)",
                      borderRadius: 10, padding: "11px 13px",
                      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    }}
                  >
                    <span style={{
                      fontSize: 11, fontWeight: 500, background: "#E6F1FB",
                      color: "#0C447C", borderRadius: 6, padding: "3px 8px", flexShrink: 0,
                    }}>
                      Art. {a.numero}º
                    </span>
                    <span style={{ fontSize: 13, color: "#1a1a1a", flex: 1, lineHeight: 1.35 }}>
                      {a.ementa}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#bbb" strokeWidth="1.5">
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          ))}

        {!loading && filtrados.length === 0 && (
          <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 32 }}>
            Nenhum artigo encontrado.
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
