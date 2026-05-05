// src/components/ui/FeedbackModal.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contexto?: string; // ex: 'simulado_ENEM', 'quiz', etc.
}

type Tipo = "geral" | "bug" | "sugestao" | "elogio";

const TIPOS: { id: Tipo; emoji: string; label: string; cor: string }[] = [
  { id: "elogio",   emoji: "😍", label: "Elogio",    cor: "#22c55e" },
  { id: "sugestao", emoji: "💡", label: "Sugestão",  cor: "#f59e0b" },
  { id: "bug",      emoji: "🐛", label: "Bug",       cor: "#ef4444" },
  { id: "geral",    emoji: "💬", label: "Geral",     cor: "#0057FF" },
];

export default function FeedbackModal({ isOpen, onClose, contexto }: Props) {
  const { user } = useAuth();
  const [estrelas, setEstrelas] = useState(0);
  const [estrelasHover, setEstrelasHover] = useState(0);
  const [tipo, setTipo] = useState<Tipo>("geral");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    if (estrelas === 0) return;
    setEnviando(true);
    await supabase.from("feedbacks").insert({
      user_id: user?.id ?? null,
      tipo,
      estrelas,
      comentario: comentario.trim() || null,
      contexto: contexto ?? null,
    });
    setEnviando(false);
    setEnviado(true);
    setTimeout(() => {
      setEnviado(false);
      setEstrelas(0);
      setTipo("geral");
      setComentario("");
      onClose();
    }, 1800);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, backdropFilter: "blur(3px)" }}
      />

      {/* Modal deslizante */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001,
        background: "#fff", borderRadius: "20px 20px 0 0",
        padding: "0 20px 32px",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
        animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e0e0e0" }} />
        </div>

        {enviado ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ fontSize: 48, margin: "0 0 8px" }}>🙏</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Obrigado!</p>
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Seu feedback foi enviado com sucesso.</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Como foi sua experiência?</p>
              <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Sua opinião nos ajuda a melhorar 🚀</p>
            </div>

            {/* Estrelas */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setEstrelas(n)}
                  onMouseEnter={() => setEstrelasHover(n)}
                  onMouseLeave={() => setEstrelasHover(0)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    fontSize: 36,
                    transition: "transform 0.15s",
                    transform: (estrelasHover || estrelas) >= n ? "scale(1.15)" : "scale(1)",
                    filter: (estrelasHover || estrelas) >= n ? "none" : "grayscale(1) opacity(0.3)",
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>

            {/* Tipo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
              {TIPOS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  style={{
                    padding: "10px 4px", borderRadius: 12, border: "none", cursor: "pointer",
                    background: tipo === t.id ? `${t.cor}15` : "#f4f6fb",
                    outline: tipo === t.id ? `2px solid ${t.cor}` : "none",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: tipo === t.id ? t.cor : "#888" }}>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Comentário */}
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Conte mais (opcional)..."
              rows={3}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none",
                resize: "none", boxSizing: "border-box", fontFamily: "inherit",
                marginBottom: 14, background: "#fafafa", color: "#1a1a1a",
              }}
            />

            {/* Botão enviar */}
            <button
              onClick={enviar}
              disabled={estrelas === 0 || enviando}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                background: estrelas === 0 ? "#e0e0e0" : "linear-gradient(90deg,#0057FF,#0ea5e9)",
                color: estrelas === 0 ? "#aaa" : "#fff",
                fontSize: 15, fontWeight: 700,
                cursor: estrelas === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {enviando ? "Enviando..." : "Enviar feedback →"}
            </button>

            <button
              onClick={onClose}
              style={{ width: "100%", marginTop: 8, padding: "10px 0", background: "transparent", border: "none", fontSize: 13, color: "#aaa", cursor: "pointer" }}
            >
              Agora não
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </>
  );
}
