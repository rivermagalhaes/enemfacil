// src/pages/cf88/CF88Home.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import type { Artigo } from "@/types";

const LEIS = [
  { sigla: "CF88", nome: "CF/88", nomeCompleto: "Constituição Federal", cor: "#1a3a6e", bg: "#E6F1FB", icone: "🏛️" },
  { sigla: "CDC",  nome: "CDC",   nomeCompleto: "Código do Consumidor", cor: "#0f6e56", bg: "#E1F5EE", icone: "🛒" },
  { sigla: "ECA",  nome: "ECA",   nomeCompleto: "Estatuto da Criança",  cor: "#7c3aed", bg: "#EEEDFE", icone: "👶" },
  { sigla: "CPC",  nome: "CPC",   nomeCompleto: "Código de Proc. Civil", cor: "#b45309", bg: "#FEF3E2", icone: "⚖️" },
];

const TITULOS_CF88: Record<number, { nome: string; cor: string; bg: string }> = {
  1: { nome: "Princípios fundamentais",          cor: "#0C447C", bg: "#E6F1FB" },
  2: { nome: "Direitos e garantias fundamentais", cor: "#27500A", bg: "#EAF3DE" },
  3: { nome: "Organização do Estado",             cor: "#3C3489", bg: "#EEEDFE" },
  4: { nome: "Organização dos Poderes",           cor: "#633806", bg: "#FAEEDA" },
  5: { nome: "Defesa do Estado",                  cor: "#791F1F", bg: "#FCEBEB" },
  6: { nome: "Tributação e orçamento",            cor: "#085041", bg: "#E1F5EE" },
  7: { nome: "Ordem econômica",                   cor: "#712B13", bg: "#FAECE7" },
  8: { nome: "Ordem social",                      cor: "#444441", bg: "#F1EFE8" },
  9: { nome: "Disposições gerais",                cor: "#5F5E5A", bg: "#F1EFE8" },
};

type Modo = "lista" | "busca" | "trilha" | "ranking";
type RankingCategoria = "xp" | "quiz";

interface RankingXP { id: string; nome: string | null; xp_total: number; sequencia: number; posicao: number; }
interface RankingQuiz { user_id: string; nome: string | null; total_respondidas: number; total_certas: number; taxa_acerto: number; }

function Medalha({ pos }: { pos: number }) {
  if (pos === 1) return <span style={{ fontSize: 18 }}>🥇</span>;
  if (pos === 2) return <span style={{ fontSize: 18 }}>🥈</span>;
  if (pos === 3) return <span style={{ fontSize: 18 }}>🥉</span>;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%", background: "#f0f0f0",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: "#888", flexShrink: 0,
    }}>
      {pos}
    </div>
  );
}

