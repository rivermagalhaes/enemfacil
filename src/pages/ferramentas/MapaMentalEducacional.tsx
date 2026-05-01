// src/pages/ferramentas/MapaMentalEducacional.tsx
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
      supabase.from("uso_funcionalidades").select("id").eq("user_id", userId).eq("funcionalidade", "mapa_educacional").eq("usado_em", hoje),
      supabase.from("travas_usuario").select("travado_ate, nivel").eq("user_id", userId).eq("funcionalidade", "mapa_educacional").maybeSingle(),
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
        { user_id: userId, funcionalidade: "mapa_educacional", nivel: proximoNivel, travado_ate: ate.toISOString().split("T")[0] },
        { onConflict: "user_id,funcionalidade" }
      );
      await carregar();
      return false;
    }
    await supabase.from("uso_funcionalidades").insert({ user_id: userId, funcionalidade: "mapa_educacional", usado_em: hoje });
    await carregar();
    return true;
  }, [userId, plano, usosHoje, limite, travadoAte, travaNivel, carregar]);

  return { usosHoje, limite, travadoAte, loading, registrar };
}

interface Campo {
  id: string; label: string; placeholder: string; icone: string; cor: string; dica?: string;
}

const CAMPOS: Campo[] = [
  { id: "estrutura", label: "Estrutura geral do tema", icone: "📚", cor: "#1a3a6e", placeholder: "Ex: Art. 5º — direitos e garantias individuais, localizado no Título II da CF/88...", dica: "Contextualize onde o tema se encaixa na lei" },
  { id: "conceitos", label: "Conceitos-chave", icone: "💡", cor: "#0f6e56", placeholder: "Ex: Direito fundamental = proteção mínima do indivíduo contra o Estado...", dica: "Defina em linguagem simples, sem juridiquês" },
  { id: "classificacoes", label: "Classificações", icone: "🗂️", cor: "#7c3aed", placeholder: "Ex: Direitos de 1ª geração (liberdade), 2ª geração (igualdade), 3ª geração (fraternidade)...", dica: "Se o tema tiver divisões, categorias ou espécies" },
  { id: "elementos", label: "Elementos / Requisitos", icone: "📋", cor: "#b45309", placeholder: "Ex: Para configurar o HC precisa: ameaça à liberdade de locomoção + ilegalidade ou abuso de poder...", dica: "O que precisa existir para o instituto se aplicar" },
  { id: "exemplos", label: "Exemplos práticos", icone: "🌍", cor: "#0891b2", placeholder: "Ex: Policial que prende sem mandado em caso que não é flagrante — violação ao art. 5º, LXI...", dica: "Situações reais onde o instituto é aplicado" },
  { id: "pegadinhas", label: "Pegadinhas de prova", icone: "⚠️", cor: "#dc2626", placeholder: "Ex: HC não cabe para proteger direitos patrimoniais, apenas liberdade de locomoção...", dica: "O que as bancas adoram cobrar de forma errada" },
  { id: "palavras_chave", label: "Palavras-chave", icone: "🔑", cor: "#0f6e56", placeholder: "Ex: Liberdade, locomoção, writ, coação ilegal, relaxamento, salvo-conduto...", dica: "Termos técnicos que aparecem nas questões" },
  { id: "ligacoes", label: "Ligações com outros temas", icone: "🔗", cor: "#1a3a6e", placeholder: "Ex: HC se conecta com: prisão em flagrante (art. 302 CPP), liberdade provisória, Tribunal do Júri...", dica: "Outros institutos que se relacionam com este tema" },
];

// SVG helpers
const _NW = 148; const _NH = 58; const _HGAP = 52; const _VGAP = 10;
interface SvgNo { id:string; label:string; desc:string; cor:string; bg:string; filhos:SvgNo[]; x:number; y:number; w:number; h:number; }
function svgSubH(n:SvgNo):number{ if(!n.filhos.length)return n.h; const t=n.filhos.reduce((s,f)=>s+svgSubH(f)+_VGAP,-_VGAP); return Math.max(n.h,t); }
function svgLayout(n:SvgNo,x:number,top:number){n.x=x;const sh=svgSubH(n);n.y=top+sh/2-n.h/2;let cy=top;for(const f of n.filhos){svgLayout(f,x+n.w+_HGAP,cy);cy+=svgSubH(f)+_VGAP;}}
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
          <defs><pattern id="g2" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5"/></pattern></defs>
          <rect width={W} height={H} fill="url(#g2)"/>
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

