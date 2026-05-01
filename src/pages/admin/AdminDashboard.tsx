// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

type Aba = "visao" | "videos" | "materiais" | "usuarios" | "ranking" | "juris";
type ModoInsercao = "url" | "upload";
type RankingCategoria = "xp" | "quiz";

interface Concurso { id: string; nome: string; video_url?: string | null; }
interface Usuario { id: string; nome: string | null; plano: string; role: string | null; criado_em: string; }
interface Material { id: string; concurso_id: string; titulo: string; tipo: string; url: string; criado_em: string; }
interface RankingXP { id: string; nome: string | null; xp_total: number; sequencia: number; posicao: number; }
interface RankingQuiz { user_id: string; nome: string | null; total_respondidas: number; total_certas: number; taxa_acerto: number; }
interface ArtigoOpcao { id: string; numero: number; ementa: string; lei_sigla: string; }
interface Jurisprudencia { id: string; artigo_id: string; tribunal: string; numero_processo?: string; ementa: string; resumo_simples?: string; data_julgamento?: string; relator?: string; url_original?: string; relevancia: number; artigos?: { numero: number; lei_sigla: string; }; }

const PLANOS = ["gratis", "cidadao", "concurseiro", "cursinho", "premium"];
const PLANO_COR: Record<string, string> = {
  gratis: "#888", cidadao: "#0f6e56", concurseiro: "#1a3a6e", cursinho: "#7c3aed", premium: "#b45309",
};

function ytThumb(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
}

function ToggleModo({ modo, onChange }: { modo: ModoInsercao; onChange: (m: ModoInsercao) => void }) {
  return (
    <div style={{ display: "flex", background: "#f4f6fb", borderRadius: 8, padding: 3, gap: 3 }}>
      {(["url", "upload"] as ModoInsercao[]).map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          flex: 1, padding: "7px 0", borderRadius: 6, border: "none", cursor: "pointer",
          background: modo === m ? "#fff" : "transparent",
          fontSize: 12, fontWeight: 500,
          color: modo === m ? "#1a3a6e" : "#888",
          boxShadow: modo === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
        }}>
          {m === "url" ? "🔗 Link externo" : "📁 Upload de arquivo"}
        </button>
      ))}
    </div>
  );
}

function AreaUpload({ fileRef, arquivo, onChange, accept, hint }: {
  fileRef: React.RefObject<HTMLInputElement>;
  arquivo: File | null;
  onChange: (f: File | null) => void;
  accept: string;
  hint: string;
}) {
  return (
    <div>
      <div onClick={() => fileRef.current?.click()} style={{
        border: "1.5px dashed rgba(26,58,110,0.3)", borderRadius: 8, padding: 16,
        textAlign: "center", cursor: "pointer", background: "#f8faff",
      }}>
        {arquivo
          ? <p style={{ fontSize: 13, color: "#1a3a6e", margin: 0, fontWeight: 500 }}>📄 {arquivo.name}</p>
          : <>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px" }}>Clique para selecionar o arquivo</p>
            <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>{hint}</p>
          </>
        }
      </div>
      <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => onChange(e.target.files?.[0] ?? null)} />
    </div>
  );
}

// ── Medalha por posição ──────────────────────────────────────────────────────
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

