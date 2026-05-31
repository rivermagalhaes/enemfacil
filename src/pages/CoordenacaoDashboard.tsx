// src/pages/CoordenacaoDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface VistEscola {
  area_conhecimento: string;
  disciplina: string;
  conteudo: string;
  media_escola: number;
  total_alunos: number;
  status_alerta: "CRITICO" | "ATENCAO" | "OK";
}

interface ResumoTurma {
  id: string;
  nome: string;
  codigo: string;
  total_alunos: number;
}

const STATUS_CONFIG = {
  CRITICO: { bg: "bg-red-900/30", border: "border-red-500/30", text: "text-red-300", dot: "bg-red-500" },
  ATENCAO: { bg: "bg-yellow-900/30", border: "border-yellow-500/30", text: "text-yellow-300", dot: "bg-yellow-400" },
  OK:      { bg: "bg-emerald-900/30", border: "border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-400" },
};

const AREA_ICONS: Record<string, string> = {
  natureza: "⚗️", matematica: "📐", humanas: "🌍", linguagens: "📝", redacao: "✍️",
};

function HeatmapCell({ pct, label }: { pct: number; label: string }) {
  const bg = pct < 40 ? "bg-red-500" : pct < 60 ? "bg-yellow-400" : pct < 80 ? "bg-emerald-400" : "bg-emerald-300";
  const opacity = pct < 40 ? "opacity-90" : pct < 60 ? "opacity-70" : "opacity-80";
  return (
    <div className={`${bg} ${opacity} rounded-lg p-2 text-center`}>
      <p className="text-white text-xs font-bold">{pct}%</p>
      <p className="text-white/80 text-xs truncate">{label}</p>
    </div>
  );
}

