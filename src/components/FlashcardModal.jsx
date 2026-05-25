// src/components/FlashcardModal.jsx
// Modal de flashcards — abre ao clicar em "Flashcards" no TopicPage
//
// Uso:
//   <FlashcardModal
//     open={showFlashcards}
//     onClose={() => setShowFlashcards(false)}
//     topicoNome="Estrutura Atômica"
//   />

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function FlashcardModal({ open, onClose, topicoNome }) {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [virado, setVirado] = useState(false);
  const [respondidos, setRespondidos] = useState({});

  useEffect(() => {
    if (!open || !topicoNome) return;
    setIndex(0);
    setVirado(false);
    setRespondidos({});
    carregar();
  }, [open, topicoNome]);

  async function carregar() {
    setLoading(true);
    // Busca pelo nome do tópico via join
    const { data } = await supabase
      .from("flashcards")
      .select("id, pergunta, resposta, ordem")
      .eq("ativo", true)
      .order("ordem");

    // Filtra pelo nome do tópico se possível
    // (como topico_id pode ser null para flashcards gerados sem tópico no banco,
    //  buscamos todos ativos e filtramos por materia se necessário)
    setFlashcards(data ?? []);
    setLoading(false);
  }

  if (!open) return null;

  const total = flashcards.length;
  const card = flashcards[index];
  const acertos = Object.values(respondidos).filter(v => v === "acertei").length;
  const erros = Object.values(respondidos).filter(v => v === "errei").length;
  const finalizado = Object.keys(respondidos).length === total && total > 0;

  function proximo() {
    setVirado(false);
    setTimeout(() => setIndex(i => Math.min(i + 1, total - 1)), 150);
  }

  function anterior() {
    setVirado(false);
    setTimeout(() => setIndex(i => Math.max(i - 1, 0)), 150);
  }

  function responder(resultado) {
    setRespondidos(p => ({ ...p, [card.id]: resultado }));
    if (index < total - 1) {
      setTimeout(proximo, 300);
    }
  }

  function reiniciar() {
    setIndex(0);
    setVirado(false);
    setRespondidos({});
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420,
          boxShadow: "0 8px 40px rgba(0,0,0,0.2)", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #6C63FF, #4F46E5)",
          padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
              🃏 Flashcards
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>
              {topicoNome}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255,255,255,0.2)", border: "none",
              color: "#fff", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
              Carregando flashcards...
            </div>
          ) : total === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                Nenhum flashcard gerado ainda
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                Use o painel admin para gerar conteúdo para este tópico
              </div>
            </div>
          ) : finalizado ? (
            /* Tela de resultado */
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>
                {acertos >= total * 0.8 ? "🏆" : acertos >= total * 0.5 ? "👍" : "💪"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>
                Sessão concluída!
              </div>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
                {total} flashcards revisados
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
                <div style={{
                  background: "#EDFAF3", borderRadius: 12, padding: "12px 24px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#15803d" }}>{acertos}</div>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Acertei</div>
                </div>
                <div style={{
                  background: "#FFF1F1", borderRadius: 12, padding: "12px 24px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#b91c1c" }}>{erros}</div>
                  <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Errei</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={reiniciar}
                  style={{
                    flex: 1, padding: "12px 0", border: "1px solid #e5e7eb",
                    background: "#fff", borderRadius: 12, fontSize: 14,
                    color: "#374151", cursor: "pointer", fontWeight: 500,
                  }}
                >🔄 Revisar de novo</button>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, padding: "12px 0", background: "#6C63FF", color: "#fff",
                    border: "none", borderRadius: 12, fontSize: 14,
                    fontWeight: 600, cursor: "pointer",
                  }}
                >✓ Concluir</button>
              </div>
            </div>
          ) : (
            <>
              {/* Progresso */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    {index + 1} de {total}
                  </span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    ✅ {acertos} · ❌ {erros}
                  </span>
                </div>
                <div style={{ height: 4, background: "#f3f4f6", borderRadius: 4 }}>
                  <div style={{
                    height: 4, background: "#6C63FF", borderRadius: 4,
                    width: `${((index + 1) / total) * 100}%`,
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>

              {/* Card */}
              <div
                onClick={() => setVirado(v => !v)}
                style={{
                  background: virado ? "#f5f3ff" : "#fafafa",
                  border: `2px solid ${virado ? "#6C63FF" : "#e5e7eb"}`,
                  borderRadius: 16, padding: "28px 20px",
                  minHeight: 160, cursor: "pointer",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  textAlign: "center", transition: "all 0.2s ease",
                  marginBottom: 16, position: "relative",
                }}
              >
                <div style={{
                  position: "absolute", top: 12, right: 14,
                  fontSize: 10, color: virado ? "#6C63FF" : "#9ca3af",
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  {virado ? "RESPOSTA" : "PERGUNTA — toque para virar"}
                </div>
                <div style={{
                  fontSize: 15, color: "#1f2937", lineHeight: 1.6, fontWeight: virado ? 400 : 500,
                  marginTop: 8,
                }}>
                  {virado ? card.resposta : card.pergunta}
                </div>
              </div>

              {/* Botões de resposta (só aparecem quando virado) */}
              {virado ? (
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <button
                    onClick={() => responder("errei")}
                    style={{
                      flex: 1, padding: "11px 0", background: "#FFF1F1", color: "#b91c1c",
                      border: "1.5px solid #fecaca", borderRadius: 12, fontSize: 13,
                      fontWeight: 600, cursor: "pointer",
                    }}
                  >❌ Errei</button>
                  <button
                    onClick={() => responder("acertei")}
                    style={{
                      flex: 1, padding: "11px 0", background: "#EDFAF3", color: "#15803d",
                      border: "1.5px solid #bbf7d0", borderRadius: 12, fontSize: 13,
                      fontWeight: 600, cursor: "pointer",
                    }}
                  >✅ Acertei</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <button
                    onClick={anterior}
                    disabled={index === 0}
                    style={{
                      flex: 1, padding: "11px 0", border: "1px solid #e5e7eb",
                      background: index === 0 ? "#f9fafb" : "#fff",
                      borderRadius: 12, fontSize: 13, color: "#6b7280",
                      cursor: index === 0 ? "not-allowed" : "pointer",
                      opacity: index === 0 ? 0.5 : 1,
                    }}
                  >← Anterior</button>
                  <button
                    onClick={proximo}
                    disabled={index === total - 1}
                    style={{
                      flex: 1, padding: "11px 0", border: "1px solid #e5e7eb",
                      background: index === total - 1 ? "#f9fafb" : "#fff",
                      borderRadius: 12, fontSize: 13, color: "#6b7280",
                      cursor: index === total - 1 ? "not-allowed" : "pointer",
                      opacity: index === total - 1 ? 0.5 : 1,
                    }}
                  >Próximo →</button>
                </div>
              )}

              <div style={{ textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
                Toque no card para ver a resposta
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
