// src/pages/MeuDesempenho.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface DesempenhoRow {
  area_conhecimento: string;
  disciplina: string;
  conteudo: string;
  total: number;
  acertos: number;
  pct_acerto: number;
  ultima_resposta: string;
}

interface Diagnostico {
  total_questoes: number;
  pct_acerto_geral: number;
  areas_criticas: { area: string; disciplina: string; pct_acerto: number; status: string }[];
  conteudos_fracos: { conteudo: string; disciplina: string; pct_acerto: number; total: number }[];
  pontos_fortes: { conteudo: string; disciplina: string; pct_acerto: number }[];
  interpretacao_ia: string;
  plano_acao: { acao: string; prazo: string; tipo: string }[];
  mensagem_motivacional: string;
  habilidades_criticas: { conteudo: string; disciplina: string; motivo: string; prioridade: number }[];
}

const AREA_COLORS: Record<string, { bg: string; bar: string; text: string; icon: string }> = {
  natureza:    { bg: "bg-emerald-900/40", bar: "bg-emerald-400", text: "text-emerald-300", icon: "⚗️" },
  matematica:  { bg: "bg-blue-900/40",    bar: "bg-blue-400",    text: "text-blue-300",    icon: "📐" },
  humanas:     { bg: "bg-amber-900/40",   bar: "bg-amber-400",   text: "text-amber-300",   icon: "🌍" },
  linguagens:  { bg: "bg-purple-900/40",  bar: "bg-purple-400",  text: "text-purple-300",  icon: "📝" },
  redacao:     { bg: "bg-rose-900/40",    bar: "bg-rose-400",    text: "text-rose-300",    icon: "✍️" },
};

