// src/pages/artigos/ArtigoDetalhe.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import ToggleModo from "@/components/artigos/ToggleModo";
import CardInciso from "@/components/artigos/CardInciso";
import TagsPalavrasChave from "@/components/artigos/TagsPalavrasChave";
import AcaoBtn from "@/components/ui/AcaoBtn";
import type { Artigo, Inciso } from "@/types";

export default function ArtigoDetalhe() {
  const { artigoId } = useParams<{ artigoId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [artigo, setArtigo] = useState<Artigo | null>(null);
  const [incisos, setIncisos] = useState<Inciso[]>([]);
  const [modo, setModo] = useState<"facil" | "original">("facil");
  const [salvo, setSalvo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artigoId) return;

    Promise.all([
      supabase.from("artigos").select("*").eq("id", artigoId).single(),
      supabase.from("incisos").select("*").eq("artigo_id", artigoId).order("ordem"),
    ]).then(([{ data: art }, { data: inc }]) => {
      setArtigo(art);
      setIncisos(inc ?? []);
      setLoading(false);
    });

    // Verifica se está salvo
    if (profile) {
      supabase
        .from("artigos_salvos")
        .select("id")
        .eq("user_id", profile.id)
        .eq("artigo_id", artigoId)
        .maybeSingle()
        .then(({ data }) => setSalvo(!!data));
    }
  }, [artigoId, profile]);

  async function toggleSalvar() {
    if (!profile || !artigoId) return;
    if (salvo) {
      await supabase
        .from("artigos_salvos")
        .delete()
        .eq("user_id", profile.id)
        .eq("artigo_id", artigoId);
      setSalvo(false);
    } else {
      await supabase
        .from("artigos_salvos")
        .insert({ user_id: profile.id, artigo_id: artigoId });
      setSalvo(true);
    }
  }

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}>Carregando...</div>;
  if (!artigo) return <div style={{ padding: 32 }}>Artigo não encontrado.</div>;

  const textoBody =
    modo === "facil" && artigo.texto_simples
      ? artigo.texto_simples
      : artigo.texto_original;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* TopBar com botão de favoritar */}
      <div style={{ background: "#1a3a6e", padding: "10px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#fff" }}>
            Artigos simplificados
          </span>
          <button
            onClick={toggleSalvar}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill={salvo ? "#f0c040" : "none"} stroke={salvo ? "#f0c040" : "#fff"} strokeWidth="1.5">
              <path d="M8 12.5S2 9 2 5a3 3 0 016 0 3 3 0 016 0c0 4-6 7.5-6 7.5z" />
            </svg>
          </button>
        </div>
        <ToggleModo modo={modo} onChange={setModo} />
      </div>

      {/* Barra de leitura */}
      <div style={{ height: 3, background: "rgba(0,0,0,0.06)" }}>
        <div style={{ height: "100%", width: "35%", background: "#1a3a6e" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 14 }}>
          <span style={{
            fontSize: 11, fontWeight: 500, background: "#E6F1FB", color: "#0C447C",
            borderRadius: 99, padding: "3px 10px", display: "inline-block", marginBottom: 6,
          }}>
            Art. {artigo.numero}º
          </span>
          <p style={{ fontSize: 16, fontWeight: 500, color: "#1a1a1a", margin: "0 0 3px" }}>
            {artigo.ementa}
          </p>
        </div>

        {/* Corpo do artigo */}
        {modo === "original" ? (
          <div style={{
            fontSize: 12, color: "#444", lineHeight: 1.65,
            padding: "10px 12px", background: "#f4f6fb",
            borderRadius: 8, borderLeft: "3px solid #B5D4F4",
            borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
            fontFamily: "Georgia, serif", marginBottom: 14,
          }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: "#185FA5", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px", fontFamily: "var(--font-sans)" }}>
              Texto constitucional
            </p>
            {textoBody}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.65, marginBottom: 14 }}>
            {textoBody}
          </p>
        )}

        {/* Palavras-chave */}
        <TagsPalavrasChave tags={artigo.palavras_chave ?? []} />

        {/* Incisos */}
        {incisos.length > 0 && (
          <>
            <p style={{
              fontSize: 12, fontWeight: 500, color: "#666",
              margin: "0 0 8px", textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              {modo === "facil" ? "Principais garantias" : "Incisos e parágrafos"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
              {incisos.map((i) => (
                <CardInciso key={i.id} inciso={i} modo={modo} />
              ))}
            </div>
          </>
        )}

        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0 14px" }} />

        {/* Ações */}
        <div style={{ display: "flex", gap: 8 }}>
          <AcaoBtn onClick={() => navigate("/casos")}>Ver casos reais</AcaoBtn>
          <AcaoBtn primary onClick={() => navigate(`/quiz/${artigoId}`)}>Fazer quiz ↗</AcaoBtn>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
