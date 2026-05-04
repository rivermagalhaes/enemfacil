// src/components/MapaMental.tsx
import { useState } from "react";

interface Unidade {
  id: string;
  numero: number;
  titulo: string;
  emoji: string;
  cor: string;
  bg: string;
  topicos: string[];
  xp: number;
}

interface Props {
  unidades: Unidade[];
  titulo: string;
  onClose: () => void;
  onSelecionarUnidade: (unidadeId: string) => void;
  progresso?: Record<string, { status: string }>;
}

export default function MapaMental({ unidades, titulo, onClose, onSelecionarUnidade, progresso = {} }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Layout: nó central + nós ao redor em elipse
  const CX = 300; // centro X
  const CY = 320; // centro Y
  const RX = 220; // raio horizontal
  const RY = 240; // raio vertical

  const nos = unidades.map((u, i) => {
    const angulo = (2 * Math.PI * i) / unidades.length - Math.PI / 2;
    return {
      ...u,
      x: CX + RX * Math.cos(angulo),
      y: CY + RY * Math.sin(angulo),
      concluida: progresso[u.id]?.status === "concluido",
    };
  });

  const selected = nos.find(n => n.id === selectedId);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.75)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-end",
    }}>
      <div style={{
        background: "#0a0f1e",
        borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 480,
        maxHeight: "92dvh",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>🗺️ Mapa Mental</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0 }}>{titulo}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* SVG Mind Map */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <svg
            viewBox="0 0 600 640"
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            {/* Gradiente de fundo */}
            <defs>
              <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1a1a3e" />
                <stop offset="100%" stopColor="#0a0f1e" />
              </radialGradient>
              {nos.map(n => (
                <radialGradient key={`grad-${n.id}`} id={`grad-${n.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={n.cor} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={n.cor} stopOpacity="0.6" />
                </radialGradient>
              ))}
            </defs>

            <rect width="600" height="640" fill="url(#bgGrad)" />

            {/* Linhas de conexão */}
            {nos.map(n => (
              <line
                key={`line-${n.id}`}
                x1={CX} y1={CY}
                x2={n.x} y2={n.y}
                stroke={n.concluida ? n.cor : "rgba(255,255,255,0.12)"}
                strokeWidth={hoverId === n.id || selectedId === n.id ? 2.5 : 1.5}
                strokeDasharray={n.concluida ? "none" : "4 3"}
                style={{ transition: "all 0.3s" }}
              />
            ))}

            {/* Nó central */}
            <circle cx={CX} cy={CY} r={48} fill="#1a1a3e" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
            <circle cx={CX} cy={CY} r={44} fill="#0057FF" fillOpacity={0.15} />
            <text x={CX} y={CY - 8} textAnchor="middle" fontSize={22} fill="#fff">🎯</text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize={9} fontWeight="700" fill="rgba(255,255,255,0.8)" letterSpacing="0.5">TRILHA</text>
            <text x={CX} y={CY + 22} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.5)">{unidades.length} unidades</text>

            {/* Nós das unidades */}
            {nos.map(n => {
              const isHover = hoverId === n.id;
              const isSelected = selectedId === n.id;
              const r = isHover || isSelected ? 32 : 28;
              return (
                <g
                  key={n.id}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => setSelectedId(selectedId === n.id ? null : n.id)}
                >
                  {/* Halo de conclusão */}
                  {n.concluida && (
                    <circle
                      cx={n.x} cy={n.y} r={r + 6}
                      fill="none"
                      stroke={n.cor}
                      strokeWidth={1.5}
                      strokeOpacity={0.4}
                    />
                  )}

                  {/* Círculo principal */}
                  <circle
                    cx={n.x} cy={n.y} r={r}
                    fill={isSelected ? n.cor : `url(#grad-${n.id})`}
                    fillOpacity={isSelected ? 1 : isHover ? 0.9 : 0.75}
                    stroke={isSelected ? "#fff" : n.cor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    style={{ transition: "all 0.2s" }}
                  />

                  {/* Emoji */}
                  <text
                    x={n.x} y={n.y - 4}
                    textAnchor="middle"
                    fontSize={isHover || isSelected ? 16 : 14}
                    style={{ transition: "all 0.2s" }}
                  >
                    {n.concluida ? "✅" : n.emoji}
                  </text>

                  {/* Número */}
                  <text
                    x={n.x} y={n.y + 11}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight="700"
                    fill="#fff"
                    fillOpacity={0.9}
                  >
                    U{n.numero}
                  </text>

                  {/* Label do título — fora do círculo */}
                  <text
                    x={n.x}
                    y={n.y + r + 14}
                    textAnchor="middle"
                    fontSize={8.5}
                    fontWeight={isSelected ? "700" : "500"}
                    fill={isSelected ? n.cor : "rgba(255,255,255,0.7)"}
                    style={{ transition: "all 0.2s" }}
                  >
                    {n.titulo.length > 14 ? n.titulo.substring(0, 13) + "…" : n.titulo}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Painel de detalhes da unidade selecionada */}
          {selected && (
            <div style={{
              margin: "0 14px 14px",
              background: `${selected.cor}15`,
              border: `1.5px solid ${selected.cor}44`,
              borderRadius: 14,
              padding: 14,
              animation: "fadeIn 0.2s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: selected.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {selected.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>
                    U{selected.numero} — {selected.titulo}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                    ⚡ {selected.xp} XP {progresso[selected.id]?.status === "concluido" ? "· ✅ Concluída" : ""}
                  </p>
                </div>
              </div>

              {/* Tópicos */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                {selected.topicos.map((t, i) => (
                  <span key={i} style={{
                    fontSize: 10, background: `${selected.cor}25`,
                    color: selected.cor, borderRadius: 99,
                    padding: "3px 9px", fontWeight: 600,
                    border: `1px solid ${selected.cor}33`,
                  }}>
                    {t}
                  </span>
                ))}
              </div>

              <button
                onClick={() => { onSelecionarUnidade(selected.id); onClose(); }}
                style={{
                  width: "100%", padding: "10px 0",
                  background: selected.cor, color: "#fff",
                  border: "none", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                Ir para esta unidade →
              </button>
            </div>
          )}

          {/* Legenda */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", padding: "0 14px 20px" }}>
            {[
              { cor: "rgba(255,255,255,0.3)", label: "Não iniciada", dash: true },
              { cor: "#22c55e", label: "Concluída", dash: false },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="20" height="8">
                  <line x1="0" y1="4" x2="20" y2="4" stroke={l.cor} strokeWidth="2" strokeDasharray={l.dash ? "3 2" : "none"} />
                </svg>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
