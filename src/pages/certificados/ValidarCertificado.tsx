// src/pages/certificados/ValidarCertificado.tsx
// Página pública — acessível sem login via QR Code

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

interface DadosCert {
  valido: boolean;
  codigo?: string;
  nome_aluno?: string;
  evento?: string;
  edicao?: string;
  ano?: number;
  disciplina?: string;
  tipo?: string;
  medalha?: string;
  nota?: number;
  percentual?: number;
  carga_horaria?: number;
  emitido_em?: string;
  mensagem?: string;
}

const MEDALHA_LABEL: Record<string, string> = {
  ouro: "🥇 Medalha de Ouro",
  prata: "🥈 Medalha de Prata",
  bronze: "🥉 Medalha de Bronze",
};

export default function ValidarCertificado() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const [dados, setDados] = useState<DadosCert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (codigo) validar();
  }, [codigo]);

  async function validar() {
    const { data, error } = await supabase.rpc("validar_certificado", { p_codigo: codigo });
    if (error) {
      setDados({ valido: false, mensagem: "Erro ao verificar certificado." });
    } else {
      setDados(data);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0A0F1E 0%, #0D1635 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <p style={{ fontSize:36, margin:0 }}>🎯</p>
          <p style={{ fontSize:16, fontWeight:800, color:"#fff", margin:"4px 0 0" }}>EnemFácil</p>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", margin:0 }}>Sistema de Certificação Digital</p>
        </div>

        {/* Card */}
        <div style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:"0 25px 60px rgba(0,0,0,0.4)" }}>

          {loading && (
            <div style={{ padding:48, textAlign:"center" }}>
              <div style={{ width:32, height:32, border:"3px solid #e2e8f0", borderTopColor:"#3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
              <p style={{ color:"#64748b", fontSize:14 }}>Verificando certificado...</p>
            </div>
          )}

          {!loading && dados && (
            <>
              {/* Status banner */}
              <div style={{
                padding:"16px 24px",
                background: dados.valido ? "#EDFAF3" : "#FFF1F1",
                borderBottom: `3px solid ${dados.valido ? "#22c55e" : "#ef4444"}`,
                display:"flex", alignItems:"center", gap:12,
              }}>
                <span style={{ fontSize:32 }}>{dados.valido ? "✅" : "❌"}</span>
                <div>
                  <p style={{ fontSize:16, fontWeight:700, color: dados.valido ? "#15803d" : "#b91c1c", margin:0 }}>
                    {dados.valido ? "Certificado Válido" : "Certificado Inválido"}
                  </p>
                  <p style={{ fontSize:12, color: dados.valido ? "#166534" : "#dc2626", margin:0 }}>
                    {dados.valido ? "Documento autêntico e verificado" : (dados.mensagem ?? "Este certificado não foi encontrado")}
                  </p>
                </div>
              </div>

              {dados.valido && (
                <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:12 }}>
                  {/* Nome */}
                  <div style={{ textAlign:"center", padding:"16px 0", borderBottom:"1px solid #f1f5f9" }}>
                    <p style={{ fontSize:11, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 4px" }}>Emitido para</p>
                    <p style={{ fontSize:24, fontWeight:700, color:"#0f172a", margin:0 }}>{dados.nome_aluno}</p>
                  </div>

                  {/* Dados */}
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {[
                      { label:"Evento",        valor: dados.evento },
                      { label:"Edição",         valor: dados.edicao },
                      { label:"Ano",            valor: dados.ano?.toString() },
                      { label:"Disciplina",     valor: dados.disciplina },
                      { label:"Tipo",           valor: dados.tipo },
                      { label:"Medalha",        valor: dados.medalha ? MEDALHA_LABEL[dados.medalha] : undefined },
                      { label:"Nota",           valor: dados.nota?.toFixed(1) },
                      { label:"Aproveitamento", valor: dados.percentual ? `${dados.percentual}%` : undefined },
                      { label:"Carga Horária",  valor: dados.carga_horaria ? `${dados.carga_horaria}h` : undefined },
                      { label:"Data de Emissão",valor: dados.emitido_em ? new Date(dados.emitido_em).toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" }) : undefined },
                    ].filter(i => i.valor).map(({ label, valor }) => (
                      <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"#f8fafc", borderRadius:8 }}>
                        <span style={{ fontSize:12, color:"#64748b" }}>{label}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:"#0f172a", textAlign:"right", maxWidth:"60%" }}>{valor}</span>
                      </div>
                    ))}
                  </div>

                  {/* Código */}
                  <div style={{ background:"#0A0F1E", borderRadius:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <p style={{ fontSize:10, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 2px" }}>Código de autenticidade</p>
                      <p style={{ fontSize:16, fontWeight:700, color:"#fbbf24", margin:0, fontFamily:"monospace" }}>{dados.codigo}</p>
                    </div>
                    <span style={{ fontSize:24 }}>🔐</span>
                  </div>

                  <p style={{ fontSize:11, color:"#94a3b8", textAlign:"center", margin:0 }}>
                    Este certificado foi emitido pela plataforma EnemFácil e é digitalmente verificável.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => navigate("/")}
          style={{ display:"block", margin:"20px auto 0", background:"rgba(255,255,255,0.1)", color:"#fff", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, padding:"10px 24px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}
        >
          Ir para o EnemFácil
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
