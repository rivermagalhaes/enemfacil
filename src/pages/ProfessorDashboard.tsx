// src/pages/ProfessorDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Turma {
  id: string;
  nome: string;
  codigo: string;
  ativa: boolean;
}

interface MapaTurma {
  disciplina: string;
  conteudo: string;
  media_turma: number;
  total_respostas: number;
  alunos_criticos: number;
  status_alerta: "CRITICO" | "ATENCAO" | "OK";
}

interface AlunoTurma {
  student_id: string;
  profiles: {
    nome: string;
    email: string;
    xp_total: number;
  };
}

const STATUS_CONFIG = {
  CRITICO: { bg: "bg-red-900/30", border: "border-red-500/30", text: "text-red-300", badge: "🔴", label: "Crítico" },
  ATENCAO: { bg: "bg-yellow-900/30", border: "border-yellow-500/30", text: "text-yellow-300", badge: "🟡", label: "Atenção" },
  OK:      { bg: "bg-emerald-900/30", border: "border-emerald-500/30", text: "text-emerald-300", badge: "🟢", label: "Bom" },
};

function BarraMedia({ pct }: { pct: number }) {
  const cor = pct < 40 ? "bg-red-500" : pct < 60 ? "bg-yellow-400" : "bg-emerald-400";
  return (
    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
      <div className={`h-1.5 rounded-full transition-all duration-700 ${cor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>("");
  const [mapa, setMapa] = useState<MapaTurma[]>([]);
  const [alunos, setAlunos] = useState<AlunoTurma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMapa, setCarregandoMapa] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "CRITICO" | "ATENCAO" | "OK">("TODOS");
  const [filtroDisciplina, setFiltroDisciplina] = useState("Todas");
  const [abaAtiva, setAbaAtiva] = useState<"mapa" | "alunos" | "alertas">("mapa");

  useEffect(() => {
    carregarTurmas();
  }, [user]);

  useEffect(() => {
    if (turmaSelecionada) {
      carregarMapaTurma(turmaSelecionada);
      carregarAlunos(turmaSelecionada);
    }
  }, [turmaSelecionada]);

  async function carregarTurmas() {
    setCarregando(true);
    const { data } = await supabase
      .from("classrooms")
      .select("id, nome, codigo, ativa")
      .eq("professor_id", user!.id)
      .eq("ativa", true)
      .order("nome");
    setTurmas(data ?? []);
    if (data && data.length > 0) setTurmaSelecionada(data[0].id);
    setCarregando(false);
  }

  async function carregarMapaTurma(turmaId: string) {
    setCarregandoMapa(true);
    const { data } = await supabase.rpc("get_mapa_turma", { p_classroom_id: turmaId });
    setMapa(data ?? []);
    setCarregandoMapa(false);
  }

  async function carregarAlunos(turmaId: string) {
    const { data } = await supabase
      .from("classroom_members")
      .select("student_id, profiles(nome, email, xp_total)")
      .eq("classroom_id", turmaId);
    setAlunos((data as any) ?? []);
  }

  const disciplinas = ["Todas", ...Array.from(new Set(mapa.map(m => m.disciplina).filter(Boolean)))];

  const mapaFiltrado = mapa.filter(m => {
    const passaStatus = filtroStatus === "TODOS" || m.status_alerta === filtroStatus;
    const passaDisciplina = filtroDisciplina === "Todas" || m.disciplina === filtroDisciplina;
    return passaStatus && passaDisciplina;
  });

  const criticos = mapa.filter(m => m.status_alerta === "CRITICO");
  const atencao = mapa.filter(m => m.status_alerta === "ATENCAO");
  const mediaGeral = mapa.length > 0
    ? Math.round(mapa.reduce((s, m) => s + m.media_turma, 0) / mapa.length)
    : 0;

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 px-4 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mb-4 flex items-center gap-1 text-sm">
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold">Dashboard do Professor</h1>
        <p className="text-gray-400 text-sm mt-1">Diagnóstico pedagógico por turma</p>

        {/* Seletor de turma */}
        {turmas.length > 0 && (
          <div className="mt-4">
            <select
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {turmas.map(t => (
                <option key={t.id} value={t.id} className="bg-gray-900">{t.nome} ({t.codigo})</option>
              ))}
            </select>
          </div>
        )}

        {/* Cards de resumo */}
        {turmaSelecionada && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{mediaGeral}%</p>
              <p className="text-gray-500 text-xs">Média geral</p>
            </div>
            <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{criticos.length}</p>
              <p className="text-gray-500 text-xs">Críticos</p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{atencao.length}</p>
              <p className="text-gray-500 text-xs">Atenção</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        {turmas.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">🏫</p>
            <p>Nenhuma turma ativa encontrada.</p>
          </div>
        ) : (
          <>
            {/* Abas */}
            <div className="flex gap-2 mb-4 bg-white/5 rounded-xl p-1">
              {(["mapa", "alunos", "alertas"] as const).map((aba) => (
                <button
                  key={aba}
                  onClick={() => setAbaAtiva(aba)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    abaAtiva === aba ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {aba === "mapa" ? "🗺️ Mapa" : aba === "alunos" ? "👥 Alunos" : "⚠️ Alertas"}
                </button>
              ))}
            </div>

            {/* Aba Mapa Pedagógico */}
            {abaAtiva === "mapa" && (
              <div>
                {/* Filtros */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                  {(["TODOS", "CRITICO", "ATENCAO", "OK"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setFiltroStatus(s)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        filtroStatus === s
                          ? "bg-indigo-600 text-white"
                          : "bg-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {s === "TODOS" ? "Todos" : s === "CRITICO" ? "🔴 Crítico" : s === "ATENCAO" ? "🟡 Atenção" : "🟢 Bom"}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                  {disciplinas.map(d => (
                    <button
                      key={d}
                      onClick={() => setFiltroDisciplina(d)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        filtroDisciplina === d
                          ? "bg-indigo-600 text-white"
                          : "bg-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {carregandoMapa ? (
                  <div className="text-center py-10 text-gray-500">Carregando mapa...</div>
                ) : mapaFiltrado.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <p className="text-3xl mb-2">📭</p>
                    <p>Nenhuma atividade registrada ainda.</p>
                    <p className="text-xs mt-1">Os dados aparecem conforme os alunos respondem questões.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mapaFiltrado.map((m, i) => {
                      const cfg = STATUS_CONFIG[m.status_alerta];
                      return (
                        <div key={i} className={`${cfg.bg} border ${cfg.border} rounded-xl p-4`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-white font-medium text-sm">{m.conteudo ?? "—"}</p>
                              <p className="text-gray-500 text-xs">{m.disciplina} · {m.total_respostas} respostas</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${cfg.text}`}>{m.media_turma}%</p>
                              <p className="text-gray-500 text-xs">{m.alunos_criticos} alunos &lt;40%</p>
                            </div>
                          </div>
                          <BarraMedia pct={m.media_turma} />
                          {m.status_alerta !== "OK" && (
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => navigate(`/professor/gerar-lista?disciplina=${m.disciplina}&conteudo=${m.conteudo}`)}
                                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                📋 Gerar lista
                              </button>
                              <button
                                onClick={() => navigate(`/professor/novo-simulado?disciplina=${m.disciplina}&conteudo=${m.conteudo}`)}
                                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                📝 Mini simulado
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Aba Alunos */}
            {abaAtiva === "alunos" && (
              <div className="space-y-2">
                {alunos.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">Nenhum aluno nesta turma.</div>
                ) : (
                  alunos
                    .sort((a, b) => (b.profiles?.xp_total ?? 0) - (a.profiles?.xp_total ?? 0))
                    .map((a, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {a.profiles?.nome ?? a.profiles?.email ?? "Aluno"}
                          </p>
                          <p className="text-gray-500 text-xs">{a.profiles?.xp_total ?? 0} XP</p>
                        </div>
                        <button
                          onClick={() => navigate(`/professor/aluno/${a.student_id}`)}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Ver →
                        </button>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* Aba Alertas */}
            {abaAtiva === "alertas" && (
              <div className="space-y-3">
                {criticos.length === 0 && atencao.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="text-emerald-400 font-semibold">Turma sem alertas críticos!</p>
                    <p className="text-gray-500 text-sm mt-1">Continue acompanhando o desempenho.</p>
                  </div>
                ) : (
                  <>
                    {criticos.length > 0 && (
                      <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                        <p className="text-red-300 font-semibold mb-3">🔴 Alertas Críticos ({criticos.length})</p>
                        <div className="space-y-3">
                          {criticos.map((m, i) => (
                            <div key={i} className="border-l-2 border-red-500 pl-3">
                              <p className="text-white text-sm font-medium">{m.conteudo}</p>
                              <p className="text-gray-400 text-xs">{m.disciplina} · Média: {m.media_turma}% · {m.alunos_criticos} alunos abaixo de 40%</p>
                              <p className="text-red-300 text-xs mt-1">⚠️ Recomendado: revisão urgente + mini simulado</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {atencao.length > 0 && (
                      <div className="bg-yellow-950/20 border border-yellow-500/20 rounded-xl p-4">
                        <p className="text-yellow-300 font-semibold mb-3">🟡 Atenção ({atencao.length})</p>
                        <div className="space-y-3">
                          {atencao.map((m, i) => (
                            <div key={i} className="border-l-2 border-yellow-500 pl-3">
                              <p className="text-white text-sm font-medium">{m.conteudo}</p>
                              <p className="text-gray-400 text-xs">{m.disciplina} · Média: {m.media_turma}%</p>
                              <p className="text-yellow-300 text-xs mt-1">💡 Recomendado: exercícios de reforço</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
