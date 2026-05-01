// src/pages/redacao/Redacao.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

interface Tema {
  id: string;
  ano: number;
  titulo: string;
  tipo: string;
  repertorio: string[];
  dicas: string[];
  estrutura: string[];
}

interface Competencia {
  id: string;
  nome: string;
  descricao: string;
  nota: number;
  feedback: string;
}

interface Correcao {
  notaTotal: number;
  competencias: Competencia[];
  pontosFortres: string[];
  pontosAMelhorar: string[];
  conclusao: string;
}

const TEMAS: Tema[] = [
  {
    id: "t1",
    ano: 2023,
    titulo: "Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil",
    tipo: "Problema social",
    repertorio: [
      "Simone de Beauvoir: 'O Segundo Sexo' — a construção social do feminino",
      "OIT: mulheres realizam 75% do trabalho de cuidado não remunerado no mundo",
      "CF/88: Art. 5° — igualdade entre homens e mulheres",
      "Betty Friedan: 'A Mística Feminina' — crítica ao papel doméstico feminino",
      "IBGE: mulheres dedicam 21,4h semanais ao trabalho doméstico vs 11h dos homens",
    ],
    dicas: [
      "Mostre que o trabalho de cuidado (filhos, idosos, doentes) é invisível economicamente",
      "Cite a dupla jornada feminina como obstáculo à igualdade",
      "Proponha políticas públicas concretas: licença parental igualitária, creches públicas",
      "Conecte a invisibilidade ao mercado de trabalho e à desigualdade salarial",
    ],
    estrutura: [
      "Introdução: contextualizar o trabalho de cuidado e sua invisibilidade",
      "Desenvolvimento 1: causas históricas e culturais da divisão desigual",
      "Desenvolvimento 2: impactos na vida profissional e econômica da mulher",
      "Conclusão: proposta de intervenção com agente, ação, meio e finalidade",
    ],
  },
  {
    id: "t2",
    ano: 2022,
    titulo: "Desafios para a valorização de comunidades e povos tradicionais no Brasil",
    tipo: "Diversidade cultural",
    repertorio: [
      "CF/88: Art. 231 — direitos dos povos indígenas às suas terras e culturas",
      "Convenção 169 da OIT: direitos dos povos tradicionais",
      "Ailton Krenak: 'Ideias para adiar o fim do mundo' — perspectiva indígena",
      "IBGE 2022: 1,7 milhão de indígenas no Brasil, 305 etnias, 274 línguas",
      "Quilombolas: mais de 6.000 comunidades reconhecidas no país",
    ],
    dicas: [
      "Diferencie povos tradicionais: indígenas, quilombolas, ribeirinhos, caiçaras",
      "Aborde a ameaça ao modo de vida pela modernização e agronegócio",
      "Cite a demarcação de terras como instrumento de proteção",
      "Proponha educação intercultural e políticas de reconhecimento",
    ],
    estrutura: [
      "Introdução: definir povos tradicionais e apresentar o problema",
      "Desenvolvimento 1: ameaças à existência e cultura dessas comunidades",
      "Desenvolvimento 2: consequências da invisibilidade e marginalização",
      "Conclusão: proposta com agente, ação, meio e finalidade específicos",
    ],
  },
  {
    id: "t3",
    ano: 2021,
    titulo: "Invisibilidade e registro civil: entre o acesso a direitos e a marginalização social",
    tipo: "Direitos e cidadania",
    repertorio: [
      "CF/88: Art. 5°, XXXVI — inviolabilidade dos direitos fundamentais",
      "Lei 9.534/97: gratuidade do registro civil de nascimento",
      "Hannah Arendt: 'direito a ter direitos' — a cidadania como fundamento",
      "IBGE: 3 milhões de brasileiros sem registro civil em 2020",
      "ONU: registro civil é direito humano fundamental (Declaração Universal)",
    ],
    dicas: [
      "Explique que sem registro a pessoa não existe para o Estado",
      "Cite a dificuldade de acesso a saúde, educação, emprego formal",
      "Aborde populações vulneráveis: indígenas, ribeirinhos, moradores de rua",
      "Proponha campanhas de registro itinerante e conscientização",
    ],
    estrutura: [
      "Introdução: paradoxo — existir sem existir para o Estado",
      "Desenvolvimento 1: causas da falta de registro (distância, desinformação)",
      "Desenvolvimento 2: consequências para o exercício da cidadania",
      "Conclusão: proposta articulada com agentes e ações específicas",
    ],
  },
  {
    id: "t4",
    ano: 2020,
    titulo: "O estigma associado às doenças mentais na sociedade brasileira",
    tipo: "Saúde mental",
    repertorio: [
      "OMS: depressão afeta 280 milhões de pessoas; principal causa de incapacidade",
      "Lei 10.216/01 (Lei Paulo Delgado): reforma psiquiátrica brasileira",
      "Foucault: 'História da Loucura' — construção social da doença mental",
      "CAPS: Centros de Atenção Psicossocial como alternativa ao internamento",
      "IBGE: 12 milhões de brasileiros têm depressão; apenas 3% recebem tratamento",
    ],
    dicas: [
      "Diferencie estigma social de preconceito individual",
      "Cite o impacto do estigma na busca por tratamento",
      "Aborde a influência da mídia na representação das doenças mentais",
      "Proponha educação em saúde mental nas escolas e campanhas nacionais",
    ],
    estrutura: [
      "Introdução: definir estigma e contextualizar no Brasil",
      "Desenvolvimento 1: origem histórica do preconceito com saúde mental",
      "Desenvolvimento 2: consequências do estigma para os pacientes",
      "Conclusão: intervenção do Estado, escola e mídia para reduzir o estigma",
    ],
  },
  {
    id: "t5",
    ano: 2019,
    titulo: "Democratização do acesso ao cinema no Brasil",
    tipo: "Cultura e arte",
    repertorio: [
      "CF/88: Art. 215 — o Estado garantirá o pleno exercício dos direitos culturais",
      "Lei do Audiovisual (8.685/93): incentivo à produção cinematográfica nacional",
      "IBGE: 46% dos brasileiros nunca foram ao cinema",
      "Ancine: concentração de salas nas regiões Sul e Sudeste",
      "Walter Benjamin: 'A obra de arte na era de sua reprodutibilidade técnica'",
    ],
    dicas: [
      "Mostre a concentração geográfica e econômica do acesso ao cinema",
      "Cite o cinema como instrumento de formação cultural e identidade",
      "Aborde barreiras: preço dos ingressos, ausência de salas no interior",
      "Proponha cineclubes, cinema itinerante, streaming público gratuito",
    ],
    estrutura: [
      "Introdução: cinema como direito cultural e o problema do acesso desigual",
      "Desenvolvimento 1: barreiras econômicas e geográficas",
      "Desenvolvimento 2: impacto da exclusão cultural na identidade nacional",
      "Conclusão: papel do Estado, iniciativa privada e tecnologia na democratização",
    ],
  },
  {
    id: "t6",
    ano: 2018,
    titulo: "Manipulação do comportamento do usuário pelo controle de dados na internet",
    tipo: "Tecnologia e sociedade",
    repertorio: [
      "LGPD (Lei 13.709/18): proteção de dados pessoais no Brasil",
      "Byung-Chul Han: 'Psicopolítica' — controle por dados e algoritmos",
      "Cambridge Analytica: escândalo de uso indevido de dados do Facebook",
      "Shoshana Zuboff: 'Capitalismo de Vigilância'",
      "GDPR europeu como modelo de regulação de dados",
    ],
    dicas: [
      "Explique como algoritmos criam bolhas de informação e manipulam escolhas",
      "Cite o caso Cambridge Analytica como exemplo concreto",
      "Aborde a relação entre dados pessoais e publicidade direcionada",
      "Proponha regulação, educação digital e maior transparência das plataformas",
    ],
    estrutura: [
      "Introdução: paradoxo da internet — liberdade e vigilância",
      "Desenvolvimento 1: como os dados são coletados e usados para manipulação",
      "Desenvolvimento 2: consequências para a democracia e autonomia individual",
      "Conclusão: proposta de regulação estatal e educação para a mídia",
    ],
  },
];