export default function CF88Home() {
  const [leiAtiva, setLeiAtiva] = useState("CF88");
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<Modo>("lista");
  const [tituloAberto, setTituloAberto] = useState<number | null>(1);
  const [progresso, setProgresso] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [jurisIds, setJurisIds] = useState<Set<string>>(new Set());

  // Ranking
  const [rankingCategoria, setRankingCategoria] = useState<RankingCategoria>("xp");
  const [rankingXP, setRankingXP] = useState<RankingXP[]>([]);
  const [rankingQuiz, setRankingQuiz] = useState<RankingQuiz[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  const { profile } = useAuth();
  const navigate = useNavigate();

  const lei = LEIS.find(l => l.sigla === leiAtiva) ?? LEIS[0];
  const corLei = lei.cor;
  const bgLei = lei.bg;

  useEffect(() => {
    setLoading(true); setBusca(""); setModo("lista"); setTituloAberto(1);
    supabase.from("artigos").select("id,numero,titulo_num,ementa,palavras_chave,lei_sigla")
      .eq("lei_sigla", leiAtiva).order("numero")
      .then(({ data }) => {
        const arts = (data as Artigo[]) ?? [];
        setArtigos(arts);
        setLoading(false);
        // Buscar artigos que têm jurisprudência — em lotes para evitar limite do .in()
        if (arts.length > 0) {
          const ids = arts.map(a => a.id);
          const lotes = [];
          for (let i = 0; i < ids.length; i += 100) lotes.push(ids.slice(i, i + 100));
          Promise.all(
            lotes.map(lote =>
              supabase.from("jurisprudencias").select("artigo_id").eq("ativo", true).in("artigo_id", lote)
            )
          ).then(resultados => {
            const todos = resultados.flatMap(r => (r.data ?? []).map((x: any) => x.artigo_id));
            setJurisIds(new Set(todos));
          });
        }
      });
  }, [leiAtiva]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("respostas").select("questao_id, questoes(artigo_id)").eq("user_id", profile.id)
      .then(({ data }) => {
        const lidos: Record<string, boolean> = {};
        (data ?? []).forEach((r: any) => { if (r.questoes?.artigo_id) lidos[r.questoes.artigo_id] = true; });
        setProgresso(lidos);
      });
  }, [profile]);

  useEffect(() => {
    if (modo === "ranking") carregarRanking();
  }, [modo, rankingCategoria]);

  async function carregarRanking() {
    setLoadingRanking(true);
    if (rankingCategoria === "xp") {
      const { data } = await supabase
        .from("v_ranking")
        .select("id, nome, xp_total, sequencia, posicao")
        .order("posicao", { ascending: true })
        .limit(50);
      setRankingXP((data as RankingXP[]) ?? []);
    } else {
      const { data: respostas } = await supabase
        .from("respostas")
        .select("user_id, correta");

      if (respostas) {
        const mapa: Record<string, { total: number; certas: number }> = {};
        respostas.forEach((r: any) => {
          if (!mapa[r.user_id]) mapa[r.user_id] = { total: 0, certas: 0 };
          mapa[r.user_id].total++;
          if (r.correta) mapa[r.user_id].certas++;
        });

        const ids = Object.keys(mapa);
        const { data: perfis } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", ids);

        const nomes: Record<string, string> = {};
        (perfis ?? []).forEach((p: any) => { nomes[p.id] = p.nome; });

        const lista: RankingQuiz[] = ids
          .map(uid => ({
            user_id: uid,
            nome: nomes[uid] ?? "Usuário",
            total_respondidas: mapa[uid].total,
            total_certas: mapa[uid].certas,
            taxa_acerto: mapa[uid].total > 0 ? Math.round((mapa[uid].certas / mapa[uid].total) * 100) : 0,
          }))
          .sort((a, b) => b.total_certas - a.total_certas || b.taxa_acerto - a.taxa_acerto)
          .slice(0, 50);

        setRankingQuiz(lista);
      }
    }
    setLoadingRanking(false);
  }

  const filtrados = artigos.filter(a =>
    !busca || String(a.numero).includes(busca) ||
    a.ementa.toLowerCase().includes(busca.toLowerCase()) ||
    (a.palavras_chave ?? []).some(p => p.toLowerCase().includes(busca.toLowerCase()))
  );

  const grupos = artigos.reduce<Record<number, Artigo[]>>((acc, a) => {
    const t = a.titulo_num ?? 0;
    if (!acc[t]) acc[t] = [];
    acc[t].push(a);
    return acc;
  }, {});

  const totalLidos = Object.keys(progresso).length;
  const pctGeral = artigos.length > 0 ? Math.round((totalLidos / artigos.length) * 100) : 0;

  const maxXP = rankingXP.length > 0 ? rankingXP[0].xp_total : 1;
  const maxCertas = rankingQuiz.length > 0 ? rankingQuiz[0].total_certas : 1;

  // Posição do usuário logado no ranking
  const meuPosXP = rankingXP.findIndex(r => r.id === profile?.id);
  const meuPosQuiz = rankingQuiz.findIndex(r => r.user_id === profile?.id);

  const ArtigoItem = ({ a, i }: { a: Artigo; i?: number }) => (
    <div onClick={() => navigate(`/cf88/${a.id}`)} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 13px",
      borderTop: i && i > 0 ? "0.5px solid rgba(0,0,0,0.05)" : "none",
      background: "#fff", cursor: "pointer",
    }}>
      <span style={{ fontSize: 10, fontWeight: 500, background: bgLei, color: corLei, borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
        Art. {a.numero}º
      </span>
      <span style={{ fontSize: 12, color: "#1a1a1a", flex: 1, lineHeight: 1.35 }}>{a.ementa}</span>
      {jurisIds.has(a.id) && (
        <div title="Tem jurisprudência" style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
          background: "#FFF8E6",
          border: "1px solid #f0c040",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10,
        }}>
          ⚖️
        </div>
      )}
      {progresso[a.id]
        ? <div style={{ width: 16, height: 16, borderRadius: "50%", background: bgLei, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke={corLei} strokeWidth="2" strokeLinecap="round"><polyline points="1.5 5 4 7.5 8.5 2" /></svg>
          </div>
        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#bbb" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
      }
    </div>
  );

  const TABS: { key: Modo; label: string }[] = [
    { key: "lista",   label: "Por seção" },
    { key: "busca",   label: "Buscar" },
    { key: "trilha",  label: "Trilha" },
    { key: "ranking", label: "🏆 Ranking" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div style={{ background: corLei, padding: "12px 16px 0", transition: "background .3s" }}>
        {/* Seletor de leis + Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {LEIS.map(l => (
              <button key={l.sigla} onClick={() => setLeiAtiva(l.sigla)} style={{
                padding: "6px 12px", borderRadius: 99, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: leiAtiva === l.sigla ? 700 : 400,
                background: leiAtiva === l.sigla ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)",
                color: leiAtiva === l.sigla ? corLei : "rgba(255,255,255,0.8)",
                transition: "all .2s",
              }}>
                {l.icone} {l.nome}
              </button>
            ))}
          </div>
          <img src="/logo.png" alt="CFfácil" style={{ height: 36, objectFit: "contain", background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "2px 4px" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#fff", margin: "0 0 1px" }}>{lei.nomeCompleto}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>{artigos.length} artigos · {pctGeral}% explorados</p>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#4ece9a", lineHeight: 1 }}>{pctGeral}%</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>lidos</span>
          </div>
        </div>

        <div style={{ height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 99, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pctGeral}%`, background: "#4ece9a", borderRadius: 99, transition: "width 0.4s" }} />
        </div>

        <div style={{ display: "flex", overflowX: "auto" }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setModo(tab.key)} style={{
              flex: tab.key === "ranking" ? "none" : 1,
              padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: 13, fontWeight: modo === tab.key ? 500 : 400, whiteSpace: "nowrap",
              color: modo === tab.key ? "#fff" : "rgba(255,255,255,0.5)",
              borderBottom: `2px solid ${modo === tab.key ? "#4ece9a" : "transparent"}`,
              transition: "all 0.15s",
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px" }}>
        {loading && modo !== "ranking" && <p style={{ color: "#888", fontSize: 13 }}>Carregando artigos...</p>}

        {/* LISTA */}
        {!loading && modo === "lista" && (
          <div>
            {leiAtiva === "CF88"
              ? Object.entries(grupos).sort(([a],[b]) => Number(a)-Number(b)).map(([tNum, arts]) => {
                  const t = TITULOS_CF88[Number(tNum)];
                  const aberto = tituloAberto === Number(tNum);
                  const lidos = arts.filter(a => progresso[a.id]).length;
                  return (
                    <div key={tNum} style={{ marginBottom: 8 }}>
                      <div onClick={() => setTituloAberto(aberto ? null : Number(tNum))} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "11px 13px",
                        borderRadius: aberto ? "10px 10px 0 0" : 10,
                        background: t?.bg ?? "#f4f6fb", cursor: "pointer",
                        border: `0.5px solid ${t?.cor ?? "#ccc"}22`,
                      }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: t?.cor ?? "#666", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                          {tNum}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: t?.cor ?? "#333", margin: "0 0 2px" }}>Título {tNum}</p>
                          <p style={{ fontSize: 11, color: t?.cor ?? "#666", margin: 0, opacity: 0.8 }}>{t?.nome} · {lidos}/{arts.length} lidos</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={t?.cor ?? "#666"} strokeWidth="1.5"
                          style={{ transform: aberto ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                          <path d="M6 4l4 4-4 4" />
                        </svg>
                      </div>
                      {aberto && (
                        <div style={{ border: `0.5px solid ${t?.cor ?? "#ccc"}22`, borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                          {arts.map((a, i) => <ArtigoItem key={a.id} a={a} i={i} />)}
                        </div>
                      )}
                    </div>
                  );
                })
              : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {artigos.map((a, i) => <ArtigoItem key={a.id} a={a} i={i} />)}
                </div>
            }
          </div>
        )}

        {/* BUSCA */}
        {!loading && modo === "busca" && (
          <div>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="6.5" cy="6.5" r="4" /><line x1="10" y1="10" x2="14" y2="14" />
              </svg>
              <input autoFocus placeholder="Número, tema ou palavra-chave..." value={busca}
                onChange={e => setBusca(e.target.value)}
                style={{ width: "100%", padding: "10px 12px 10px 30px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.12)", fontSize: 13, outline: "none", background: "#f4f6fb" }} />
            </div>
            {busca && <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(busca ? filtrados : artigos.slice(0, 20)).map(a => (
                <div key={a.id} onClick={() => navigate(`/cf88/${a.id}`)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 13px",
                  borderRadius: 10, background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", cursor: "pointer",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 500, background: bgLei, color: corLei, borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>Art. {a.numero}º</span>
                  <span style={{ fontSize: 12, color: "#1a1a1a", flex: 1 }}>{a.ementa}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRILHA */}
        {!loading && modo === "trilha" && (
          <div>
            <p style={{ fontSize: 12, color: "#666", margin: "0 0 14px", lineHeight: 1.5 }}>
              Leia do início ao fim, artigo por artigo. Seu progresso é salvo automaticamente.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {artigos.map((a, i) => {
                const lido = progresso[a.id];
                const proximo = !lido && (i === 0 || progresso[artigos[i-1]?.id]);
                return (
                  <div key={a.id} onClick={() => navigate(`/cf88/${a.id}`)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 13px",
                    borderRadius: 10, cursor: "pointer",
                    background: lido ? bgLei : proximo ? "#fff" : "#fafafa",
                    border: `0.5px solid ${lido ? corLei : proximo ? corLei : "rgba(0,0,0,0.06)"}`,
                    opacity: !lido && !proximo ? 0.5 : 1,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: lido ? corLei : proximo ? corLei : "#ddd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {lido
                        ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="2 6 5 9 10 3" /></svg>
                        : <span style={{ fontSize: 10, fontWeight: 600, color: proximo ? "#fff" : "#888" }}>{a.numero}</span>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, margin: "0 0 1px", color: lido ? corLei : "#1a1a1a" }}>Art. {a.numero}º</p>
                      <p style={{ fontSize: 11, color: lido ? corLei : "#666", margin: 0 }}>{a.ementa}</p>
                    </div>
                    {proximo && <span style={{ fontSize: 10, fontWeight: 500, background: bgLei, color: corLei, borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>próximo</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RANKING */}
        {modo === "ranking" && (
          <div>
            {/* Toggle XP / Quiz */}
            <div style={{ display: "flex", background: "#fff", borderRadius: 10, padding: 4, gap: 4, marginBottom: 16, border: "0.5px solid rgba(0,0,0,0.08)" }}>
              <button onClick={() => setRankingCategoria("xp")} style={{
                flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer",
                background: rankingCategoria === "xp" ? corLei : "transparent",
                color: rankingCategoria === "xp" ? "#fff" : "#888",
                fontSize: 13, fontWeight: 600, transition: "all 0.2s",
              }}>
                ⭐ XP Total
              </button>
              <button onClick={() => setRankingCategoria("quiz")} style={{
                flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer",
                background: rankingCategoria === "quiz" ? corLei : "transparent",
                color: rankingCategoria === "quiz" ? "#fff" : "#888",
                fontSize: 13, fontWeight: 600, transition: "all 0.2s",
              }}>
                🧠 Quiz
              </button>
            </div>

            {/* Minha posição */}
            {!loadingRanking && profile && (rankingCategoria === "xp" ? meuPosXP : meuPosQuiz) >= 0 && (
              <div style={{
                background: `${corLei}12`, border: `1px solid ${corLei}30`,
                borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 11, color: corLei, fontWeight: 600 }}>Sua posição</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 18, fontWeight: 700, color: corLei }}>
                  #{rankingCategoria === "xp" ? meuPosXP + 1 : meuPosQuiz + 1}
                </span>
                {rankingCategoria === "xp" && meuPosXP >= 0 && (
                  <span style={{ fontSize: 12, color: "#888" }}>{rankingXP[meuPosXP]?.xp_total} XP</span>
                )}
                {rankingCategoria === "quiz" && meuPosQuiz >= 0 && (
                  <span style={{ fontSize: 12, color: "#888" }}>{rankingQuiz[meuPosQuiz]?.total_certas} acertos</span>
                )}
              </div>
            )}

            {/* Pódio top 3 */}
            {!loadingRanking && (rankingCategoria === "xp" ? rankingXP : rankingQuiz).length >= 3 && (
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, marginBottom: 20 }}>
                {[1, 0, 2].map((idx) => {
                  const isFirst = idx === 0;
                  const lista = rankingCategoria === "xp" ? rankingXP : rankingQuiz;
                  const item = lista[idx];
                  const val = rankingCategoria === "xp"
                    ? `${(item as RankingXP).xp_total} XP`
                    : `${(item as RankingQuiz).total_certas} acertos`;
                  const alturas = [48, 64, 36];
                  const cores = ["#C0C0C0", "linear-gradient(135deg,#FFD700,#FFA500)", "#CD7F32"];
                  const bordas = ["#C0C0C0", "#FFD700", "#CD7F32"];
                  const avatarSizes = [44, 52, 40];
                  const medalhas = ["🥈", "🥇", "🥉"];
                  return (
                    <div key={idx} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{
                        width: avatarSizes[idx], height: avatarSizes[idx], borderRadius: "50%",
                        background: isFirst ? "#FFF9E6" : "#f4f6fb",
                        border: `2px solid ${bordas[idx]}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: isFirst ? 20 : 16, fontWeight: 700,
                        color: isFirst ? "#b45309" : "#666",
                        margin: "0 auto 6px",
                      }}>
                        {(item.nome ?? "?")[0].toUpperCase()}
                      </div>
                      <p style={{ fontSize: isFirst ? 12 : 11, fontWeight: isFirst ? 700 : 600, margin: "0 0 2px", color: "#1a1a1a", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.nome ?? "—"}
                      </p>
                      <p style={{ fontSize: 10, color: "#888", margin: "0 0 4px" }}>{val}</p>
                      <div style={{ background: cores[idx], borderRadius: "6px 6px 0 0", height: alturas[idx], display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: isFirst ? 24 : 18 }}>{medalhas[idx]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Loading */}
            {loadingRanking && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <p style={{ fontSize: 13, color: "#888" }}>Carregando ranking...</p>
              </div>
            )}

            {/* Lista */}
            {!loadingRanking && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rankingCategoria === "xp" && rankingXP.map((u, i) => {
                  const isMe = u.id === profile?.id;
                  return (
                    <div key={u.id} style={{
                      background: isMe ? `${corLei}10` : i < 3 ? "#fafcff" : "#fff",
                      borderRadius: 10, padding: "10px 12px",
                      border: isMe ? `1.5px solid ${corLei}40` : i === 0 ? "1px solid rgba(255,215,0,0.4)" : i === 1 ? "1px solid rgba(192,192,192,0.4)" : i === 2 ? "1px solid rgba(205,127,50,0.4)" : "0.5px solid rgba(0,0,0,0.07)",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <Medalha pos={u.posicao} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: isMe ? 700 : 600, margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isMe ? corLei : "#1a1a1a" }}>
                          {u.nome ?? "Usuário"}{isMe ? " (você)" : ""}
                        </p>
                        <div style={{ height: 4, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.round((u.xp_total / maxXP) * 100)}%`, background: corLei, borderRadius: 99 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: corLei, margin: 0 }}>{u.xp_total} XP</p>
                        {u.sequencia > 0 && <p style={{ fontSize: 10, color: "#f59e0b", margin: 0 }}>🔥 {u.sequencia}d</p>}
                      </div>
                    </div>
                  );
                })}

                {rankingCategoria === "quiz" && rankingQuiz.map((u, i) => {
                  const isMe = u.user_id === profile?.id;
                  return (
                    <div key={u.user_id} style={{
                      background: isMe ? `${corLei}10` : i < 3 ? "#fafcff" : "#fff",
                      borderRadius: 10, padding: "10px 12px",
                      border: isMe ? `1.5px solid ${corLei}40` : i === 0 ? "1px solid rgba(255,215,0,0.4)" : i === 1 ? "1px solid rgba(192,192,192,0.4)" : i === 2 ? "1px solid rgba(205,127,50,0.4)" : "0.5px solid rgba(0,0,0,0.07)",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <Medalha pos={i + 1} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: isMe ? 700 : 600, margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isMe ? corLei : "#1a1a1a" }}>
                          {u.nome ?? "Usuário"}{isMe ? " (você)" : ""}
                        </p>
                        <p style={{ fontSize: 10, color: "#888", margin: "0 0 3px" }}>
                          {u.total_respondidas} respondidas · {u.taxa_acerto}% de acerto
                        </p>
                        <div style={{ height: 4, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.round((u.total_certas / maxCertas) * 100)}%`, background: "#0f6e56", borderRadius: 99 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0f6e56", margin: 0 }}>{u.total_certas}</p>
                        <p style={{ fontSize: 10, color: "#888", margin: 0 }}>acertos</p>
                      </div>
                    </div>
                  );
                })}

                {rankingCategoria === "xp" && rankingXP.length === 0 && (
                  <p style={{ textAlign: "center", color: "#888", fontSize: 13, padding: 32 }}>Nenhum dado de XP ainda.</p>
                )}
                {rankingCategoria === "quiz" && rankingQuiz.length === 0 && (
                  <p style={{ textAlign: "center", color: "#888", fontSize: 13, padding: 32 }}>Nenhuma resposta registrada ainda.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
