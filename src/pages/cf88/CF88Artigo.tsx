// src/pages/cf88/CF88Artigo.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import ToggleModo from "@/components/artigos/ToggleModo";
import CardInciso from "@/components/artigos/CardInciso";
import TagsPalavrasChave from "@/components/artigos/TagsPalavrasChave";
import OpcoesCespe from "@/components/quiz/OpcoesCespe";
import FeedbackQuestao from "@/components/quiz/FeedbackQuestao";
import PaywallModal from "@/components/ui/PaywallModal";
import ModalPeticao from "@/components/ui/ModalPeticao";
import type { Artigo, Inciso, Questao, Gabarito } from "@/types";

interface RespostaQuiz {
  resposta: Gabarito;
  correta: boolean;
}

interface Juris {
  id: string;
  tribunal: string;
  numero_processo?: string;
  ementa: string;
  resumo_simples?: string;
  relator?: string;
  data_julgamento?: string;
  url_original?: string;
}

export default function CF88Artigo() {
  const { artigoId } = useParams<{ artigoId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [artigo, setArtigo] = useState<Artigo | null>(null);
  const [incisos, setIncisos] = useState<Inciso[]>([]);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [juris, setJuris] = useState<Juris[]>([]);
  const [modo, setModo] = useState<"facil" | "original">("facil");
  const [salvo, setSalvo] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quiz
  const [quizAtivo, setQuizAtivo] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, RespostaQuiz>>({});
  const [quizFinalizado, setQuizFinalizado] = useState(false);
  const [paywallAberto, setPaywallAberto] = useState(false);
  const [paywallTipo, setPaywallTipo] = useState<"quiz" | "peticao">("quiz");
  const [quizzesDoMes, setQuizzesDoMes] = useState(0);

  // Petição
  const [peticaoAberta, setPeticaoAberta] = useState(false);

  const LIMITE_FREE = 3;
  const isFree = !profile || profile.plano === "gratis";
  const isOuro = (profile?.plano as string) === "ouro";

  useEffect(() => {
    if (!artigoId) return;
    Promise.all([
      supabase.from("artigos").select("*").eq("id", artigoId).single(),
      supabase.from("incisos").select("*").eq("artigo_id", artigoId).order("ordem"),
      supabase.from("questoes").select("*").eq("artigo_id", artigoId).eq("ativo", true).not("assertiva", "is", null).limit(3),
      supabase.from("jurisprudencias").select("*").eq("artigo_id", artigoId).eq("ativo", true).order("relevancia", { ascending: false }),
    ]).then(([{ data: art }, { data: inc }, { data: q }, { data: j }]) => {
      setArtigo(art);
      setIncisos(inc ?? []);
      setQuestoes(q ?? []);
      setJuris((j as Juris[]) ?? []);
      setLoading(false);
    });

    if (profile) {
      supabase
        .from("artigos_salvos")
        .select("id")
        .eq("user_id", profile.id)
        .eq("artigo_id", artigoId)
        .maybeSingle()
        .then(({ data }) => setSalvo(!!data));

      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      supabase
        .from("respostas")
        .select("questao_id, questoes(artigo_id)")
        .eq("user_id", profile.id)
        .gte("respondida_em", inicioDia.toISOString())
        .then(({ data }) => {
          const artigosUnicos = new Set(
            (data ?? []).map((r: any) => r.questoes?.artigo_id).filter(Boolean)
          );
          setQuizzesDoMes(artigosUnicos.size);
        });
    }
  }, [artigoId, profile]);

  async function toggleSalvar() {
    if (!profile || !artigoId) return;
    if (salvo) {
      await supabase.from("artigos_salvos").delete().eq("user_id", profile.id).eq("artigo_id", artigoId);
      setSalvo(false);
    } else {
      await supabase.from("artigos_salvos").insert({ user_id: profile.id, artigo_id: artigoId });
      setSalvo(true);
    }
  }

  async function handleResponder(resposta: Gabarito) {
    if (!profile || respostas[qIdx] !== undefined) return;
    const q = questoes[qIdx];
    const correta = resposta === q.gabarito_cespe;
    setRespostas(prev => ({ ...prev, [qIdx]: { resposta, correta } }));
    await supabase.from("respostas").insert({
      user_id: profile.id,
      questao_id: q.id,
      resposta_cespe: resposta,
      correta,
    });
  }

  function avancarQuiz() {
    if (qIdx + 1 >= questoes.length) setQuizFinalizado(true);
    else setQIdx(i => i + 1);
  }

  const acertos = Object.values(respostas).filter(r => r.correta).length;

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}>Carregando...</div>;
  if (!artigo) return <div style={{ padding: 32 }}>Artigo não encontrado.</div>;

  const textoBody = modo === "facil" && (artigo.texto_simples ?? "")
    ? artigo.texto_simples ?? ""
    : artigo.texto_original ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* Header */}
      <div style={{ background: "#1a3a6e", padding: "10px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button onClick={() => navigate(-1)} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#fff" }}>
            Art. {artigo.numero}º — {artigo.lei_sigla ?? "CF/88"}
          </span>
          <button onClick={toggleSalvar} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill={salvo ? "#f0c040" : "none"} stroke={salvo ? "#f0c040" : "#fff"} strokeWidth="1.5">
              <path d="M8 12.5S2 9 2 5a3 3 0 016 0 3 3 0 016 0c0 4-6 7.5-6 7.5z" />
            </svg>
          </button>
        </div>
        <ToggleModo modo={modo} onChange={setModo} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 24px" }}>

        {/* ── LEITURA ── */}
        {!quizAtivo && (
          <>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 500, background: "#E6F1FB", color: "#0C447C", borderRadius: 99, padding: "3px 10px", display: "inline-block", marginBottom: 6 }}>
                Art. {artigo.numero}º
              </span>
              <p style={{ fontSize: 16, fontWeight: 500, color: "#1a1a1a", margin: "0 0 3px" }}>{artigo.ementa}</p>
            </div>

            {modo === "original" ? (
              <div style={{ fontSize: 12, color: "#444", lineHeight: 1.65, padding: "10px 12px", background: "#f4f6fb", borderRadius: 8, borderLeft: "3px solid #B5D4F4", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontFamily: "Georgia, serif", marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 500, color: "#185FA5", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px", fontFamily: "inherit" }}>Texto constitucional</p>
                {textoBody}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.65, marginBottom: 14 }}>{textoBody}</p>
            )}

            <TagsPalavrasChave tags={artigo.palavras_chave ?? []} />

            {incisos.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 500, color: "#666", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {modo === "facil" ? "Principais garantias" : "Incisos e parágrafos"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                  {incisos.map(i => <CardInciso key={i.id} inciso={i} modo={modo} />)}
                </div>
              </>
            )}

            {/* ── JURISPRUDÊNCIAS ── */}
            {juris.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}>
                  ⚖️ Jurisprudência relevante
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {juris.map(j => {
                    const urlJuris = j.url_original
                      ? j.url_original
                      : j.tribunal === "STF"
                      ? `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&queryString=${encodeURIComponent(j.numero_processo ?? j.ementa.slice(0, 30))}&sort=_score&sortBy=desc`
                      : j.tribunal === "STJ"
                      ? `https://processo.stj.jus.br/SCON/?b=ACOR&p=true&operador=mesmo&q=${encodeURIComponent(j.numero_processo ?? "")}`
                      : null;
                    return (
                      <button
                        key={j.id}
                        onClick={urlJuris ? () => window.open(urlJuris, "_blank", "noopener noreferrer") : undefined}
                        style={{ background: "#fffbeb", border: "1px solid #f0c04066", borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: urlJuris ? "pointer" : "default", width: "100%" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#1a3a6e", color: "#fff", borderRadius: 4, padding: "2px 6px" }}>{j.tribunal}</span>
                          {j.numero_processo && <span style={{ fontSize: 10, color: "#888" }}>{j.numero_processo}</span>}
                          {j.data_julgamento && <span style={{ fontSize: 10, color: "#aaa", marginLeft: "auto" }}>{new Date(j.data_julgamento).toLocaleDateString("pt-BR")}</span>}
                          {urlJuris && (
                            <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="#b45309" strokeWidth="2" style={{ marginLeft: "auto", flexShrink: 0 }}><path d="M7 3H3v10h10v-4M9 3h4v4M9 7l4-4"/></svg>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: "#333", margin: "0 0 4px", lineHeight: 1.5 }}>
                          {j.resumo_simples ?? j.ementa}
                        </p>
                        {j.relator && <p style={{ fontSize: 10, color: "#888", margin: 0 }}>Rel. {j.relator}</p>}
                      </button>
                    );
                  })}
                </div>
                </div>
            )}

            {/* ── BOTÃO PETIÇÃO ── */}
            <button
              onClick={() => setPeticaoAberta(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", marginBottom: 12,
                background: "#fffbeb",
                border: "1px solid #f0c040",
                borderRadius: 8, fontSize: 12, fontWeight: 500,
                cursor: "pointer", color: "#92400e",
              }}
            >
              📄 Usar na petição
            </button>

            <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0 16px" }} />

            {/* ── BOTÃO QUIZ ── */}
            {questoes.length > 0 ? (
              <div style={{ background: "#E6F1FB", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#0C447C", margin: 0 }}>Quiz rápido</p>
                  {isFree && (
                    <span style={{
                      fontSize: 12, fontWeight: 700, borderRadius: 99, padding: "4px 12px",
                      background: quizzesDoMes >= LIMITE_FREE ? "linear-gradient(90deg, #dc2626, #b91c1c)" : quizzesDoMes === LIMITE_FREE - 1 ? "linear-gradient(90deg, #f0c040, #d97706)" : "#EAF3DE",
                      color: quizzesDoMes >= LIMITE_FREE - 1 ? "#fff" : "#27500A",
                      boxShadow: quizzesDoMes >= LIMITE_FREE ? "0 0 8px rgba(220,38,38,0.4)" : quizzesDoMes === LIMITE_FREE - 1 ? "0 0 8px rgba(240,192,64,0.4)" : "none",
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      {quizzesDoMes >= LIMITE_FREE ? "🔒" : "🔥"} {quizzesDoMes}/{LIMITE_FREE} hoje
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "#185FA5", margin: "0 0 12px" }}>
                  {questoes.length} questões sobre este artigo. Testa seu entendimento!
                </p>
                <button
                  onClick={() => {
                    if (isFree && quizzesDoMes >= LIMITE_FREE) { setPaywallTipo("quiz"); setPaywallAberto(true); return; }
                    setQuizAtivo(true);
                  }}
                  style={{
                    padding: "9px 20px",
                    background: isFree && quizzesDoMes >= LIMITE_FREE ? "linear-gradient(90deg, #dc2626, #b91c1c)" : "#1a3a6e",
                    color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  {isFree && quizzesDoMes >= LIMITE_FREE ? "🔒 Limite atingido — Ver planos" : "Iniciar quiz ↗"}
                </button>
              </div>
            ) : (
              <div style={{ background: "#f4f6fb", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Nenhuma questão disponível para este artigo ainda.</p>
              </div>
            )}
          </>
        )}

        {/* ── QUIZ ATIVO ── */}
        {quizAtivo && !quizFinalizado && questoes[qIdx] && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {questoes.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < qIdx ? "#4ece9a" : i === qIdx ? "#1a3a6e" : "#e0e0e0" }} />
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#888", margin: "0 0 12px" }}>Questão {qIdx + 1} de {questoes.length}</p>
            <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 13, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 500, background: "#E6F1FB", color: "#0C447C", borderRadius: 99, padding: "2px 8px" }}>
                  {questoes[qIdx].banca}
                </span>
                {questoes[qIdx].assunto && (
                  <span style={{ fontSize: 10, fontWeight: 500, background: "#EEEDFE", color: "#3C3489", borderRadius: 99, padding: "2px 8px" }}>
                    {questoes[qIdx].assunto}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.55, margin: 0, fontFamily: "Georgia, serif" }}>
                {questoes[qIdx].enunciado}
              </p>
            </div>
            {questoes[qIdx].assertiva && questoes[qIdx].gabarito_cespe && (
              <OpcoesCespe
                assertiva={questoes[qIdx].assertiva!}
                gabarito={questoes[qIdx].gabarito_cespe!}
                respostaUsuario={respostas[qIdx]?.resposta ?? null}
                onResponder={handleResponder}
              />
            )}
            {respostas[qIdx] !== undefined && (
              <>
                <FeedbackQuestao correta={respostas[qIdx].correta} justificativa={questoes[qIdx].justificativa ?? ""} />
                <button onClick={avancarQuiz} style={{ width: "100%", padding: "11px 0", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                  {qIdx + 1 >= questoes.length ? "Ver resultado" : "Próxima questão"}
                </button>
              </>
            )}
          </>
        )}

        {/* ── RESULTADO ── */}
        {quizFinalizado && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: acertos === questoes.length ? "#EAF3DE" : acertos >= questoes.length / 2 ? "#E6F1FB" : "#FAEEDA", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              {acertos === questoes.length
                ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#27500A" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#633806" strokeWidth="2" strokeLinecap="round"><path d="M12 9v4M12 17h.01" /></svg>
              }
            </div>
            <p style={{ fontSize: 17, fontWeight: 500, margin: "0 0 4px" }}>
              {acertos === questoes.length ? "Perfeito!" : acertos >= questoes.length / 2 ? "Bom trabalho!" : "Continue praticando!"}
            </p>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px" }}>
              Você acertou {acertos} de {questoes.length} questões sobre o Art. {artigo.numero}º
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
              <button onClick={() => { setQIdx(0); setRespostas({}); setQuizFinalizado(false); }} style={{ padding: "9px 20px", border: "0.5px solid rgba(0,0,0,0.12)", background: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                Refazer quiz
              </button>
              <button onClick={() => navigate(-1)} style={{ padding: "9px 20px", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                Próximo artigo
              </button>
            </div>
          </div>
        )}
      </div>

      {!quizAtivo && <BottomNav />}

      <PaywallModal
        isOpen={paywallAberto}
        onClose={() => setPaywallAberto(false)}
        contentTitle={paywallTipo === "peticao" ? "o Gerador de Petições" : "quizzes ilimitados"}
        contentType={paywallTipo}
        onUpgrade={() => { setPaywallAberto(false); navigate("/assinatura"); }}
      />

      <ModalPeticao
        isOpen={peticaoAberta}
        onClose={() => setPeticaoAberta(false)}
        artigoInicial={artigo ?? undefined}
      />
    </div>
  );
}