async function corrigirRedacao(tema: Tema, texto: string): Promise<Correcao> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `Você é um corretor especializado em redações do ENEM. Corrija a redação seguindo rigorosamente os 5 critérios de avaliação do ENEM (0-200 pontos cada):

C1: Domínio da norma culta (gramática, ortografia, pontuação)
C2: Compreensão da proposta e uso de conceitos das ciências humanas
C3: Seleção e organização das informações e argumentos
C4: Coesão e coerência, uso de conectivos e progressão textual
C5: Proposta de intervenção detalhada (agente, ação, meio, finalidade, detalhamento)

Responda APENAS em JSON válido, sem markdown, sem texto adicional:
{
  "notaTotal": 0,
  "competencias": [
    {"id": "c1", "nome": "Competência 1", "descricao": "...", "nota": 0, "feedback": "..."},
    {"id": "c2", "nome": "Competência 2", "descricao": "...", "nota": 0, "feedback": "..."},
    {"id": "c3", "nome": "Competência 3", "descricao": "...", "nota": 0, "feedback": "..."},
    {"id": "c4", "nome": "Competência 4", "descricao": "...", "nota": 0, "feedback": "..."},
    {"id": "c5", "nome": "Competência 5", "descricao": "...", "nota": 0, "feedback": "..."}
  ],
  "pontosFortres": ["..."],
  "pontosAMelhorar": ["..."],
  "conclusao": "..."
}`,
      messages: [{
        role: "user",
        content: `Tema: ${tema.titulo}\n\nRedação:\n${texto}`,
      }],
    }),
  });

  if (!response.ok) throw new Error("Erro ao corrigir redação");
  const data = await response.json();
  const texto_resposta = data.content?.[0]?.text ?? "{}";
  return JSON.parse(texto_resposta.replace(/```json|```/g, "").trim());
}

