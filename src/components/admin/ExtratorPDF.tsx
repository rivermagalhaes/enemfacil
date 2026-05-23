// src/components/admin/ExtratorPDF.tsx
// Extrai questões de PDFs via IA, permite revisão e salva no banco (questions + question_options)

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface QuestaoExtraida {
  question: string;
  options: string[];
  answer_index: number | null;
  explanation: string;
  topic: string;
  area: string;
  difficulty: string;
  vestibular: string;
  ano: number | null;
  // controle local
  _id: string;
  _selecionada: boolean;
  _salva: boolean;
  _erro: string | null;
}

interface SimuladoOpcao {
  id: string;
  titulo?: string;
  area_enem?: string;
}

const AREAS = [
  { value: "ciencias_natureza",  label: "Ciências da Natureza" },
  { value: "ciencias_humanas",   label: "Ciências Humanas" },
  { value: "linguagens",         label: "Linguagens" },
  { value: "matematica",         label: "Matemática" },
];

const DIFICULDADES = [
  { value: "facil",   label: "Fácil",   cor: "#22c55e" },
  { value: "medio",   label: "Médio",   cor: "#f59e0b" },
  { value: "dificil", label: "Difícil", cor: "#ef4444" },
];

const VESTIBULARES = ["ENEM","FUVEST","UNICAMP","ITA","IME","UNB","CEFET","PRÓPRIO"];