export default function MapaMentalEducacional() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [tema, setTema] = useState("");
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
    if (!tema.trim()) return;
    const ok = await registrar();
    if (!ok) { setPaywallAberto(true); return; }
    setEtapa("guiado");
    setCampoAtual(0);
  }

  function proximoCampo() {
    if (campoAtual < CAMPOS.length - 1) { setCampoAtual(i => i + 1); }
    else { setEtapa("mapa"); setSecoesAbertas({ 0: true }); }
  }

  function campoAnterior() {
    if (campoAtual > 0) setCampoAtual(i => i - 1);
    else setEtapa("entrada");
  }

  function toggleSecao(i: number) { setSecoesAbertas(s => ({ ...s, [i]: !s[i] })); }

  function reiniciar() { setTema(""); setCampos({}); setEtapa("entrada"); setCampoAtual(0); }

  function copiarMapa() {
    const texto = CAMPOS.filter(c => campos[c.id]?.trim())
      .map(c => `${c.icone} ${c.label.toUpperCase()}\n${campos[c.id].split("\n").map(l => `  • ${l}`).join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(`MAPA MENTAL — ${tema}\n\n${texto}`);
  }

  const camposPreenchidos = CAMPOS.filter(c => campos[c.id]?.trim()).length;
  const progresso = Math.round((camposPreenchidos / CAMPOS.length) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#f4f6fb" }}>
      {/* Header */}
      <div style={{ background: "#0f6e56", padding: "12px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => etapa === "entrada" ? navigate("/perfil") : etapa === "guiado" ? campoAnterior() : setEtapa("guiado")}
            style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>Mapa Mental de Estudo</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", margin: 0 }}>
              {etapa === "entrada" ? "Organize o conteúdo jurídico" : etapa === "guiado" ? `Campo ${campoAtual + 1} de ${CAMPOS.length}` : `${camposPreenchidos} seções preenchidas`}
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
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {CAMPOS.map((_, i) => (
                <div key={i} onClick={() => setCampoAtual(i)} style={{ flex: 1, height: 4, borderRadius: 99, cursor: "pointer", background: i < campoAtual ? "#4ece9a" : i === campoAtual ? "#fff" : "rgba(255,255,255,0.2)", transition: "background 0.2s" }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 24px" }}>

        {/* ── ETAPA 1: ENTRADA DO TEMA ── */}
        {etapa === "entrada" && (
          <>
            {/* Aviso de uso */}
            {!loadingUso && plano !== "ouro" && (
              <div style={{
                background: bloqueado ? "#fff1f1" : "#f0f6ff",
                border: `1px solid ${bloqueado ? "#fca5a5" : "#bfdbfe"}`,
                borderRadius: 10, padding: "10px 14px", marginBottom: 16,
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

            <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "0.5px solid rgba(0,0,0,0.08)", marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0f6e56", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                📚 Qual tema você quer mapear?
              </p>
              <input
                value={tema}
                onChange={e => setTema(e.target.value)}
                onKeyDown={e => e.key === "Enter" && iniciar()}
                placeholder="Ex: Art. 5º CF, Habeas Corpus, Princípios do Direito Penal..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.12)", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }}
              />
              <button
                onClick={iniciar}
                disabled={!tema.trim()}
                style={{ marginTop: 10, width: "100%", padding: "11px 0", background: !tema.trim() ? "#ccc" : "#0f6e56", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: !tema.trim() ? "not-allowed" : "pointer" }}
              >
                Começar mapa mental →
              </button>
            </div>

            <p style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Sugestões</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Art. 5º CF/88", "Habeas Corpus", "Mandado de Segurança", "Princípios do Direito Penal", "Improbidade Administrativa", "Tribunal do Júri", "Prescrição Penal", "Direitos Fundamentais"].map(s => (
                <button key={s} onClick={() => setTema(s)} style={{ padding: "5px 12px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 99, fontSize: 12, cursor: "pointer", color: "#555" }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 20, background: "#fff", borderRadius: 12, padding: 16, border: "0.5px solid rgba(0,0,0,0.08)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#0f6e56", margin: "0 0 12px" }}>O mapa vai conter:</p>
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
          </>
        )}

        {/* ── ETAPA 2: PREENCHIMENTO GUIADO ── */}
        {etapa === "guiado" && (() => {
          const campo = CAMPOS[campoAtual];
          return (
            <div>
              <div style={{ background: `${campo.cor}10`, border: `1.5px solid ${campo.cor}30`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 28 }}>{campo.icone}</span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: campo.cor, margin: 0 }}>{campo.label}</p>
                    <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Tema: <strong>{tema}</strong></p>
                  </div>
                </div>
              </div>
              {campo.dica && (
                <div style={{ background: "#f0f9f6", border: "0.5px solid #0f6e5633", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>💬</span>
                  <p style={{ fontSize: 12, color: "#0f6e56", margin: 0, lineHeight: 1.5 }}>{campo.dica}</p>
                </div>
              )}
              <textarea value={campos[campo.id] ?? ""} onChange={e => setCampos(c => ({ ...c, [campo.id]: e.target.value }))} placeholder={campo.placeholder} rows={7} autoFocus
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px solid ${campo.cor}40`, fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box", background: "#fff" }} />
              <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 16px", textAlign: "right" }}>Use uma linha por item para melhor visualização</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={campoAnterior} style={{ flex: 1, padding: "11px 0", background: "#fff", color: "#555", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>← Voltar</button>
                <button onClick={proximoCampo} style={{ flex: 2, padding: "11px 0", background: campo.cor, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {campoAtual === CAMPOS.length - 1 ? "✓ Gerar mapa mental" : "Próximo →"}
                </button>
              </div>
              <button onClick={proximoCampo} style={{ width: "100%", marginTop: 8, padding: "8px 0", background: "transparent", border: "none", fontSize: 12, color: "#aaa", cursor: "pointer" }}>Pular este campo</button>
            </div>
          );
        })()}

        {/* ── ETAPA 3: MAPA GERADO ── */}
        {etapa === "mapa" && (
          <>
            <div style={{ background: "linear-gradient(135deg,#f0f9f6,#e1f5ee)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "1px solid #0f6e5630" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#0f6e56", margin: "0 0 2px" }}>🗺️ {tema}</p>
                  <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{camposPreenchidos} de {CAMPOS.length} seções preenchidas · {progresso}% completo</p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={copiarMapa} style={{ padding: "5px 10px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 6, fontSize: 11, cursor: "pointer", color: "#555" }}>📋 Copiar</button>
                  <button onClick={reiniciar} style={{ padding: "5px 10px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 6, fontSize: 11, cursor: "pointer", color: "#555" }}>🔄 Novo</button>
                </div>
              </div>
              <div style={{ marginTop: 8, height: 6, background: "rgba(255,255,255,0.5)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progresso}%`, background: "#0f6e56", borderRadius: 99, transition: "width 0.4s" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CAMPOS.map((campo, i) => {
                const conteudo = campos[campo.id]?.trim();
                const linhas = conteudo ? conteudo.split("\n").filter(l => l.trim()) : [];
                return (
                  <div key={campo.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${conteudo ? campo.cor + "25" : "rgba(0,0,0,0.06)"}`, overflow: "hidden", opacity: conteudo ? 1 : 0.5 }}>
                    <button onClick={() => toggleSecao(i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: secoesAbertas[i] && conteudo ? `${campo.cor}08` : "#fff", border: "none", cursor: conteudo ? "pointer" : "default", textAlign: "left" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: conteudo ? `${campo.cor}15` : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{campo.icone}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: conteudo ? campo.cor : "#aaa", margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{campo.label}</p>
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
                        <button onClick={() => { setCampoAtual(i); setEtapa("guiado"); }} style={{ marginTop: 6, padding: "4px 10px", background: `${campo.cor}10`, border: `0.5px solid ${campo.cor}30`, borderRadius: 6, fontSize: 11, color: campo.cor, cursor: "pointer", fontWeight: 500 }}>✏️ Editar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {verArvore && (() => {
              const mk = (id:string,label:string,desc:string,cor:string,bg:string,filhos:SvgNo[]=[]):SvgNo=>({id,label,desc,cor,bg,filhos,x:0,y:0,w:_NW,h:_NH});
              const raiz:SvgNo = mk("tema",`📚 ${tema||"Tema"}`,"Mapa de estudo","#0f6e56","#E1F5EE",
                CAMPOS.filter(c=>campos[c.id]?.trim()).map(c=>
                  mk(c.id,`${c.icone} ${c.label}`,campos[c.id].split("\n")[0]?.slice(0,55)??"",c.cor,c.cor+"15",
                    campos[c.id].split("\n").filter((_l,idx)=>idx>0&&_l.trim()).slice(0,4).map((l,idx)=>mk(`${c.id}-${idx}`,l.slice(0,20),l.slice(0,55),c.cor+"aa",c.cor+"08"))
                  )
                )
              );
              raiz.w=_NW+20;raiz.h=_NH+8;
              svgLayout(raiz,20,20);
              return <div style={{marginBottom:16}}><SvgArvore raiz={raiz}/></div>;
            })()}

            {camposPreenchidos < CAMPOS.length && (
              <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: "12px 14px", border: "0.5px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>📝</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: "0 0 2px" }}>Mapa incompleto</p>
                  <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{CAMPOS.length - camposPreenchidos} seção(ões) sem preenchimento</p>
                </div>
                <button onClick={() => { setCampoAtual(CAMPOS.findIndex(c => !campos[c.id]?.trim())); setEtapa("guiado"); }} style={{ padding: "7px 14px", background: "#0f6e56", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Completar</button>
              </div>
            )}
          </>
        )}
      </div>

      {etapa === "mapa" && (
        <div style={{position:"fixed",bottom:80,right:16,zIndex:100}}>
          <button onClick={()=>setVerArvore(v=>!v)} style={{padding:"10px 16px",background:"#0f6e56",color:"#fff",border:"none",borderRadius:99,fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(15,110,86,0.4)"}}>
            {verArvore?"📋 Ver lista":"🌳 Ver árvore"}
          </button>
        </div>
      )}
      <BottomNav />
      <PaywallModal isOpen={paywallAberto} onClose={() => setPaywallAberto(false)} contentTitle="o Mapa Mental de Estudo" contentType="peticao" onUpgrade={() => { setPaywallAberto(false); navigate("/assinatura"); }} />
    </div>
  );
}