export default function Redacao() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<"temas" | "dicas" | "editor" | "correcao">("temas");
  const [temaSelecionado, setTemaSelecionado] = useState<Tema | null>(null);
  const [texto, setTexto] = useState("");
  const [correcao, setCorrecao] = useState<Correcao | null>(null);
  const [corrigindo, setCorrigindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
  const linhas = texto.split("\n").filter(l => l.trim()).length;

  async function handleCorrigir() {
    if (!temaSelecionado || texto.trim().length < 100) {
      setErro("Escreva pelo menos 100 caracteres antes de corrigir.");
      return;
    }
    setCorrigindo(true);
    setErro(null);
    try {
      const resultado = await corrigirRedacao(temaSelecionado, texto);
      setCorrecao(resultado);
      setEtapa("correcao");
    } catch {
      setErro("Erro ao corrigir. Verifique sua conexão e tente novamente.");
    } finally {
      setCorrigindo(false);
    }
  }

  const notaCor = (nota: number) =>
    nota >= 160 ? CORES.success : nota >= 120 ? "#f59e0b" : nota >= 80 ? "#f97316" : CORES.error;

  const notaLabel = (total: number) =>
    total >= 800 ? "Excelente! 🏆" : total >= 600 ? "Bom! 👍" : total >= 400 ? "Regular 📚" : "Precisa melhorar 💪";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: CORES.bg }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #6D28D9, #4C1D95)", padding: "12px 16px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => {
              if (etapa === "temas") navigate(-1);
              else if (etapa === "dicas") setEtapa("temas");
              else if (etapa === "editor") setEtapa("dicas");
              else setEtapa("editor");
            }}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>✏️ Redação ENEM</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>
              {etapa === "temas" ? "Escolha um tema" : etapa === "dicas" ? "Repertório e dicas" : etapa === "editor" ? "Escreva sua redação" : "Resultado da correção"}
            </p>
          </div>
          {/* Steps */}
          <div style={{ display: "flex", gap: 4 }}>
            {["temas", "dicas", "editor", "correcao"].map((e, _i) => (
              <div key={e} style={{ width: 8, height: 8, borderRadius: "50%", background: etapa === e ? "#fff" : "rgba(255,255,255,0.3)", transition: "all 0.2s" }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 90px" }}>

        {/* ── ETAPA 1: BANCO DE TEMAS ── */}
        {etapa === "temas" && (
          <div>
            <p style={{ fontSize: 13, color: CORES.textSub, margin: "0 0 16px", lineHeight: 1.5 }}>
              Escolha um tema real do ENEM para praticar. Você receberá dicas, repertório e correção por IA com nota por competência.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {TEMAS.map(tema => (
                <button
                  key={tema.id}
                  onClick={() => { setTemaSelecionado(tema); setTexto(""); setCorrecao(null); setEtapa("dicas"); }}
                  style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 14, background: CORES.bgCard, border: `1px solid ${CORES.border}`, cursor: "pointer", textAlign: "left", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#F3F0FF", color: "#6D28D9", borderRadius: 6, padding: "2px 8px" }}>ENEM {tema.ano}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: CORES.text, margin: "4px 0 4px", lineHeight: 1.4 }}>{tema.titulo}</p>
                    <span style={{ fontSize: 11, color: "#6D28D9", background: "#F3F0FF", borderRadius: 4, padding: "1px 6px" }}>{tema.tipo}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={CORES.textSub} strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 4 }}><path d="M6 4l4 4-4 4"/></svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ETAPA 2: DICAS E REPERTÓRIO ── */}
        {etapa === "dicas" && temaSelecionado && (
          <div>
            <div style={{ background: "linear-gradient(135deg, #F3F0FF, #EDE9FE)", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid #C4B5FD" }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: "#6D28D9", color: "#fff", borderRadius: 6, padding: "2px 8px", display: "inline-block", marginBottom: 8 }}>ENEM {temaSelecionado.ano}</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#4C1D95", margin: 0, lineHeight: 1.4 }}>{temaSelecionado.titulo}</p>
            </div>

            {/* Estrutura sugerida */}
            <div style={{ background: CORES.bgCard, borderRadius: 12, padding: 14, marginBottom: 12, border: `1px solid ${CORES.border}` }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#6D28D9", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>📋 Estrutura sugerida</p>
              {temaSelecionado.estrutura.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#6D28D9", flexShrink: 0 }}>{i + 1}</div>
                  <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.5, flex: 1 }}>{item}</p>
                </div>
              ))}
            </div>

            {/* Repertório */}
            <div style={{ background: CORES.bgCard, borderRadius: 12, padding: 14, marginBottom: 12, border: `1px solid ${CORES.border}` }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0057FF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>📚 Repertório sociocultural</p>
              {temaSelecionado.repertorio.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: "#0057FF", fontSize: 14, flexShrink: 0, marginTop: 1 }}>▸</span>
                  <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.5 }}>{item}</p>
                </div>
              ))}
            </div>

            {/* Dicas */}
            <div style={{ background: CORES.bgCard, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${CORES.border}` }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: CORES.success, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>💡 Dicas importantes</p>
              {temaSelecionado.dicas.map((dica, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: CORES.success, fontSize: 14, flexShrink: 0 }}>✓</span>
                  <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.5 }}>{dica}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setEtapa("editor")}
              style={{ width: "100%", padding: "13px 0", background: "linear-gradient(135deg, #6D28D9, #4C1D95)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(109,40,217,0.4)" }}
            >
              Escrever redação →
            </button>
          </div>
        )}

        {/* ── ETAPA 3: EDITOR ── */}
        {etapa === "editor" && temaSelecionado && (
          <div>
            <div style={{ background: "#F3F0FF", borderRadius: 10, padding: "10px 14px", marginBottom: 14, border: "1px solid #C4B5FD" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#4C1D95", margin: 0, lineHeight: 1.4 }}>{temaSelecionado.titulo}</p>
            </div>

            {/* Competências resumo */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
              {["C1: Norma culta", "C2: Proposta", "C3: Argumentos", "C4: Coesão", "C5: Intervenção"].map((c, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, background: "#F3F0FF", color: "#6D28D9", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>{c}</span>
              ))}
            </div>

            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Escreva sua redação aqui...

Lembre-se:
• Introdução: apresente o tema e tese
• 2 parágrafos de desenvolvimento com argumentos
• Conclusão: proposta de intervenção detalhada

Mínimo recomendado: 20-30 linhas"
              style={{
                width: "100%", minHeight: 400, padding: "14px", borderRadius: 12,
                border: `1.5px solid ${CORES.border}`, fontSize: 14, outline: "none",
                resize: "vertical", lineHeight: 1.8, fontFamily: "Georgia, serif",
                boxSizing: "border-box", background: CORES.bgCard, color: CORES.text,
              }}
            />

            {/* Contador */}
            <div style={{ display: "flex", gap: 12, marginTop: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: CORES.textSub }}>📝 {palavras} palavras</span>
              <span style={{ fontSize: 12, color: CORES.textSub }}>📄 ~{linhas} linhas</span>
              <span style={{ fontSize: 12, color: palavras < 150 ? CORES.error : palavras > 300 ? CORES.warning : CORES.success, fontWeight: 600 }}>
                {palavras < 150 ? "⚠️ Muito curta" : palavras > 300 ? "⚠️ Muito longa" : "✓ Tamanho ideal"}
              </span>
            </div>

            {erro && (
              <div style={{ background: "#FFF1F1", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: CORES.error }}>
                {erro}
              </div>
            )}

            <button
              onClick={handleCorrigir}
              disabled={corrigindo || texto.trim().length < 100}
              style={{
                width: "100%", padding: "13px 0",
                background: corrigindo || texto.trim().length < 100 ? "#ccc" : "linear-gradient(135deg, #6D28D9, #4C1D95)",
                color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
                cursor: corrigindo || texto.trim().length < 100 ? "not-allowed" : "pointer",
                boxShadow: corrigindo ? "none" : "0 4px 16px rgba(109,40,217,0.4)",
              }}
            >
              {corrigindo ? "🤖 Corrigindo sua redação..." : "🎯 Corrigir com IA →"}
            </button>

            {corrigindo && (
              <p style={{ fontSize: 12, color: CORES.textSub, textAlign: "center", marginTop: 8 }}>
                A IA está analisando sua redação... isso pode levar até 30 segundos.
              </p>
            )}
          </div>
        )}

        {/* ── ETAPA 4: CORREÇÃO ── */}
        {etapa === "correcao" && correcao && (
          <div>
            {/* Nota total */}
            <div style={{
              background: `linear-gradient(135deg, ${notaCor(correcao.notaTotal)}15, ${notaCor(correcao.notaTotal)}25)`,
              border: `2px solid ${notaCor(correcao.notaTotal)}`,
              borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center",
            }}>
              <p style={{ fontSize: 48, fontWeight: 800, color: notaCor(correcao.notaTotal), margin: "0 0 4px" }}>
                {correcao.notaTotal}
              </p>
              <p style={{ fontSize: 14, color: CORES.textSub, margin: "0 0 4px" }}>de 1000 pontos</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: notaCor(correcao.notaTotal), margin: 0 }}>
                {notaLabel(correcao.notaTotal)}
              </p>
              {/* Barra de nota */}
              <div style={{ height: 8, background: "rgba(0,0,0,0.1)", borderRadius: 99, margin: "12px 0 0", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(correcao.notaTotal / 1000) * 100}%`, background: notaCor(correcao.notaTotal), borderRadius: 99, transition: "width 0.8s" }} />
              </div>
            </div>

            {/* Por competência */}
            <p style={{ fontSize: 12, fontWeight: 700, color: CORES.textSub, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>Nota por competência</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {correcao.competencias.map(c => (
                <div key={c.id} style={{ background: CORES.bgCard, borderRadius: 12, padding: "12px 14px", border: `1px solid ${CORES.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: CORES.text, margin: "0 0 1px" }}>{c.nome}</p>
                      <p style={{ fontSize: 11, color: CORES.textSub, margin: 0 }}>{c.descricao}</p>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: notaCor(c.nota), marginLeft: 12, flexShrink: 0 }}>{c.nota}</span>
                  </div>
                  <div style={{ height: 5, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", width: `${(c.nota / 200) * 100}%`, background: notaCor(c.nota), borderRadius: 99 }} />
                  </div>
                  <p style={{ fontSize: 12, color: CORES.textSub, margin: 0, lineHeight: 1.5 }}>{c.feedback}</p>
                </div>
              ))}
            </div>

            {/* Pontos fortes */}
            {correcao.pontosFortres?.length > 0 && (
              <div style={{ background: "#EDFAF3", borderRadius: 12, padding: 14, marginBottom: 12, border: "1px solid #6EE7B7" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: CORES.success, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>✅ Pontos fortes</p>
                {correcao.pontosFortres.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: CORES.success, flexShrink: 0 }}>▸</span>
                    <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.5 }}>{p}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pontos a melhorar */}
            {correcao.pontosAMelhorar?.length > 0 && (
              <div style={{ background: "#FFF8E6", borderRadius: 12, padding: 14, marginBottom: 12, border: "1px solid #FCD34D" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>📌 O que melhorar</p>
                {correcao.pontosAMelhorar.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: "#B45309", flexShrink: 0 }}>▸</span>
                    <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.5 }}>{p}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Conclusão */}
            {correcao.conclusao && (
              <div style={{ background: "#F3F0FF", borderRadius: 12, padding: 14, marginBottom: 16, border: "1px solid #C4B5FD" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#6D28D9", margin: "0 0 6px" }}>🤖 Parecer geral</p>
                <p style={{ fontSize: 12, color: CORES.text, margin: 0, lineHeight: 1.6 }}>{correcao.conclusao}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setEtapa("editor"); setCorrecao(null); }} style={{ flex: 1, padding: "12px 0", background: CORES.bgCard, color: CORES.text, border: `1px solid ${CORES.border}`, borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                ✏️ Reescrever
              </button>
              <button onClick={() => { setEtapa("temas"); setTemaSelecionado(null); setTexto(""); setCorrecao(null); }} style={{ flex: 1, padding: "12px 0", background: "linear-gradient(135deg, #6D28D9, #4C1D95)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Novo tema →
              </button>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
