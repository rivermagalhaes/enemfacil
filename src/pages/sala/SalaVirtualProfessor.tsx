// src/pages/sala/SalaVirtualProfessor.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Sala {
  id: string; codigo: string; nome: string; materia: string;
  vestibular: string; status: string; modo: string;
  tempo_limite_min: number | null; max_questoes: number;
  criada_em: string; iniciada_em: string | null; encerrada_em: string | null;
}
interface Participante {
  user_id: string; nome_exibicao: string | null; entrou_em: string; saiu_em: string | null;
}
interface AlunoStats {
  user_id: string; nome: string | null; certas: number; total: number; taxa: number;
}
interface QuestaoData {
  id: string; question: string; options: string[];
  answer_index: number; explanation: string; topic: string; area: string;
}
interface Assignment {
  id: string; titulo: string; descricao: string | null;
  data_liberacao: string | null; tempo_limite_min: number | null;
  ativo: boolean; questoes_data: QuestaoData[]; sala_virtual_id: string;
}
interface SubmissaoResumo {
  assignment_id: string; total_alunos: number; media_acertos: number;
}
interface Material {
  id: string; titulo: string; tipo: string; url: string;
  materia: string | null; topic: string | null; vestibular: string | null;
}
interface SalaMaterial {
  vinculo_id: string; material_id: string; titulo: string;
  tipo: string; url: string; topic: string | null; adicionado_em: string;
}

const MATERIAS = [
  { id: "quimica",    label: "Química",    emoji: "🧪" },
  { id: "fisica",     label: "Física",     emoji: "⚡" },
  { id: "matematica", label: "Matemática", emoji: "📐" },
  { id: "portugues",  label: "Português",  emoji: "📝" },
  { id: "ingles",     label: "Inglês",     emoji: "🌎" },
  { id: "redacao",    label: "Redação",    emoji: "✍️" },
  { id: "historia",   label: "História",   emoji: "📜" },
  { id: "geografia",  label: "Geografia",  emoji: "🌍" },
  { id: "biologia",   label: "Biologia",   emoji: "🔬" },
  { id: "geral",      label: "Geral",      emoji: "🎯" },
];
const VESTIBULARES = ["ENEM", "FUVEST", "UNICAMP", "ITA", "IME", "UNB"];
const TIPO_EMOJI: Record<string, string> = { pdf: "📄", video: "🎥", ppt: "📊", link: "🔗" };

