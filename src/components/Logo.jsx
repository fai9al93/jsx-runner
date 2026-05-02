/**
 * Logo — the brand mark.
 *
 * A custom 4-petal "atom" inspired by React's logo, drawn fresh
 * so the brand has its own identity rather than the React mark.
 * The gradient is set inline via CSS variables so the same SVG
 * adapts to the active theme.
 */
export default function Logo({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#logo-grad)" />
      <g stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.95">
        <ellipse cx="16" cy="16" rx="9.5" ry="3.6" />
        <ellipse cx="16" cy="16" rx="9.5" ry="3.6" transform="rotate(60 16 16)" />
        <ellipse cx="16" cy="16" rx="9.5" ry="3.6" transform="rotate(-60 16 16)" />
      </g>
      <circle cx="16" cy="16" r="2" fill="white" />
    </svg>
  );
}
