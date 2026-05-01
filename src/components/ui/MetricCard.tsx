// src/components/ui/MetricCard.tsx
interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export default function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div style={{
      background: "#f4f6fb", borderRadius: 8,
      padding: "10px 12px", flex: 1,
    }}>
      <p style={{ fontSize: 11, color: "#666", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 500, color: "#1a1a1a", margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "#888", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}
