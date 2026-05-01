// src/pages/ferramentas/MapaMentalVisual.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";
import PaywallModal from "@/components/ui/PaywallModal";

const LEIS: Record<string, { cor: string; bg: string; emoji: string; sigla: string }> = {
  CF88: { cor: "#1a3a6e", bg: "#E6F1FB", emoji: "🏛️", sigla: "CF/88" },
  CDC:  { cor: "#0f6e56", bg: "#E1F5EE", emoji: "🛒", sigla: "CDC"   },
  ECA:  { cor: "#7c3aed", bg: "#EEEDFE", emoji: "👶", sigla: "ECA"   },
  CPC:  { cor: "#b45309", bg: "#FFF8E6", emoji: "⚖️", sigla: "CPC"  },
};

const LIMITES_DIA: Record<string, number> = {
  gratis: 1, cidadao: 2, concurseiro: 4, premium: 4, cursinho: 4, ouro: Infinity,
};

const TRAVA_DIAS = [3, 21, 90];

interface Artigo { id: string; numero: number; ementa: string; lei_sigla?: string; }
interface Inciso { id: string; identificador: string; texto_simples?: string; texto_original?: string; ordem: number; }
interface Juris  { id: string; tribunal: string; resumo_simples?: string; ementa: string; relevancia: number; }

const NW = 148;
const NH = 62;
const HGAP = 56;
const VGAP = 12;

interface No {
  id: string; tipo: "artigo" | "inciso" | "juris";
  titulo: string; subtitulo: string; cor: string; bg: string; border: string;
  filhos: No[]; artigoId?: string;
  x: number; y: number; w: number; h: number;
}

function subH(no: No): number {
  if (!no.filhos.length) return no.h;
  const total = no.filhos.reduce((s, f) => s + subH(f) + VGAP, -VGAP);
  return Math.max(no.h, total);
}

function layout(no: No, x: number, topY: number) {
  no.x = x;
  const sh = subH(no);
  no.y = Math.max(20, topY + sh / 2 - no.h / 2);
  let cy = topY;
  for (const f of no.filhos) {
    layout(f, x + no.w + HGAP, cy);
    cy += subH(f) + VGAP;
  }
}

function flatNos(no: No, out: No[] = []) { out.push(no); no.filhos.forEach(f => flatNos(f, out)); return out; }

function flatEdges(no: No, out: {x1:number;y1:number;x2:number;y2:number;cor:string}[] = []) {
  no.filhos.forEach(f => {
    out.push({ x1: no.x+no.w, y1: no.y+no.h/2, x2: f.x, y2: f.y+f.h/2, cor: no.cor });
    flatEdges(f, out);
  });
  return out;
}

// ── Hook de uso (igual ao Perfil.tsx) ────────────────────────
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
      supabase.from("uso_funcionalidades").select("id").eq("user_id", userId).eq("funcionalidade", "mapa_visual").eq("usado_em", hoje),
      supabase.from("travas_usuario").select("travado_ate, nivel").eq("user_id", userId).eq("funcionalidade", "mapa_visual").maybeSingle(),
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
        { user_id: userId, funcionalidade: "mapa_visual", nivel: proximoNivel, travado_ate: ate.toISOString().split("T")[0] },
        { onConflict: "user_id,funcionalidade" }
      );
      await carregar();
      return false;
    }

    await supabase.from("uso_funcionalidades").insert({ user_id: userId, funcionalidade: "mapa_visual", usado_em: hoje });
    await carregar();
    return true;
  }, [userId, plano, usosHoje, limite, travadoAte, travaNivel, carregar]);

  return { usosHoje, limite, travadoAte, loading, registrar };
}

