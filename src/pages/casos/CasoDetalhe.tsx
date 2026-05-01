// src/pages/casos/CasoDetalhe.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import VeredictoBox from "@/components/casos/VeredictoBox";
import RefArtigo from "@/components/casos/RefArtigo";
import AcaoBtn from "@/components/ui/AcaoBtn";
import Badge from "@/components/ui/Badge";
import type { CasoDiaDia, Artigo } from "@/types";

export default function CasoDetalhe() {
  const { casoId } = useParams<{ casoId: string }>();
  const navigate = useNavigate();
  const [caso, setCaso] = useState<CasoDiaDia | null>(null);
  const [artigo, setArtigo] = useState<Artigo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!casoId) return;
    supabase
      .from("casos_dia_a_dia")
      .select("*")
      .eq("id", casoId)
      .single()
      .then(async ({ data }) => {
        setCaso(data as CasoDiaDia);
        if (data?.artigo_id) {
          const { data: art } = await supabase
            .from("artigos")
            .select("id, numero, ementa, texto_simples, texto_original, titulo_num, capitulo_num, palavras_chave")
            .eq("id", data.artigo_id)
            .single();
          setArtigo(art);
        }
        setLoading(false);
      });
  }, [casoId]);

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}>Carregando...</div>;
  if (!caso) return <div style={{ padding: 32 }}>Caso não encontrado.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <TopBar title="Caso do dia a dia" subtitle={`Art. ${artigo?.numero}º — ${artigo?.ementa ?? ""}`} showBack />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 20px" }}>
        {/* Badge categoria */}
        <div style={{ marginBottom: 12 }}>
          <Badge color="green">{caso.categoria}</Badge>
        </div>

        {/* Título */}
        <p style={{ fontSize: 17, fontWeight: 500, color: "#1a1a1a", margin: "0 0 16px", lineHeight: 1.4 }}>
          {caso.titulo}
        </p>

        {/* Situação */}
        <div style={{
          background: "#f4f6fb", borderRadius: 10, padding: 14, marginBottom: 14,
        }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>
            A situação
          </p>
          <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.6, margin: "0 0 10px" }}>
            {caso.situacao ?? ""}
          </p>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#1a3a6e", margin: 0 }}>
            {caso.pergunta ?? ""}
          </p>
        </div>

        {/* Artigo referência */}
        {artigo && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>
              O que a Constituição diz
            </p>
            <RefArtigo
              numero={`Art. ${artigo.numero}º`}
              texto={artigo.texto_simples ?? artigo.texto_original ?? ""}
            />
          </div>
        )}

        {/* Resposta */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>
            Resposta
          </p>
          <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.6, margin: 0 }}>
            {caso.resposta}
          </p>
        </div>

        {/* Veredictos */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>
            Resumo
          </p>
          <VeredictoBox positivo={caso.veredicto_positivo ?? ""} negativo={caso.veredicto_negativo ?? ""} />
        </div>

        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 0 14px" }} />

        {/* Ações */}
        <div style={{ display: "flex", gap: 8 }}>
          {artigo && (
            <AcaoBtn onClick={() => navigate(`/artigos/${artigo.id}`)}>
              Ver Art. {artigo.numero}º
            </AcaoBtn>
          )}
          <AcaoBtn primary onClick={() => navigate("/quiz")}>
            Fazer quiz ↗
          </AcaoBtn>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
