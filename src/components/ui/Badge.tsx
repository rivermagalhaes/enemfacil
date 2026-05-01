// src/components/ui/Badge.tsx
interface BadgeProps {
  children: React.ReactNode;
  color?: "blue" | "green" | "amber" | "purple" | "red" | "gray";
}

const palettes = {
  blue:   { bg: "#E6F1FB", color: "#0C447C" },
  green:  { bg: "#EAF3DE", color: "#27500A" },
  amber:  { bg: "#FAEEDA", color: "#633806" },
  purple: { bg: "#EEEDFE", color: "#3C3489" },
  red:    { bg: "#FCEBEB", color: "#791F1F" },
  gray:   { bg: "#F1EFE8", color: "#444441" },
};

export default function Badge({ children, color = "blue" }: BadgeProps) {
  const p = palettes[color];
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, borderRadius: 99,
      padding: "2px 8px", background: p.bg, color: p.color,
      display: "inline-block",
    }}>
      {children}
    </span>
  );
}
