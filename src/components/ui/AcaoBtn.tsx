// src/components/ui/AcaoBtn.tsx
interface AcaoBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  full?: boolean;
}

export default function AcaoBtn({ children, onClick, primary, disabled, full }: AcaoBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 16px",
        borderRadius: 8,
        border: primary ? "none" : "0.5px solid rgba(0,0,0,0.15)",
        background: primary ? "#1a3a6e" : "#fff",
        color: primary ? "#fff" : "#1a1a1a",
        fontSize: 13, fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : undefined,
        transition: "opacity 0.15s",
      }}
    >
      {children}
    </button>
  );
}
