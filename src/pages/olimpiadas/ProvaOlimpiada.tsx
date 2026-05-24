// src/pages/olimpiadas/ProvaOlimpiada.tsx
// Tela da prova oficial — modo bloqueado, cronômetro, auto-certificado

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export default function ProvaOlimpiada() {
  const { id, provaId } = useParams<{ id: string; provaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [prova, setProva] = useState<any>(null);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [tentativa, setTentativa] = useState<any>(null);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [atual, setAtual] = useState(0);
  const [tempoRestante, setTempoRestante] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return; // Aguarda auth carregar
    iniciarProva();
    // Bloqueia navegação
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => { window.history.pushState(null, "", window.location.href); };
    return () => { window.onpopstate = null; clearInterval(intervalRef.current); };
  }, [user]);

  useEffect(() => {
    if (tempoRestante <= 0 && prova && !finalizado) {
      finalizarProva(true);
    }
  }, [tempoRestante]);

  async function iniciarProva() {
    setLoading(true);
    const { data: p } = await supabase.from("provas_olimpiada").select("*").eq("id", provaId).single();
    if (!p) { navigate(-1); return; }
    setProva(p);

    const { data: qs } = await supabase.from("questoes_prova").select("*").eq("prova_id", provaId).order("ordem");
    setQuestoes(qs ?? []);

    // Busca ou cria tentativa
    let { data: t } = await supabase.from("tentativas_prova").select("*").eq("prova_id", provaId).eq("user_id", user!.id).maybeSingle();

    if (!t) {
      const { data: nova, error: errNova } = await supabase.from("tentativas_prova").insert({
        prova_id: provaId, user_id: user!.id, respostas: {}, status: "em_andamento",
        iniciada_em: new Date().toISOString(),
      }).select().maybeSingle();
      console.log("INSERT tentativa:", { nova, errNova });
      if (errNova) { console.error("Erro ao criar tentativa:", errNova.message, errNova.details, errNova.hint); setLoading(false); return; }
      if (!nova) { console.error("INSERT retornou null sem erro"); setLoading(false); return; }
      t = nova;
    }

    if (t?.status === "finalizado") {
      setFinalizado(true);
      setResultado({ nota: t.nota, acertos: t.acertos, total: p.total_questoes });
      setLoading(false);
      return;
    }

    if (!t) { console.error("Tentativa nula após insert"); setLoading(false); return; }

    setTentativa(t);
    setRespostas(t?.respostas ?? {});

    // Calcula tempo restante
    const iniciada = new Date(t?.iniciada_em ?? new Date()).getTime();
    const duracao = p.duracao_minutos * 60 * 1000;
    const restante = Math.max(0, Math.floor((iniciada + duracao - Date.now()) / 1000));
    setTempoRestante(restante);

    // Inicia cronômetro
    intervalRef.current = setInterval(() => {
      setTempoRestante(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);

    setLoading(false);
  }

  async function salvarResposta(questaoId: string, opcao: number) {
    const novas = { ...respostas, [questaoId]: opcao };
    setRespostas(novas);
    await supabase.from("tentativas_prova").update({ respostas: novas }).eq("id", tentativa.id);
  }

  async function finalizarProva(porTempo = false) {
    if (finalizando) return;
    setFinalizando(true);
    clearInterval(intervalRef.current);

    // Calcula nota
    let acertos = 0;
    questoes.forEach(q => {
      if (respostas[q.id] === q.resposta_correta) acertos++;
    });
    const nota = (acertos / questoes.length) * 100;
    const tempoGasto = prova.duracao_minutos * 60 - tempoRestante;

    await supabase.from("tentativas_prova").update({
      respostas, nota, acertos, status: "finalizado",
      finalizada_em: new Date().toISOString(),
      tempo_gasto_segundos: tempoGasto,
    }).eq("id", tentativa.id);

    // Auto-emissão de certificado se atingiu nota mínima
    if (nota >= (prova.nota_aprovacao ?? 60)) {
      const { data: ev } = await supabase.from("eventos_certificaveis").select("id").eq("sigla", id?.toUpperCase()).single();
      if (ev) {
        const { data: regras } = await supabase.from("regras_certificado").select("*").eq("evento_id", ev.id);
        if (regras?.length) {
          const regra = regras.find(r => r.nota_minima <= nota) ?? regras[0];
          await supabase.functions.invoke("gerar-certificado", {
            body: { user_id: user!.id, evento_id: ev.id, regra_id: regra.id, tipo_certificado: regra.tipo_certificado, nota }
          });
        }
      }
    }

    setResultado({ nota, acertos, total: questoes.length, porTempo });
    setFinalizado(true);
    setFinalizando(false);
    window.onpopstate = null;
  }

  function formatarTempo(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2,"0")}:${seg.toString().padStart(2,"0")}` : `${m}:${seg.toString().padStart(2,"0")}`;
  }

  const corTempo = tempoRestante < 300 ? "#ef4444" : tempoRestante < 600 ? "#f59e0b" : "#22c55e";

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100dvh", background:"#0f172a" }}>
      <p style={{ color:"#fff", fontSize:16 }}>Carregando prova...</p>
    </div>
  );

  // Tela de resultado
  if (finalizado && resultado) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100dvh", background:"#0f172a", padding:24 }}>
      <div style={{ background:"#1e293b", borderRadius:20, padding:28, maxWidth:400, width:"100%", textAlign:"center" }}>
        <p style={{ fontSize:56, margin:"0 0 8px" }}>{resultado.nota >= 85 ? "🥇" : resultado.nota >= 75 ? "🥈" : resultado.nota >= 60 ? "🥉" : "📝"}</p>
        <p style={{ fontSize:22, fontWeight:800, color:"#fff", margin:"0 0 4px" }}>
          {resultado.porTempo ? "Tempo esgotado!" : "Prova finalizada!"}
        </p>
        <p style={{ fontSize:13, color:"#94a3b8", margin:"0 0 20px" }}>
          {resultado.nota >= 60 ? "🎉 Parabéns! Certificado emitido automaticamente!" : "Continue estudando para a próxima edição!"}
        </p>
        <div style={{ background:"#0f172a", borderRadius:14, padding:20, marginBottom:20 }}>
          <p style={{ fontSize:42, fontWeight:800, color:"#fff", margin:"0 0 4px" }}>{resultado.nota?.toFixed(1)}</p>
          <p style={{ fontSize:13, color:"#94a3b8", margin:"0 0 12px" }}>Pontuação</p>
          <p style={{ fontSize:14, color:"#94a3b8", margin:0 }}>{resultado.acertos} de {resultado.total} acertos</p>
        </div>
        {resultado.nota >= 60 && (
          <button onClick={() => navigate("/certificados")} style={{ width:"100%", padding:"13px 0", background:"#0A7C4B", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", marginBottom:8 }}>
            📜 Ver meu certificado
          </button>
        )}
        <button onClick={() => navigate(`/olimpiada/${id}`)} style={{ width:"100%", padding:"13px 0", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>
          Voltar para OTQ
        </button>
      </div>
    </div>
  );

  const questao = questoes[atual];
  const respondidas = Object.keys(respostas).length;
  const progresso = (respondidas / questoes.length) * 100;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100dvh", background:"#0f172a", userSelect:"none" }}>

      {/* Header fixo */}
      <div style={{ background:"#1e293b", padding:"12px 16px", flexShrink:0, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <p style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0 }}>
            {id?.toUpperCase()} · Questão {atual + 1}/{questoes.length}
          </p>
          <div style={{ background: tempoRestante < 300 ? "#7f1d1d" : "#0f172a", borderRadius:8, padding:"4px 12px" }}>
            <p style={{ fontSize:16, fontWeight:800, color:corTempo, margin:0, fontFamily:"monospace" }}>
              ⏱ {formatarTempo(tempoRestante)}
            </p>
          </div>
        </div>
        {/* Barra de progresso */}
        <div style={{ height:4, background:"rgba(255,255,255,0.1)", borderRadius:2 }}>
          <div style={{ height:"100%", width:`${progresso}%`, background:"#0A7C4B", borderRadius:2, transition:"width 0.3s" }} />
        </div>
        <p style={{ fontSize:10, color:"#64748b", margin:"4px 0 0" }}>{respondidas} de {questoes.length} respondidas</p>
      </div>

      {/* Questão */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 16px" }}>
        {questao && (
          <>
            <div style={{ background:"#1e293b", borderRadius:14, padding:16, marginBottom:16 }}>
              <p style={{ fontSize:14, color:"#e2e8f0", lineHeight:1.7, margin:0 }}>{questao.enunciado}</p>
              {questao.assunto && (
                <span style={{ fontSize:10, color:"#64748b", background:"#0f172a", borderRadius:4, padding:"2px 8px", marginTop:8, display:"inline-block" }}>
                  {questao.assunto}
                </span>
              )}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(questao.alternativas as any[]).map((alt: any, i: number) => {
                const selecionada = respostas[questao.id] === i;
                return (
                  <button key={i} onClick={() => salvarResposta(questao.id, i)}
                    style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", borderRadius:12,
                      background: selecionada ? "#1a3a6e" : "#1e293b",
                      border:`2px solid ${selecionada ? "#3b82f6" : "rgba(255,255,255,0.08)"}`,
                      cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                      background: selecionada ? "#3b82f6" : "rgba(255,255,255,0.08)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, fontWeight:700, color: selecionada ? "#fff" : "#94a3b8" }}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <p style={{ fontSize:13, color: selecionada ? "#fff" : "#cbd5e1", margin:0, lineHeight:1.6 }}>
                      {alt.texto}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Navegação */}
      <div style={{ background:"#1e293b", padding:"12px 16px", flexShrink:0, borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        {/* Mini mapa de questões */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:12 }}>
          {questoes.map((q, i) => (
            <button key={i} onClick={() => setAtual(i)}
              style={{ width:28, height:28, borderRadius:6, border:"none", cursor:"pointer", fontSize:10, fontWeight:700,
                background: i === atual ? "#3b82f6" : respostas[q.id] !== undefined ? "#0A7C4B" : "rgba(255,255,255,0.1)",
                color: "#fff" }}>
              {i + 1}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setAtual(Math.max(0, atual - 1))} disabled={atual === 0}
            style={{ flex:1, padding:"12px 0", background:"rgba(255,255,255,0.08)", color:"#94a3b8", border:"none", borderRadius:10, fontSize:13, cursor:"pointer", opacity: atual === 0 ? 0.4 : 1 }}>
            ← Anterior
          </button>
          {atual < questoes.length - 1 ? (
            <button onClick={() => setAtual(atual + 1)}
              style={{ flex:2, padding:"12px 0", background:"#1a3a6e", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              Próxima →
            </button>
          ) : (
            <button onClick={() => {
              if (confirm(`Finalizar prova? ${respondidas}/${questoes.length} questões respondidas.`)) finalizarProva();
            }} disabled={finalizando}
              style={{ flex:2, padding:"12px 0", background:"#0A7C4B", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {finalizando ? "Finalizando..." : "✅ Finalizar Prova"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
