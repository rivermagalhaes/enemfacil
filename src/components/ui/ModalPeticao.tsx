// src/components/ui/ModalPeticao.tsx
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

interface ArtigoPeticao {
  id: string;
  numero: number;
  ementa: string;
  texto_original?: string;
  texto_simples?: string;
  lei_sigla?: string;
}

interface JurisPeticao {
  id: string;
  tribunal: string;
  numero_processo?: string;
  ementa: string;
  resumo_simples?: string;
  relator?: string;
  data_julgamento?: string;
  artigo_id: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  artigoInicial?: ArtigoPeticao;
}

const TRIBUNAIS = ["STF", "STJ", "TST", "TSE", "TRF", "OUTRO"];
const TRIB_COR: Record<string, { bg: string; color: string }> = {
  STF: { bg: "#E6F1FB", color: "#0C447C" }, STJ: { bg: "#EAF3DE", color: "#27500A" },
  TST: { bg: "#EEEDFE", color: "#3C3489" }, TSE: { bg: "#FAEEDA", color: "#633806" },
  TRF: { bg: "#FCEBEB", color: "#791F1F" }, OUTRO: { bg: "#f4f6fb", color: "#555" },
};

// Cache para não repetir fetch
let _cidadesCache: { nome: string; uf: string }[] | null = null;
async function getCidades(): Promise<{ nome: string; uf: string }[]> {
  if (_cidadesCache) return _cidadesCache;
  const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome");
  const data = await res.json();
  _cidadesCache = data
    .filter((m: any) => m?.microrregiao?.mesorregiao?.UF?.sigla)
    .map((m: any) => ({
      nome: m.nome,
      uf: m.microrregiao.mesorregiao.UF.sigla,
    }));
  return _cidadesCache!;
}

