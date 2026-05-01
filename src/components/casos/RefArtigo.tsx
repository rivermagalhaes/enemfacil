// src/components/casos/RefArtigo.tsx
interface Props { numero: string; texto: string; cor?: "blue" | "green" }

export default function RefArtigo({ numero, texto, cor = "blue" }: Props) {
  const paleta = cor === "green"
    ? { bg: "#EAF3DE", numBg: "#C0DD97", numColor: "#173404", textColor: "#27500A" }
    : { bg: "#E6F1FB", numBg: "#B5D4F4", numColor: "#042C53", textColor: "#0C447C" };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px", background: paleta.bg, borderRadius: 8, marginBottom: 8,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 500, background: paleta.numBg,
        color: paleta.numColor, borderRadius: 6, padding: "2px 8px", flexShrink: 0,
      }}>
        {numero}
      </span>
      <span style={{ fontSize: 11, color: paleta.textColor, lineHeight: 1.4 }}>{texto}</span>
    </div>
  );
}
