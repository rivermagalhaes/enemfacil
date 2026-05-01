// src/pages/agente/AgenteEnem.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { CORES, AREAS } from "@/styles/theme";

interface Mensagem {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  area?: string;
}

const SUGESTOES = [
  "Como funciona a fotossíntese?",
  "O que foi a Revolução Francesa?",
  "Como resolver equações do 2° grau?",
  "Quais as características do Modernismo?",
  "O que é globalização?",
  "Como funciona a lei de Mendel?",
  "O que é imperialismo?",
  "Como interpretar gráficos no ENEM?",
];

function identificarArea(texto: string): string {
  const t = texto.toLowerCase();
  if (/fotossíntese|célula|dna|genética|evolução|ecologia|física|química|reação|mol|energia|força|velocidade|onda/.test(t)) return "natureza";
  if (/história|guerra|revolução|política|geografia|clima|bioma|mapa|população|cultura|filosofia|sociologia/.test(t)) return "humanas";
  if (/equação|função|geometria|trigonometria|estatística|probabilidade|matriz|logaritmo|número|cálculo/.test(t)) return "matematica";
  if (/texto|interpretação|gramática|literatura|redação|poesia|romance|modernismo|língua|verbo|sujeito/.test(t)) return "linguagens";
  return "geral";
}

async function consultarIA(pergunta: string, historico: Mensagem[]): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `Você é um professor especializado no ENEM, didático e motivador. 
Responda de forma clara, objetiva e com exemplos práticos.
Use linguagem acessível para estudantes do ensino médio.
Quando relevante, mencione como o tema costuma ser cobrado no ENEM.
Organize sua resposta com emojis para facilitar a leitura.
Mantenha respostas concisas (máximo 400 palavras).
Idioma: Português brasileiro.`,
      messages: [
        ...historico.filter(m => !m.loading && m.content).map(m => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: pergunta },
      ],
    }),
  });

  if (!response.ok) throw new Error("Erro ao consultar IA");
  const data = await response.json();
  return data.content?.[0]?.text ?? "Não foi possível obter uma resposta.";
}

export default function AgenteEnem() {
  const navigate = useNavigate();
  const [mensagens, setMensagens] = useState<Mensagem[]>([{
    role: "assistant",
    content: "Olá! 👋 Sou seu professor particular para o ENEM!\n\nPosso te ajudar com qualquer matéria: Matemática, Português, História, Geografia, Física, Química, Biologia e muito mais.\n\nO que você quer aprender hoje?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  async function enviar(pergunta?: string) {
    const texto = (pergunta ?? input).trim();
    if (!texto || loading) return;
    setInput(""); setLoading(true);

    const area = identificarArea(texto);
    setMensagens(prev => [...prev,
      { role: "user", content: texto },
      { role: "assistant", content: "", loading: true, area },
    ]);

    try {
      const resposta = await consultarIA(texto, mensagens);
      setMensagens(prev => [...prev.slice(0, -1), {
        role: "assistant", content: resposta, area,
      }]);
    } catch {
      setMensagens(prev => [...prev.slice(0, -1), {
        role: "assistant",
        content: "Desculpe, não consegui processar sua pergunta. Tente novamente! 😊",
      }]);
    } finally { setLoading(false); }
  }

  const areaConfig = (areaId: string) => AREAS.find(a => a.id === areaId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: CORES.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${CORES.bgDark}, #0D1F3C)`, padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #6D28D9, #4C1D95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>Professor IA</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>Especialista em ENEM · Online</p>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {AREAS.slice(0, 4).map(a => (
              <span key={a.id} style={{ fontSize: 10, background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: 4, padding: "2px 5px", fontWeight: 600 }}>{a.emoji}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        {mensagens.map((msg, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>

            {msg.role === "assistant" && msg.area && msg.area !== "geral" && (() => {
              const area = areaConfig(msg.area);
              return area ? (
                <span style={{ fontSize: 9, fontWeight: 600, background: area.bg, color: area.cor, borderRadius: 4, padding: "2px 7px" }}>
                  {area.emoji} {area.label}
                </span>
              ) : null;
            })()}

            <div style={{
              maxWidth: "85%", padding: "10px 14px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? CORES.primary : CORES.bgCard,
              color: msg.role === "user" ? "#fff" : CORES.text,
              fontSize: 13, lineHeight: 1.6,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}>
              {msg.loading ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: CORES.primary, animation: `bounce 1.2s ${i*0.2}s ease-in-out infinite` }} />
                  ))}
                  <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
                </div>
              ) : (
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {/* Sugestões iniciais */}
        {mensagens.length === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 11, color: CORES.textSub, margin: "8px 0 4px", textAlign: "center" }}>Perguntas frequentes</p>
            {SUGESTOES.map((s, i) => (
              <button key={i} onClick={() => enviar(s)} style={{
                padding: "9px 14px", borderRadius: 10,
                border: `1px solid ${CORES.border}`,
                background: CORES.bgCard, cursor: "pointer",
                textAlign: "left", fontSize: 12, color: CORES.primary, lineHeight: 1.4,
              }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: CORES.bgCard, borderTop: `0.5px solid ${CORES.border}`, padding: "10px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Pergunte sobre qualquer matéria do ENEM..." rows={1}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: `1px solid ${CORES.border}`, fontSize: 13, outline: "none", resize: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", fontFamily: "inherit", background: CORES.bg }}
          />
          <button onClick={() => enviar()} disabled={loading || !input.trim()} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: loading || !input.trim() ? "#e5e7eb" : CORES.primary, color: "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s", boxShadow: loading || !input.trim() ? "none" : `0 4px 12px ${CORES.primary}40` }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 10l14-7-7 14V10H3z"/></svg>
          </button>
        </div>
        <p style={{ fontSize: 10, color: CORES.textSub, margin: "6px 0 0", textAlign: "center" }}>
          IA especializada no ENEM · Não substitui o estudo regular
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
