// src/pages/trilha/TrilhaQuimica.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";
import { addXP } from "@/lib/xpService";
import MapaMental from "@/components/MapaMental";

// ── Ementa de Química ─────────────────────────────────────────
const UNIDADES = [
  {
    id: "introducao",
    numero: 1,
    titulo: "Introdução à Química",
    emoji: "🔬",
    cor: "#6366f1",
    bg: "#eef2ff",
    topic: null,
    topicos: ["Método científico", "Unidades SI", "Algarismos significativos", "Análise dimensional"],
    xp: 50,
  },
  {
    id: "estrutura-atomica",
    numero: 2,
    titulo: "Estrutura Atômica",
    emoji: "⚛️",
    cor: "#0ea5e9",
    bg: "#e0f2fe",
    topic: "estrutura-atomica",
    topicos: ["Modelos atômicos", "Prótons, nêutrons, elétrons", "Isótopos", "Configuração eletrônica"],
    xp: 80,
  },
  {
    id: "tabela-periodica",
    numero: 3,
    titulo: "Tabela Periódica",
    emoji: "📊",
    cor: "#8b5cf6",
    bg: "#f5f3ff",
    topic: "tabela-periodica",
    topicos: ["Organização da tabela", "Raio atômico", "Energia de ionização", "Eletronegatividade"],
    xp: 80,
  },
  {
    id: "ligacoes-quimicas",
    numero: 4,
    titulo: "Ligações Químicas",
    emoji: "🔗",
    cor: "#f59e0b",
    bg: "#fffbeb",
    topic: "ligacoes-quimicas",
    topicos: ["Ligação iônica", "Ligação covalente", "Estruturas de Lewis", "Geometria molecular"],
    xp: 100,
  },
  {
    id: "funcoes-inorganicas",
    numero: 5,
    titulo: "Funções Inorgânicas",
    emoji: "🧪",
    cor: "#10b981",
    bg: "#ecfdf5",
    topic: null,
    topicos: ["Ácidos e bases", "Sais e óxidos", "Nomenclatura química"],
    xp: 80,
  },
  {
    id: "reacoes-quimicas",
    numero: 6,
    titulo: "Reações Químicas",
    emoji: "💥",
    cor: "#ef4444",
    bg: "#fef2f2",
    topic: "reacoes-quimicas",
    topicos: ["Tipos de reações", "Balanceamento", "Reações de oxirredução"],
    xp: 100,
  },
  {
    id: "estequiometria",
    numero: 7,
    titulo: "Estequiometria",
    emoji: "⚖️",
    cor: "#f97316",
    bg: "#fff7ed",
    topic: "estequiometria",
    topicos: ["Conceito de mol", "Massa molar", "Reagente limitante", "Rendimento"],
    xp: 120,
  },
  {
    id: "gases",
    numero: 8,
    titulo: "Estados da Matéria & Gases",
    emoji: "💨",
    cor: "#06b6d4",
    bg: "#ecfeff",
    topic: "gases",
    topicos: ["Sólidos, líquidos e gases", "Mudanças de estado", "Equação dos gases ideais"],
    xp: 100,
  },
  {
    id: "solucoes",
    numero: 9,
    titulo: "Soluções",
    emoji: "🫧",
    cor: "#3b82f6",
    bg: "#eff6ff",
    topic: "solucoes",
    topicos: ["Tipos de soluções", "Concentração mol/L", "Diluição", "Solubilidade"],
    xp: 100,
  },
];

interface Progresso {
  unidade_id: string;
  status: "nao_iniciado" | "em_andamento" | "concluido";
  xp_ganho: number;
}

interface Questao {
  id: string;
  question: string;
  explanation: string;
  answer_index: number;
  difficulty: string;
  ano: number;
}

interface QuestaoOption {
  question_id: string;
  option_index: number;
  label: string;
}

