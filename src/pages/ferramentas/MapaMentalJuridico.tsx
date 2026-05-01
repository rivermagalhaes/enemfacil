// src/pages/ferramentas/MapaMentalJuridico.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/layout/BottomNav";
import PaywallModal from "@/components/ui/PaywallModal";

const LIMITES_DIA: Record<string, number> = {
  gratis: 1, cidadao: 2, concurseiro: 4, premium: 4, cursinho: 4, ouro: Infinity,
};
const TRAVA_DIAS = [3, 21, 90];

function useUso(userId: string | undefined, plano: string) {
  const limite = plano === "ouro" ? Infinity : (LIMITES_DIA[plano] ?? 0);
  const [usosHoje, setUsosHoje]     = useState(0);
  const [travadoAte, setTravadoAte] = useState<Date | null>(null);
  const [travaNivel, setTravaNivel] = useState(0);
  const [loading, setLoading]       = useState(true);

  const carregar = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const hoje = new Date().toISOString().split("T")[0];
    const [{ data: usos }, { data: trava }] = await Promise.all([
      supabase.from("uso_funcionalidades").select("id").eq("user_id", userId).eq("funcionalidade", "mapa_mental").eq("usado_em", hoje),
      supabase.from("travas_usuario").select("travado_ate, nivel").eq("user_id", userId).eq("funcionalidade", "mapa_mental").maybeSingle(),
    ]);
    setUsosHoje(usos?.length ?? 0);
    setTravadoAte(trava?.travado_ate ? new Date(trava.travado_ate) : null);
    setTravaNivel(trava?.nivel ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => { carregar(); }, [carregar]);

  const registrar = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    if (plano === "ouro") return true;
    const hoje = new Date().toISOString().split("T")[0];
    if (travadoAte && travadoAte > new Date()) return false;
    if (usosHoje >= limite) {
      const proximoNivel = Math.min(travaNivel + 1, TRAVA_DIAS.length);
      const dias = TRAVA_DIAS[proximoNivel - 1] ?? 90;
      const ate = new Date();
      ate.setDate(ate.getDate() + dias);
      await supabase.from("travas_usuario").upsert(
        { user_id: userId, funcionalidade: "mapa_mental", nivel: proximoNivel, travado_ate: ate.toISOString().split("T")[0] },
        { onConflict: "user_id,funcionalidade" }
      );
      await carregar();
      return false;
    }
    await supabase.from("uso_funcionalidades").insert({ user_id: userId, funcionalidade: "mapa_mental", usado_em: hoje });
    await carregar();
    return true;
  }, [userId, plano, usosHoje, limite, travadoAte, travaNivel, carregar]);

  return { usosHoje, limite, travadoAte, loading, registrar };
}

interface Campo { id: string; label: string; placeholder: string; icone: string; cor: string; dica?: string; }

