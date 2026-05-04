// src/pages/trilha/TrilhaFisicoQuimica.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

// ── Ementa de Físico-Química ───────────────────────────────────
const UNIDADES = [
  {
    id: "introducao-fisicoquimica",
    numero: 1,
    titulo: "Introdução à Físico-Química",
    emoji: "⚗️",
    cor: "#6366f1",
    bg: "#eef2ff",
    topic: null,
    topicos: ["O que é físico-química", "Sistemas e transformações", "Grandezas físicas e químicas", "Unidades e medidas"],
    xp: 50,
  },
  {
    id: "termoquimica",
    numero: 2,
    titulo: "Termoquímica",
    emoji: "🔥",
    cor: "#ef4444",
    bg: "#fef2f2",
    topic: "termoquimica",
    topicos: ["Reações endotérmicas e exotérmicas", "Entalpia (ΔH)", "Lei de Hess", "Energia de ligação"],
    xp: 100,
  },
  {
    id: "cinetica-quimica",
    numero: 3,
    titulo: "Cinética Química",
    emoji: "⚡",
    cor: "#f59e0b",
    bg: "#fffbeb",
    topic: "cinetica-quimica",
    topicos: ["Velocidade das reações", "Teoria das colisões", "Fatores: temperatura, concentração, catalisadores", "Energia de ativação"],
    xp: 100,
  },
  {
    id: "equilibrio-quimico",
    numero: 4,
    titulo: "Equilíbrio Químico",
    emoji: "⚖️",
    cor: "#10b981",
    bg: "#ecfdf5",
    topic: "equilibrio-quimico",
    topicos: ["Reações reversíveis", "Constante de equilíbrio (Kc)", "Princípio de Le Chatelier", "Deslocamento do equilíbrio"],
    xp: 120,
  },
  {
    id: "equilibrio-ionico",
    numero: 5,
    titulo: "Equilíbrio Iônico",
    emoji: "🧫",
    cor: "#8b5cf6",
    bg: "#f5f3ff",
    topic: "equilibrio-ionico",
    topicos: ["Ácidos e bases (Arrhenius, Brønsted-Lowry)", "pH e pOH", "Escala de pH", "Força de ácidos e bases"],
    xp: 100,
  },
  {
    id: "eletroquimica",
    numero: 6,
    titulo: "Eletroquímica",
    emoji: "🔋",
    cor: "#0ea5e9",
    bg: "#e0f2fe",
    topic: "eletroquimica",
    topicos: ["Reações de oxirredução", "Pilhas (células galvânicas)", "Potencial de eletrodo", "Eletrólise"],
    xp: 120,
  },
  {
    id: "propriedades-coligativas",
    numero: 7,
    titulo: "Soluções e Propriedades Coligativas",
    emoji: "🫧",
    cor: "#3b82f6",
    bg: "#eff6ff",
    topic: "propriedades-coligativas",
    topicos: ["Tipos de soluções", "Pressão de vapor", "Ebulição e congelamento", "Osmose"],
    xp: 100,
  },
  {
    id: "gases-fisicoquimica",
    numero: 8,
    titulo: "Gases",
    emoji: "💨",
    cor: "#06b6d4",
    bg: "#ecfeff",
    topic: "gases",
    topicos: ["Propriedades dos gases", "Transformações gasosas", "Lei dos gases ideais", "Pressão, volume e temperatura"],
    xp: 100,
  },
  {
    id: "aplicacoes-cotidiano",
    numero: 9,
    titulo: "Aplicações no Cotidiano",
    emoji: "🌍",
    cor: "#22c55e",
    bg: "#f0fdf4",
    topic: null,
    topicos: ["Energia e combustíveis", "Processos industriais", "Química ambiental", "Tecnologias: baterias e materiais"],
    xp: 80,
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
    if (!unidade.topic) { setLoading(false); return; }
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
      onConcluir();
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
        <div style={{ background: unidade.cor, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {unidade.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{unidade.titulo}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>⚡ {unidade.xp} XP ao concluir</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 18, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

          {/* Tópicos */}
          <div style={{ background: unidade.bg, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${unidade.cor}22` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: unidade.cor, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>📋 Tópicos desta unidade</p>
            {unidade.topicos.map((t, i) => (
              <p key={i} style={{ fontSize: 13, color: CORES.text, margin: "0 0 4px", display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ color: unidade.cor, fontWeight: 700, flexShrink: 0 }}>•</span> {t}
              </p>
            ))}
          </div>

          {loading && <p style={{ textAlign: "center", color: CORES.textSub, padding: 24 }}>Carregando questões...</p>}

          {/* Sem questões / apenas teoria */}
          {!loading && !unidade.topic && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontSize: 36, margin: "0 0 12px" }}>{unidade.emoji}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: CORES.text, margin: "0 0 6px" }}>Unidade de nivelamento</p>
              <p style={{ fontSize: 13, color: CORES.textSub, marginBottom: 20 }}>Esta unidade é introdutória. Questões de {unidade.titulo} aparecerão ao longo da trilha.</p>
              <button onClick={() => { onConcluir(); onClose(); }} style={{ padding: "12px 28px", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Marcar como concluída ✓
              </button>
            </div>
          )}

          {!loading && unidade.topic && questoes.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontSize: 36, margin: "0 0 12px" }}>📚</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: CORES.text, margin: "0 0 6px" }}>Questões em breve!</p>
              <p style={{ fontSize: 13, color: CORES.textSub }}>Ainda não há questões cadastradas para este tópico.</p>
            </div>
          )}

          {/* Resultado */}
          {fim && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: acertos >= questoes.length * 0.7 ? "#EDFAF3" : "#E6EEFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 36 }}>
                {acertos >= questoes.length * 0.7 ? "🏆" : acertos >= questoes.length * 0.5 ? "👍" : "💪"}
              </div>
              <p style={{ fontSize: 24, fontWeight: 700, color: CORES.text, margin: "0 0 4px" }}>{acertos}/{questoes.length} acertos</p>
              <p style={{ fontSize: 13, color: "#22c55e", fontWeight: 600, margin: "0 0 4px" }}>+{unidade.xp} XP ganhos!</p>
              <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 20px" }}>
                {acertos === questoes.length ? "Perfeito! Você domina esse conteúdo!" : acertos >= questoes.length / 2 ? "Bom trabalho! Continue praticando." : "Revise os tópicos e tente novamente."}
              </p>
              <button onClick={onClose} style={{ padding: "12px 28px", background: unidade.cor, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Voltar para a trilha →
              </button>
            </div>
          )}

          {/* Questão ativa */}
          {!loading && !fim && q && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: unidade.bg, color: unidade.cor, borderRadius: 99, padding: "3px 10px" }}>
                  Questão {idx + 1}/{questoes.length}
                </span>
                {q.ano && <span style={{ fontSize: 11, color: CORES.textSub }}>{vestibular} {q.ano}</span>}
              </div>

              <div style={{ background: CORES.bgCard, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${unidade.cor}15` }}>
                <p style={{ fontSize: 14, color: CORES.text, lineHeight: 1.7, margin: 0, fontFamily: "Georgia, serif" }}>{q.question}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {(opcoes[q.id] ?? []).map((op, i) => {
                  const selecionada = resposta === i;
                  const correta = q.answer_index === i;
                  const mostrar = resposta !== null && (selecionada || correta);
                  let bg = CORES.bgCard, border = `1px solid ${CORES.border}`, cor = CORES.text;
                  if (mostrar) {
                    if (correta) { bg = "#EDFAF3"; border = `1.5px solid #22c55e`; cor = "#22c55e"; }
                    else if (selecionada) { bg = "#FFF1F1"; border = `1.5px solid #ef4444`; cor = "#ef4444"; }
                  }
                  return (
                    <button key={i} onClick={() => responder(i)} disabled={resposta !== null}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 13px", borderRadius: 10, border, background: bg, cursor: resposta !== null ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: selecionada || (resposta !== null && correta) ? unidade.cor : "#e5e7eb", color: selecionada || (resposta !== null && correta) ? "#fff" : "#666", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{letras[i]}</span>
                      <span style={{ fontSize: 13, color: cor, lineHeight: 1.5 }}>{op}</span>
                    </button>
                  );
                })}
              </div>

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
export default function TrilhaFisicoQuimica() {
  const { vestibular = "ENEM" } = useParams<{ vestibular: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [progresso, setProgresso] = useState<Record<string, Progresso>>({});
  const [unidadeAberta, setUnidadeAberta] = useState<typeof UNIDADES[0] | null>(null);
  const [loading, setLoading] = useState(true);

  const vestUpper = vestibular.toUpperCase();

  // Cor principal por vestibular
  const corVest =
    vestUpper === "ITA"     ? "#003D80" :
    vestUpper === "IME"     ? "#1a3a6e" :
    vestUpper === "FUVEST"  ? "#8B0000" :
    vestUpper === "UNICAMP" ? "#005C97" :
    vestUpper === "UNB"     ? "#006400" :
    "#0057FF"; // ENEM

  useEffect(() => {
    if (user?.id) carregarProgresso();
  }, [user?.id]);

  async function carregarProgresso() {
    const { data } = await supabase
      .from("trilha_progresso")
      .select("unidade_id, status, xp_ganho")
      .eq("user_id", user!.id)
      .eq("vestibular", vestUpper)
      .eq("materia", "fisicoquimica");

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
      materia: "fisicoquimica",
      unidade_id: unidadeId,
      status: "concluido",
      xp_ganho: xp,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "user_id,vestibular,materia,unidade_id" });

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
      <div style={{ background: `linear-gradient(135deg, ${corVest}, ${corVest}cc)`, padding: "16px 16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>⚗️ Trilha de Físico-Química</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0 }}>{vestUpper} · Ensino Médio</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#fbbf24", margin: 0 }}>⚡ {totalXP} XP</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", margin: 0 }}>{concluidas}/{UNIDADES.length} unidades</p>
          </div>
        </div>

        {/* Barra de progresso */}
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
              const anterior = i === 0 || progresso[UNIDADES[i - 1].id]?.status === "concluido";
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
                      <span style={{ fontSize: 10, color: bloqueada ? "#9ca3af" : u.cor, fontWeight: 600 }}>📝 questões</span>
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
        <div style={{ marginTop: 16, background: "#fef9ec", borderRadius: 12, padding: "12px 14px", border: "1px solid #fcd34d" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e", margin: "0 0 4px" }}>💡 Como funciona</p>
          <p style={{ fontSize: 12, color: CORES.textSub, margin: 0, lineHeight: 1.6 }}>
            Complete as unidades em ordem. Cada unidade tem questões reais filtradas por tema. Ganhe XP ao concluir e acompanhe seu progresso!
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
