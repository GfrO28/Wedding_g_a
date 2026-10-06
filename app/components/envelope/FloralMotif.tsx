export function FloralMotif({
  className,
  opacity = 0.14,
  color = "#000000",
}: {
  className?: string;
  opacity?: number;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ opacity, mixBlendMode: "multiply" }}
      aria-hidden
    >
      <g fill="none" stroke={color} strokeWidth="0.6">
        <circle cx="50" cy="50" r="3.5" fill={color} stroke="none" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse
            key={angle}
            cx="50"
            cy="50"
            rx="13"
            ry="6.5"
            transform={`rotate(${angle} 50 50) translate(10 0)`}
          />
        ))}
        <circle cx="50" cy="50" r="22" strokeDasharray="1.5 2.4" />
        <circle cx="50" cy="50" r="30" strokeDasharray="0.8 3" opacity={0.6} />
      </g>
    </svg>
  );
}