const CAMPOS: Campo[] = [
  { id: "classificacao", label: "Classificação do crime", icone: "⚖️", cor: "#1a3a6e", placeholder: "Ex: Homicídio simples (art. 121 CP), crime doloso contra a vida, forma consumada...", dica: "Tipo penal, se é doloso/culposo, qualificadoras, tentado ou consumado" },
  { id: "elementos", label: "Elementos do crime", icone: "🔍", cor: "#0f6e56", placeholder: "Conduta: luta corporal\nResultado: morte do invasor\nNexo causal: luta causou a morte\nTipicidade: art. 121 CP\nIlicitude: possível exclusão por legítima defesa\nCulpabilidade: analisar imputabilidade", dica: "Conduta, resultado, nexo, tipicidade, ilicitude e culpabilidade" },
  { id: "defesas", label: "Linhas de defesa possíveis", icone: "🛡️", cor: "#7c3aed", placeholder: "Legítima defesa (art. 25 CP): invasão + agressão injusta\nNegativa de autoria: dúvida sobre quem causou o óbito\nAusência de dolo: sem intenção de matar\nExcesso culposo: ultrapassou os limites sem querer", dica: "Liste TODAS as teses plausíveis — inclua as mais remotas" },
  { id: "provas", label: "Provas relevantes", icone: "📋", cor: "#b45309", placeholder: "Analisar: laudo de local, laudo necroscópico, testemunhas\nPontos fracos da acusação: ausência de premeditação\nOportunidades: câmeras, marcas de arrombamento", dica: "O que analisar, pontos fracos da acusação e oportunidades" },
  { id: "fundamentos", label: "Fundamentos legais", icone: "📚", cor: "#dc2626", placeholder: "Art. 25 CP: legítima defesa\nArt. 5º, LV CF: contraditório e ampla defesa\nArt. 386 CPP: absolvição por insuficiência de provas\nIn dubio pro reo: dúvida favorece o réu", dica: "Artigos do CP, CPP, CF/88 e princípios ligados às teses" },
  { id: "estrategia", label: "Estratégia jurídica", icone: "🗺️", cor: "#0891b2", placeholder: "Caminhos: legítima defesa em plenário + subsidiariamente homicídio culposo\nAtenção: evitar contradições entre teses\nRiscos: excesso pode ser reconhecido pelo júri", dica: "Caminhos possíveis, pontos de atenção e riscos — sem decidir pelo advogado" },
];

// SVG helpers
const _NW = 148; const NH = 58; const HGAP = 52; const VGAP = 10;
interface SvgNo { id:string; label:string; desc:string; cor:string; bg:string; filhos:SvgNo[]; x:number; y:number; w:number; h:number; }
function svgSubH(n:SvgNo):number{ if(!n.filhos.length)return n.h; const t=n.filhos.reduce((s,f)=>s+svgSubH(f)+VGAP,-VGAP); return Math.max(n.h,t); }
function svgLayout(n:SvgNo,x:number,top:number){n.x=x;const sh=svgSubH(n);n.y=top+sh/2-n.h/2;let cy=top;for(const f of n.filhos){svgLayout(f,x+n.w+HGAP,cy);cy+=svgSubH(f)+VGAP;}}
function svgFlat(n:SvgNo,out:SvgNo[]=[]):SvgNo[]{out.push(n);n.filhos.forEach(f=>svgFlat(f,out));return out;}
function svgEdges(n:SvgNo,out:{x1:number;y1:number;x2:number;y2:number;cor:string}[]=[]):{x1:number;y1:number;x2:number;y2:number;cor:string}[]{n.filhos.forEach(f=>{out.push({x1:n.x+n.w,y1:n.y+n.h/2,x2:f.x,y2:f.y+f.h/2,cor:n.cor});svgEdges(f,out)});return out;}

