const CHEVRON = (n) => (
  <svg viewBox="0 0 48 48" width="100%" height="100%">
    {Array.from({ length: n }).map((_, i) => (
      <path
        key={i}
        d={`M8 ${16 + i * 9} L24 ${8 + i * 9} L40 ${16 + i * 9}`}
        stroke="var(--brass)"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
      />
    ))}
  </svg>
);

const BAR = (n) => (
  <svg viewBox="0 0 48 48" width="100%" height="100%">
    {Array.from({ length: n }).map((_, i) => (
      <rect
        key={i}
        x="10"
        y={12 + i * 10}
        width="28"
        height="6"
        rx="2"
        fill="var(--brass)"
      />
    ))}
  </svg>
);

const STAR = (n) => (
  <svg viewBox="0 0 48 48" width="100%" height="100%">
    {Array.from({ length: n }).map((_, i) => {
      const cx = 24 + (i - (n - 1) / 2) * 14;
      return (
        <path
          key={i}
          transform={`translate(${cx - 24}, 0)`}
          d="M24 8 L27 19 L38 19 L29 26 L32 37 L24 30 L16 37 L19 26 L10 19 L21 19 Z"
          fill="var(--brass)"
        />
      );
    })}
  </svg>
);

function emblemFor(key) {
  switch (key) {
    case "chevron-1": return CHEVRON(1);
    case "chevron-2": return CHEVRON(2);
    case "chevron-3": return CHEVRON(3);
    case "bar-1": return BAR(1);
    case "bar-2": return BAR(2);
    case "star-1": return STAR(1);
    case "star-2": return STAR(2);
    case "star-3": return STAR(3);
    default: return CHEVRON(1);
  }
}

export default function RankBadge({ emblem, size = 48 }) {
  return (
    <div
      className="card-raised"
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        flexShrink: 0,
        padding: 8,
      }}
    >
      {emblemFor(emblem)}
    </div>
  );
}