// ── Barra de progresso animada ───────────────────────────────────────────────
function BarraProgresso({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div style={{ height: 5, background: "#f0f0f0", borderRadius: 99, overflow: "hidden", marginTop: 4 }}>
      <div style={{
        height: "100%", width: `${pct}%`, background: cor, borderRadius: 99,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

export default function AdminDashboard() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>("visao");

  // Stats
  const [stats, setStats] = useState({ total: 0, pagantes: 0, porPlano: {} as Record<string, number> });

  // Vídeos
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [videoModos, setVideoModos] = useState<Record<string, ModoInsercao>>({});
  const [videoArquivos, setVideoArquivos] = useState<Record<string, File | null>>({});
  const [videoProgress, setVideoProgress] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Record<string, React.RefObject<HTMLInputElement>>>({});

  // Materiais
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [novoMat, setNovoMat] = useState({ concurso_id: "", titulo: "", tipo: "pdf", url: "" });
  const [modoMat, setModoMat] = useState<ModoInsercao>("url");
  const [arquivoMat, setArquivoMat] = useState<File | null>(null);
  const [uploadProgressMat, setUploadProgressMat] = useState("");
  const [salvandoMat, setSalvandoMat] = useState(false);
  const matFileRef = useRef<HTMLInputElement>(null);

  // Usuários
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [buscaUser, setBuscaUser] = useState("");

  // Ranking
  const [rankingCategoria, setRankingCategoria] = useState<RankingCategoria>("xp");
  const [rankingXP, setRankingXP] = useState<RankingXP[]>([]);
  const [rankingQuiz, setRankingQuiz] = useState<RankingQuiz[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  // Jurisprudência
  const [jurisList, setJurisList] = useState<Jurisprudencia[]>([]);
  const [jurisBusca, setJurisBusca] = useState("");
  const [jurisArtigos, setJurisArtigos] = useState<ArtigoOpcao[]>([]);
  const [jurisArtigosBusca, setJurisArtigosBusca] = useState("");
  const [loadingJurisArtigos, setLoadingJurisArtigos] = useState(false);
  const [salvandoJuris, setSalvandoJuris] = useState(false);
  const [novaJuris, setNovaJuris] = useState({
    artigo_id: "", tribunal: "STF", numero_processo: "",
    ementa: "", resumo_simples: "", data_julgamento: "",
    relator: "", url_original: "", relevancia: 3,
  });

  useEffect(() => {
    if (loading) return;
    if (profile && !["super_admin", "admin"].includes(profile.role ?? "")) navigate("/");
  }, [profile, loading]);

  useEffect(() => {
    if (aba === "visao") carregarStats();
    if (aba === "videos") carregarConcursos();
    if (aba === "materiais") { carregarConcursos(); carregarMateriais(); }
    if (aba === "usuarios") carregarUsuarios();
    if (aba === "ranking") carregarRanking();
    if (aba === "juris") carregarJuris();
  }, [aba]);

  useEffect(() => {
    if (aba === "ranking") carregarRanking();
    if (aba === "juris") carregarJuris();
  }, [rankingCategoria]);

  async function carregarStats() {
    const { data } = await supabase.from("profiles").select("plano");
    if (!data) return;
    const porPlano: Record<string, number> = {};
    data.forEach((u: any) => { porPlano[u.plano] = (porPlano[u.plano] ?? 0) + 1; });
    setStats({ total: data.length, pagantes: data.filter((u: any) => u.plano !== "gratis").length, porPlano });
  }

  async function carregarConcursos() {
    const { data } = await supabase.from("concursos").select("id, nome, video_url").order("nome");
    if (!data) return;
    setConcursos(data as Concurso[]);
    const urls: Record<string, string> = {};
    data.forEach((c: any) => { if (c.video_url) urls[c.id] = c.video_url; });
    setVideoUrls(urls);
    data.forEach((c: any) => {
      if (!videoRefs.current[c.id]) videoRefs.current[c.id] = { current: null } as React.RefObject<HTMLInputElement>;
    });
  }

  async function carregarMateriais() {
    const { data } = await supabase.from("materiais").select("*").order("criado_em", { ascending: false });
    setMateriais((data as Material[]) ?? []);
  }

  async function carregarUsuarios() {
    const { data } = await supabase.from("profiles").select("id, nome, plano, role, criado_em").order("criado_em", { ascending: false });
    setUsuarios((data as Usuario[]) ?? []);
  }

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
      // Ranking por quiz: agrupa respostas por usuário
      const { data: respostas } = await supabase
        .from("respostas")
        .select("user_id, correta");

      if (respostas) {
        // Agrupa por user_id
        const mapa: Record<string, { total: number; certas: number }> = {};
        respostas.forEach((r: any) => {
          if (!mapa[r.user_id]) mapa[r.user_id] = { total: 0, certas: 0 };
          mapa[r.user_id].total++;
          if (r.correta) mapa[r.user_id].certas++;
        });

        // Busca nomes dos usuários
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

  async function salvarVideo(concursoId: string) {
    setSalvando(s => ({ ...s, [concursoId]: true }));
    const modo = videoModos[concursoId] ?? "url";
    let urlFinal = videoUrls[concursoId] ?? "";

    if (modo === "upload" && videoArquivos[concursoId]) {
      setVideoProgress(p => ({ ...p, [concursoId]: "Enviando vídeo..." }));
      const file = videoArquivos[concursoId]!;
      const ext = file.name.split(".").pop();
      const path = `videos/${concursoId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("materiais-cf").upload(path, file);
      if (error) {
        setVideoProgress(p => ({ ...p, [concursoId]: "Erro: " + error.message }));
        setSalvando(s => ({ ...s, [concursoId]: false }));
        return;
      }
      const { data: pub } = supabase.storage.from("materiais-cf").getPublicUrl(path);
      urlFinal = pub.publicUrl;
      setVideoProgress(p => ({ ...p, [concursoId]: "" }));
    }

    await supabase.from("concursos").update({ video_url: urlFinal || null }).eq("id", concursoId);
    setVideoUrls(v => ({ ...v, [concursoId]: urlFinal }));
    setSalvando(s => ({ ...s, [concursoId]: false }));
  }

  async function removerVideo(concursoId: string) {
    await supabase.from("concursos").update({ video_url: null }).eq("id", concursoId);
    setVideoUrls(u => { const n = { ...u }; delete n[concursoId]; return n; });
    setVideoArquivos(a => { const n = { ...a }; delete n[concursoId]; return n; });
  }

  async function salvarMaterial() {
    if (!novoMat.concurso_id || !novoMat.titulo) return;
    setSalvandoMat(true);
    let urlFinal = novoMat.url;

    if (modoMat === "upload" && arquivoMat) {
      setUploadProgressMat("Enviando arquivo...");
      const ext = arquivoMat.name.split(".").pop();
      const path = `${novoMat.concurso_id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("materiais-cf").upload(path, arquivoMat);
      if (error) { setUploadProgressMat("Erro: " + error.message); setSalvandoMat(false); return; }
      const { data: pub } = supabase.storage.from("materiais-cf").getPublicUrl(path);
      urlFinal = pub.publicUrl;
      setUploadProgressMat("");
    }

    if (!urlFinal) { setSalvandoMat(false); return; }
    await supabase.from("materiais").insert({ ...novoMat, url: urlFinal, criado_por: profile?.id });
    setNovoMat({ concurso_id: "", titulo: "", tipo: "pdf", url: "" });
    setArquivoMat(null);
    if (matFileRef.current) matFileRef.current.value = "";
    await carregarMateriais();
    setSalvandoMat(false);
  }

  async function removerMaterial(id: string) {
    await supabase.from("materiais").delete().eq("id", id);
    setMateriais(m => m.filter(x => x.id !== id));
  }

  async function mudarPlano(userId: string, plano: string) {
    await supabase.from("profiles").update({ plano }).eq("id", userId);
    setUsuarios(u => u.map(x => x.id === userId ? { ...x, plano } : x));
  }

  async function carregarJuris() {
    const { data } = await supabase
      .from("jurisprudencias")
      .select("*, artigos(numero, lei_sigla)")
      .order("criado_em", { ascending: false })
      .limit(100);
    setJurisList((data as Jurisprudencia[]) ?? []);
  }

  async function buscarArtigos(termo: string) {
    if (!termo || termo.length < 2) { setJurisArtigos([]); return; }
    setLoadingJurisArtigos(true);
    const numerico = parseInt(termo);
    let query = supabase.from("artigos").select("id, numero, ementa, lei_sigla").limit(10);
    if (!isNaN(numerico)) query = query.eq("numero", numerico);
    else query = query.ilike("ementa", `%${termo}%`);
    const { data } = await query;
    setJurisArtigos((data as ArtigoOpcao[]) ?? []);
    setLoadingJurisArtigos(false);
  }

  async function salvarJuris() {
    if (!novaJuris.artigo_id || !novaJuris.ementa || !novaJuris.tribunal) return;
    setSalvandoJuris(true);
    await supabase.from("jurisprudencias").insert({
      ...novaJuris,
      data_julgamento: novaJuris.data_julgamento || null,
      numero_processo: novaJuris.numero_processo || null,
      relator: novaJuris.relator || null,
      url_original: novaJuris.url_original || null,
      resumo_simples: novaJuris.resumo_simples || null,
    });
    setNovaJuris({ artigo_id: "", tribunal: "STF", numero_processo: "", ementa: "", resumo_simples: "", data_julgamento: "", relator: "", url_original: "", relevancia: 3 });
    setJurisArtigosBusca("");
    setJurisArtigos([]);
    await carregarJuris();
    setSalvandoJuris(false);
  }

  async function removerJuris(id: string) {
    await supabase.from("jurisprudencias").update({ ativo: false }).eq("id", id);
    setJurisList(j => j.filter(x => x.id !== id));
  }

  const INPUT: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.15)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const };
  const BTN = (bg: string, color = "#fff"): React.CSSProperties => ({ padding: "7px 14px", background: bg, color, border: "none", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" });

  const ABAS: { key: Aba; label: string }[] = [
    { key: "visao", label: "📊 Visão Geral" },
    { key: "videos", label: "🎬 Vídeos" },
    { key: "materiais", label: "📚 Materiais" },
    { key: "usuarios", label: "👥 Usuários" },
    { key: "ranking", label: "🏆 Ranking" },
    { key: "juris", label: "⚖️ Jurisprudência" },
  ];

  const usuariosFiltrados = usuarios.filter(u =>
    !buscaUser || (u.nome ?? "").toLowerCase().includes(buscaUser.toLowerCase())
  );

  // XP máximo para barra de progresso
  const maxXP = rankingXP.length > 0 ? rankingXP[0].xp_total : 1;
  const maxCertas = rankingQuiz.length > 0 ? rankingQuiz[0].total_certas : 1;

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f6fb", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#1a3a6e", padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate("/perfil")} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
            </button>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#fff", margin: 0 }}>Painel Admin</p>
          </div>
          <img src="/logo.png" alt="CFfácil" style={{ height: 36, objectFit: "contain", background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "2px 4px" }} />
        </div>
        <div style={{ display: "flex", overflowX: "auto", gap: 4 }}>
          {ABAS.map(a => (
            <button key={a.key} onClick={() => setAba(a.key)} style={{
              padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: 12, fontWeight: aba === a.key ? 600 : 400, whiteSpace: "nowrap",
              color: aba === a.key ? "#fff" : "rgba(255,255,255,0.5)",
              borderBottom: `2px solid ${aba === a.key ? "#4ece9a" : "transparent"}`,
            }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 24px" }}>

        {/* VISÃO GERAL */}
        {aba === "visao" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { val: stats.total, lbl: "Usuários", cor: "#1a3a6e" },
                { val: stats.pagantes, lbl: "Pagantes", cor: "#0f6e56" },
                { val: stats.total > 0 ? `${Math.round((stats.pagantes / stats.total) * 100)}%` : "0%", lbl: "Conversão", cor: "#7c3aed" },
              ].map(s => (
                <div key={s.lbl} style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "14px 10px", textAlign: "center", border: "0.5px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.cor }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{s.lbl}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Por plano</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PLANOS.map(p => {
                const qtd = stats.porPlano[p] ?? 0;
                const pct = stats.total > 0 ? Math.round((qtd / stats.total) * 100) : 0;
                return (
                  <div key={p} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "0.5px solid rgba(0,0,0,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: PLANO_COR[p] ?? "#333", textTransform: "capitalize" }}>{p}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{qtd} <span style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: PLANO_COR[p] ?? "#ccc", borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VÍDEOS */}
        {aba === "videos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {concursos.map(c => {
              const url = videoUrls[c.id] ?? "";
              const modo = videoModos[c.id] ?? "url";
              const thumb = url && !url.includes("supabase") ? ytThumb(url) : null;
              if (!videoRefs.current[c.id]) videoRefs.current[c.id] = { current: null } as React.RefObject<HTMLInputElement>;
              const ref = videoRefs.current[c.id];

              return (
                <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: 14, border: "0.5px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    {thumb
                      ? <img src={thumb} alt="" style={{ width: 56, height: 40, borderRadius: 6, objectFit: "cover" }} />
                      : <div style={{ width: 56, height: 40, borderRadius: 6, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎬</div>
                    }
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 2px" }}>{c.nome}</p>
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: url ? "#E1F5EE" : "#f0f0f0", color: url ? "#0f6e56" : "#888" }}>
                        {url ? "✓ Com vídeo" : "Sem vídeo"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <ToggleModo modo={modo} onChange={m => setVideoModos(v => ({ ...v, [c.id]: m }))} />

                    {modo === "url" && (
                      <input placeholder="URL do YouTube ou Vimeo..." value={url}
                        onChange={e => setVideoUrls(v => ({ ...v, [c.id]: e.target.value }))}
                        style={INPUT} />
                    )}

                    {modo === "upload" && (
                      <AreaUpload
                        fileRef={ref as React.RefObject<HTMLInputElement>}
                        arquivo={videoArquivos[c.id] ?? null}
                        onChange={f => setVideoArquivos(a => ({ ...a, [c.id]: f }))}
                        accept="video/mp4,video/webm,video/ogg"
                        hint="MP4, WebM até 50MB"
                      />
                    )}

                    {videoProgress[c.id] && (
                      <p style={{ fontSize: 12, color: "#1a3a6e", margin: 0, textAlign: "center" }}>{videoProgress[c.id]}</p>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => salvarVideo(c.id)} disabled={salvando[c.id]} style={BTN("#1a3a6e")}>
                        {salvando[c.id] ? "Salvando..." : "Salvar"}
                      </button>
                      {url && <button onClick={() => removerVideo(c.id)} style={BTN("#f4f6fb", "#A32D2D")}>Remover</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MATERIAIS */}
        {aba === "materiais" && (
          <div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "0.5px solid rgba(0,0,0,0.08)", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: "#1a3a6e" }}>+ Novo material</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <select value={novoMat.concurso_id} onChange={e => setNovoMat(m => ({ ...m, concurso_id: e.target.value }))} style={INPUT}>
                  <option value="">Selecione o concurso...</option>
                  {concursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <input placeholder="Título do material" value={novoMat.titulo} onChange={e => setNovoMat(m => ({ ...m, titulo: e.target.value }))} style={INPUT} />
                <select value={novoMat.tipo} onChange={e => setNovoMat(m => ({ ...m, tipo: e.target.value }))} style={INPUT}>
                  <option value="pdf">PDF</option>
                  <option value="slide">Slide</option>
                  <option value="resumo">Resumo</option>
                  <option value="video">Vídeo</option>
                </select>
                <ToggleModo modo={modoMat} onChange={setModoMat} />
                {modoMat === "url" && (
                  <input placeholder="Cole a URL do arquivo..." value={novoMat.url} onChange={e => setNovoMat(m => ({ ...m, url: e.target.value }))} style={INPUT} />
                )}
                {modoMat === "upload" && (
                  <AreaUpload
                    fileRef={matFileRef as React.RefObject<HTMLInputElement>}
                    arquivo={arquivoMat}
                    onChange={setArquivoMat}
                    accept=".pdf,.pptx,.ppt,.docx,.doc,video/mp4"
                    hint="PDF, PPTX, DOCX, MP4 até 50MB"
                  />
                )}
                {uploadProgressMat && <p style={{ fontSize: 12, color: "#1a3a6e", margin: 0, textAlign: "center" }}>{uploadProgressMat}</p>}
                <button onClick={salvarMaterial} disabled={salvandoMat || !novoMat.concurso_id || !novoMat.titulo || (modoMat === "url" ? !novoMat.url : !arquivoMat)}
                  style={{ ...BTN("#1a3a6e"), padding: "10px 0", width: "100%", opacity: salvandoMat ? 0.7 : 1 }}>
                  {salvandoMat ? "Enviando..." : "Adicionar material"}
                </button>
              </div>
            </div>

            {materiais.length === 0 && <p style={{ color: "#888", fontSize: 13, textAlign: "center" }}>Nenhum material ainda.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {materiais.map(m => {
                const c = concursos.find(x => x.id === m.concurso_id);
                return (
                  <div key={m.id} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "0.5px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{m.tipo === "pdf" ? "📄" : m.tipo === "slide" ? "📊" : m.tipo === "video" ? "🎬" : "📝"}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 2px" }}>{m.titulo}</p>
                      <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{c?.nome ?? "—"} · {m.tipo.toUpperCase()}</p>
                    </div>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ ...BTN("#f4f6fb", "#1a3a6e"), textDecoration: "none" }}>↗</a>
                    <button onClick={() => removerMaterial(m.id)} style={BTN("#fff", "#A32D2D")}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* USUÁRIOS */}
        {aba === "usuarios" && (
          <div>
            <input placeholder="Buscar por nome..." value={buscaUser} onChange={e => setBuscaUser(e.target.value)} style={{ ...INPUT, marginBottom: 12 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {usuariosFiltrados.map(u => (
                <div key={u.id} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "0.5px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#1a3a6e", flexShrink: 0 }}>
                      {(u.nome ?? "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 1px" }}>{u.nome ?? "Sem nome"}</p>
                      <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{u.role ?? "user"} · {new Date(u.criado_em).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                    {PLANOS.map(p => (
                      <button key={p} onClick={() => mudarPlano(u.id, p)} style={{
                        padding: "4px 10px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500,
                        background: u.plano === p ? PLANO_COR[p] ?? "#333" : "#f0f0f0",
                        color: u.plano === p ? "#fff" : "#666",
                      }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RANKING */}
        {aba === "ranking" && (
          <div>
            {/* Toggle categoria */}
            <div style={{ display: "flex", background: "#fff", borderRadius: 10, padding: 4, gap: 4, marginBottom: 16, border: "0.5px solid rgba(0,0,0,0.08)" }}>
              <button
                onClick={() => setRankingCategoria("xp")}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer",
                  background: rankingCategoria === "xp" ? "#1a3a6e" : "transparent",
                  color: rankingCategoria === "xp" ? "#fff" : "#888",
                  fontSize: 13, fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                ⭐ XP Total
              </button>
              <button
                onClick={() => setRankingCategoria("quiz")}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer",
                  background: rankingCategoria === "quiz" ? "#1a3a6e" : "transparent",
                  color: rankingCategoria === "quiz" ? "#fff" : "#888",
                  fontSize: 13, fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                🧠 Quiz
              </button>
            </div>

            {/* Pódio top 3 */}
            {!loadingRanking && (rankingCategoria === "xp" ? rankingXP : rankingQuiz).length >= 3 && (
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, marginBottom: 20, padding: "0 4px" }}>
                {/* 2º lugar */}
                {(() => {
                  const item = rankingCategoria === "xp" ? rankingXP[1] : rankingQuiz[1];
                  const val = rankingCategoria === "xp"
                    ? `${(item as RankingXP).xp_total} XP`
                    : `${(item as RankingQuiz).total_certas} acertos`;
                  return (
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E8F0FE", border: "2px solid #C0C0C0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#666", margin: "0 auto 6px" }}>
                        {(item.nome ?? "?")[0].toUpperCase()}
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, margin: "0 0 2px", color: "#333", lineHeight: 1.2 }}>{item.nome ?? "—"}</p>
                      <p style={{ fontSize: 10, color: "#888", margin: "0 0 4px" }}>{val}</p>
                      <div style={{ background: "#C0C0C0", borderRadius: "6px 6px 0 0", height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 20 }}>🥈</span>
                      </div>
                    </div>
                  );
                })()}
                {/* 1º lugar */}
                {(() => {
                  const item = rankingCategoria === "xp" ? rankingXP[0] : rankingQuiz[0];
                  const val = rankingCategoria === "xp"
                    ? `${(item as RankingXP).xp_total} XP`
                    : `${(item as RankingQuiz).total_certas} acertos`;
                  return (
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#FFF9E6", border: "2px solid #FFD700", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#b45309", margin: "0 auto 6px" }}>
                        {(item.nome ?? "?")[0].toUpperCase()}
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 2px", color: "#1a1a1a", lineHeight: 1.2 }}>{item.nome ?? "—"}</p>
                      <p style={{ fontSize: 10, color: "#888", margin: "0 0 4px" }}>{val}</p>
                      <div style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", borderRadius: "6px 6px 0 0", height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 24 }}>🥇</span>
                      </div>
                    </div>
                  );
                })()}
                {/* 3º lugar */}
                {(() => {
                  const item = rankingCategoria === "xp" ? rankingXP[2] : rankingQuiz[2];
                  const val = rankingCategoria === "xp"
                    ? `${(item as RankingXP).xp_total} XP`
                    : `${(item as RankingQuiz).total_certas} acertos`;
                  return (
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF0E6", border: "2px solid #CD7F32", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#92400e", margin: "0 auto 6px" }}>
                        {(item.nome ?? "?")[0].toUpperCase()}
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, margin: "0 0 2px", color: "#333", lineHeight: 1.2 }}>{item.nome ?? "—"}</p>
                      <p style={{ fontSize: 10, color: "#888", margin: "0 0 4px" }}>{val}</p>
                      <div style={{ background: "#CD7F32", borderRadius: "6px 6px 0 0", height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 18 }}>🥉</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Loading */}
            {loadingRanking && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <p style={{ fontSize: 13, color: "#888" }}>Carregando ranking...</p>
              </div>
            )}

            {/* Lista completa */}
            {!loadingRanking && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rankingCategoria === "xp" && rankingXP.map((u, i) => (
                  <div key={u.id} style={{
                    background: i < 3 ? "linear-gradient(135deg, #f8faff, #fff)" : "#fff",
                    borderRadius: 10, padding: "10px 12px",
                    border: i === 0 ? "1px solid rgba(255,215,0,0.4)" : i === 1 ? "1px solid rgba(192,192,192,0.4)" : i === 2 ? "1px solid rgba(205,127,50,0.4)" : "0.5px solid rgba(0,0,0,0.07)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <Medalha pos={u.posicao} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.nome ?? "Usuário"}
                      </p>
                      <BarraProgresso pct={Math.round((u.xp_total / maxXP) * 100)} cor="#1a3a6e" />
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1a3a6e", margin: 0 }}>{u.xp_total} XP</p>
                      {u.sequencia > 0 && <p style={{ fontSize: 10, color: "#f59e0b", margin: 0 }}>🔥 {u.sequencia} dias</p>}
                    </div>
                  </div>
                ))}

                {rankingCategoria === "quiz" && rankingQuiz.map((u, i) => (
                  <div key={u.user_id} style={{
                    background: i < 3 ? "linear-gradient(135deg, #f8faff, #fff)" : "#fff",
                    borderRadius: 10, padding: "10px 12px",
                    border: i === 0 ? "1px solid rgba(255,215,0,0.4)" : i === 1 ? "1px solid rgba(192,192,192,0.4)" : i === 2 ? "1px solid rgba(205,127,50,0.4)" : "0.5px solid rgba(0,0,0,0.07)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <Medalha pos={i + 1} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.nome ?? "Usuário"}
                      </p>
                      <p style={{ fontSize: 10, color: "#888", margin: "0 0 2px" }}>
                        {u.total_respondidas} respondidas · {u.taxa_acerto}% de acerto
                      </p>
                      <BarraProgresso pct={Math.round((u.total_certas / maxCertas) * 100)} cor="#0f6e56" />
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0f6e56", margin: 0 }}>{u.total_certas}</p>
                      <p style={{ fontSize: 10, color: "#888", margin: 0 }}>acertos</p>
                    </div>
                  </div>
                ))}

                {rankingCategoria === "xp" && rankingXP.length === 0 && (
                  <p style={{ textAlign: "center", color: "#888", fontSize: 13, padding: 24 }}>Nenhum dado de XP ainda.</p>
                )}
                {rankingCategoria === "quiz" && rankingQuiz.length === 0 && (
                  <p style={{ textAlign: "center", color: "#888", fontSize: 13, padding: 24 }}>Nenhuma resposta registrada ainda.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* JURISPRUDÊNCIA */}
        {aba === "juris" && (
          <div>
            {/* Formulário de cadastro */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "0.5px solid rgba(0,0,0,0.08)", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: "#7c4a00" }}>⚖️ + Nova jurisprudência</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                {/* Busca de artigo */}
                <div>
                  <input
                    placeholder="Buscar artigo por número ou tema (ex: 5, liberdade)..."
                    value={jurisArtigosBusca}
                    onChange={e => { setJurisArtigosBusca(e.target.value); buscarArtigos(e.target.value); }}
                    style={INPUT}
                  />
                  {loadingJurisArtigos && <p style={{ fontSize: 11, color: "#888", margin: "4px 0 0" }}>Buscando...</p>}
                  {jurisArtigos.length > 0 && (
                    <div style={{ border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 8, marginTop: 4, overflow: "hidden" }}>
                      {jurisArtigos.map(a => (
                        <button key={a.id} onClick={() => {
                          setNovaJuris(j => ({ ...j, artigo_id: a.id }));
                          setJurisArtigosBusca(`Art. ${a.numero}º (${a.lei_sigla}) — ${a.ementa.slice(0, 50)}...`);
                          setJurisArtigos([]);
                        }} style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 12px", background: novaJuris.artigo_id === a.id ? "#E6F1FB" : "#fff",
                          border: "none", borderBottom: "0.5px solid rgba(0,0,0,0.06)", cursor: "pointer", textAlign: "left",
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#E6F1FB", color: "#0C447C", borderRadius: 6, padding: "2px 6px", flexShrink: 0 }}>
                            {a.lei_sigla} {a.numero}º
                          </span>
                          <span style={{ fontSize: 12, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ementa}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {novaJuris.artigo_id && (
                    <p style={{ fontSize: 11, color: "#0f6e56", margin: "4px 0 0" }}>✓ Artigo selecionado</p>
                  )}
                </div>

                {/* Tribunal */}
                <select value={novaJuris.tribunal} onChange={e => setNovaJuris(j => ({ ...j, tribunal: e.target.value }))} style={INPUT}>
                  {["STF","STJ","TST","TSE","TRF","OUTRO"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* Ementa */}
                <textarea
                  placeholder="Ementa completa (texto oficial do julgado)..."
                  value={novaJuris.ementa}
                  onChange={e => setNovaJuris(j => ({ ...j, ementa: e.target.value }))}
                  rows={4}
                  style={{ ...INPUT, resize: "vertical", fontFamily: "Georgia, serif" }}
                />

                {/* Resumo simples */}
                <textarea
                  placeholder="Resumo em linguagem simples (opcional — para o usuário)..."
                  value={novaJuris.resumo_simples}
                  onChange={e => setNovaJuris(j => ({ ...j, resumo_simples: e.target.value }))}
                  rows={2}
                  style={{ ...INPUT, resize: "vertical" }}
                />

                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="Nº processo (ex: RE 123456)" value={novaJuris.numero_processo} onChange={e => setNovaJuris(j => ({ ...j, numero_processo: e.target.value }))} style={{ ...INPUT, flex: 1 }} />
                  <input type="date" value={novaJuris.data_julgamento} onChange={e => setNovaJuris(j => ({ ...j, data_julgamento: e.target.value }))} style={{ ...INPUT, flex: 1 }} />
                </div>

                <input placeholder="Relator (ex: Min. Alexandre de Moraes)" value={novaJuris.relator} onChange={e => setNovaJuris(j => ({ ...j, relator: e.target.value }))} style={INPUT} />
                <input placeholder="URL do acórdão (opcional)" value={novaJuris.url_original} onChange={e => setNovaJuris(j => ({ ...j, url_original: e.target.value }))} style={INPUT} />

                {/* Relevância */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "#666", flexShrink: 0 }}>Relevância:</span>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setNovaJuris(j => ({ ...j, relevancia: n }))} style={{
                      fontSize: 18, background: "none", border: "none", cursor: "pointer", padding: 2,
                      opacity: n <= novaJuris.relevancia ? 1 : 0.25,
                    }}>★</button>
                  ))}
                </div>

                <button
                  onClick={salvarJuris}
                  disabled={salvandoJuris || !novaJuris.artigo_id || !novaJuris.ementa}
                  style={{ ...BTN("#7c4a00"), padding: "10px 0", width: "100%", opacity: salvandoJuris || !novaJuris.artigo_id || !novaJuris.ementa ? 0.5 : 1 }}
                >
                  {salvandoJuris ? "Salvando..." : "Adicionar jurisprudência"}
                </button>
              </div>
            </div>

            {/* Busca na lista */}
            <input
              placeholder="Filtrar por tribunal, artigo ou texto..."
              value={jurisBusca}
              onChange={e => setJurisBusca(e.target.value)}
              style={{ ...INPUT, marginBottom: 10 }}
            />

            {/* Lista */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {jurisList
                .filter(j => !jurisBusca || j.ementa.toLowerCase().includes(jurisBusca.toLowerCase()) || j.tribunal.toLowerCase().includes(jurisBusca.toLowerCase()))
                .map(j => {
                  const TRIB_COR: Record<string, string> = { STF: "#0C447C", STJ: "#27500A", TST: "#3C3489", TSE: "#633806", TRF: "#791F1F", OUTRO: "#555" };
                  const TRIB_BG: Record<string, string> = { STF: "#E6F1FB", STJ: "#EAF3DE", TST: "#EEEDFE", TSE: "#FAEEDA", TRF: "#FCEBEB", OUTRO: "#f4f6fb" };
                  return (
                    <div key={j.id} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "0.5px solid rgba(0,0,0,0.08)" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: TRIB_BG[j.tribunal] ?? "#f4f6fb", color: TRIB_COR[j.tribunal] ?? "#555", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                          {j.tribunal}
                        </span>
                        {j.artigos && (
                          <span style={{ fontSize: 10, background: "#E6F1FB", color: "#0C447C", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                            {j.artigos.lei_sigla} Art. {j.artigos.numero}º
                          </span>
                        )}
                        <div style={{ flex: 1 }} />
                        <button onClick={() => removerJuris(j.id)} style={{ ...BTN("#fff", "#A32D2D"), padding: "3px 8px", fontSize: 11 }}>✕</button>
                      </div>
                      <p style={{ fontSize: 12, color: "#333", margin: "0 0 3px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                        {j.resumo_simples ?? j.ementa}
                      </p>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 10, color: n <= j.relevancia ? "#f0c040" : "#ddd" }}>★</span>)}
                      </div>
                    </div>
                  );
              })}
              {jurisList.length === 0 && <p style={{ textAlign: "center", color: "#888", fontSize: 13, padding: 24 }}>Nenhuma jurisprudência cadastrada ainda.</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
