// src/components/artigos/TagsPalavrasChave.tsx
interface TagsProps { tags: string[] }

export default function TagsPalavrasChave({ tags }: TagsProps) {
  if (!tags.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
      {tags.map((t) => (
        <span key={t} style={{
          fontSize: 11, fontWeight: 500, background: "#EEEDFE",
          color: "#3C3489", borderRadius: 99, padding: "3px 10px",
        }}>
          {t}
        </span>
      ))}
    </div>
  );
}
