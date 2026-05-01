// src/pages/concursos/ConcursoDetalhe.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useProgresso } from "@/hooks/useProgresso";
import BottomNav from "@/components/layout/BottomNav";
import DistribuicaoEdital from "@/components/concursos/DistribuicaoEdital";
import FiltrosAssunto from "@/components/concursos/FiltrosAssunto";
import QuestaoPreview from "@/components/concursos/QuestaoPreview";
import PaywallModal from "@/components/ui/PaywallModal";
import type { Concurso, ConcursoAssunto, Questao } from "@/types";

type Aba = "questoes" | "materiais" | "ranking";

interface RankingEntry {
  user_id: string;
  nome: string;
  total: number;
  acertos: number;
  pct: number;
}

interface Material {
  id: string;
  titulo: string;
  tipo: string;
  url: string;
}

const MEDALHA = ["🥇", "🥈", "🥉"];
const TIPO_ICONE: Record<string, string> = { pdf: "📄", slide: "📊", resumo: "📝", video: "🎬" };

export default function ConcursoDetalhe() {
  const { concursoId } = useParams<{ concursoId: string }>();
  const { profile } = useAuth();
  const { getPctAcerto, getPorConcurso } = useProgresso(profile?.id);
  const navigate = useNavigate();

  const [concurso, setConcurso] = useState<Concurso | null>(null);
  const [assuntos, setAssuntos] = useState<ConcursoAssunto[]>([]);
  const [preview, setPreview] = useState<Questao | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<Aba>("questoes");
  const [paywallAberto, setPaywallAberto] = useState(false);
  const [simuladosFeitos, setSimuladosFeitos] = useState(0);

  const LIMITE_SIMULADO_FREE = 1;
  const isFree = !profile || profile.plano === "gratis";
  // Free pode fazer 1 simulado — depois mostra aviso mas NÃO trava a página
  const simuladoBloqueado = isFree && simuladosFeitos >= LIMITE_SIMULADO_FREE;

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [materiaisLoading, setMateriaisLoading] = useState(false);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  useEffect(() => {
    if (!concursoId) return;
    Promise.all([
      supabase.from("concursos").select("*").eq("id", concursoId).single(),
      supabase.from("concurso_assuntos").select("*").eq("concurso_id", concursoId).order("ordem"),
      supabase.from("questoes").select("*").eq("concurso_id", concursoId).eq("ativo", true).not("assertiva", "is", null).limit(1).single(),
    ]).then(([{ data: c }, { data: a }, { data: q }]) => {
      setConcurso(c as Concurso);
      setAssuntos((a as ConcursoAssunto[]) ?? []);
      setPreview(q as Questao | null);
      setLoading(false);
    });

    if (profile) {
      supabase
        .from("respostas")
        .select("questao_id, questoes!inner(concurso_id)")
        .eq("user_id", profile.id)
        .eq("questoes.concurso_id", concursoId)
        .then(({ data }) => {
          setSimuladosFeitos(Math.floor((data?.length ?? 0) / 5));
        });
    }
  }, [concursoId]);

  useEffect(() => {
    if (aba !== "materiais" || !concursoId) return;
    setMateriaisLoading(true);
    supabase.from("materiais").select("id, titulo, tipo, url").eq("concurso_id", concursoId)
      .then(({ data }) => {
        setMateriais((data as Material[]) ?? []);
        setMateriaisLoading(false);
      });
  }, [aba, concursoId]);

  useEffect(() => {
    if (aba !== "ranking" || !concursoId) return;
    setRankingLoading(true);
    supabase
      .from("respostas")
      .select("user_id, correta, questoes(concurso_id), profiles(nome)")
      .eq("questoes.concurso_id", concursoId)
      .then(({ data }) => {
        if (!data) { setRankingLoading(false); return; }
        const map: Record<string, { nome: string; total: number; acertos: number }> = {};
        data.forEach((r: any) => {
          if (!r.questoes) return;
          const uid = r.user_id;
          if (!map[uid]) map[uid] = { nome: r.profiles?.nome ?? "Anônimo", total: 0, acertos: 0 };
          map[uid].total++;
          if (r.correta) map[uid].acertos++;
        });
        const lista: RankingEntry[] = Object.entries(map)
          .map(([user_id, v]) => ({ user_id, nome: v.nome, total: v.total, acertos: v.acertos, pct: v.total > 0 ? Math.round((v.acertos / v.total) * 100) : 0 }))
          .filter(e => e.total >= 5)
          .sort((a, b) => b.pct - a.pct || b.total - a.total);
        setRanking(lista);
        setRankingLoading(false);
      });
  }, [aba, concursoId]);

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}>Carregando...</div>;
  if (!concurso) return <div style={{ padding: 32 }}>Concurso não encontrado.</div>;

  const prog = getPorConcurso(concursoId!);
  const pct = getPctAcerto(concursoId!);
  const minhaPosicao = ranking.findIndex(r => r.user_id === profile?.id);

  const ABAS: { key: Aba; label: string }[] = [
    { key: "questoes", label: "Questões" },
    { key: "materiais", label: "📚 Materiais" },
    { key: "ranking", label: "🏆 Ranking" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div style={{ background: "#1a3a6e", padding: "10px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#fff" }}>{concurso.nome}</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[
            { val: prog?.total_respondidas ?? 0, lbl: "respondidas" },
            { val: prog?.total_respondidas ? `${pct}%` : "—", lbl: "acerto" },
            { val: prog?.sequencia_atual ?? 0, lbl: "sequência" },
          ].map((s) => (
            <div key={s.lbl} style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex" }}>
          {ABAS.map(({ key, label }) => (
            <button key={key} onClick={() => setAba(key)} style={{
              flex: 1, padding: "8px 0", border: "none", background: "transparent", cursor: "pointer",
              fontSize: 12, fontWeight: aba === key ? 500 : 400,
              color: aba === key ? "#fff" : "rgba(255,255,255,0.5)",
              borderBottom: `2px solid ${aba === key ? "#4ece9a" : "transparent"}`,
              transition: "all 0.15s", whiteSpace: "nowrap",
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {aba === "questoes" && (
        <FiltrosAssunto assuntos={assuntos.map((a) => a.assunto)} ativo={filtroAtivo} onChange={setFiltroAtivo} />
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 20px" }}>

        {/* ── ABA QUESTÕES ─────────────────────────────────────── */}
        {aba === "questoes" && (
          <>
            <div style={{ marginBottom: 16 }}>
              {simuladoBloqueado ? (
                // Simulado já usado — convida a assinar mas não bloqueia a página
                <div style={{ background: "#F0F7FF", border: "1.5px solid #1a3a6e33", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>🏆</span>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6e", margin: 0 }}>Simulado gratuito utilizado</p>
                  </div>
                  <p style={{ fontSize: 12, color: "#555", margin: "0 0 10px", lineHeight: 1.5 }}>
                    Você já experimentou este concurso. Assine para fazer simulados ilimitados, salvar seu histórico e aparecer no ranking!
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setPaywallAberto(true)} style={{ flex: 1, padding: "9px 0", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Ver planos 🚀
                    </button>
                    <button onClick={() => setAba("ranking")} style={{ padding: "9px 14px", background: "transparent", color: "#1a3a6e", border: "1.5px solid #1a3a6e33", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                      Ver ranking
                    </button>
                  </div>
                </div>
              ) : (
                // Ainda tem simulado gratuito disponível
                <div>
                  {isFree && (
                    <div style={{ background: "#E6F1FB", borderRadius: 8, padding: "8px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>🎁</span>
                      <p style={{ fontSize: 12, color: "#0C447C", margin: 0 }}>
                        Simulado gratuito — experimente! Assine para acesso ilimitado e ranking.
                      </p>
                    </div>
                  )}
                  <button onClick={() => navigate(`/quiz/${concursoId}`)} style={{ width: "100%", padding: 11, background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                    {isFree ? "Iniciar simulado grátis — 5 questões" : "Iniciar simulado — 10 questões"}
                  </button>
                </div>
              )}
            </div>

            {assuntos.length > 0 && <DistribuicaoEdital assuntos={assuntos} />}
            {preview && (
              <>
                <p style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
                  Prévia — questão estilo CESPE
                </p>
                <QuestaoPreview questao={preview} />
              </>
            )}
          </>
        )}

        {/* ── ABA MATERIAIS ────────────────────────────────────── */}
        {aba === "materiais" && (
          <div>
            {materiaisLoading && <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 32 }}>Carregando materiais...</p>}
            {!materiaisLoading && materiais.length === 0 && (
              <div style={{ textAlign: "center", marginTop: 40 }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>📚</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#333", marginBottom: 4 }}>Nenhum material ainda</p>
                <p style={{ fontSize: 13, color: "#888" }}>Os materiais de estudo aparecerão aqui quando disponíveis.</p>
              </div>
            )}
            {!materiaisLoading && materiais.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {materiais.map(m => (
                  <a key={m.id} href={m.tipo === "pdf" ? `https://docs.google.com/viewer?url=${encodeURIComponent(m.url)}` : m.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", cursor: "pointer" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        {TIPO_ICONE[m.tipo] ?? "📄"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", margin: "0 0 2px" }}>{m.titulo}</p>
                        <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{m.tipo.toUpperCase()}</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1a3a6e" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA RANKING ─────────────────────────────────────── */}
        {aba === "ranking" && (
          <div>
            {rankingLoading && <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 32 }}>Carregando ranking...</p>}

            {!rankingLoading && ranking.length === 0 && (
              <div style={{ textAlign: "center", marginTop: 40 }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🏆</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#333", marginBottom: 4 }}>Ranking vazio</p>
                <p style={{ fontSize: 13, color: "#888" }}>Responda pelo menos 5 questões para aparecer aqui!</p>
              </div>
            )}

            {!rankingLoading && ranking.length > 0 && (
              <>
                {/* Pódio top 3 */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {ranking.slice(0, 3).map((entry, i) => (
                    <div key={entry.user_id} style={{ flex: 1, background: entry.user_id === profile?.id ? "#E6F1FB" : "#f4f6fb", border: `1.5px solid ${entry.user_id === profile?.id ? "#1a3a6e" : "rgba(0,0,0,0.06)"}`, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{MEDALHA[i]}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.nome.split(" ")[0]}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a3a6e" }}>{entry.pct}%</div>
                      <div style={{ fontSize: 10, color: "#888" }}>{entry.total} questões</div>
                    </div>
                  ))}
                </div>

                {/* Lista completa — free vê top 3 completo, restante com blur + CTA */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {ranking.map((entry, i) => {
                    const isMe = entry.user_id === profile?.id;
                    const bloqueado = isFree && i >= 3;
                    return (
                      <div key={entry.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: isMe ? "#E6F1FB" : "#fff", border: `0.5px solid ${isMe ? "#1a3a6e" : "rgba(0,0,0,0.08)"}`, filter: bloqueado ? "blur(3px)" : "none", pointerEvents: bloqueado ? "none" : "auto" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? "#1a3a6e" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: i < 3 ? 14 : 11, fontWeight: 600, color: i < 3 ? "#fff" : "#666" }}>{i < 3 ? MEDALHA[i] : `${i + 1}º`}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: isMe ? 600 : 400, color: isMe ? "#1a3a6e" : "#1a1a1a", margin: "0 0 1px" }}>{entry.nome} {isMe && <span style={{ fontSize: 10, color: "#1a3a6e" }}>(você)</span>}</p>
                          <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{entry.total} questões respondidas</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: entry.pct >= 70 ? "#27500A" : entry.pct >= 50 ? "#633806" : "#791F1F" }}>{entry.pct}%</div>
                          <div style={{ fontSize: 10, color: "#888" }}>acerto</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CTA para free ver ranking completo */}
                {isFree && ranking.length > 3 && (
                  <div style={{ marginTop: 8, background: "#fff", border: "1.5px solid #1a3a6e", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1a3a6e", margin: "0 0 4px" }}>🏆 {ranking.length - 3} competidores ocultos</p>
                    <p style={{ fontSize: 12, color: "#666", margin: "0 0 10px" }}>Assine para ver o ranking completo e competir!</p>
                    <button onClick={() => setPaywallAberto(true)} style={{ padding: "8px 20px", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                      Ver ranking completo
                    </button>
                  </div>
                )}

                {/* Minha posição se estiver fora do top 10 */}
                {minhaPosicao > 9 && (
                  <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "#E6F1FB", border: "1.5px solid #1a3a6e", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a3a6e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{minhaPosicao + 1}º</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6e", margin: "0 0 1px" }}>{profile?.nome} <span style={{ fontSize: 10 }}>(você)</span></p>
                      <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{ranking[minhaPosicao]?.total} questões</p>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1a3a6e" }}>{ranking[minhaPosicao]?.pct}%</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav />

      <PaywallModal
        isOpen={paywallAberto}
        onClose={() => setPaywallAberto(false)}
        contentTitle="simulados ilimitados"
        contentType="simulado"
        onUpgrade={() => { setPaywallAberto(false); navigate("/assinatura"); }}
      />
    </div>
  );
}