function SvgArvore({raiz}:{raiz:SvgNo}){
  const nos=svgFlat(raiz); const edges=svgEdges(raiz);
  const W=Math.max(...nos.map(n=>n.x+n.w))+30;
  const H=Math.max(...nos.map(n=>n.y+n.h))+30;
  const [ativo,setAtivo]=React.useState<string|null>(null);
  return(
    <div>
      <div style={{overflowX:"auto",borderRadius:14,background:"#fff",border:"0.5px solid rgba(0,0,0,0.08)",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
        <svg width={W} height={H} style={{display:"block"}}>
          <defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5"/></pattern></defs>
          <rect width={W} height={H} fill="url(#g)"/>
          {edges.map((e,i)=>{const mx=(e.x1+e.x2)/2;return(<path key={i} d={`M ${e.x1} ${e.y1} C ${mx} ${e.y1} ${mx} ${e.y2} ${e.x2} ${e.y2}`} fill="none" stroke={e.cor} strokeWidth={2} strokeOpacity={0.25}/>);})}
          {nos.map(no=>{const at=ativo===no.id;const cy=no.y+no.h/2;return(
            <g key={no.id} onClick={()=>setAtivo(at?null:no.id)} style={{cursor:"pointer"}}>
              <rect x={no.x+3} y={no.y+4} width={no.w} height={no.h} rx={9} fill="rgba(0,0,0,0.07)"/>
              <rect x={no.x} y={no.y} width={no.w} height={no.h} rx={9} fill={no.bg} stroke={at?no.cor:no.cor+"44"} strokeWidth={at?2.5:1.5}/>
              <rect x={no.x} y={no.y} width={5} height={no.h} rx={0} fill={no.cor} opacity={0.7}/>
              <text x={no.x+12} y={no.y+18} fontSize={9} fontWeight={700} fill={no.cor} fontFamily="system-ui">{no.label.slice(0,22)}</text>
              <text x={no.x+12} y={no.y+32} fontSize={8} fill="#555" fontFamily="system-ui">{no.desc.slice(0,24)}</text>
              <text x={no.x+12} y={no.y+44} fontSize={8} fill="#777" fontFamily="system-ui">{no.desc.slice(24,46)}{no.desc.length>46?"…":""}</text>
              {no.filhos.length>0&&<><circle cx={no.x+no.w-12} cy={cy} r={9} fill={no.cor}/><text x={no.x+no.w-12} y={cy+4} fontSize={8} fill="#fff" textAnchor="middle" fontWeight={700} fontFamily="system-ui">{no.filhos.length}</text></>}
              <circle cx={no.x} cy={cy} r={3} fill={no.cor+"66"}/>
              {no.filhos.length>0&&<circle cx={no.x+no.w} cy={cy} r={3} fill={no.cor}/>}
            </g>
          );})}
        </svg>
      </div>
      {ativo&&(()=>{const no=nos.find(n=>n.id===ativo);if(!no)return null;return(<div style={{marginTop:10,background:"#fff",borderRadius:10,padding:"10px 14px",border:`2px solid ${no.cor}44`}}><p style={{fontSize:12,fontWeight:700,color:no.cor,margin:"0 0 4px"}}>{no.label}</p><p style={{fontSize:11,color:"#555",margin:0,lineHeight:1.5}}>{no.desc}</p></div>);})()}
    </div>
  );
}

export default function MapaMentalJuridico() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [caso, setCaso] = useState("");
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [etapa, setEtapa] = useState<"entrada" | "guiado" | "mapa">("entrada");
  const [campoAtual, setCampoAtual] = useState(0);
  const [paywallAberto, setPaywallAberto] = useState(false);
  const [secoesAbertas, setSecoesAbertas] = useState<Record<number, boolean>>({ 0: true });
  const [verArvore, setVerArvore] = useState(false);

  const plano = String(profile?.plano ?? "gratis");
  const { usosHoje, limite, travadoAte, loading: loadingUso, registrar } = useUso(profile?.id, plano);

  const travado = travadoAte && travadoAte > new Date();
  const bloqueado = travado || (!loadingUso && limite < Infinity && usosHoje >= limite && !travado);

  const badgeLabel = () => {
    if (plano === "ouro") return "👑 ilimitado";
    if (travado) { const dias = Math.ceil((travadoAte!.getTime() - Date.now()) / 86400000); return `🔒 ${dias}d bloqueado`; }
    const restantes = Math.max(0, limite - usosHoje);
    return `${restantes}/${limite} hoje`;
  };

  async function iniciar() {
    if (caso.trim().length < 20) return;
    const ok = await registrar();
    if (!ok) { setPaywallAberto(true); return; }
    setEtapa("guiado"); setCampoAtual(0);
  }

  function proximoCampo() { campoAtual < CAMPOS.length - 1 ? setCampoAtual(i => i + 1) : (setEtapa("mapa"), setSecoesAbertas({ 0: true })); }
  function campoAnterior() { campoAtual > 0 ? setCampoAtual(i => i - 1) : setEtapa("entrada"); }
  function toggleSecao(i: number) { setSecoesAbertas(s => ({ ...s, [i]: !s[i] })); }
  function reiniciar() { setCaso(""); setCampos({}); setEtapa("entrada"); setCampoAtual(0); }
  function copiarMapa() {
    const texto = CAMPOS.filter(c => campos[c.id]?.trim())
      .map(c => `${c.icone} ${c.label.toUpperCase()}\n${campos[c.id].split("\n").map(l => `  • ${l}`).join("\n")}`).join("\n\n");
    navigator.clipboard.writeText(`MAPA MENTAL JURÍDICO\n\nCaso: ${caso}\n\n${texto}`);
  }

  const camposPreenchidos = CAMPOS.filter(c => campos[c.id]?.trim()).length;
  const pct = Math.round((camposPreenchidos / CAMPOS.length) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#f4f6fb" }}>
      {/* Header */}
      <div style={{ background: "#1a3a6e", padding: "12px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => etapa === "entrada" ? navigate("/perfil") : etapa === "guiado" ? campoAnterior() : setEtapa("guiado")}
            style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>Mapa Mental Jurídico</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", margin: 0 }}>
              {etapa === "entrada" ? "Análise de defesa penal" : etapa === "guiado" ? `Campo ${campoAtual + 1} de ${CAMPOS.length}` : `${camposPreenchidos} seções preenchidas`}
            </p>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "3px 10px",
            background: bloqueado ? "#fee2e2" : plano === "ouro" ? "linear-gradient(90deg,#b45309,#d97706)" : "rgba(255,255,255,0.2)",
            color: bloqueado ? "#b91c1c" : "#fff",
          }}>
            {loadingUso ? "..." : badgeLabel()}
          </span>
        </div>

        {etapa === "guiado" && (
          <div style={{ marginTop: 10, display: "flex", gap: 4 }}>
            {CAMPOS.map((_, i) => (
              <div key={i} onClick={() => setCampoAtual(i)} style={{ flex: 1, height: 4, borderRadius: 99, cursor: "pointer", background: i < campoAtual ? "#4ece9a" : i === campoAtual ? "#fff" : "rgba(255,255,255,0.2)", transition: "background 0.2s" }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 24px" }}>

        {/* ── ETAPA 1: ENTRADA DO CASO ── */}
        {etapa === "entrada" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Aviso de uso */}
            {!loadingUso && plano !== "ouro" && (
              <div style={{
                background: bloqueado ? "#fff1f1" : "#f0f6ff",
                border: `1px solid ${bloqueado ? "#fca5a5" : "#bfdbfe"}`,
                borderRadius: 10, padding: "10px 14px",
                fontSize: 12, color: bloqueado ? "#b91c1c" : "#1d4ed8",
              }}>
                {bloqueado && travado
                  ? `🔒 Bloqueado até ${travadoAte!.toLocaleDateString("pt-BR")}`
                  : bloqueado
                  ? "⚠️ Limite diário atingido — tente amanhã ou faça upgrade"
                  : `Você tem ${Math.max(0, limite - usosHoje)} uso${Math.max(0, limite - usosHoje) !== 1 ? "s" : ""} restante${Math.max(0, limite - usosHoje) !== 1 ? "s" : ""} hoje`
                }
                {bloqueado && (
                  <button onClick={() => navigate("/assinatura")} style={{ display: "block", marginTop: 8, padding: "6px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Ver planos →
                  </button>
                )}
              </div>
            )}

            <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "0.5px solid rgba(0,0,0,0.08)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6e", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>⚖️ Descreva o caso</p>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 12px", lineHeight: 1.5 }}>Descreva os fatos do caso penal. O mapa vai organizar os argumentos de defesa.</p>
              <textarea value={caso} onChange={e => setCaso(e.target.value)}
                placeholder="Ex: Cliente foi preso em flagrante após luta corporal com invasor de seu imóvel que resultou na morte do invasor..." rows={6}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.12)", fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box", background: "#fff" }} />
              <button onClick={iniciar} disabled={caso.trim().length < 20}
                style={{ marginTop: 10, width: "100%", padding: "11px 0", background: caso.trim().length < 20 ? "#ccc" : "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: caso.trim().length < 20 ? "not-allowed" : "pointer" }}>
                Montar mapa de defesa →
              </button>
              {caso.trim().length < 20 && caso.trim().length > 0 && (
                <p style={{ fontSize: 11, color: "#aaa", margin: "6px 0 0", textAlign: "center" }}>Descreva com pelo menos 20 caracteres</p>
              )}
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "0.5px solid rgba(0,0,0,0.08)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#1a3a6e", margin: "0 0 12px" }}>O mapa vai organizar:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {CAMPOS.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icone}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: c.cor, margin: 0 }}>{c.label}</p>
                      <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>{c.dica}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ETAPA 2: PREENCHIMENTO GUIADO ── */}
        {etapa === "guiado" && (() => {
          const campo = CAMPOS[campoAtual];
          return (
            <div>
              <div style={{ background: `${campo.cor}10`, border: `1.5px solid ${campo.cor}30`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>{campo.icone}</span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: campo.cor, margin: 0 }}>{campo.label}</p>
                    <p style={{ fontSize: 11, color: "#888", margin: 0 }}>Analise o caso com foco neste aspecto</p>
                  </div>
                </div>
                {campo.dica && (
                  <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>💬</span>
                    <p style={{ fontSize: 12, color: campo.cor, margin: 0, lineHeight: 1.5 }}>{campo.dica}</p>
                  </div>
                )}
              </div>
              <textarea value={campos[campo.id] ?? ""} onChange={e => setCampos(c => ({ ...c, [campo.id]: e.target.value }))}
                placeholder={campo.placeholder} rows={8} autoFocus
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px solid ${campo.cor}40`, fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box", background: "#fff" }} />
              <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 16px", textAlign: "right" }}>Uma linha por item</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={campoAnterior} style={{ flex: 1, padding: "11px 0", background: "#fff", color: "#555", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>← Voltar</button>
                <button onClick={proximoCampo} style={{ flex: 2, padding: "11px 0", background: campo.cor, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {campoAtual === CAMPOS.length - 1 ? "✓ Ver mapa" : "Próximo →"}
                </button>
              </div>
              <button onClick={proximoCampo} style={{ width: "100%", marginTop: 8, padding: "8px 0", background: "transparent", border: "none", fontSize: 12, color: "#aaa", cursor: "pointer" }}>Pular</button>
            </div>
          );
        })()}

        {/* ── ETAPA 3: MAPA GERADO ── */}
        {etapa === "mapa" && (
          <>
            <div style={{ background: "linear-gradient(135deg,#E6F1FB,#f0f5ff)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "1px solid #1a3a6e20" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1a3a6e", margin: "0 0 2px" }}>⚖️ Mapa Mental — Defesa</p>
                  <p style={{ fontSize: 11, color: "#888", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{caso.slice(0, 55)}...</p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={copiarMapa} style={{ padding: "5px 10px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 6, fontSize: 11, cursor: "pointer", color: "#555" }}>📋</button>
                  <button onClick={reiniciar} style={{ padding: "5px 10px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 6, fontSize: 11, cursor: "pointer", color: "#555" }}>🔄</button>
                </div>
              </div>
              <div style={{ marginTop: 8, height: 5, background: "rgba(255,255,255,0.6)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "#1a3a6e", borderRadius: 99 }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CAMPOS.map((campo, i) => {
                const conteudo = campos[campo.id]?.trim();
                const linhas = conteudo ? conteudo.split("\n").filter(l => l.trim()) : [];
                return (
                  <div key={campo.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${conteudo ? campo.cor + "25" : "rgba(0,0,0,0.06)"}`, overflow: "hidden", opacity: conteudo ? 1 : 0.4 }}>
                    <button onClick={() => conteudo && toggleSecao(i)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: secoesAbertas[i] && conteudo ? `${campo.cor}08` : "#fff", border: "none", cursor: conteudo ? "pointer" : "default", textAlign: "left" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: conteudo ? `${campo.cor}15` : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{campo.icone}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: conteudo ? campo.cor : "#ccc", margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{campo.label}</p>
                        {!conteudo && <p style={{ fontSize: 11, color: "#ccc", margin: 0 }}>Não preenchido</p>}
                        {conteudo && !secoesAbertas[i] && <p style={{ fontSize: 11, color: "#888", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linhas[0]}</p>}
                      </div>
                      {conteudo && <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={campo.cor} strokeWidth="2" style={{ transform: secoesAbertas[i] ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}><path d="M6 4l4 4-4 4" /></svg>}
                    </button>
                    {secoesAbertas[i] && conteudo && (
                      <div style={{ padding: "4px 14px 14px" }}>
                        {linhas.map((linha, j) => (
                          <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                            <span style={{ color: campo.cor, fontSize: 12, marginTop: 2, flexShrink: 0 }}>▸</span>
                            <p style={{ fontSize: 13, color: "#333", margin: 0, lineHeight: 1.55 }}>{linha}</p>
                          </div>
                        ))}
                        <button onClick={() => { setCampoAtual(i); setEtapa("guiado"); }}
                          style={{ marginTop: 6, padding: "4px 10px", background: `${campo.cor}10`, border: `0.5px solid ${campo.cor}30`, borderRadius: 6, fontSize: 11, color: campo.cor, cursor: "pointer", fontWeight: 500 }}>✏️ Editar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {verArvore && (() => {
              const mk = (id:string,label:string,desc:string,cor:string,bg:string,filhos:SvgNo[]=[]):SvgNo=>({id,label,desc,cor,bg,filhos,x:0,y:0,w:_NW,h:NH});
              const raiz:SvgNo = mk("caso","⚖️ Caso","Análise de defesa","#1a3a6e","#E6F1FB",
                CAMPOS.filter(c=>campos[c.id]?.trim()).map(c=>
                  mk(c.id,`${c.icone} ${c.label}`,campos[c.id].split("\n")[0]?.slice(0,55)??"",c.cor,c.cor+"15",
                    campos[c.id].split("\n").filter((_l,i)=>i>0&&_l.trim()).slice(0,4).map((l,i)=>mk(`${c.id}-${i}`,l.slice(0,20),l.slice(0,55),c.cor+"aa",c.cor+"08"))
                  )
                )
              );
              raiz.w=_NW+20;raiz.h=NH+8;
              svgLayout(raiz,20,20);
              return <div style={{marginBottom:12}}><SvgArvore raiz={raiz}/></div>;
            })()}

            <div style={{ background: "#FFF8E6", border: "1px solid #f0c04066", borderRadius: 10, padding: "10px 14px", marginTop: 16, display: "flex", gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <p style={{ fontSize: 11, color: "#92400e", margin: 0, lineHeight: 1.5 }}>Este mapa organiza o raciocínio jurídico. Não constitui aconselhamento legal. Consulte sempre um advogado.</p>
            </div>
          </>
        )}
      </div>

      {etapa === "mapa" && (
        <div style={{position:"fixed",bottom:80,right:16,zIndex:100}}>
          <button onClick={()=>setVerArvore(v=>!v)} style={{padding:"10px 16px",background:"#1a3a6e",color:"#fff",border:"none",borderRadius:99,fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(26,58,110,0.4)"}}>
            {verArvore?"📋 Ver lista":"🌳 Ver árvore"}
          </button>
        </div>
      )}
      <BottomNav />
      <PaywallModal isOpen={paywallAberto} onClose={() => setPaywallAberto(false)} contentTitle="o Mapa Mental Jurídico" contentType="peticao" onUpgrade={() => { setPaywallAberto(false); navigate("/assinatura"); }} />
    </div>
  );
}