function BarraDesempenho({ pct, area }: { pct: number; area: string }) {
  const colors = AREA_COLORS[area?.toLowerCase()] ?? AREA_COLORS.natureza;
  const cor = pct < 40 ? "bg-red-500" : pct < 60 ? "bg-yellow-400" : colors.bar;
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${cor}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function StatusBadge({ pct }: { pct: number }) {
  if (pct < 40) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold">🔴 Crítico</span>;
  if (pct < 60) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-semibold">🟡 Atenção</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">🟢 Bom</span>;
}

export default function MeuDesempenho() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [desempenho, setDesempenho] = useState<DesempenhoRow[]>([]);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [erro, setErro] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"geral" | "conteudos" | "plano">("geral");

  useEffect(() => {
    if (user) carregarDados();
  }, [user]);

  async function carregarDados() {
    setCarregando(true);
    try {
      // Buscar desempenho bruto
      const { data, error } = await supabase
        .rpc("get_desempenho_aluno", { p_aluno_id: user!.id });
      if (error) throw error;
      setDesempenho(data ?? []);

      // Buscar diagnóstico IA salvo
      const { data: diag } = await supabase
        .from("diagnosticos_aluno")
        .select("*")
        .eq("aluno_id", user!.id)
        .gt("valido_ate", new Date().toISOString())
        .order("gerado_em", { ascending: false })
        .limit(1)
        .single();
      if (diag) setDiagnostico(diag);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  async function gerarDiagnosticoIA() {
    setGerandoIA(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-diagnostico", {
        body: { aluno_id: user!.id },
      });
      if (error) throw error;
      if (data?.diagnostico) setDiagnostico(data.diagnostico);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setGerandoIA(false);
    }
  }

  // Agrupar desempenho por área
  const porArea: Record<string, { total: number; acertos: number }> = {};
  desempenho.forEach((r) => {
    const area = r.area_conhecimento ?? r.disciplina ?? "outro";
    if (!porArea[area]) porArea[area] = { total: 0, acertos: 0 };
    porArea[area].total += r.total;
    porArea[area].acertos += r.acertos;
  });

  const totalGeral = desempenho.reduce((s, r) => s + r.total, 0);
  const acertosGeral = desempenho.reduce((s, r) => s + r.acertos, 0);
  const pctGeral = totalGeral > 0 ? Math.round((acertosGeral / totalGeral) * 100) : 0;

  const conteudosCriticos = desempenho.filter(r => r.pct_acerto < 50).slice(0, 8);

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando seu desempenho...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 px-4 pt-12 pb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mb-4 flex items-center gap-1 text-sm">
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-white">Meu Desempenho</h1>
        <p className="text-gray-400 text-sm mt-1">Diagnóstico pedagógico personalizado</p>

        {/* Card geral */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-5">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#ffffff15" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke={pctGeral >= 60 ? "#34d399" : pctGeral >= 40 ? "#fbbf24" : "#f87171"}
                strokeWidth="8"
                strokeDasharray={`${(pctGeral / 100) * 201} 201`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{pctGeral}%</span>
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Aproveitamento geral</p>
            <p className="text-white font-semibold text-lg">{acertosGeral}/{totalGeral} acertos</p>
            <p className="text-gray-500 text-xs mt-1">{desempenho.length} conteúdos avaliados</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Abas */}
        <div className="flex gap-2 mb-5 bg-white/5 rounded-xl p-1">
          {(["geral", "conteudos", "plano"] as const).map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                abaAtiva === aba ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {aba === "geral" ? "📊 Áreas" : aba === "conteudos" ? "📚 Conteúdos" : "🎯 Plano IA"}
            </button>
          ))}
        </div>

        {/* Aba Geral — por área */}
        {abaAtiva === "geral" && (
          <div className="space-y-3">
            {Object.entries(porArea).map(([area, { total, acertos }]) => {
              const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
              const colors = AREA_COLORS[area.toLowerCase()] ?? AREA_COLORS.natureza;
              return (
                <div key={area} className={`${colors.bg} border border-white/10 rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{colors.icon}</span>
                      <span className={`font-semibold capitalize ${colors.text}`}>{area}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge pct={pct} />
                      <span className="font-bold text-white">{pct}%</span>
                    </div>
                  </div>
                  <BarraDesempenho pct={pct} area={area} />
                  <p className="text-gray-500 text-xs mt-1">{acertos}/{total} acertos</p>
                </div>
              );
            })}

            {/* Pontos de atenção */}
            {conteudosCriticos.length > 0 && (
              <div className="mt-4 bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-300 font-semibold mb-3">⚠️ Pontos de atenção</p>
                <div className="space-y-2">
                  {conteudosCriticos.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">{r.conteudo ?? r.disciplina}</span>
                      <span className="text-red-400 text-sm font-semibold">{r.pct_acerto}%</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate("/quiz")}
                  className="mt-4 w-full bg-red-600 hover:bg-red-500 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
                >
                  🎯 Treinar pontos fracos
                </button>
              </div>
            )}
          </div>
        )}

        {/* Aba Conteúdos */}
        {abaAtiva === "conteudos" && (
          <div className="space-y-2">
            {desempenho.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">📭</p>
                <p>Nenhuma questão respondida ainda.</p>
                <button onClick={() => navigate("/quiz")} className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm">
                  Começar agora
                </button>
              </div>
            ) : (
              desempenho.map((r, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-white text-sm font-medium">{r.conteudo ?? "—"}</p>
                      <p className="text-gray-500 text-xs">{r.disciplina} · {r.total} questões</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${r.pct_acerto < 40 ? "text-red-400" : r.pct_acerto < 60 ? "text-yellow-400" : "text-emerald-400"}`}>
                        {r.pct_acerto}%
                      </p>
                      <StatusBadge pct={r.pct_acerto} />
                    </div>
                  </div>
                  <BarraDesempenho pct={r.pct_acerto} area={r.area_conhecimento} />
                </div>
              ))
            )}
          </div>
        )}

        {/* Aba Plano IA */}
        {abaAtiva === "plano" && (
          <div>
            {!diagnostico ? (
              <div className="text-center py-10">
                <p className="text-5xl mb-4">🤖</p>
                <p className="text-white font-semibold text-lg mb-2">Diagnóstico Inteligente</p>
                <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                  A IA analisa seus erros, identifica padrões e cria um plano de estudo personalizado.
                </p>
                {totalGeral < 10 ? (
                  <p className="text-yellow-400 text-sm bg-yellow-900/20 rounded-xl px-4 py-3">
                    ⚠️ Responda pelo menos 10 questões para gerar seu diagnóstico.
                  </p>
                ) : (
                  <button
                    onClick={gerarDiagnosticoIA}
                    disabled={gerandoIA}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    {gerandoIA ? "⏳ Analisando..." : "✨ Gerar diagnóstico IA"}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mensagem motivacional */}
                {diagnostico.mensagem_motivacional && (
                  <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-blue-300 text-sm italic">"{diagnostico.mensagem_motivacional}"</p>
                  </div>
                )}

                {/* Resumo IA */}
                {diagnostico.interpretacao_ia && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-300 font-semibold mb-2">🧠 Análise pedagógica</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{diagnostico.interpretacao_ia}</p>
                  </div>
                )}

                {/* Conteúdos críticos com motivo */}
                {diagnostico.habilidades_criticas?.length > 0 && (
                  <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4">
                    <p className="text-red-300 font-semibold mb-3">🎯 Prioridades de estudo</p>
                    <div className="space-y-3">
                      {diagnostico.habilidades_criticas.map((h, i) => (
                        <div key={i} className="border-l-2 border-red-500 pl-3">
                          <p className="text-white text-sm font-medium">{h.conteudo}</p>
                          <p className="text-gray-500 text-xs">{h.disciplina}</p>
                          <p className="text-gray-400 text-xs mt-1">{h.motivo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plano de ação */}
                {diagnostico.plano_acao?.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-white font-semibold mb-3">📋 Plano de ação</p>
                    <div className="space-y-2">
                      {diagnostico.plano_acao.map((p, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                            p.tipo === "revisao" ? "bg-blue-900/40 text-blue-300" :
                            p.tipo === "pratica" ? "bg-emerald-900/40 text-emerald-300" :
                            "bg-purple-900/40 text-purple-300"
                          }`}>{p.tipo}</span>
                          <p className="text-gray-300 text-sm">{p.acao}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pontos fortes */}
                {diagnostico.pontos_fortes?.length > 0 && (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-emerald-300 font-semibold mb-2">💪 Seus pontos fortes</p>
                    <div className="flex flex-wrap gap-2">
                      {diagnostico.pontos_fortes.map((p: any, i: number) => (
                        <span key={i} className="text-xs bg-emerald-900/30 text-emerald-300 px-3 py-1 rounded-full">
                          {typeof p === "string" ? p : p.conteudo}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={gerarDiagnosticoIA}
                  disabled={gerandoIA}
                  className="w-full border border-white/10 text-gray-400 hover:text-white rounded-xl py-2.5 text-sm transition-colors"
                >
                  {gerandoIA ? "⏳ Atualizando..." : "🔄 Atualizar diagnóstico"}
                </button>
              </div>
            )}
          </div>
        )}

        {erro && (
          <div className="mt-4 bg-red-900/20 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
            {erro}
          </div>
        )}
      </div>
    </div>
  );
}