async function buscarCidades(termo: string): Promise<{ nome: string; uf: string }[]> {
  if (!termo || termo.length < 2) return [];
  try {
    const cidades = await getCidades();
    const lower = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return cidades
      .filter(c => c.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").startsWith(lower))
      .slice(0, 8);
  } catch {
    return [];
  }
}

function hoje() {
  return new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ModalPeticao({ isOpen, onClose, artigoInicial }: Props) {
  
  const printRef = useRef<HTMLDivElement>(null);
  const [etapa, setEtapa] = useState<"cabecalho" | "artigos" | "juris" | "preview">("cabecalho");
  const [visible, setVisible] = useState(false);

  // Cabeçalho
  const [cab, setCab] = useState({
    exmo: "Exmo(a). Sr(a). Juiz(a) de Direito",
    vara: "",
    comarca: "Paraíso do Tocantins",
    estado: "Tocantins",
    autor: "",
    cpf: "",
    advogado: "",
    oab: "",
    tipo_acao: "Ação de Obrigação de Fazer",
    reu: "",
    cidade: "Paraíso do Tocantins",
    pedido: "",
    numero_processo: "",
    nome_escritorio: "",
  });

  // Dados do perfil (logo, escritório, OAB)
  const { profile } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    // Carregar dados do perfil
    supabase.from("profiles").select("logo_url, nome_escritorio, oab").eq("id", profile.id).single()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
        if (data?.nome_escritorio) setCab(c => ({ ...c, nome_escritorio: data.nome_escritorio ?? "" }));
        if (data?.oab) setCab(c => ({ ...c, oab: data.oab ?? "" }));
      });
  }, [profile]);

  // Campo número do processo — antes do autocomplete vara
  const [varaSugestoes, setVaraSugestoes] = useState<{ id: string; nome: string; area: string }[]>([]);
  const [varaAberta, setVaraAberta] = useState(false);
  const varaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleVaraChange(valor: string) {
    setCab(c => ({ ...c, vara: valor }));
    setVaraAberta(true);
    if (varaTimer.current) clearTimeout(varaTimer.current);
    if (!valor || valor.length < 1) { setVaraSugestoes([]); return; }
    varaTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from("varas")
        .select("id, nome, area")
        .ilike("nome", `%${valor}%`)
        .eq("ativo", true)
        .order("ordem")
        .limit(8);
      setVaraSugestoes((data as any[]) ?? []);
    }, 200);
  }

  // Autocomplete comarca
  const [comarcaSugestoes, setComarcaSugestoes] = useState<{ nome: string; uf: string }[]>([]);
  const [comarcaAberta, setComarcaAberta] = useState(false);
  const comarcaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleComarcaChange(valor: string) {
    setCab(c => ({ ...c, comarca: valor }));
    setComarcaAberta(true);
    if (comarcaTimer.current) clearTimeout(comarcaTimer.current);
    comarcaTimer.current = setTimeout(async () => {
      const sugs = await buscarCidades(valor);
      setComarcaSugestoes(sugs);
    }, 300);
  }

  function selecionarComarca(cidade: { nome: string; uf: string }) {
    setCab(c => ({ ...c, comarca: cidade.nome, estado: cidade.uf, cidade: cidade.nome }));
    setComarcaAberta(false);
    setComarcaSugestoes([]);
  }

  // Artigos selecionados
  const [artigosBusca, setArtigosBusca] = useState("");
  const [artigosResultado, setArtigosResultado] = useState<ArtigoPeticao[]>([]);
  const [artigosSelecionados, setArtigosSelecionados] = useState<ArtigoPeticao[]>(
    artigoInicial ? [artigoInicial] : []
  );
  const [buscandoArtigos, setBuscandoArtigos] = useState(false);

  // Jurisprudências selecionadas
  const [jurisDisponiveis, setJurisDisponiveis] = useState<JurisPeticao[]>([]);
  const [jurisSelecionadas, setJurisSelecionadas] = useState<JurisPeticao[]>([]);
  const [filtroTribunal, setFiltroTribunal] = useState("Todos");

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setVisible(true), 10);
      getCidades(); // pré-carrega o cache silenciosamente
    }
    else { setVisible(false); setEtapa("cabecalho"); }
  }, [isOpen]);

  // Quando entra na etapa de juris, carrega jurisprudências dos artigos selecionados
  useEffect(() => {
    if (etapa !== "juris" || artigosSelecionados.length === 0) return;
    const ids = artigosSelecionados.map(a => a.id);
    supabase.from("jurisprudencias").select("*").in("artigo_id", ids).eq("ativo", true)
      .order("relevancia", { ascending: false })
      .then(({ data }) => setJurisDisponiveis((data as JurisPeticao[]) ?? []));
  }, [etapa, artigosSelecionados]);

  async function buscarArtigos(termo: string) {
    if (!termo || termo.length < 2) { setArtigosResultado([]); return; }
    setBuscandoArtigos(true);
    const num = parseInt(termo);
    let q = supabase.from("artigos").select("id, numero, ementa, texto_original, texto_simples, lei_sigla").limit(8);
    if (!isNaN(num)) q = q.eq("numero", num);
    else q = q.ilike("ementa", `%${termo}%`);
    const { data } = await q;
    setArtigosResultado((data as ArtigoPeticao[]) ?? []);
    setBuscandoArtigos(false);
  }

  function toggleArtigo(a: ArtigoPeticao) {
    setArtigosSelecionados(prev =>
      prev.find(x => x.id === a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a]
    );
  }

  function toggleJuris(j: JurisPeticao) {
    setJurisSelecionadas(prev =>
      prev.find(x => x.id === j.id) ? prev.filter(x => x.id !== j.id) : [...prev, j]
    );
  }

  function imprimir() {
    const conteudo = printRef.current?.innerHTML;
    if (!conteudo) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Petição — CFfácil</title>
      <style>
        @page { margin: 3cm 2.5cm; }
        body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.8; color: #000; }
        h1 { font-size: 14pt; text-align: center; text-transform: uppercase; margin: 0 0 8px; }
        h2 { font-size: 12pt; text-align: center; text-transform: uppercase; margin: 24px 0 8px; }
        h3 { font-size: 12pt; margin: 16px 0 4px; }
        p { margin: 0 0 12px; text-align: justify; }
        .cabecalho { text-align: center; margin-bottom: 32px; }
        .artigo-box { border-left: 3px solid #1a3a6e; padding: 8px 12px; margin: 12px 0; background: #f8faff; }
        .juris-box { border-left: 3px solid #b45309; padding: 8px 12px; margin: 12px 0; background: #fffbeb; font-style: italic; font-size: 11pt; }
        .tribunal-badge { font-weight: bold; font-size: 10pt; }
        .assinatura { margin-top: 48px; text-align: center; }
        .qualificacao { margin: 24px 0; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
      </head><body>${conteudo}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  if (!isOpen) return null;

  const ETAPAS = [
    { key: "cabecalho", label: "Cabeçalho", num: 1 },
    { key: "artigos",   label: "Artigos",   num: 2 },
    { key: "juris",     label: "Jurisprud.",num: 3 },
    { key: "preview",   label: "Preview",   num: 4 },
  ];

  const INPUT: React.CSSProperties = {
    padding: "8px 10px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.15)",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
    background: "#fff",
  };

  const jurisFiltradas = filtroTribunal === "Todos"
    ? jurisDisponiveis
    : jurisDisponiveis.filter(j => j.tribunal === filtroTribunal);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", opacity: visible ? 1 : 0, transition: "opacity 0.25s" }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 600,
        background: "#f4f6fb", borderRadius: "20px 20px 0 0",
        height: "92dvh", display: "flex", flexDirection: "column",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Header */}
        <div style={{ background: "#1a3a6e", padding: "14px 16px 0", borderRadius: "20px 20px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: 0, flex: 1 }}>📄 Gerador de Petição</p>
            {etapa === "preview" && (
              <button onClick={imprimir} style={{ padding: "6px 14px", background: "#4ece9a", color: "#0a3d2e", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                🖨️ Imprimir
              </button>
            )}
          </div>

          {/* Steps */}
          <div style={{ display: "flex", gap: 0 }}>
            {ETAPAS.map((e, _i) => (
              <button key={e.key} onClick={() => {
                if (e.key === "artigos" || e.key === "cabecalho") setEtapa(e.key as any);
                if (e.key === "juris" && artigosSelecionados.length > 0) setEtapa("juris");
                if (e.key === "preview") setEtapa("preview");
              }} style={{
                flex: 1, padding: "8px 4px", border: "none", background: "transparent", cursor: "pointer",
                borderBottom: `2px solid ${etapa === e.key ? "#4ece9a" : "transparent"}`,
              }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: etapa === e.key ? "#4ece9a" : "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: etapa === e.key ? "#0a3d2e" : "rgba(255,255,255,0.6)" }}>{e.num}</span>
                  </div>
                  <span style={{ fontSize: 10, color: etapa === e.key ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: etapa === e.key ? 600 : 400 }}>{e.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", overflowX: "visible", padding: "16px 14px 24px" }}>

          {/* ── ETAPA 1: CABEÇALHO ── */}
          {etapa === "cabecalho" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6e", margin: "0 0 4px" }}>Endereçamento</p>
              <input placeholder="Exmo(a). Sr(a). Juiz(a) de Direito" value={cab.exmo} onChange={e => setCab(c => ({ ...c, exmo: e.target.value }))} style={INPUT} />
              <div style={{ position: "relative" }}>
                <input
                  placeholder="Vara (ex: Vara Cível, Vara Criminal...)"
                  value={cab.vara}
                  onChange={e => handleVaraChange(e.target.value)}
                  onFocus={() => cab.vara.length >= 1 && setVaraAberta(true)}
                  onBlur={() => setTimeout(() => setVaraAberta(false), 150)}
                  style={INPUT}
                  autoComplete="off"
                />
                {varaAberta && varaSugestoes.length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    zIndex: 2000, background: "#fff",
                    border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    maxHeight: 240, overflowY: "auto",
                  }}>
                    {varaSugestoes.map((v, i) => (
                      <button
                        key={v.id}
                        onMouseDown={() => { setCab(c => ({ ...c, vara: v.nome })); setVaraAberta(false); setVaraSugestoes([]); }}
                        style={{
                          width: "100%", padding: "10px 12px", border: "none",
                          borderBottom: i < varaSugestoes.length - 1 ? "0.5px solid rgba(0,0,0,0.06)" : "none",
                          background: "#fff", cursor: "pointer", textAlign: "left",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          fontSize: 13,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f0f6ff")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                      >
                        <span style={{ color: "#1a1a1a" }}>{v.nome}</span>
                        <span style={{ fontSize: 10, color: "#888", background: "#f4f6fb", padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>{v.area}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 2, position: "relative" }}>
                  <input
                    placeholder="Comarca (cidade)"
                    value={cab.comarca}
                    onChange={e => handleComarcaChange(e.target.value)}
                    onFocus={() => cab.comarca.length >= 2 && setComarcaAberta(true)}
                    onBlur={() => setTimeout(() => setComarcaAberta(false), 150)}
                    style={INPUT}
                    autoComplete="off"
                  />
                  {comarcaAberta && comarcaSugestoes.length > 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                      zIndex: 2000, background: "#fff",
                      border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      maxHeight: 240, overflowY: "auto",
                    }}>
                      {comarcaSugestoes.map((c, i) => (
                        <button
                          key={i}
                          onMouseDown={() => selecionarComarca(c)}
                          style={{
                            width: "100%", padding: "10px 12px", border: "none",
                            borderBottom: i < comarcaSugestoes.length - 1 ? "0.5px solid rgba(0,0,0,0.06)" : "none",
                            background: "#fff", cursor: "pointer", textAlign: "left",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            fontSize: 13,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f0f6ff")}
                          onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                        >
                          <span style={{ color: "#1a1a1a" }}>{c.nome}</span>
                          <span style={{ fontSize: 11, color: "#888", background: "#f4f6fb", padding: "1px 6px", borderRadius: 4 }}>{c.uf}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input placeholder="UF" value={cab.estado} onChange={e => setCab(c => ({ ...c, estado: e.target.value }))} style={{ ...INPUT, flex: 1 }} />
              </div>

              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6e", margin: "8px 0 4px" }}>Autor / Requerente</p>
              <input placeholder="Nome completo do autor" value={cab.autor} onChange={e => setCab(c => ({ ...c, autor: e.target.value }))} style={INPUT} />
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="CPF" value={cab.cpf} onChange={e => setCab(c => ({ ...c, cpf: e.target.value }))} style={{ ...INPUT, flex: 1 }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Advogado" value={cab.advogado} onChange={e => setCab(c => ({ ...c, advogado: e.target.value }))} style={{ ...INPUT, flex: 2 }} />
                <input placeholder="OAB nº" value={cab.oab} onChange={e => setCab(c => ({ ...c, oab: e.target.value }))} style={{ ...INPUT, flex: 1 }} />
              </div>

              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6e", margin: "8px 0 4px" }}>Ação</p>
              <input placeholder="Tipo da ação" value={cab.tipo_acao} onChange={e => setCab(c => ({ ...c, tipo_acao: e.target.value }))} style={INPUT} />
              <input placeholder="Réu / Requerido" value={cab.reu} onChange={e => setCab(c => ({ ...c, reu: e.target.value }))} style={INPUT} />
              {/* ── Campo número do processo ── */}
              <input
                placeholder="Número do processo (opcional)"
                value={cab.numero_processo}
                onChange={e => setCab(c => ({ ...c, numero_processo: e.target.value }))}
                style={INPUT}
              />

              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6e", margin: "8px 0 4px" }}>Pedido principal</p>
              <textarea
                placeholder="Descreva o pedido principal da petição..."
                value={cab.pedido}
                onChange={e => setCab(c => ({ ...c, pedido: e.target.value }))}
                rows={4}
                style={{ ...INPUT, resize: "vertical" }}
              />

              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6e", margin: "8px 0 4px" }}>Local de assinatura</p>
              <input
                placeholder="Cidade de assinatura"
                value={cab.cidade}
                onChange={e => setCab(c => ({ ...c, cidade: e.target.value }))}
                style={INPUT}
              />

              <button onClick={() => setEtapa("artigos")} style={{ marginTop: 8, padding: "11px 0", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                Próximo — Selecionar artigos →
              </button>
            </div>
          )}

          {/* ── ETAPA 2: ARTIGOS ── */}
          {etapa === "artigos" && (
            <div>
              <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px" }}>
                Selecione os artigos que embasam sua petição. Você pode buscar por número ou tema.
              </p>

              <div style={{ position: "relative", marginBottom: 8 }}>
                <input
                  placeholder="Buscar por número (ex: 5) ou tema (ex: liberdade)..."
                  value={artigosBusca}
                  onChange={e => { setArtigosBusca(e.target.value); buscarArtigos(e.target.value); }}
                  style={INPUT}
                />
                {buscandoArtigos && <p style={{ fontSize: 11, color: "#888", margin: "4px 0 0" }}>Buscando...</p>}
              </div>

              {artigosResultado.length > 0 && (
                <div style={{ border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
                  {artigosResultado.map(a => {
                    const sel = !!artigosSelecionados.find(x => x.id === a.id);
                    return (
                      <button key={a.id} onClick={() => toggleArtigo(a)} style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                        background: sel ? "#E6F1FB" : "#fff", border: "none",
                        borderBottom: "0.5px solid rgba(0,0,0,0.06)", cursor: "pointer", textAlign: "left",
                      }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? "#1a3a6e" : "#ccc"}`, background: sel ? "#1a3a6e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {sel && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><polyline points="1.5 5 4 7.5 8.5 2" /></svg>}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#E6F1FB", color: "#0C447C", borderRadius: 6, padding: "2px 6px", flexShrink: 0 }}>
                          {a.lei_sigla ?? "CF"} {a.numero}º
                        </span>
                        <span style={{ fontSize: 12, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ementa}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selecionados */}
              {artigosSelecionados.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#0f6e56", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>
                    ✓ {artigosSelecionados.length} artigo{artigosSelecionados.length > 1 ? "s" : ""} selecionado{artigosSelecionados.length > 1 ? "s" : ""}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {artigosSelecionados.map(a => (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#E6F1FB", borderRadius: 8, border: "0.5px solid #B5D4F4" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#0C447C" }}>{a.lei_sigla ?? "CF"} Art. {a.numero}º</span>
                        <span style={{ fontSize: 12, color: "#1a3a6e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ementa}</span>
                        <button onClick={() => toggleArtigo(a)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A32D2D", fontSize: 14, padding: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => setEtapa("cabecalho")} style={{ flex: 1, padding: "11px 0", background: "#fff", color: "#1a3a6e", border: "1px solid #1a3a6e33", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  ← Voltar
                </button>
                <button onClick={() => setEtapa("juris")} disabled={artigosSelecionados.length === 0} style={{ flex: 2, padding: "11px 0", background: artigosSelecionados.length === 0 ? "#ccc" : "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: artigosSelecionados.length === 0 ? "not-allowed" : "pointer" }}>
                  Próximo — Jurisprudências →
                </button>
              </div>
            </div>
          )}

          {/* ── ETAPA 3: JURISPRUDÊNCIA ── */}
          {etapa === "juris" && (
            <div>
              <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px" }}>
                Selecione as jurisprudências dos artigos escolhidos para incluir na petição.
              </p>

              {/* Filtro por tribunal */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
                {["Todos", ...TRIBUNAIS].map(t => (
                  <button key={t} onClick={() => setFiltroTribunal(t)} style={{
                    padding: "5px 12px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
                    background: filtroTribunal === t ? "#1a3a6e" : "#fff",
                    color: filtroTribunal === t ? "#fff" : "#666",
                  }}>
                    {t}
                  </button>
                ))}
              </div>

              {jurisFiltradas.length === 0 && (
                <div style={{ textAlign: "center", padding: 32 }}>
                  <p style={{ fontSize: 32, margin: "0 0 8px" }}>⚖️</p>
                  <p style={{ fontSize: 13, color: "#888" }}>Nenhuma jurisprudência cadastrada para os artigos selecionados.</p>
                  <button onClick={() => setEtapa("preview")} style={{ marginTop: 12, padding: "8px 20px", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                    Prosseguir sem jurisprudência
                  </button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {jurisFiltradas.map(j => {
                  const sel = !!jurisSelecionadas.find(x => x.id === j.id);
                  const cor = TRIB_COR[j.tribunal] ?? TRIB_COR.OUTRO;
                  return (
                    <button key={j.id} onClick={() => toggleJuris(j)} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                      background: sel ? "#FFF8E6" : "#fff", border: sel ? "1.5px solid #f0c040" : "0.5px solid rgba(0,0,0,0.1)",
                      borderRadius: 10, cursor: "pointer", textAlign: "left",
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? "#b45309" : "#ccc"}`, background: sel ? "#b45309" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        {sel && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><polyline points="1.5 5 4 7.5 8.5 2" /></svg>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, background: cor.bg, color: cor.color, borderRadius: 6, padding: "1px 6px" }}>{j.tribunal}</span>
                          {j.numero_processo && <span style={{ fontSize: 10, color: "#aaa" }}>{j.numero_processo}</span>}
                        </div>
                        <p style={{ fontSize: 12, color: "#333", margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                          {j.resumo_simples ?? j.ementa}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {jurisSelecionadas.length > 0 && (
                <p style={{ fontSize: 11, color: "#b45309", fontWeight: 600, margin: "0 0 12px" }}>
                  ✓ {jurisSelecionadas.length} jurisprudência{jurisSelecionadas.length > 1 ? "s" : ""} selecionada{jurisSelecionadas.length > 1 ? "s" : ""}
                </p>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEtapa("artigos")} style={{ flex: 1, padding: "11px 0", background: "#fff", color: "#1a3a6e", border: "1px solid #1a3a6e33", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  ← Voltar
                </button>
                <button onClick={() => setEtapa("preview")} style={{ flex: 2, padding: "11px 0", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  Ver preview →
                </button>
              </div>
            </div>
          )}

          {/* ── ETAPA 4: PREVIEW ── */}
          {etapa === "preview" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => setEtapa("juris")} style={{ flex: 1, padding: "9px 0", background: "#fff", color: "#1a3a6e", border: "1px solid #1a3a6e33", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>← Editar</button>
                <button onClick={imprimir} style={{ flex: 2, padding: "9px 0", background: "#1a3a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🖨️ Imprimir / Salvar PDF</button>
              </div>

              {/* Petição para impressão */}
              <div ref={printRef} style={{ background: "#fff", borderRadius: 10, padding: "24px 20px", border: "0.5px solid rgba(0,0,0,0.08)", fontSize: 13, lineHeight: 1.8, fontFamily: "Georgia, serif", color: "#111" }}>

                {/* Logo e dados do escritório */}
                {(logoUrl || cab.nome_escritorio) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #1a3a6e" }}>
                    {logoUrl && (
                      <img src={logoUrl} alt="Logo" style={{ height: 56, objectFit: "contain", flexShrink: 0 }} />
                    )}
                    <div>
                      {cab.nome_escritorio && <p style={{ margin: "0 0 2px", fontWeight: "bold", fontSize: 14, color: "#1a3a6e" }}>{cab.nome_escritorio}</p>}
                      {cab.advogado && <p style={{ margin: "0 0 2px", fontSize: 12 }}>{cab.advogado}</p>}
                      {cab.oab && <p style={{ margin: 0, fontSize: 11, color: "#666" }}>OAB nº {cab.oab}</p>}
                    </div>
                  </div>
                )}

                {/* Número do processo */}
                {cab.numero_processo && (
                  <p style={{ textAlign: "right", fontSize: 11, color: "#666", margin: "0 0 16px" }}>
                    Processo nº {cab.numero_processo}
                  </p>
                )}

                {/* Endereçamento */}
                <div className="cabecalho" style={{ textAlign: "center", marginBottom: 24 }}>
                  <p style={{ margin: "0 0 2px", fontWeight: "bold" }}>{cab.exmo}</p>
                  {cab.vara && <p style={{ margin: "0 0 2px" }}>{cab.vara}</p>}
                  <p style={{ margin: 0 }}>Comarca de {cab.comarca} — {cab.estado}</p>
                </div>

                {/* Qualificação */}
                <p style={{ textAlign: "justify", marginBottom: 16 }}>
                  <strong>{cab.autor}</strong>{cab.cpf ? `, inscrito(a) no CPF sob o nº ${cab.cpf}` : ""}, por intermédio de seu(sua) advogado(a) <strong>{cab.advogado}</strong>{cab.oab ? `, inscrito(a) na OAB sob o nº ${cab.oab}` : ""}, vem, respeitosamente, à presença de Vossa Excelência propor a presente:
                </p>

                {/* Tipo da ação */}
                <h2 style={{ textAlign: "center", fontSize: 14, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 16px", fontFamily: "Georgia, serif" }}>
                  {cab.tipo_acao}
                </h2>

                {cab.reu && (
                  <p style={{ textAlign: "justify", marginBottom: 16 }}>
                    Em face de <strong>{cab.reu}</strong>, pelas razões de fato e de direito a seguir expostas.
                  </p>
                )}

                {/* Fundamentos */}
                {artigosSelecionados.length > 0 && (
                  <>
                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, margin: "20px 0 8px", textTransform: "uppercase", borderBottom: "1px solid #ddd", paddingBottom: 4 }}>
                      I — DOS FUNDAMENTOS LEGAIS
                    </h3>
                    {artigosSelecionados.map(a => (
                      <div key={a.id} style={{ borderLeft: "3px solid #1a3a6e", paddingLeft: 12, margin: "10px 0", background: "#f8faff", padding: "8px 12px" }}>
                        <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: 12 }}>
                          {a.lei_sigla ?? "CF/88"} — Art. {a.numero}º — {a.ementa}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#333", fontStyle: "italic" }}>
                          {a.texto_original ?? a.texto_simples ?? ""}
                        </p>
                      </div>
                    ))}
                  </>
                )}

                {/* Jurisprudência */}
                {jurisSelecionadas.length > 0 && (
                  <>
                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, margin: "20px 0 8px", textTransform: "uppercase", borderBottom: "1px solid #ddd", paddingBottom: 4 }}>
                      II — DA JURISPRUDÊNCIA APLICÁVEL
                    </h3>
                    {jurisSelecionadas.map(j => (
                      <div key={j.id} style={{ borderLeft: "3px solid #b45309", paddingLeft: 12, margin: "10px 0", background: "#fffbeb", padding: "8px 12px" }}>
                        <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: 11 }}>
                          {j.tribunal}{j.numero_processo ? ` — ${j.numero_processo}` : ""}
                          {j.relator ? ` — Rel. ${j.relator}` : ""}
                          {j.data_julgamento ? ` — ${new Date(j.data_julgamento).toLocaleDateString("pt-BR")}` : ""}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, fontStyle: "italic" }}>"{j.ementa}"</p>
                      </div>
                    ))}
                  </>
                )}

                {/* Pedido */}
                {cab.pedido && (
                  <>
                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, margin: "20px 0 8px", textTransform: "uppercase", borderBottom: "1px solid #ddd", paddingBottom: 4 }}>
                      {jurisSelecionadas.length > 0 ? "III" : "II"} — DOS PEDIDOS
                    </h3>
                    <p style={{ textAlign: "justify" }}>
                      Ante o exposto, requer a Vossa Excelência que se digne a {cab.pedido}
                    </p>
                    <p style={{ textAlign: "justify" }}>Requer, ainda, a condenação da parte contrária ao pagamento das custas processuais e honorários advocatícios.</p>
                    <p>Termos em que, pede deferimento.</p>
                  </>
                )}

                {/* Assinatura */}
                <div style={{ marginTop: 40, textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px" }}>{cab.cidade} — {cab.estado}, {hoje()}</p>
                  <p style={{ margin: "0 0 40px" }}>_________________________________________</p>
                  {cab.advogado && <p style={{ margin: "0 0 2px", fontWeight: "bold" }}>{cab.advogado}</p>}
                  {cab.oab && <p style={{ margin: 0, fontSize: 12 }}>OAB nº {cab.oab}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