const C = {
  bg:      "#F4F6FB",
  card:    "#FFFFFF",
  primary: "#0057FF",
  text:    "#1a1a2e",
  sub:     "#64748B",
  border:  "#E2E8F0",
  ok:      "#22c55e",
  erro:    "#ef4444",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = () => rej(new Error("Falha ao ler arquivo"));
    r.readAsDataURL(file);
  });
}

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export default function ExtratorPDF() {
  const pdfRef = useRef<HTMLInputElement>(null);

  const [etapa, setEtapa] = useState<"upload" | "revisao" | "concluido">("upload");
  const [extraindo, setExtraindo] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [questoes, setQuestoes] = useState<QuestaoExtraida[]>([]);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [destino, setDestino] = useState<"questions" | "questoes_simulado">("questions");
  const [simulados, setSimulados] = useState<SimuladoOpcao[]>([]);
  const [simuladoId, setSimuladoId] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");

  const MSGS = [
    "📄 Lendo estrutura do PDF...",
    "🔍 Identificando questões e alternativas...",
    "📊 Procurando gabarito...",
    "🧠 Classificando por área e dificuldade...",
    "✅ Finalizando extração...",
  ];

  // Carrega simulados quando destino mudar
  async function carregarSimulados() {
    const { data } = await supabase
      .from("mini_simulados")
      .select("id, area_enem")
      .eq("ativo", true)
      .order("area_enem");
    if (data) setSimulados(data);
  }

  async function extrairPDF(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const tiposAceitos = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!tiposAceitos.includes(file.type)) {
      setMsg({ tipo: "erro", texto: "Formatos aceitos: PDF, JPG, PNG, WEBP." });
      return;
    }
    const maxSize = file.type === "application/pdf" ? 20 : 10;
    if (file.size > maxSize * 1024 * 1024) {
      setMsg({ tipo: "erro", texto: `Arquivo muito grande. Máximo ${maxSize} MB.` });
      return;
    }

    setNomeArquivo(file.name);
    setExtraindo(true);
    setMsg(null);

    let idx = 0;
    setProgresso(MSGS[0]);
    const timer = setInterval(() => {
      idx = Math.min(idx + 1, MSGS.length - 1);
      setProgresso(MSGS[idx]);
    }, 2500);

    try {
      const base64Data = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extrair-questoes-pdf", {
        body: { base64Data, mimeType: file.type || 'application/pdf' },
      });

      if (error) throw new Error(error.message);
      if (!data?.questoes || !Array.isArray(data.questoes)) {
        throw new Error("Resposta inválida da extração.");
      }

      const formatadas: QuestaoExtraida[] = data.questoes.map((q: any) => ({
        question:     q.question     ?? "",
        options:      Array.isArray(q.options) ? q.options : ["", "", "", ""],
        answer_index: q.answer_index ?? null,
        explanation:  q.explanation  ?? "",
        topic:        q.topic        ?? "",
        area:         q.area         ?? "ciencias_natureza",
        difficulty:   q.difficulty   ?? "medio",
        vestibular:   q.vestibular   ?? "ENEM",
        ano:          q.ano          ?? null,
        _id:          uid(),
        _selecionada: true,
        _salva:       false,
        _erro:        null,
      }));

      setQuestoes(formatadas);
      setEtapa("revisao");
      // Pré-carrega simulados em background
      carregarSimulados();
    } catch (err: any) {
      setMsg({ tipo: "erro", texto: "Erro na extração: " + err.message });
    } finally {
      clearInterval(timer);
      setExtraindo(false);
      // limpa o input para permitir reuso
      if (pdfRef.current) pdfRef.current.value = "";
    }
  }

  function atualizarQuestao(id: string, campo: keyof QuestaoExtraida, valor: any) {
    setQuestoes(prev => prev.map(q => q._id === id ? { ...q, [campo]: valor } : q));
  }

  function atualizarOpcao(qId: string, idx: number, valor: string) {
    setQuestoes(prev => prev.map(q => {
      if (q._id !== qId) return q;
      const novas = [...q.options];
      novas[idx] = valor;
      return { ...q, options: novas };
    }));
  }

  function adicionarOpcao(qId: string) {
    setQuestoes(prev => prev.map(q =>
      q._id === qId && q.options.length < 5
        ? { ...q, options: [...q.options, ""] }
        : q
    ));
  }

  function removerOpcao(qId: string, idx: number) {
    setQuestoes(prev => prev.map(q => {
      if (q._id !== qId || q.options.length <= 2) return q;
      const novas = q.options.filter((_, i) => i !== idx);
      const novoIdx = q.answer_index !== null && q.answer_index >= novas.length
        ? novas.length - 1
        : q.answer_index;
      return { ...q, options: novas, answer_index: novoIdx };
    }));
  }

  function toggleSelecionada(id: string) {
    setQuestoes(prev => prev.map(q => q._id === id ? { ...q, _selecionada: !q._selecionada } : q));
  }

  function selecionarTodas(v: boolean) {
    setQuestoes(prev => prev.map(q => ({ ...q, _selecionada: v })));
  }

  function removerQuestao(id: string) {
    setQuestoes(prev => prev.filter(q => q._id !== id));
  }

  const selecionadas = questoes.filter(q => q._selecionada && !q._salva);
  const todasSelecionadas = selecionadas.length === questoes.filter(q => !q._salva).length && questoes.length > 0;

  async function salvarSelecionadas() {
    if (selecionadas.length === 0) {
      setMsg({ tipo: "erro", texto: "Selecione ao menos uma questão." });
      return;
    }
    if (destino === "questoes_simulado" && !simuladoId) {
      setMsg({ tipo: "erro", texto: "Selecione o simulado de destino." });
      return;
    }

    setSalvando(true);
    setMsg(null);
    let ok = 0, erros = 0;

    for (const q of selecionadas) {
      try {
        if (destino === "questions") {
          // Tabela questions + question_options
          const { data: inserted, error: qErr } = await supabase
            .from("questions")
            .insert({
              question:    q.question,
              explanation: q.explanation,
              answer_index: q.answer_index ?? 0,
              vestibular:  q.vestibular,
              topic:       q.topic || null,
              area:        q.area  || null,
              difficulty:  q.difficulty,
              ano:         q.ano   || null,
            })
            .select("id")
            .single();

          if (qErr || !inserted) throw new Error(qErr?.message ?? "Erro ao inserir questão");

          if (q.options.filter(Boolean).length >= 2) {
            await supabase.from("question_options").insert(
              q.options
                .filter(Boolean)
                .map((label, i) => ({ question_id: inserted.id, option_index: i, label }))
            );
          }
        } else {
          // Tabela questoes_simulado + alternativas_simulado
          const letras = ["A", "B", "C", "D", "E"];
          const { data: inserted, error: qErr } = await supabase
            .from("questoes_simulado")
            .insert({
              simulado_id:  simuladoId,
              enunciado:    q.question,
              explicacao:   q.explanation,
              assunto_tag:  q.topic    || null,
              area_enem:    q.area     || null,
              dificuldade:  q.difficulty,
              ativa:        true,
            })
            .select("id")
            .single();

          if (qErr || !inserted) throw new Error(qErr?.message ?? "Erro ao inserir questão");

          if (q.options.filter(Boolean).length >= 2) {
            await supabase.from("alternativas_simulado").insert(
              q.options
                .filter(Boolean)
                .map((texto, i) => ({
                  questao_id: inserted.id,
                  letra:      letras[i],
                  texto,
                  correta:    i === q.answer_index,
                  ordem:      i,
                }))
            );
          }
        }

        setQuestoes(prev =>
          prev.map(x => x._id === q._id ? { ...x, _salva: true, _selecionada: false, _erro: null } : x)
        );
        ok++;
      } catch (err: any) {
        setQuestoes(prev =>
          prev.map(x => x._id === q._id ? { ...x, _erro: err.message } : x)
        );
        erros++;
      }
    }

    setSalvando(false);
    setMsg({
      tipo: erros === 0 ? "ok" : "erro",
      texto: `${ok > 0 ? `✅ ${ok} questão(ões) salva(s)` : ""}${erros > 0 ? ` ⚠️ ${erros} com erro` : ""}`,
    });

    if (questoes.filter(q => !q._salva).length === 0) {
      setTimeout(() => setEtapa("concluido"), 800);
    }
  }

  // ── RENDER: UPLOAD ──────────────────────────────────────────────────────────
  if (etapa === "upload") {
    return (
      <div>
        <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>📄 Extrator de Questões via PDF</p>
          <p style={{ fontSize: 12, color: C.sub, margin: "0 0 20px", lineHeight: 1.6 }}>
            Envie uma prova em PDF. A IA extrai todas as questões, alternativas e gabarito automaticamente.
          </p>

          {/* Drop zone */}
          <div
            onClick={() => pdfRef.current?.click()}
            style={{
              border: `2px dashed ${C.border}`,
              borderRadius: 12,
              padding: "32px 20px",
              textAlign: "center",
              cursor: extraindo ? "wait" : "pointer",
              background: extraindo ? "#F8FAFC" : "#FAFBFF",
              transition: "all 0.2s",
            }}
          >
            {extraindo ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>Extraindo questões...</p>
                <p style={{ fontSize: 12, color: C.sub, margin: 0 }}>{progresso}</p>
                {/* Barra de progresso animada */}
                <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: "hidden", marginTop: 16, maxWidth: 280, margin: "16px auto 0" }}>
                  <div style={{
                    height: "100%",
                    background: `linear-gradient(90deg, ${C.primary}, #22c55e)`,
                    borderRadius: 99,
                    animation: "extrator-progress 2s ease-in-out infinite alternate",
                    width: "60%",
                  }} />
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>Clique para selecionar o PDF</p>
                <p style={{ fontSize: 12, color: C.sub, margin: 0 }}>Tamanho máximo: 20 MB · Provas, gabaritos, listas</p>
              </>
            )}
          </div>
          <input ref={pdfRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={extrairPDF} style={{ display: "none" }} />
        </div>

        {msg && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: msg.tipo === "ok" ? "#EDFAF3" : "#FFF1F1", border: `1px solid ${msg.tipo === "ok" ? C.ok : C.erro}`, color: msg.tipo === "ok" ? "#15803d" : "#b91c1c", fontSize: 13, fontWeight: 600 }}>
            {msg.texto}
          </div>
        )}

        {/* Dicas */}
        <div style={{ background: "#FFF8E6", borderRadius: 12, padding: "12px 14px", border: "1px solid #fcd34d", marginTop: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e", margin: "0 0 6px" }}>💡 Dicas para melhor extração</p>
          <p style={{ fontSize: 12, color: "#78350f", margin: 0, lineHeight: 1.7 }}>
            • PDFs com texto selecionável têm melhor precisão que PDFs escaneados<br />
            • Se a prova tiver gabarito no final, a IA irá identificá-lo automaticamente<br />
            • Provas do ENEM, FUVEST, ITA, IME e UNICAMP são reconhecidas automaticamente<br />
            • Revise e corrija antes de salvar — especialmente o gabarito
          </p>
        </div>

        <style>{`
          @keyframes extrator-progress {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    );
  }

  // ── RENDER: CONCLUÍDO ───────────────────────────────────────────────────────
  if (etapa === "concluido") {
    const salvas = questoes.filter(q => q._salva).length;
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>
          {salvas} questão(ões) importada(s)!
        </p>
        <p style={{ fontSize: 13, color: C.sub, margin: "0 0 24px" }}>
          Do arquivo <strong>{nomeArquivo}</strong>
        </p>
        <button
          onClick={() => { setEtapa("upload"); setQuestoes([]); setMsg(null); }}
          style={{ padding: "11px 24px", background: C.primary, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          📄 Extrair outro PDF
        </button>
      </div>
    );
  }

  // ── RENDER: REVISÃO ─────────────────────────────────────────────────────────
  const pendentes = questoes.filter(q => !q._salva);
  const jasSalvas = questoes.filter(q => q._salva).length;

  return (
    <div>
      {/* Cabeçalho de revisão */}
      <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>
              ✅ {questoes.length} questão(ões) extraída(s)
            </p>
            <p style={{ fontSize: 11, color: C.sub, margin: 0 }}>
              {nomeArquivo} · {selecionadas.length} selecionada(s)
              {jasSalvas > 0 && ` · ${jasSalvas} já salva(s)`}
            </p>
          </div>
          <button
            onClick={() => { setEtapa("upload"); setQuestoes([]); setMsg(null); }}
            style={{ padding: "6px 12px", background: "#F4F6FB", color: C.sub, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, cursor: "pointer" }}
          >
            ← Novo PDF
          </button>
        </div>

        {/* Destino */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", margin: "0 0 6px" }}>Salvar em</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { v: "questions",        label: "🧠 Banco Geral (questions)" },
              { v: "questoes_simulado", label: "📝 Simulado Específico" },
            ].map(op => (
              <button
                key={op.v}
                onClick={() => setDestino(op.v as any)}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 9, border: `1.5px solid ${destino === op.v ? C.primary : C.border}`,
                  background: destino === op.v ? "#E6EEFF" : C.card,
                  color: destino === op.v ? C.primary : C.sub,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Seletor de simulado */}
        {destino === "questoes_simulado" && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", margin: "0 0 6px" }}>Simulado de destino</p>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={simuladoId}
                onChange={e => setSimuladoId(e.target.value)}
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text }}
              >
                <option value="">Selecione um simulado...</option>
                {simulados.map(s => (
                  <option key={s.id} value={s.id}>{s.area_enem ?? s.id}</option>
                ))}
              </select>
              <input
                placeholder="ou cole o UUID"
                value={simuladoId}
                onChange={e => setSimuladoId(e.target.value)}
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.text }}
              />
            </div>
          </div>
        )}

        {/* Ações em lote */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => selecionarTodas(!todasSelecionadas)}
            style={{ padding: "7px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.sub, cursor: "pointer" }}
          >
            {todasSelecionadas ? "☑ Desmarcar tudo" : "☐ Selecionar tudo"}
          </button>
          <button
            onClick={salvarSelecionadas}
            disabled={salvando || selecionadas.length === 0}
            style={{
              flex: 1, padding: "9px 0",
              background: salvando || selecionadas.length === 0 ? "#e2e8f0" : C.primary,
              color: salvando || selecionadas.length === 0 ? C.sub : "#fff",
              border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: salvando || selecionadas.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {salvando ? "⏳ Salvando..." : `💾 Salvar ${selecionadas.length} selecionada(s)`}
          </button>
        </div>

        {msg && (
          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: msg.tipo === "ok" ? "#EDFAF3" : "#FFF1F1", border: `1px solid ${msg.tipo === "ok" ? C.ok : C.erro}`, color: msg.tipo === "ok" ? "#15803d" : "#b91c1c", fontSize: 12, fontWeight: 600 }}>
            {msg.texto}
          </div>
        )}
      </div>

      {/* Lista de questões */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {questoes.map((q, idx) => {
          const aberta = expandida === q._id;
          const dcfg = DIFICULDADES.find(d => d.value === q.difficulty) ?? DIFICULDADES[1];
          const letraCorreta = q.answer_index !== null ? ["A","B","C","D","E"][q.answer_index] : "?";

          return (
            <div
              key={q._id}
              style={{
                background: C.card,
                borderRadius: 12,
                border: `1.5px solid ${q._salva ? C.ok : q._erro ? C.erro : q._selecionada ? C.primary : C.border}`,
                overflow: "hidden",
                opacity: q._salva ? 0.65 : 1,
                transition: "border-color 0.2s",
              }}
            >
              {/* Linha de preview */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer" }}
                onClick={() => setExpandida(aberta ? null : q._id)}
              >
                {/* Checkbox */}
                {!q._salva && (
                  <div
                    onClick={e => { e.stopPropagation(); toggleSelecionada(q._id); }}
                    style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: q._selecionada ? C.primary : C.bg,
                      border: `2px solid ${q._selecionada ? C.primary : C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {q._selecionada && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                  </div>
                )}
                {q._salva && <span style={{ fontSize: 14 }}>✅</span>}

                {/* Número */}
                <span style={{ fontSize: 11, fontWeight: 700, color: C.sub, width: 20, flexShrink: 0 }}>
                  {idx + 1}
                </span>

                {/* Enunciado truncado */}
                <p style={{ flex: 1, fontSize: 12, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.question || <em style={{ color: C.sub }}>Sem enunciado</em>}
                </p>

                {/* Badges */}
                <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "#F1F5F9", color: C.sub, fontWeight: 600 }}>
                    {q.vestibular}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: `${dcfg.cor}18`, color: dcfg.cor, fontWeight: 600 }}>
                    {dcfg.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: q.answer_index !== null ? "#15803d" : "#ef4444" }}>
                    {letraCorreta}
                  </span>
                  <span style={{ fontSize: 14, color: C.sub, transform: aberta ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                </div>
              </div>

              {/* Painel de edição expandido */}
              {aberta && (
                <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}` }}>
                  {q._erro && (
                    <div style={{ margin: "10px 0", padding: "6px 10px", background: "#FFF1F1", borderRadius: 6, color: "#b91c1c", fontSize: 11 }}>
                      ⚠️ {q._erro}
                    </div>
                  )}

                  {/* Enunciado */}
                  <div style={{ marginTop: 12 }}>
                    <p style={sLabel}>Enunciado</p>
                    <textarea
                      rows={3}
                      style={sTextarea}
                      value={q.question}
                      onChange={e => atualizarQuestao(q._id, "question", e.target.value)}
                    />
                  </div>

                  {/* Alternativas */}
                  <div style={{ marginTop: 10 }}>
                    <p style={sLabel}>Alternativas <span style={{ color: C.sub, fontWeight: 400 }}>(clique na letra para marcar como correta)</span></p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {q.options.map((opt, i) => {
                        const letra = ["A","B","C","D","E"][i];
                        const isCorreta = q.answer_index === i;
                        return (
                          <div key={i} style={{ display: "flex", gap: 7, alignItems: "center" }}>
                            <button
                              onClick={() => atualizarQuestao(q._id, "answer_index", i)}
                              style={{
                                width: 26, height: 26, borderRadius: "50%", border: "none", flexShrink: 0,
                                background: isCorreta ? C.ok : "#F1F5F9",
                                color: isCorreta ? "#fff" : C.sub,
                                fontSize: 11, fontWeight: 700, cursor: "pointer",
                              }}
                            >
                              {letra}
                            </button>
                            <input
                              value={opt}
                              onChange={e => atualizarOpcao(q._id, i, e.target.value)}
                              style={{ ...sInput, flex: 1, borderColor: isCorreta ? C.ok : C.border }}
                            />
                            <button
                              onClick={() => removerOpcao(q._id, i)}
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, padding: "0 4px" }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                      {q.options.length < 5 && (
                        <button
                          onClick={() => adicionarOpcao(q._id)}
                          style={{ padding: "6px 0", background: "#F8FAFC", border: `1px dashed ${C.border}`, borderRadius: 7, fontSize: 12, color: C.sub, cursor: "pointer" }}
                        >
                          + Adicionar alternativa
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Explicação */}
                  <div style={{ marginTop: 10 }}>
                    <p style={sLabel}>Explicação / Justificativa</p>
                    <textarea
                      rows={2}
                      style={sTextarea}
                      value={q.explanation}
                      placeholder="Explicação da resposta correta..."
                      onChange={e => atualizarQuestao(q._id, "explanation", e.target.value)}
                    />
                  </div>

                  {/* Metadados */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <div>
                      <p style={sLabel}>Área</p>
                      <select style={sSelect} value={q.area} onChange={e => atualizarQuestao(q._id, "area", e.target.value)}>
                        {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <p style={sLabel}>Dificuldade</p>
                      <select style={sSelect} value={q.difficulty} onChange={e => atualizarQuestao(q._id, "difficulty", e.target.value)}>
                        {DIFICULDADES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <p style={sLabel}>Vestibular</p>
                      <select style={sSelect} value={q.vestibular} onChange={e => atualizarQuestao(q._id, "vestibular", e.target.value)}>
                        {VESTIBULARES.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <p style={sLabel}>Ano</p>
                      <input
                        type="number"
                        style={sInput}
                        value={q.ano ?? ""}
                        placeholder="ex: 2024"
                        onChange={e => atualizarQuestao(q._id, "ano", e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <p style={sLabel}>Tópico</p>
                      <input
                        style={sInput}
                        value={q.topic}
                        placeholder="ex: Termoquímica"
                        onChange={e => atualizarQuestao(q._id, "topic", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Ações da questão */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => removerQuestao(q._id)}
                      style={{ padding: "6px 14px", background: "#FFF1F1", color: C.erro, border: `1px solid ${C.erro}30`, borderRadius: 8, fontSize: 12, cursor: "pointer" }}
                    >
                      🗑 Remover
                    </button>
                    <button
                      onClick={() => setExpandida(null)}
                      style={{ padding: "6px 14px", background: C.bg, color: C.sub, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, cursor: "pointer" }}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão salvar fixo no rodapé se houver muitas questões */}
      {pendentes.length > 5 && (
        <div style={{ position: "sticky", bottom: 16, marginTop: 16 }}>
          <button
            onClick={salvarSelecionadas}
            disabled={salvando || selecionadas.length === 0}
            style={{
              width: "100%", padding: "13px 0",
              background: salvando || selecionadas.length === 0 ? "#e2e8f0" : C.primary,
              color: salvando || selecionadas.length === 0 ? C.sub : "#fff",
              border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: salvando || selecionadas.length === 0 ? "not-allowed" : "pointer",
              boxShadow: "0 4px 20px rgba(0,87,255,0.25)",
            }}
          >
            {salvando ? "⏳ Salvando..." : `💾 Salvar ${selecionadas.length} questão(ões)`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ESTILOS LOCAIS ───────────────────────────────────────────────────────────
const sLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#64748B",
  textTransform: "uppercase", letterSpacing: "0.05em",
  margin: "0 0 4px",
};

const sTextarea: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  border: "1px solid #E2E8F0", borderRadius: 7,
  fontSize: 12, color: "#1a1a2e", lineHeight: 1.6,
  fontFamily: "inherit", resize: "vertical",
  outline: "none", boxSizing: "border-box",
};

const sInput: React.CSSProperties = {
  width: "100%", padding: "7px 10px",
  border: "1px solid #E2E8F0", borderRadius: 7,
  fontSize: 12, color: "#1a1a2e",
  fontFamily: "inherit", outline: "none",
  boxSizing: "border-box",
};

const sSelect: React.CSSProperties = {
  width: "100%", padding: "7px 10px",
  border: "1px solid #E2E8F0", borderRadius: 7,
  fontSize: 12, color: "#1a1a2e",
  background: "#fff", outline: "none",
  boxSizing: "border-box",
};