// ── Modal de questões da unidade ──────────────────────────────
function ModalQuestoes({
  unidade,
  vestibular,
  onClose,
  onConcluir,
}: {
  unidade: typeof UNIDADES[0];
  vestibular: string;
  onClose: () => void;
  onConcluir: () => void;
}) {
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [opcoes, setOpcoes] = useState<Record<string, string[]>>({});
  const [idx, setIdx] = useState(0);
  const [resposta, setResposta] = useState<number | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fim, setFim] = useState(false);

  useEffect(() => {
    if (!unidade.topic) {
      setLoading(false);
      return;
    }
    carregarQuestoes();
  }, []);

  async function carregarQuestoes() {
    const { data: qs } = await supabase
      .from("questions")
      .select("id, question, explanation, answer_index, difficulty, ano")
      .eq("vestibular", vestibular)
      .eq("topic", unidade.topic)
      .limit(5);

    if (!qs?.length) { setLoading(false); return; }

    const { data: ops } = await supabase
      .from("question_options")
      .select("question_id, option_index, label")
      .in("question_id", qs.map(q => q.id));

    const opMap: Record<string, string[]> = {};
    ops?.forEach((op: QuestaoOption) => {
      if (!opMap[op.question_id]) opMap[op.question_id] = [];
      opMap[op.question_id][op.option_index] = op.label;
    });

    setQuestoes(qs);
    setOpcoes(opMap);
    setLoading(false);
  }

  function responder(i: number) {
    if (resposta !== null) return;
    setResposta(i);
    if (i === questoes[idx].answer_index) setAcertos(a => a + 1);
  }

  function proxima() {
    if (idx + 1 >= questoes.length) {
      setFim(true);
    } else {
      setIdx(i => i + 1);
      setResposta(null);
    }
  }

  const q = questoes[idx];
  const letras = ["A", "B", "C", "D", "E"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "90dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header modal */}
        <div style={{ background: unidade.cor, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{unidade.emoji}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{unidade.titulo}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{questoes.length} questões do ITA</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading ? (
            <p style={{ textAlign: "center", color: CORES.textSub, padding: 32 }}>Carregando questões...</p>
          ) : !unidade.topic || questoes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <p style={{ fontSize: 32, margin: "0 0 12px" }}>📝</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: CORES.text, margin: "0 0 8px" }}>Sem questões ainda</p>
              <p style={{ fontSize: 12, color: CORES.textSub, margin: "0 0 20px" }}>Esta unidade ainda não tem questões mapeadas no banco.</p>
              <button onClick={() => { onConcluir(); onClose(); }} style={{ padding: "10px 24px", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Marcar como estudado ✓
              </button>
            </div>
          ) : fim ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <p style={{ fontSize: 48, margin: "0 0 12px" }}>{acertos >= questoes.length * 0.7 ? "🎉" : "📚"}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: CORES.text, margin: "0 0 8px" }}>
                {acertos}/{questoes.length} acertos
              </p>
              <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 20px" }}>
                {acertos >= questoes.length * 0.7 ? "Ótimo desempenho! Unidade concluída." : "Continue praticando para dominar o conteúdo."}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} style={{ flex: 1, padding: "11px 0", background: "#f3f4f6", color: CORES.text, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Fechar
                </button>
                <button onClick={() => { onConcluir(); onClose(); }} style={{ flex: 1, padding: "11px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Concluir ✓ +{unidade.xp} XP
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Progresso */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: CORES.textSub }}>Questão {idx + 1}/{questoes.length}</span>
                <span style={{ fontSize: 11, background: unidade.bg, color: unidade.cor, borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                  {q.ano} · {q.difficulty === "facil" ? "Fácil" : q.difficulty === "medio" ? "Médio" : "Difícil"}
                </span>
              </div>

              {/* Barra de progresso */}
              <div style={{ height: 3, background: "#f3f4f6", borderRadius: 2, marginBottom: 16 }}>
                <div style={{ width: `${((idx) / questoes.length) * 100}%`, height: "100%", background: unidade.cor, borderRadius: 2 }} />
              </div>

              {/* Enunciado */}
              <div style={{ background: unidade.bg, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${unidade.cor}22` }}>
                <p style={{ fontSize: 13, color: CORES.text, lineHeight: 1.65, margin: 0 }}>{q.question}</p>
              </div>

              {/* Alternativas */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(opcoes[q.id] ?? []).map((op, i) => {
                  const correta = i === q.answer_index;
                  const selecionada = i === resposta;
                  let bg = "#f9fafb", cor = CORES.text, border = "1px solid #e5e7eb";
                  if (resposta !== null) {
                    if (correta) { bg = "#dcfce7"; cor = "#15803d"; border = "1px solid #86efac"; }
                    else if (selecionada) { bg = "#fee2e2"; cor = "#b91c1c"; border = "1px solid #fca5a5"; }
                  }
                  return (
                    <button key={i} onClick={() => responder(i)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, border, background: bg, cursor: resposta !== null ? "default" : "pointer", textAlign: "left" }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: selecionada || (resposta !== null && correta) ? unidade.cor : "#e5e7eb", color: selecionada || (resposta !== null && correta) ? "#fff" : "#666", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{letras[i]}</span>
                      <span style={{ fontSize: 13, color: cor, lineHeight: 1.5 }}>{op}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explicação */}
              {resposta !== null && (
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: 12, marginTop: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#0284c7", margin: "0 0 4px" }}>💡 Explicação</p>
                  <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.6 }}>{q.explanation}</p>
                </div>
              )}

              {resposta !== null && (
                <button onClick={proxima} style={{ width: "100%", marginTop: 14, padding: "12px 0", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {idx + 1 >= questoes.length ? "Ver resultado 🎉" : "Próxima →"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function TrilhaQuimica() {
  const { vestibular = "ITA" } = useParams<{ vestibular: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [progresso, setProgresso] = useState<Record<string, Progresso>>({});
  const [unidadeAberta, setUnidadeAberta] = useState<typeof UNIDADES[0] | null>(null);
  const [mapaMentalAberto, setMapaMentalAberto] = useState(false);
  const [loading, setLoading] = useState(true);

  const vestUpper = vestibular.toUpperCase();
  const corVest = vestUpper === "ITA" ? "#003D80" : vestUpper === "IME" ? "#1a3a6e" : "#005C97";

  useEffect(() => {
    if (user?.id) carregarProgresso();
  }, [user?.id]);

  async function carregarProgresso() {
    const { data } = await supabase
      .from("trilha_progresso")
      .select("unidade_id, status, xp_ganho")
      .eq("user_id", user!.id)
      .eq("vestibular", vestUpper)
      .eq("materia", "quimica");

    const map: Record<string, Progresso> = {};
    data?.forEach(p => { map[p.unidade_id] = p; });
    setProgresso(map);
    setLoading(false);
  }

  async function concluirUnidade(unidadeId: string, xp: number) {
    if (!user?.id) return;
    await supabase.from("trilha_progresso").upsert({
      user_id: user.id,
      vestibular: vestUpper,
      materia: "quimica",
      unidade_id: unidadeId,
      status: "concluido",
      xp_ganho: xp,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "user_id,vestibular,materia,unidade_id" });

    // Adiciona XP ao perfil
    await addXP(user.id, xp);

    setProgresso(prev => ({
      ...prev,
      [unidadeId]: { unidade_id: unidadeId, status: "concluido", xp_ganho: xp },
    }));
  }

  const totalXP = Object.values(progresso).reduce((acc, p) => acc + (p.xp_ganho ?? 0), 0);
  const concluidas = Object.values(progresso).filter(p => p.status === "concluido").length;
  const pct = Math.round((concluidas / UNIDADES.length) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      {/* Mapa Mental */}
      {mapaMentalAberto && (
        <MapaMental
          unidades={UNIDADES}
          titulo="Química — Ensino Médio"
          onClose={() => setMapaMentalAberto(false)}
          onSelecionarUnidade={(id) => {
            const u = UNIDADES.find(u => u.id === id);
            if (u) setUnidadeAberta(u);
          }}
          progresso={progresso}
        />
      )}

      {/* Modal de questões */}
      {unidadeAberta && (
        <ModalQuestoes
          unidade={unidadeAberta}
          vestibular={vestUpper}
          onClose={() => setUnidadeAberta(null)}
          onConcluir={() => concluirUnidade(unidadeAberta.id, unidadeAberta.xp)}
        />
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${corVest}, ${corVest}dd)`, padding: "16px 16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>🧪 Trilha de Química</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{vestUpper} · Química Geral I</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#fbbf24", margin: 0 }}>⚡ {totalXP} XP</p>
            <button
              onClick={() => setMapaMentalAberto(true)}
              style={{ fontSize: 10, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 99, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}
            >
              🗺️ Mapa Mental
            </button>
          </div>
        </div>

        {/* Barra de progresso geral */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Progresso geral</span>
            <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #fbbf24, #f59e0b)", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>
      </div>

      {/* Lista de unidades */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: CORES.textSub, padding: 32 }}>Carregando trilha...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {UNIDADES.map((u, i) => {
              const prog = progresso[u.id];
              const concluida = prog?.status === "concluido";
              const anterior = i === 0 || progresso[UNIDADES[i-1].id]?.status === "concluido";
              const bloqueada = !anterior && !concluida;

              return (
                <button
                  key={u.id}
                  onClick={() => !bloqueada && setUnidadeAberta(u)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 16,
                    background: bloqueada ? "#f9fafb" : concluida ? u.bg : CORES.bgCard,
                    border: concluida ? `2px solid ${u.cor}44` : bloqueada ? "1.5px solid #e5e7eb" : `1.5px solid ${u.cor}22`,
                    cursor: bloqueada ? "not-allowed" : "pointer",
                    textAlign: "left",
                    boxShadow: concluida ? `0 2px 12px ${u.cor}20` : "0 1px 4px rgba(0,0,0,0.06)",
                    opacity: bloqueada ? 0.6 : 1,
                  }}
                >
                  {/* Ícone */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: bloqueada ? "#f3f4f6" : u.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26, border: `1.5px solid ${bloqueada ? "#e5e7eb" : u.cor + "33"}`,
                    position: "relative",
                  }}>
                    {bloqueada ? "🔒" : u.emoji}
                    {concluida && (
                      <div style={{ position: "absolute", bottom: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", border: "2px solid #fff" }}>✓</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: bloqueada ? "#9ca3af" : u.cor, background: bloqueada ? "#f3f4f6" : u.bg, borderRadius: 4, padding: "1px 6px" }}>
                        U{u.numero}
                      </span>
                      {concluida && <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e" }}>+{u.xp} XP ✓</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: bloqueada ? "#9ca3af" : CORES.text, margin: "0 0 3px" }}>{u.titulo}</p>
                    <p style={{ fontSize: 11, color: CORES.textSub, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.topicos.slice(0, 2).join(" · ")}
                    </p>
                  </div>

                  {/* Direita */}
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {u.topic ? (
                      <span style={{ fontSize: 10, color: bloqueada ? "#9ca3af" : u.cor, fontWeight: 600 }}>
                        📝 questões
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>teoria</span>
                    )}
                    {!bloqueada && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={u.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Info box */}
        <div style={{ marginTop: 16, background: "#f0f6ff", borderRadius: 12, padding: "12px 14px", border: "1px solid #bfdbfe" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: CORES.primary, margin: "0 0 4px" }}>💡 Como funciona</p>
          <p style={{ fontSize: 12, color: CORES.textSub, margin: 0, lineHeight: 1.6 }}>
            Complete as unidades em ordem. Cada unidade tem questões reais do {vestUpper} filtradas por tema. Ganhe XP ao concluir!
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