export default function MapaMentalVisual() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [leiAtiva, setLeiAtiva] = useState("CF88");
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Artigo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [paywallAberto, setPaywallAberto] = useState(false);
  const [arvore, setArvore] = useState<No | null>(null);
  const [noAtivo, setNoAtivo] = useState<No | null>(null);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const plano = String(profile?.plano ?? "gratis");
  const lei = LEIS[leiAtiva];

  const { usosHoje, limite, travadoAte, loading: loadingUso, registrar } = useUso(profile?.id, plano);

  const travado = travadoAte && travadoAte > new Date();
  const semUsos = !loadingUso && limite < Infinity && usosHoje >= limite && !travado;
  const bloqueado = travado || semUsos;

  // Badge de uso
  const badgeLabel = () => {
    if (plano === "ouro") return "👑 ilimitado";
    if (travado) {
      const dias = Math.ceil((travadoAte!.getTime() - Date.now()) / 86400000);
      return `🔒 ${dias}d bloqueado`;
    }
    const restantes = Math.max(0, limite - usosHoje);
    return `${restantes}/${limite} hoje`;
  };

  useEffect(() => {
    if (!busca || busca.length < 1) { setResultados([]); return; }
    setBuscando(true);
    const num = parseInt(busca);
    let q = supabase.from("artigos").select("id,numero,ementa,lei_sigla").eq("lei_sigla", leiAtiva).limit(6);
    if (!isNaN(num)) q = q.eq("numero", num); else q = q.ilike("ementa", `%${busca}%`);
    q.then(({ data }) => { setResultados((data as Artigo[]) ?? []); setBuscando(false); });
  }, [busca, leiAtiva]);

  async function carregarArvore(art: Artigo) {
    // Tenta registrar uso — se não puder, abre paywall
    const ok = await registrar();
    if (!ok) { setPaywallAberto(true); return; }

    setCarregando(true); setBusca(""); setResultados([]); setNoAtivo(null);

    const [{ data: incs }, { data: jurs }] = await Promise.all([
      supabase.from("incisos").select("*").eq("artigo_id", art.id).order("ordem").limit(14),
      supabase.from("jurisprudencias").select("*").eq("artigo_id", art.id).eq("ativo", true).order("relevancia", { ascending: false }).limit(6),
    ]);

    const mk = (id: string, tipo: No["tipo"], titulo: string, subtitulo: string, cor: string, bg: string, border: string, filhos: No[] = [], artigoId?: string): No =>
      ({ id, tipo, titulo, subtitulo, cor, bg, border, filhos, artigoId, x: 0, y: 0, w: NW, h: NH });

    const jurisNos = ((jurs as Juris[]) ?? []).map(j =>
      mk(j.id, "juris", j.tribunal, (j.resumo_simples ?? j.ementa).slice(0, 55) + "…", "#b45309", "#FFF8E6", "#f0c040", [], art.id)
    );

    const incNos = ((incs as Inciso[]) ?? []).map(i =>
      mk(i.id, "inciso", i.identificador, (i.texto_simples ?? i.texto_original ?? "").slice(0, 55) + "…", lei.cor, "#fff", "#ddd", [], art.id)
    );

    const filhosRaiz: No[] = [
      ...incNos,
      ...(jurisNos.length > 0 ? [mk("jg", "juris", "⚖️ Jurisprudências", `${jurisNos.length} julgado${jurisNos.length>1?"s":""}`, "#b45309", "#FFF8E6", "#f0c040", jurisNos, art.id)] : []),
    ];

    const raiz = mk(art.id, "artigo", `Art. ${art.numero}º — ${lei.sigla}`, art.ementa.slice(0, 55) + (art.ementa.length > 55 ? "…" : ""), lei.cor, lei.bg, lei.cor, filhosRaiz, art.id);
    raiz.w = NW + 20; raiz.h = NH + 8;

    layout(raiz, 20, 20);
    const nos = flatNos(raiz);
    const maxX = Math.max(...nos.map(n => n.x + n.w)) + 30;
    const maxY = Math.max(...nos.map(n => n.y + n.h)) + 30;
    setSvgSize({ w: maxX, h: maxY });
    setArvore(raiz);
    setCarregando(false);
  }

  const nos = arvore ? flatNos(arvore) : [];
  const edges = arvore ? flatEdges(arvore) : [];

  const SUGS: Record<string, string[]> = {
    CF88: ["1","5","6","14","37","102","196","225"],
    CDC:  ["1","2","4","6","12","14","18"],
    ECA:  ["1","2","3","4","5","13","17"],
    CPC:  ["1","5","9","10","11","300","373","489","523","833"],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#f0f2f5" }}>

      {/* Header */}
      <div style={{ background: lei.cor, padding: "12px 16px 14px", transition: "background 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={() => navigate("/perfil")} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>Mapa Mental Visual</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", margin: 0 }}>Árvore interativa · {lei.sigla}</p>
          </div>
          {/* Badge de uso */}
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "3px 10px",
            background: bloqueado ? "#fee2e2" : plano === "ouro" ? "linear-gradient(90deg,#b45309,#d97706)" : "rgba(255,255,255,0.2)",
            color: bloqueado ? "#b91c1c" : "#fff",
          }}>
            {loadingUso ? "..." : badgeLabel()}
          </span>
        </div>

        {/* Seletor lei */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
          {Object.entries(LEIS).map(([sigla, cfg]) => (
            <button key={sigla} onClick={() => { setLeiAtiva(sigla); setArvore(null); setBusca(""); setNoAtivo(null); }}
              style={{ padding: "5px 12px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12, fontWeight: leiAtiva === sigla ? 700 : 400, whiteSpace: "nowrap", flexShrink: 0, background: leiAtiva === sigla ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)", color: leiAtiva === sigla ? lei.cor : "rgba(255,255,255,0.8)" }}>
              {cfg.emoji} {cfg.sigla}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div style={{ position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="6.5" cy="6.5" r="4" /><line x1="10" y1="10" x2="14" y2="14" />
          </svg>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Número ou tema do artigo..."
            style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.15)", fontSize: 13, color: "#fff", outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Resultados busca */}
        {resultados.length > 0 && (
          <div style={{ marginTop: 6, background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
            {resultados.map(a => (
              <button key={a.id} onClick={() => carregarArvore(a)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#fff", border: "none", borderBottom: "0.5px solid rgba(0,0,0,0.06)", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 10, fontWeight: 700, background: lei.bg, color: lei.cor, borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>Art. {a.numero}º</span>
                <span style={{ fontSize: 12, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ementa}</span>
              </button>
            ))}
          </div>
        )}
        {buscando && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "6px 0 0", textAlign: "center" }}>Buscando...</p>}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>

        {/* Vazio */}
        {!arvore && !carregando && (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{lei.emoji}</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px" }}>Busque um artigo da {lei.sigla}</p>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px", lineHeight: 1.5 }}>A árvore mostrará artigo, incisos e jurisprudências conectados visualmente.</p>

            {/* Aviso de uso restante */}
            {!loadingUso && plano !== "ouro" && (
              <div style={{
                marginBottom: 16,
                background: bloqueado ? "#fff1f1" : "#f0f6ff",
                border: `1px solid ${bloqueado ? "#fca5a5" : "#bfdbfe"}`,
                borderRadius: 10, padding: "10px 14px",
                fontSize: 12, color: bloqueado ? "#b91c1c" : "#1d4ed8",
              }}>
                {bloqueado && travado
                  ? `🔒 Bloqueado até ${travadoAte!.toLocaleDateString("pt-BR")} — limite diário ultrapassado`
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

            <p style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>Sugestões</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {(SUGS[leiAtiva] ?? []).map(n => (
                <button key={n} onClick={() => setBusca(n)}
                  style={{ padding: "6px 14px", background: "#fff", border: `1.5px solid ${lei.cor}33`, borderRadius: 99, fontSize: 12, cursor: "pointer", color: lei.cor, fontWeight: 500 }}>
                  Art. {n}º
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {carregando && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 36, display: "inline-block", animation: "spin 1s linear infinite", marginBottom: 12 }}>⟳</div>
            <p style={{ fontSize: 13, color: "#888" }}>Montando a árvore...</p>
          </div>
        )}

        {/* Árvore SVG */}
        {arvore && !carregando && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              {[
                { bg: lei.bg, border: lei.cor, label: "Artigo" },
                { bg: "#fff", border: "#ccc", label: "Inciso" },
                { bg: "#FFF8E6", border: "#f0c040", label: "Jurisprudência" },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#555" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `2px solid ${l.border}` }} />
                  {l.label}
                </div>
              ))}
              <span style={{ fontSize: 11, color: "#bbb", marginLeft: "auto" }}>← deslize para ver tudo →</span>
            </div>

            <div style={{ overflowX: "auto", overflowY: "visible", borderRadius: 14, background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <svg width={svgSize.w} height={svgSize.h} style={{ display: "block" }}>
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width={svgSize.w} height={svgSize.h} fill="url(#grid)" />

                {edges.map((e, i) => {
                  const mx = (e.x1 + e.x2) / 2;
                  return (
                    <path key={i}
                      d={`M ${e.x1} ${e.y1} C ${mx} ${e.y1} ${mx} ${e.y2} ${e.x2} ${e.y2}`}
                      fill="none" stroke={e.cor} strokeWidth={2} strokeOpacity={0.25}
                    />
                  );
                })}

                {nos.map(no => {
                  const ativo = noAtivo?.id === no.id;
                  const cy = no.y + no.h / 2;
                  return (
                    <g key={no.id} onClick={() => setNoAtivo(ativo ? null : no)} style={{ cursor: "pointer" }}>
                      <rect x={no.x + 3} y={no.y + 4} width={no.w} height={no.h} rx={10} fill="rgba(0,0,0,0.07)" />
                      <rect x={no.x} y={no.y} width={no.w} height={no.h} rx={10} fill={no.bg} stroke={ativo ? no.cor : no.border} strokeWidth={ativo ? 2.5 : 1.5} />
                      <rect x={no.x} y={no.y} width={4} height={no.h} rx={10} fill={no.cor} />
                      <rect x={no.x} y={no.y} width={4} height={no.h} fill={no.cor} />
                      <rect x={no.x} y={no.y} width={8} height={no.h} rx={0} fill={no.bg} />
                      <rect x={no.x} y={no.y} width={5} height={no.h} fill={no.cor} opacity={0.7} />
                      <text x={no.x + 12} y={no.y + 20} fontSize={no.tipo === "artigo" ? 10 : 9} fontWeight={700} fill={no.cor} fontFamily="-apple-system, system-ui, sans-serif">
                        {no.titulo.slice(0, no.tipo === "artigo" ? 26 : 20)}
                      </text>
                      <text x={no.x + 12} y={no.y + 35} fontSize={8.5} fill="#555" fontFamily="-apple-system, system-ui, sans-serif">
                        {no.subtitulo.slice(0, 22)}
                      </text>
                      <text x={no.x + 12} y={no.y + 47} fontSize={8.5} fill="#777" fontFamily="-apple-system, system-ui, sans-serif">
                        {no.subtitulo.slice(22, 44)}{no.subtitulo.length > 44 ? "…" : ""}
                      </text>
                      {no.filhos.length > 0 && (
                        <g>
                          <circle cx={no.x + no.w - 12} cy={cy} r={10} fill={no.cor} />
                          <text x={no.x + no.w - 12} y={cy + 4} fontSize={8} fill="#fff" textAnchor="middle" fontWeight={700} fontFamily="system-ui">
                            {no.filhos.length}
                          </text>
                        </g>
                      )}
                      <circle cx={no.x} cy={cy} r={3} fill={no.border} />
                      {no.filhos.length > 0 && <circle cx={no.x + no.w} cy={cy} r={3} fill={no.cor} />}
                    </g>
                  );
                })}
              </svg>
            </div>

            {noAtivo && (
              <div style={{ marginTop: 12, background: "#fff", borderRadius: 12, padding: "12px 14px", border: `2px solid ${noAtivo.border}`, boxShadow: `0 4px 16px ${noAtivo.cor}15` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: noAtivo.cor, flexShrink: 0 }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: noAtivo.cor, margin: 0 }}>{noAtivo.titulo}</p>
                </div>
                <p style={{ fontSize: 12, color: "#555", margin: "0 0 10px", lineHeight: 1.5 }}>{noAtivo.subtitulo}</p>
                {(noAtivo.tipo === "artigo" || noAtivo.tipo === "inciso") && noAtivo.artigoId && (
                  <button onClick={() => navigate(`/cf88/${noAtivo.artigoId}`)}
                    style={{ padding: "7px 16px", background: noAtivo.cor, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    Ler artigo completo →
                  </button>
                )}
              </div>
            )}
            <div style={{ height: 20 }} />
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <BottomNav />
      <PaywallModal isOpen={paywallAberto} onClose={() => setPaywallAberto(false)} contentTitle="o Mapa Mental Visual" contentType="peticao" onUpgrade={() => { setPaywallAberto(false); navigate("/assinatura"); }} />
    </div>
  );
}