function gerarCodigo(materia: string, ano: number): string {
  const prefixos: Record<string, string> = {
    quimica: "QUI", fisica: "FIS", matematica: "MAT", portugues: "POR",
    ingles: "ING", redacao: "RED", historia: "HIS", geografia: "GEO",
    biologia: "BIO", geral: "GER",
  };
  const pref = prefixos[materia] ?? "SAL";
  const anoSufixo = String(ano).slice(2);
  const rand = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${pref}${anoSufixo}${rand}`;
}

export default function SalaVirtualProfessor() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [salas, setSalas] = useState<Sala[]>([]);
  const [salaAtiva, setSalaAtiva] = useState<Sala | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [alunosStats, setAlunosStats] = useState<AlunoStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Tabs principais
  const [tabAtiva, setTabAtiva] = useState<"salas" | "simulados">("salas");

  // Simulados
  const [modalSimulado, setModalSimulado] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissoesResumo, setSubmissoesResumo] = useState<SubmissaoResumo[]>([]);
  const [formSimulado, setFormSimulado] = useState({
    titulo: "", descricao: "", sala_virtual_id: "",
    data_liberacao: "", hora_liberacao: "", tempo_limite_min: "",
  });
  const [questoesImportadas, setQuestoesImportadas] = useState<QuestaoData[]>([]);
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<Set<string>>(new Set());
  const [buscandoQuestoes, setBuscandoQuestoes] = useState(false);
  const [filtroArea, setFiltroArea] = useState("todas");
  const [salvandoSimulado, setSalvandoSimulado] = useState(false);
  const [simuladoDetalhe, setSimuladoDetalhe] = useState<Assignment | null>(null);
  const [submissoesDetalhe, setSubmissoesDetalhe] = useState<any[]>([]);

  // ── Materiais ──────────────────────────────────────────────────────────────
  const [materiaisBiblioteca, setMateriaisBiblioteca] = useState<Material[]>([]);
  const [materiaisSalaAtiva, setMateriaisSalaAtiva] = useState<SalaMaterial[]>([]);
  const [tabMateriais, setTabMateriais] = useState<"biblioteca" | "upload">("biblioteca");
  const [modalMateriais, setModalMateriais] = useState(false);
  // materiais selecionados no modal de criação de sala
  const [materiaisSelecionadosCriacao, setMateriaisSelecionadosCriacao] = useState<Set<string>>(new Set());
  // upload direto
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitulo, setUploadTitulo] = useState("");
  const [uploadTipo, setUploadTipo] = useState("pdf");
  const [uploadLink, setUploadLink] = useState("");
  const [enviandoUpload, setEnviandoUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // busca na biblioteca
  const [buscaMaterial, setBuscaMaterial] = useState("");

  const [modalCriar, setModalCriar] = useState(false);
  const [form, setForm] = useState({
    materia: "quimica", vestibular: "ENEM", modo: "quiz",
    tempo_limite_min: "", max_questoes: "10",
  });

  const STATUS_COR: Record<string, { bg: string; cor: string; label: string }> = {
    aguardando: { bg: "#FFF8E6", cor: "#92400e", label: "Aguardando" },
    ativa:      { bg: "#EDFAF3", cor: "#15803d", label: "● Ativa" },
    encerrada:  { bg: "#F4F6FB", cor: "#64748B", label: "Encerrada" },
  };
  const AREA_COR: Record<string, string> = {
    ciencias_natureza: "#10b981", ciencias_humanas: "#f59e0b",
    linguagens: "#8b5cf6", matematica: "#3b82f6",
  };
  const INPUT: React.CSSProperties = {
    padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 13, color: "#fff", width: "100%",
    boxSizing: "border-box" as const, outline: "none",
  };

  // ── Inicialização ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const role = (profile as any).role;
    if (role !== "professor" && role !== "admin" && role !== "super_admin") {
      navigate("/"); return;
    }
    carregarSalas();
    carregarAssignments();
    carregarMateriaisBiblioteca();
  }, [profile]);

  useEffect(() => {
    if (!salaAtiva) return;
    const interval = setInterval(() => {
      carregarParticipantes(salaAtiva.id);
      carregarStats(salaAtiva.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [salaAtiva]);

  // ── Salas ──────────────────────────────────────────────────────────────────
  async function carregarSalas() {
    setLoading(true);
    const { data } = await supabase
      .from("salas_virtuais").select("*")
      .eq("professor_id", user!.id)
      .order("criada_em", { ascending: false });
    setSalas((data as Sala[]) ?? []);
    setLoading(false);
  }

  async function criarSala() {
    setSalvando(true);
    const ano = new Date().getFullYear();
    const codigo = gerarCodigo(form.materia, ano);
    const matInfo = MATERIAS.find(m => m.id === form.materia);
    const nome = `${matInfo?.label ?? form.materia} ${form.vestibular} ${ano}`;
    const { data, error } = await supabase.from("salas_virtuais").insert({
      codigo, nome, materia: form.materia, vestibular: form.vestibular,
      modo: form.modo,
      tempo_limite_min: form.tempo_limite_min ? parseInt(form.tempo_limite_min) : null,
      max_questoes: parseInt(form.max_questoes) || 10,
      professor_id: user!.id, status: "aguardando",
    }).select().single();

    if (!error && data) {
      // Vincula materiais selecionados na criação (Opção A)
      if (materiaisSelecionadosCriacao.size > 0) {
        await supabase.from("sala_materiais").insert(
          [...materiaisSelecionadosCriacao].map(mid => ({
            sala_id: (data as Sala).id,
            material_id: mid,
          }))
        );
      }
      setSalas(prev => [data as Sala, ...prev]);
      setModalCriar(false);
      setForm({ materia: "quimica", vestibular: "ENEM", modo: "quiz", tempo_limite_min: "", max_questoes: "10" });
      setMateriaisSelecionadosCriacao(new Set());
    }
    setSalvando(false);
  }

  async function iniciarSala(sala: Sala) {
    await supabase.from("salas_virtuais")
      .update({ status: "ativa", iniciada_em: new Date().toISOString() }).eq("id", sala.id);
    const updated = { ...sala, status: "ativa", iniciada_em: new Date().toISOString() };
    setSalas(prev => prev.map(s => s.id === sala.id ? updated : s));
    setSalaAtiva(updated);
    carregarParticipantes(sala.id);
    carregarStats(sala.id);
    carregarMateriaisDaSala(sala.id);
  }

  async function encerrarSala(sala: Sala) {
    await supabase.from("salas_virtuais")
      .update({ status: "encerrada", encerrada_em: new Date().toISOString() }).eq("id", sala.id);
    setSalas(prev => prev.map(s => s.id === sala.id ? { ...s, status: "encerrada" } : s));
    if (salaAtiva?.id === sala.id) setSalaAtiva(null);
  }

  async function excluirSala(salaId: string) {
    await supabase.from("salas_virtuais").delete().eq("id", salaId);
    setSalas(prev => prev.filter(s => s.id !== salaId));
    if (salaAtiva?.id === salaId) setSalaAtiva(null);
  }

  async function carregarParticipantes(salaId: string) {
    const { data } = await supabase
      .from("sala_participantes").select("*").eq("sala_id", salaId);
    setParticipantes((data as Participante[]) ?? []);
  }

  async function carregarStats(salaId: string) {
    const { data: resps } = await supabase
      .from("sala_respostas").select("user_id, correta").eq("sala_id", salaId);
    if (!resps) return;
    const mapa: Record<string, { certas: number; total: number }> = {};
    resps.forEach((r: any) => {
      if (!mapa[r.user_id]) mapa[r.user_id] = { certas: 0, total: 0 };
      mapa[r.user_id].total++;
      if (r.correta) mapa[r.user_id].certas++;
    });
    const { data: parts } = await supabase
      .from("sala_participantes").select("user_id, nome_exibicao").eq("sala_id", salaId);
    const nomes: Record<string, string | null> = {};
    (parts ?? []).forEach((p: any) => { nomes[p.user_id] = p.nome_exibicao; });
    setAlunosStats(
      Object.entries(mapa)
        .map(([uid, v]) => ({
          user_id: uid, nome: nomes[uid] ?? "Aluno",
          certas: v.certas, total: v.total,
          taxa: v.total > 0 ? Math.round((v.certas / v.total) * 100) : 0,
        }))
        .sort((a, b) => b.certas - a.certas)
    );
  }

  // ── Materiais — biblioteca ─────────────────────────────────────────────────
  async function carregarMateriaisBiblioteca() {
    const { data } = await supabase
      .from("materiais").select("id, titulo, tipo, url, materia, topic, vestibular")
      .eq("ativo", true).order("criado_em", { ascending: false });
    setMateriaisBiblioteca((data as Material[]) ?? []);
  }

  async function carregarMateriaisDaSala(salaId: string) {
    const { data } = await supabase
      .from("sala_materiais_detalhes")
      .select("vinculo_id, material_id, titulo, tipo, url, topic, adicionado_em")
      .eq("sala_id", salaId)
      .order("adicionado_em", { ascending: false });
    setMateriaisSalaAtiva((data as SalaMaterial[]) ?? []);
  }

  async function vincularMaterialNaSala(materialId: string) {
    if (!salaAtiva) return;
    const { error } = await supabase.from("sala_materiais").insert({
      sala_id: salaAtiva.id, material_id: materialId,
    });
    if (!error) carregarMateriaisDaSala(salaAtiva.id);
  }

  async function desvincularMaterialDaSala(vinculoId: string) {
    await supabase.from("sala_materiais").delete().eq("id", vinculoId);
    setMateriaisSalaAtiva(prev => prev.filter(m => m.vinculo_id !== vinculoId));
  }

  // ── Materiais — upload direto (Opção B) ───────────────────────────────────
  async function fazerUpload() {
    if (!salaAtiva) return;
    if (uploadTipo === "link") {
      if (!uploadTitulo || !uploadLink) return;
      setEnviandoUpload(true);
      const { data: mat, error } = await supabase.from("materiais").insert({
        titulo: uploadTitulo, tipo: "link", url: uploadLink,
        materia: salaAtiva.materia, vestibular: salaAtiva.vestibular,
        criado_por: user!.id, ativo: true,
      }).select("id").single();
      if (!error && mat) {
        await supabase.from("sala_materiais").insert({ sala_id: salaAtiva.id, material_id: mat.id });
        await carregarMateriaisDaSala(salaAtiva.id);
        await carregarMateriaisBiblioteca();
        setUploadTitulo(""); setUploadLink("");
      }
      setEnviandoUpload(false);
      return;
    }

    if (!uploadFile || !uploadTitulo) return;
    setEnviandoUpload(true);
    const ext = uploadFile.name.split(".").pop();
    const path = `salas/${salaAtiva.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("materiais-sala").upload(path, uploadFile, { upsert: false });
    if (upErr) { setEnviandoUpload(false); return; }

    const { data: urlData } = supabase.storage.from("materiais-sala").getPublicUrl(path);
    const { data: mat, error } = await supabase.from("materiais").insert({
      titulo: uploadTitulo, tipo: uploadTipo, url: urlData.publicUrl,
      materia: salaAtiva.materia, vestibular: salaAtiva.vestibular,
      criado_por: user!.id, ativo: true,
    }).select("id").single();
    if (!error && mat) {
      await supabase.from("sala_materiais").insert({ sala_id: salaAtiva.id, material_id: mat.id });
      await carregarMateriaisDaSala(salaAtiva.id);
      await carregarMateriaisBiblioteca();
      setUploadTitulo(""); setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    setEnviandoUpload(false);
  }

  // ── Simulados ──────────────────────────────────────────────────────────────
  async function carregarAssignments() {
    const { data } = await supabase
      .from("assignments").select("*").eq("professor_id", user!.id)
      .not("sala_virtual_id", "is", null).order("created_at", { ascending: false });
    setAssignments((data as Assignment[]) ?? []);
    if (data && data.length > 0) {
      const ids = data.map((a: any) => a.id);
      const { data: subs } = await supabase
        .from("assignment_submissions").select("assignment_id, acertos, total")
        .in("assignment_id", ids);
      if (subs) {
        const mapa: Record<string, { soma: number; count: number }> = {};
        subs.forEach((s: any) => {
          if (!mapa[s.assignment_id]) mapa[s.assignment_id] = { soma: 0, count: 0 };
          mapa[s.assignment_id].soma += s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0;
          mapa[s.assignment_id].count++;
        });
        setSubmissoesResumo(Object.entries(mapa).map(([id, v]) => ({
          assignment_id: id, total_alunos: v.count,
          media_acertos: v.count > 0 ? Math.round(v.soma / v.count) : 0,
        })));
      }
    }
  }

  async function buscarQuestoes() {
    setBuscandoQuestoes(true);
    const q = supabase.from("questions")
      .select("id, question, answer_index, explanation, topic, area").limit(50);
    if (filtroArea !== "todas") q.eq("area", filtroArea);
    const { data } = await q;
    if (data && data.length > 0) {
      const ids = data.map((q: any) => q.id);
      const { data: opts } = await supabase
        .from("question_options").select("question_id, option_index, label")
        .in("question_id", ids).order("option_index");
      const optsMap: Record<string, string[]> = {};
      (opts ?? []).forEach((o: any) => {
        if (!optsMap[o.question_id]) optsMap[o.question_id] = [];
        optsMap[o.question_id][o.option_index] = o.label;
      });
      setQuestoesImportadas(data.map((q: any) => ({
        id: q.id, question: q.question, options: optsMap[q.id] ?? [],
        answer_index: q.answer_index, explanation: q.explanation ?? "",
        topic: q.topic ?? "", area: q.area ?? "",
      })));
    }
    setBuscandoQuestoes(false);
  }

  async function criarSimulado() {
    if (!formSimulado.titulo || !formSimulado.sala_virtual_id || questoesSelecionadas.size === 0) return;
    setSalvandoSimulado(true);
    const questoesFiltradas = questoesImportadas.filter(q => questoesSelecionadas.has(q.id));
    let dataLib: string | null = null;
    if (formSimulado.data_liberacao && formSimulado.hora_liberacao) {
      dataLib = new Date(`${formSimulado.data_liberacao}T${formSimulado.hora_liberacao}`).toISOString();
    } else if (formSimulado.data_liberacao) {
      dataLib = new Date(`${formSimulado.data_liberacao}T00:00`).toISOString();
    }
    const { data, error } = await supabase.from("assignments").insert({
      titulo: formSimulado.titulo, descricao: formSimulado.descricao || null,
      professor_id: user!.id, sala_virtual_id: formSimulado.sala_virtual_id,
      data_liberacao: dataLib,
      tempo_limite_min: formSimulado.tempo_limite_min ? parseInt(formSimulado.tempo_limite_min) : null,
      questoes_ids: questoesFiltradas.map(q => q.id),
      questoes_data: questoesFiltradas, ativo: true,
    }).select().single();
    if (!error && data) {
      setModalSimulado(false);
      setFormSimulado({ titulo: "", descricao: "", sala_virtual_id: "", data_liberacao: "", hora_liberacao: "", tempo_limite_min: "" });
      setQuestoesSelecionadas(new Set()); setQuestoesImportadas([]);
      await carregarAssignments();
    }
    setSalvandoSimulado(false);
  }

  async function verDetalhesSimulado(assignment: Assignment) {
    const { data } = await supabase
      .from("assignment_submissions").select("*, profiles(nome, username)")
      .eq("assignment_id", assignment.id).order("acertos", { ascending: false });
    setSubmissoesDetalhe(data ?? []);
    setSimuladoDetalhe(assignment);
  }

  async function excluirSimulado(id: string) {
    await supabase.from("assignments").delete().eq("id", id);
    setAssignments(prev => prev.filter(a => a.id !== id));
  }

  const materiaisFiltrados = materiaisBiblioteca.filter(m =>
    m.titulo.toLowerCase().includes(buscaMaterial.toLowerCase()) ||
    (m.topic ?? "").toLowerCase().includes(buscaMaterial.toLowerCase())
  );
  const jaNaSala = new Set(materiaisSalaAtiva.map(m => m.material_id));

  // ── Detalhe simulado ───────────────────────────────────────────────────────
  if (simuladoDetalhe) return (
    <div style={{ minHeight: "100dvh", width: "100%", background: "#0a0f1e", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#065C37,#0A7C4B)", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSimuladoDetalhe(null)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>📊 {simuladoDetalhe.titulo}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>{submissoesDetalhe.length} alunos responderam</p>
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 20px 80px", boxSizing: "border-box" as const }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { val: submissoesDetalhe.length, lbl: "Responderam", emoji: "👥" },
            { val: simuladoDetalhe.questoes_data?.length ?? 0, lbl: "Questões", emoji: "📝" },
            { val: submissoesDetalhe.length > 0 ? `${Math.round(submissoesDetalhe.reduce((s: number, r: any) => s + (r.total > 0 ? r.acertos / r.total * 100 : 0), 0) / submissoesDetalhe.length)}%` : "—", lbl: "Média geral", emoji: "🎯" },
          ].map(m => (
            <div key={m.lbl} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "12px 10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 18, margin: "0 0 4px" }}>{m.emoji}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 2px" }}>{m.val}</p>
              <p style={{ fontSize: 10, color: "#64748b", margin: 0 }}>{m.lbl}</p>
            </div>
          ))}
        </div>
        {submissoesDetalhe.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 36, margin: "0 0 8px" }}>📭</p>
            <p style={{ fontSize: 14, color: "#64748b" }}>Nenhum aluno respondeu ainda</p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>🏆 Ranking</p>
            {submissoesDetalhe.map((s: any, i: number) => {
              const pct = s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0;
              const nome = s.profiles?.nome || s.profiles?.username || "Aluno";
              return (
                <div key={s.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: i < 3 ? 20 : 13, width: 28, textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: "0 0 2px" }}>{nome}</p>
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{new Date(s.concluido_em).toLocaleString("pt-BR")}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: pct >= 70 ? "#4ece9a" : pct >= 50 ? "#f59e0b" : "#ef4444", margin: 0 }}>{pct}%</p>
                    <p style={{ fontSize: 10, color: "#64748b", margin: 0 }}>{s.acertos}/{s.total}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", width: "100%", background: "#0a0f1e", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#065C37,#0A7C4B)", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/professor")} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>🏫 Salas Virtuais</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>Gerencie suas aulas ao vivo</p>
          </div>
          <button onClick={() => tabAtiva === "salas" ? setModalCriar(true) : setModalSimulado(true)}
            style={{ padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + {tabAtiva === "salas" ? "Nova sala" : "Novo simulado"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {[{ id: "salas", label: "🏫 Salas ao vivo" }, { id: "simulados", label: "📝 Simulados" }].map(t => (
            <button key={t.id} onClick={() => setTabAtiva(t.id as any)}
              style={{ padding: "6px 16px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: tabAtiva === t.id ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                color: tabAtiva === t.id ? "#fff" : "rgba(255,255,255,0.5)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px 80px", boxSizing: "border-box" as const }}>

        {/* ── Tab Salas ao vivo ── */}
        {tabAtiva === "salas" && (
          <>
            {/* Painel sala ativa */}
            {salaAtiva && (
              <div style={{ background: "linear-gradient(135deg,#065C37,#0A7C4B)", borderRadius: 16, padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>● {salaAtiva.nome}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>Sala em andamento</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "0.1em" }}>{salaAtiva.codigo}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }}>código da sala</p>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                  {[
                    { val: participantes.length, lbl: "Alunos", emoji: "👥" },
                    { val: alunosStats.length, lbl: "Respondendo", emoji: "✏️" },
                    { val: alunosStats.length > 0 ? `${Math.round(alunosStats.reduce((s, a) => s + a.taxa, 0) / alunosStats.length)}%` : "—", lbl: "Acerto médio", emoji: "🎯" },
                  ].map(m => (
                    <div key={m.lbl} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <p style={{ fontSize: 16, margin: "0 0 2px" }}>{m.emoji}</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 2px" }}>{m.val}</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", margin: 0 }}>{m.lbl}</p>
                    </div>
                  ))}
                </div>

                {/* Ranking ao vivo */}
                {alunosStats.length > 0 && (
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>🏆 Ranking ao vivo</p>
                    {alunosStats.slice(0, 8).map((a, i) => (
                      <div key={a.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < alunosStats.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <span style={{ fontSize: i < 3 ? 16 : 12, width: 22, textAlign: "center" }}>{i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}</span>
                        <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.nome}</p>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#4ece9a" }}>{a.certas}/{a.total}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{a.taxa}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Participantes */}
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>👥 Participantes ({participantes.length})</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {participantes.map(p => (
                      <span key={p.user_id} style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", color: "#fff", borderRadius: 99, padding: "3px 10px" }}>
                        {p.nome_exibicao ?? "Aluno"}
                      </span>
                    ))}
                    {participantes.length === 0 && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>Aguardando alunos...</p>}
                  </div>
                </div>

                {/* ── MATERIAIS DA SALA (Opção B — painel ao vivo) ── */}
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                      📚 Materiais ({materiaisSalaAtiva.length})
                    </p>
                    <button onClick={() => { setModalMateriais(true); carregarMateriaisDaSala(salaAtiva.id); }}
                      style={{ fontSize: 11, fontWeight: 700, color: "#4ece9a", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      + Adicionar
                    </button>
                  </div>
                  {materiaisSalaAtiva.length === 0 ? (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>Nenhum material adicionado</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {materiaisSalaAtiva.map(m => (
                        <div key={m.vinculo_id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 10px" }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{TIPO_EMOJI[m.tipo] ?? "📦"}</span>
                          <p style={{ flex: 1, fontSize: 12, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.titulo}</p>
                          <button onClick={() => desvincularMaterialDaSala(m.vinculo_id)}
                            style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => encerrarSala(salaAtiva)}
                  style={{ width: "100%", padding: "12px 0", background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  ⏹ Encerrar sala
                </button>
              </div>
            )}

            {/* Lista de salas */}
            {loading ? (
              <p style={{ textAlign: "center", color: "#64748B", padding: 32 }}>Carregando salas...</p>
            ) : salas.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p style={{ fontSize: 36, margin: "0 0 8px" }}>🏫</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 4px" }}>Nenhuma sala criada</p>
                <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 16px" }}>Crie sua primeira sala virtual</p>
                <button onClick={() => setModalCriar(true)} style={{ padding: "10px 24px", background: "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Criar sala</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {salas.map(sala => {
                  const st = STATUS_COR[sala.status] ?? STATUS_COR.aguardando;
                  return (
                    <div key={sala.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 3px" }}>{sala.nome}</p>
                        <p style={{ fontSize: 20, fontWeight: 900, color: "#0ea5e9", margin: "0 0 4px", letterSpacing: "0.1em" }}>{sala.codigo}</p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, background: st.bg, color: st.cor, borderRadius: 99, padding: "2px 8px" }}>{st.label}</span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "2px 8px" }}>{sala.max_questoes} questões</span>
                          {sala.tempo_limite_min && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "2px 8px" }}>⏱ {sala.tempo_limite_min}min</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {sala.status === "aguardando" && (
                          <button onClick={() => iniciarSala(sala)} style={{ flex: 1, padding: "9px 0", background: "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>▶ Iniciar</button>
                        )}
                        {sala.status === "ativa" && (
                          <button onClick={() => { setSalaAtiva(sala); carregarParticipantes(sala.id); carregarStats(sala.id); carregarMateriaisDaSala(sala.id); }} style={{ flex: 1, padding: "9px 0", background: "rgba(78,206,154,0.15)", color: "#4ece9a", border: "1px solid rgba(78,206,154,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>👁 Ver ao vivo</button>
                        )}
                        {sala.status === "encerrada" && (
                          <button onClick={() => { setSalaAtiva(sala); carregarParticipantes(sala.id); carregarStats(sala.id); }} style={{ flex: 1, padding: "9px 0", background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📊 Ver resultados</button>
                        )}
                        <button onClick={() => excluirSala(sala.id)} style={{ padding: "9px 14px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Tab Simulados ── */}
        {tabAtiva === "simulados" && (
          <>
            {assignments.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p style={{ fontSize: 36, margin: "0 0 8px" }}>📝</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 4px" }}>Nenhum simulado criado</p>
                <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 16px" }}>Crie um simulado e agende para sua turma</p>
                <button onClick={() => setModalSimulado(true)} style={{ padding: "10px 24px", background: "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Criar simulado</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {assignments.map(a => {
                  const resumo = submissoesResumo.find(s => s.assignment_id === a.id);
                  const liberado = !a.data_liberacao || new Date(a.data_liberacao) <= new Date();
                  const sala = salas.find(s => s.id === a.sala_virtual_id);
                  return (
                    <div key={a.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{a.titulo}</p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {sala && <span style={{ fontSize: 10, color: "#0ea5e9", background: "rgba(14,165,233,0.1)", borderRadius: 99, padding: "2px 8px" }}>🏫 {sala.codigo}</span>}
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "2px 8px" }}>{a.questoes_data?.length ?? 0} questões</span>
                          {a.tempo_limite_min && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "2px 8px" }}>⏱ {a.tempo_limite_min}min</span>}
                          {a.data_liberacao && <span style={{ fontSize: 10, color: liberado ? "#4ece9a" : "#f59e0b", background: liberado ? "rgba(78,206,154,0.1)" : "rgba(245,158,11,0.1)", borderRadius: 99, padding: "2px 8px" }}>
                            {liberado ? "✅ Liberado" : `🔒 ${new Date(a.data_liberacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                          </span>}
                        </div>
                        {resumo && (
                          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                            <span style={{ fontSize: 12, color: "#4ece9a" }}>👥 {resumo.total_alunos} responderam</span>
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>🎯 Média: {resumo.media_acertos}%</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => verDetalhesSimulado(a)} style={{ flex: 1, padding: "9px 0", background: "rgba(78,206,154,0.15)", color: "#4ece9a", border: "1px solid rgba(78,206,154,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📊 Ver resultados</button>
                        <button onClick={() => excluirSimulado(a.id)} style={{ padding: "9px 14px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          Modal Criar Sala — com seleção de materiais (Opção A)
          ══════════════════════════════════════════════════════ */}
      {modalCriar && (
        <>
          <div onClick={() => setModalCriar(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001, background: "#0f172a", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "92dvh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>🏫 Nova Sala Virtual</p>

            {/* Matéria */}
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Matéria</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 14 }}>
              {MATERIAS.map(m => (
                <button key={m.id} onClick={() => setForm(f => ({ ...f, materia: m.id }))}
                  style={{ padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", background: form.materia === m.id ? "rgba(10,124,75,0.3)" : "rgba(255,255,255,0.05)", outline: form.materia === m.id ? "1.5px solid #0A7C4B" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 18 }}>{m.emoji}</span>
                  <span style={{ fontSize: 9, color: form.materia === m.id ? "#4ece9a" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>{m.label.slice(0, 5)}</span>
                </button>
              ))}
            </div>

            {/* Vestibular */}
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Vestibular</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {VESTIBULARES.map(v => (
                <button key={v} onClick={() => setForm(f => ({ ...f, vestibular: v }))}
                  style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", background: form.vestibular === v ? "rgba(10,124,75,0.3)" : "rgba(255,255,255,0.05)", color: form.vestibular === v ? "#4ece9a" : "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, outline: form.vestibular === v ? "1.5px solid #0A7C4B" : "none" }}>{v}
                </button>
              ))}
            </div>

            {/* Modo */}
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Modo</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 14 }}>
              {[{ id: "quiz", label: "Quiz", emoji: "🧠", desc: "Ao vivo" }, { id: "prova", label: "Prova", emoji: "📝", desc: "Com tempo" }, { id: "ranking", label: "Ranking", emoji: "🏆", desc: "Competitivo" }].map(m => (
                <button key={m.id} onClick={() => setForm(f => ({ ...f, modo: m.id }))}
                  style={{ padding: "10px 6px", borderRadius: 10, border: "none", cursor: "pointer", background: form.modo === m.id ? "rgba(10,124,75,0.3)" : "rgba(255,255,255,0.05)", outline: form.modo === m.id ? "1.5px solid #0A7C4B" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 20 }}>{m.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: form.modo === m.id ? "#4ece9a" : "#fff" }}>{m.label}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{m.desc}</span>
                </button>
              ))}
            </div>

            {/* Nº questões + tempo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Nº de questões</p>
                <input type="number" value={form.max_questoes} min={1} max={50} onChange={e => setForm(f => ({ ...f, max_questoes: e.target.value }))} style={INPUT} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Tempo (min)</p>
                <input type="number" value={form.tempo_limite_min} placeholder="Sem limite" onChange={e => setForm(f => ({ ...f, tempo_limite_min: e.target.value }))} style={INPUT} />
              </div>
            </div>

            {/* ── Opção A: Materiais na criação ── */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
                📚 Materiais de apoio
                {materiaisSelecionadosCriacao.size > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: "#4ece9a" }}>{materiaisSelecionadosCriacao.size} selecionado(s)</span>}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 10px" }}>Alunos verão esses materiais enquanto aguardam e após o resultado</p>
              {materiaisBiblioteca.length === 0 ? (
                <p style={{ fontSize: 12, color: "#64748b" }}>Nenhum material na biblioteca ainda</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                  {materiaisBiblioteca.map(m => {
                    const sel = materiaisSelecionadosCriacao.has(m.id);
                    return (
                      <button key={m.id} onClick={() => setMateriaisSelecionadosCriacao(prev => { const s = new Set(prev); sel ? s.delete(m.id) : s.add(m.id); return s; })}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", background: sel ? "rgba(10,124,75,0.2)" : "rgba(255,255,255,0.04)", outline: sel ? "1.5px solid #0A7C4B" : "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{TIPO_EMOJI[m.tipo] ?? "📦"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.titulo}</p>
                          {m.topic && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0 }}>{m.topic}</p>}
                        </div>
                        {sel && <span style={{ fontSize: 14, color: "#4ece9a", flexShrink: 0 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview nome */}
            <div style={{ background: "rgba(10,124,75,0.1)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(10,124,75,0.3)" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 2px" }}>Nome da sala</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{MATERIAS.find(m => m.id === form.materia)?.label} {form.vestibular} {new Date().getFullYear()}</p>
            </div>

            <button onClick={criarSala} disabled={salvando}
              style={{ width: "100%", padding: "14px 0", background: salvando ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer" }}>
              {salvando ? "Criando..." : "✅ Criar sala"}
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          Modal Materiais — Opção B (painel ao vivo)
          ══════════════════════════════════════════════════════ */}
      {modalMateriais && salaAtiva && (
        <>
          <div onClick={() => setModalMateriais(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001, background: "#0f172a", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "92dvh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>📚 Materiais da Sala</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 16px" }}>{salaAtiva.nome} · {salaAtiva.codigo}</p>

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[{ id: "biblioteca", label: "📖 Biblioteca" }, { id: "upload", label: "⬆️ Upload / Link" }].map(t => (
                <button key={t.id} onClick={() => setTabMateriais(t.id as any)}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    background: tabMateriais === t.id ? "rgba(10,124,75,0.3)" : "rgba(255,255,255,0.06)",
                    color: tabMateriais === t.id ? "#4ece9a" : "rgba(255,255,255,0.5)",
                    outline: tabMateriais === t.id ? "1.5px solid #0A7C4B" : "none" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Biblioteca */}
            {tabMateriais === "biblioteca" && (
              <div>
                <input value={buscaMaterial} onChange={e => setBuscaMaterial(e.target.value)}
                  placeholder="Buscar por título ou tópico..." style={{ ...INPUT, marginBottom: 10 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {materiaisFiltrados.map(m => {
                    const naLista = jaNaSala.has(m.id);
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: naLista ? "rgba(10,124,75,0.15)" : "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px", border: naLista ? "1px solid rgba(10,124,75,0.4)" : "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{TIPO_EMOJI[m.tipo] ?? "📦"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.titulo}</p>
                          {m.topic && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0 }}>{m.topic}</p>}
                        </div>
                        {naLista ? (
                          <span style={{ fontSize: 11, color: "#4ece9a", fontWeight: 700, flexShrink: 0 }}>✓ Adicionado</span>
                        ) : (
                          <button onClick={() => vincularMaterialNaSala(m.id)}
                            style={{ fontSize: 11, fontWeight: 700, color: "#0ea5e9", background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", flexShrink: 0 }}>
                            + Adicionar
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {materiaisFiltrados.length === 0 && (
                    <p style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: 20 }}>Nenhum material encontrado</p>
                  )}
                </div>
              </div>
            )}

            {/* Upload / Link */}
            {tabMateriais === "upload" && (
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 8px" }}>Tipo de material</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 14 }}>
                  {[{ id: "pdf", label: "PDF", emoji: "📄" }, { id: "video", label: "Vídeo", emoji: "🎥" }, { id: "ppt", label: "PPT", emoji: "📊" }, { id: "link", label: "Link", emoji: "🔗" }].map(t => (
                    <button key={t.id} onClick={() => setUploadTipo(t.id)}
                      style={{ padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", background: uploadTipo === t.id ? "rgba(10,124,75,0.3)" : "rgba(255,255,255,0.05)", outline: uploadTipo === t.id ? "1.5px solid #0A7C4B" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 20 }}>{t.emoji}</span>
                      <span style={{ fontSize: 10, color: uploadTipo === t.id ? "#4ece9a" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>{t.label}</span>
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Título *</p>
                <input value={uploadTitulo} onChange={e => setUploadTitulo(e.target.value)}
                  placeholder="Ex: Resumo de Funções Orgânicas" style={{ ...INPUT, marginBottom: 12 }} />

                {uploadTipo === "link" ? (
                  <>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>URL *</p>
                    <input value={uploadLink} onChange={e => setUploadLink(e.target.value)}
                      placeholder="https://..." style={{ ...INPUT, marginBottom: 16 }} />
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Arquivo *</p>
                    <input ref={fileInputRef} type="file"
                      accept={uploadTipo === "pdf" ? ".pdf" : uploadTipo === "ppt" ? ".ppt,.pptx" : "video/*"}
                      onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                      style={{ ...INPUT, marginBottom: 16, paddingTop: 8 }} />
                  </>
                )}

                <button onClick={fazerUpload}
                  disabled={enviandoUpload || !uploadTitulo || (uploadTipo === "link" ? !uploadLink : !uploadFile)}
                  style={{ width: "100%", padding: "13px 0", background: enviandoUpload || !uploadTitulo ? "rgba(255,255,255,0.08)" : "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  {enviandoUpload ? "Enviando..." : "⬆️ Enviar e adicionar à sala"}
                </button>
              </div>
            )}

            <button onClick={() => setModalMateriais(false)}
              style={{ width: "100%", marginTop: 12, padding: "12px 0", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Fechar
            </button>
          </div>
        </>
      )}

      {/* ── Modal Criar Simulado ── */}
      {modalSimulado && (
        <>
          <div onClick={() => setModalSimulado(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001, background: "#0f172a", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "92dvh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>📝 Novo Simulado</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Título do simulado *</p>
            <input placeholder="Ex: Simulado ENEM — Ciências da Natureza" value={formSimulado.titulo}
              onChange={e => setFormSimulado(f => ({ ...f, titulo: e.target.value }))} style={{ ...INPUT, marginBottom: 14 }} />
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Descrição (opcional)</p>
            <input placeholder="Instruções para os alunos..." value={formSimulado.descricao}
              onChange={e => setFormSimulado(f => ({ ...f, descricao: e.target.value }))} style={{ ...INPUT, marginBottom: 14 }} />
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>Sala virtual *</p>
            {salas.length === 0 ? (
              <div style={{ background: "rgba(245,158,11,0.1)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, border: "1px solid rgba(245,158,11,0.2)" }}>
                <p style={{ fontSize: 12, color: "#f59e0b", margin: 0 }}>⚠️ Crie uma sala virtual primeiro</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {salas.map(s => (
                  <button key={s.id} onClick={() => setFormSimulado(f => ({ ...f, sala_virtual_id: s.id }))}
                    style={{ padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", background: formSimulado.sala_virtual_id === s.id ? "rgba(10,124,75,0.2)" : "rgba(255,255,255,0.05)", outline: formSimulado.sala_virtual_id === s.id ? "1.5px solid #0A7C4B" : "none" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{s.nome}</p>
                    <p style={{ fontSize: 11, color: "#0ea5e9", margin: 0 }}>{s.codigo}</p>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "0 0 4px" }}>Data de liberação</p>
                <input type="date" value={formSimulado.data_liberacao} onChange={e => setFormSimulado(f => ({ ...f, data_liberacao: e.target.value }))} style={{ ...INPUT, colorScheme: "dark" }} />
              </div>
              <div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "0 0 4px" }}>Hora</p>
                <input type="time" value={formSimulado.hora_liberacao} onChange={e => setFormSimulado(f => ({ ...f, hora_liberacao: e.target.value }))} style={{ ...INPUT, colorScheme: "dark" }} />
              </div>
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>⏱ Tempo limite (min)</p>
            <input type="number" placeholder="Sem limite" value={formSimulado.tempo_limite_min} onChange={e => setFormSimulado(f => ({ ...f, tempo_limite_min: e.target.value }))} style={{ ...INPUT, marginBottom: 20 }} />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>📚 Questões</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} style={{ ...INPUT, flex: 1 }}>
                  <option value="todas">Todas as áreas</option>
                  <option value="ciencias_natureza">Ciências da Natureza</option>
                  <option value="ciencias_humanas">Ciências Humanas</option>
                  <option value="linguagens">Linguagens</option>
                  <option value="matematica">Matemática</option>
                </select>
                <button onClick={buscarQuestoes} disabled={buscandoQuestoes} style={{ padding: "10px 16px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {buscandoQuestoes ? "..." : "🔍 Buscar"}
                </button>
              </div>
              {questoesSelecionadas.size > 0 && (
                <div style={{ background: "rgba(10,124,75,0.15)", borderRadius: 10, padding: "8px 14px", marginBottom: 10, border: "1px solid rgba(10,124,75,0.3)" }}>
                  <p style={{ fontSize: 12, color: "#4ece9a", fontWeight: 700, margin: 0 }}>✅ {questoesSelecionadas.size} questão(ões) selecionada(s)</p>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                {questoesImportadas.map(q => {
                  const sel = questoesSelecionadas.has(q.id);
                  return (
                    <button key={q.id} onClick={() => { setQuestoesSelecionadas(prev => { const s = new Set(prev); sel ? s.delete(q.id) : s.add(q.id); return s; }); }}
                      style={{ padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", background: sel ? "rgba(10,124,75,0.2)" : "rgba(255,255,255,0.04)", outline: sel ? "1.5px solid #0A7C4B" : "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: sel ? "#0A7C4B" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          {sel && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, color: sel ? "#fff" : "rgba(255,255,255,0.7)", margin: "0 0 4px", lineHeight: 1.5 }}>{q.question.slice(0, 100)}{q.question.length > 100 ? "..." : ""}</p>
                          {q.area && <span style={{ fontSize: 10, color: AREA_COR[q.area] ?? "#64748b", background: `${AREA_COR[q.area] ?? "#64748b"}22`, borderRadius: 99, padding: "2px 8px" }}>{q.area.replace("_", " ")}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {questoesImportadas.length === 0 && <p style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: 16 }}>Clique em "Buscar" para carregar questões</p>}
              </div>
            </div>
            <button onClick={criarSimulado} disabled={salvandoSimulado || !formSimulado.titulo || !formSimulado.sala_virtual_id || questoesSelecionadas.size === 0}
              style={{ width: "100%", padding: "14px 0", background: (!formSimulado.titulo || !formSimulado.sala_virtual_id || questoesSelecionadas.size === 0) ? "rgba(255,255,255,0.08)" : "linear-gradient(90deg,#065C37,#0A7C4B)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
              {salvandoSimulado ? "Salvando..." : `✅ Criar simulado${questoesSelecionadas.size > 0 ? ` (${questoesSelecionadas.size} questões)` : ""}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
