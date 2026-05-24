// src/pages/olimpiadas/OlimpiadasQuimica.tsx
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { CORES } from "@/styles/theme";

const OLIMPIADAS = {
  nacionais: [
    { id:"OBQ", nome:"OBQ", nomeCompleto:"Olimpíada Brasileira de Química", emoji:"🥇", cor:"#7C3AED", bg:"#F3F0FF", desc:"Principal olimpíada de química do Brasil", niveis:["Nível I · Fundamental","Nível II · Médio","Nível III · Avançado"], dificuldade:"⭐⭐⭐⭐", badge:"Nacional" },
  ],
  estaduais: [
    { id:"OTQ", nome:"OTQ", nomeCompleto:"Olimpíada Tocantinense de Química", emoji:"🧪", cor:"#0A7C4B", bg:"#EDFAF3", desc:"Seletiva estadual do Tocantins para OBQ", niveis:["Nível I · Fundamental","Nível II · Médio"], dificuldade:"⭐⭐⭐", badge:"Tocantins" },
  ],
};

export default function OlimpiadasQuimica() {
  const navigate = useNavigate();

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100dvh", background:CORES.bg }}>
      <div style={{ background:"linear-gradient(135deg, #3b0764 0%, #4c1d95 50%, #6d28d9 100%)", padding:"16px 16px 32px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.2, background:"radial-gradient(circle at 20% 80%, #fbbf24 0%, transparent 50%), radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 50%)", pointerEvents:"none" }} />
        <div style={{ position:"relative" }}>
          <button onClick={() => navigate("/")} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", fontSize:13, cursor:"pointer", padding:"6px 12px", borderRadius:99, marginBottom:20, display:"flex", alignItems:"center", gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
            Voltar
          </button>
          <div style={{ textAlign:"center" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><img src="/logo-pnoq.png" alt="PNOQ" style={{ width:96, height:96, objectFit:"contain", borderRadius:12 }} /></div>
            <p style={{ fontSize:24, fontWeight:800, color:"#fff", margin:"0 0 6px", letterSpacing:"-0.5px" }}>Olimpíadas de Química</p>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.7)", margin:"0 0 20px" }}>Prepare-se para competir e representar sua escola</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              {[{emoji:"🥇",label:"1 Nacional"},{emoji:"🌿",label:"1 Estadual"},{emoji:"🧪",label:"Só Química"}].map((s,i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"8px 14px", backdropFilter:"blur(10px)" }}>
                  <p style={{ fontSize:16, margin:"0 0 2px" }}>{s.emoji}</p>
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.8)", margin:0, fontWeight:600 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 14px 90px" }}>
        {/* Nacionais */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:4, height:18, borderRadius:2, background:"#7C3AED" }} />
            <p style={{ fontSize:13, fontWeight:700, color:CORES.text, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>🌎 Nacionais</p>
          </div>
          {OLIMPIADAS.nacionais.map(o => (
            <button key={o.id} onClick={() => navigate(`/olimpiada/${o.id}`)}
              style={{ width:"100%", display:"flex", alignItems:"flex-start", gap:14, padding:16, borderRadius:18, background:CORES.bgCard, border:`2px solid ${o.cor}33`, cursor:"pointer", textAlign:"left", boxShadow:`0 4px 20px ${o.cor}15`, marginBottom:10 }}>
              <div style={{ width:60, height:60, borderRadius:16, background:`linear-gradient(135deg, ${o.cor}, ${o.cor}cc)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0, boxShadow:`0 4px 16px ${o.cor}40` }}>{o.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                  <p style={{ fontSize:18, fontWeight:800, color:o.cor, margin:0 }}>{o.nome}</p>
                  <span style={{ fontSize:9, fontWeight:700, background:o.cor, color:"#fff", borderRadius:4, padding:"2px 7px" }}>{o.badge}</span>
                </div>
                <p style={{ fontSize:12, color:CORES.textSub, margin:"0 0 8px" }}>{o.nomeCompleto}</p>
                <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 8px" }}>{o.desc}</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {o.niveis.map((n,i) => <span key={i} style={{ fontSize:10, background:o.bg, color:o.cor, borderRadius:6, padding:"2px 8px", fontWeight:600 }}>{n}</span>)}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                <span style={{ fontSize:10 }}>{o.dificuldade}</span>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke={o.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
              </div>
            </button>
          ))}
        </div>

        {/* Estaduais */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:4, height:18, borderRadius:2, background:"#0A7C4B" }} />
            <p style={{ fontSize:13, fontWeight:700, color:CORES.text, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>🌿 Estaduais — Tocantins</p>
          </div>
          {OLIMPIADAS.estaduais.map(o => (
            <button key={o.id} onClick={() => navigate(`/olimpiada/${o.id}`)}
              style={{ width:"100%", display:"flex", alignItems:"flex-start", gap:14, padding:16, borderRadius:18, background:CORES.bgCard, border:`2px solid ${o.cor}33`, cursor:"pointer", textAlign:"left", boxShadow:`0 4px 20px ${o.cor}15`, marginBottom:10 }}>
              <div style={{ width:60, height:60, borderRadius:16, background:`linear-gradient(135deg, ${o.cor}, ${o.cor}cc)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0, boxShadow:`0 4px 16px ${o.cor}40` }}>{o.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                  <p style={{ fontSize:18, fontWeight:800, color:o.cor, margin:0 }}>{o.nome}</p>
                  <span style={{ fontSize:9, fontWeight:700, background:o.cor, color:"#fff", borderRadius:4, padding:"2px 7px" }}>{o.badge}</span>
                </div>
                <p style={{ fontSize:12, color:CORES.textSub, margin:"0 0 8px" }}>{o.nomeCompleto}</p>
                <p style={{ fontSize:11, color:CORES.textSub, margin:"0 0 8px" }}>{o.desc}</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {o.niveis.map((n,i) => <span key={i} style={{ fontSize:10, background:o.bg, color:o.cor, borderRadius:6, padding:"2px 8px", fontWeight:600 }}>{n}</span>)}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                <span style={{ fontSize:10 }}>{o.dificuldade}</span>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke={o.cor} strokeWidth="2"><path d="M6 4l4 4-4 4"/></svg>
              </div>
            </button>
          ))}
        </div>

        <div style={{ background:"linear-gradient(135deg, #3b0764, #4c1d95)", borderRadius:16, padding:16, position:"relative", overflow:"hidden" }}>
          <p style={{ fontSize:13, fontWeight:700, color:"#fff", margin:"0 0 6px" }}>💡 Como funciona</p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.7)", margin:0, lineHeight:1.6 }}>
            Estude pela trilha de Química, pratique com questões reais das olimpíadas e use o Simulado para testar seu nível. A OTQ classifica para a OBQ nacional.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
