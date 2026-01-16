export default function Logo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`font-semibold tracking-tight ${className}`}
      style={{ color: "#4A5568" }}
    >
      MotorenHaus
    </div>
  );
}
