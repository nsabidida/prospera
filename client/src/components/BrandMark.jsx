export default function BrandMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="prospera-mark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brass-soft)" />
          <stop offset="100%" stopColor="var(--brass)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#prospera-mark-grad)" />
      <text
        x="13.5"
        y="23"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize="17"
        fill="var(--navy)"
      >
        P
      </text>
      <path
        d="M19 22 L22 17 L25 19 L28 9"
        stroke="var(--navy)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}