export default function CoordenacaoDashboard() {
  const { } = useAuth();
  const navigate = useNavigate();
  const [visaoEscola, setVisaoEscola] = useState<VistEscola[]>([]);
  const [turmas, setTurmas] = useState<ResumoTurma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroArea, setFiltroArea] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "CRITICO" | "ATENCAO" | "OK">("TODOS");
  const [abaAtiva, setAbaAtiva] = useState<"escola" | "heatmap" | "turmas">("escola");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    const [{ data: escola }, { data: turmasData }] = await Promise.all([
      supabase.rpc("get_visao_escola"),
      supabase.from("classrooms").select("id, nome, codigo").eq("ativa", true).order("nome"),
    ]);

    // Buscar contagem de alunos por turma
    if (turmasData) {
      const turmasComAlunos = await Promise.all(
        turmasData.map(async (t) => {
          const { count } = await supabase
            .from("classroom_members")
            .select("*", { count: "exact", head: true })
            .eq("classroom_id", t.id);
          return { ...t, total_alunos: count ?? 0 };
        })
      );
      setTurmas(turmasComAlunos);
    }

    setVisaoEscola(escola ?? []);
    setCarregando(false);
  }

  const areas = ["Todas", ...Array.from(new Set(visaoEscola.map(v => v.area_conhecimento ?? v.disciplina).filter(Boolean)))];

  const dadosFiltrados = visaoEscola.filter(v => {
    const passaArea = filtroArea === "Todas" || (v.area_conhecimento ?? v.disciplina) === filtroArea;
    const passaStatus = filtroStatus === "TODOS" || v.status_alerta === filtroStatus;
    return passaArea && passaStatus;
  });

  const totalCriticos = visaoEscola.filter(v => v.status_alerta === "CRITICO").length;
  const totalAtencao = visaoEscola.filter(v => v.status_alerta === "ATENCAO").length;
  const mediaEscola = visaoEscola.length > 0
    ? Math.round(visaoEscola.reduce((s, v) => s + v.media_escola, 0) / visaoEscola.length)
    : 0;
  const totalAlunos = turmas.reduce((s, t) => s + t.total_alunos, 0);

  // Agrupar por disciplina para heatmap
  const porDisciplina: Record<string, VistEscola[]> = {};
  visaoEscola.forEach(v => {
    const key = v.disciplina ?? "Outros";
    if (!porDisciplina[key]) porDisciplina[key] = [];
    porDisciplina[key].push(v);
  });

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 px-4 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mb-4 flex items-center gap-1 text-sm">
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold">Painel de Coordenação</h1>
        <p className="text-gray-400 text-sm mt-1">Inteligência pedagógica da escola</p>

        {/* Cards resumo */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Média geral escola</p>
            <p className={`text-3xl font-bold ${mediaEscola < 40 ? "text-red-400" : mediaEscola < 60 ? "text-yellow-400" : "text-emerald-400"}`}>
              {mediaEscola}%
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Total de alunos</p>
            <p className="text-3xl font-bold text-purple-400">{totalAlunos}</p>
          </div>
          <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Conteúdos críticos</p>
            <p className="text-3xl font-bold text-red-400">{totalCriticos}</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Em atenção</p>
            <p className="text-3xl font-bold text-yellow-400">{totalAtencao}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Abas */}
        <div className="flex gap-2 mb-4 bg-white/5 rounded-xl p-1">
          {(["escola", "heatmap", "turmas"] as const).map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                abaAtiva === aba ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {aba === "escola" ? "🏫 Escola" : aba === "heatmap" ? "🗺️ Heatmap" : "👥 Turmas"}
            </button>
          ))}
        </div>

        {/* Aba Visão da Escola */}
        {abaAtiva === "escola" && (
          <div>
            {/* Filtros */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {(["TODOS", "CRITICO", "ATENCAO", "OK"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filtroStatus === s ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400"
                  }`}
                >
                  {s === "TODOS" ? "Todos" : s === "CRITICO" ? "🔴 Crítico" : s === "ATENCAO" ? "🟡 Atenção" : "🟢 Bom"}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {areas.map(a => (
                <button
                  key={a}
                  onClick={() => setFiltroArea(a)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filtroArea === a ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400"
                  }`}
                >
                  {AREA_ICONS[a?.toLowerCase()] ?? ""} {a}
                </button>
              ))}
            </div>

            {dadosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-3xl mb-2">📭</p>
                <p>Nenhum dado disponível ainda.</p>
                <p className="text-xs mt-1">Os dados aparecem conforme os alunos respondem questões.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dadosFiltrados.map((v, i) => {
                  const cfg = STATUS_CONFIG[v.status_alerta];
                  return (
                    <div key={i} className={`${cfg.bg} border ${cfg.border} rounded-xl p-4`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-white font-medium text-sm truncate">{v.conteudo ?? "—"}</p>
                          <p className="text-gray-500 text-xs">{v.disciplina} · {v.total_alunos} alunos</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-bold ${cfg.text}`}>{v.media_escola}%</p>
                          <div className={`w-2 h-2 rounded-full ${cfg.dot} ml-auto mt-1`} />
                        </div>
                      </div>
                      <div className="mt-2 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${cfg.dot}`}
                          style={{ width: `${Math.min(v.media_escola, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Aba Heatmap por Disciplina */}
        {abaAtiva === "heatmap" && (
          <div className="space-y-5">
            {Object.keys(porDisciplina).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-3xl mb-2">📭</p>
                <p>Nenhum dado disponível ainda.</p>
              </div>
            ) : (
              Object.entries(porDisciplina).map(([disciplina, itens]) => (
                <div key={disciplina} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-white font-semibold mb-3">
                    {AREA_ICONS[disciplina?.toLowerCase()] ?? "📚"} {disciplina}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {itens.map((item, i) => (
                      <HeatmapCell key={i} pct={item.media_escola} label={item.conteudo ?? "—"} />
                    ))}
                  </div>
                </div>
              ))
            )}
            {/* Legenda */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-gray-400 text-xs font-semibold mb-2">Legenda</p>
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500" /><span className="text-gray-400 text-xs">&lt;40% Crítico</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-400" /><span className="text-gray-400 text-xs">40–60% Atenção</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-gray-400 text-xs">60–80% Bom</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-300" /><span className="text-gray-400 text-xs">&gt;80% Ótimo</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Aba Turmas */}
        {abaAtiva === "turmas" && (
          <div className="space-y-2">
            {turmas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Nenhuma turma ativa.</div>
            ) : (
              turmas.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/coordenacao/turma/${t.id}`)}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{t.nome}</p>
                    <p className="text-gray-500 text-xs">{t.codigo} · {t.total_alunos} alunos</p>
                  </div>
                  <span className="text-gray-500 text-sm">→</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
