export function HRDashboardIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="hr-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="hr-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
        </linearGradient>
        <filter id="hr-glow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ambient orbs */}
      <circle cx="400" cy="60" r="80" fill="url(#hr-grad-2)" className="animate-pulse-glow" />
      <circle cx="80" cy="260" r="60" fill="url(#hr-grad-2)" opacity="0.6" />

      {/* Main dashboard card */}
      <rect x="60" y="80" width="280" height="180" rx="16" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.1" />
      <rect x="76" y="100" width="120" height="8" rx="4" fill="white" fillOpacity="0.15" />
      <rect x="76" y="116" width="80" height="6" rx="3" fill="white" fillOpacity="0.08" />

      {/* Ticket rows */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(76, ${140 + i * 36})`}>
          <rect width="248" height="28" rx="8" fill="white" fillOpacity="0.03" stroke="white" strokeOpacity="0.05" />
          <circle cx="14" cy="14" r="6" fill="url(#hr-grad-1)" opacity={0.9 - i * 0.2} />
          <rect x="28" y="9" width="80" height="5" rx="2.5" fill="white" fillOpacity="0.12" />
          <rect x="180" y="8" width="48" height="12" rx="6" fill={i === 0 ? "#818cf8" : "#34d399"} fillOpacity="0.25" />
        </g>
      ))}

      {/* Floating support agent */}
      <g filter="url(#hr-glow)" className="animate-float">
        <circle cx="370" cy="180" r="52" fill="url(#hr-grad-1)" fillOpacity="0.2" stroke="url(#hr-grad-1)" strokeWidth="1.5" strokeOpacity="0.5" />
        <circle cx="370" cy="168" r="18" fill="url(#hr-grad-1)" />
        <path d="M340 210 Q370 195 400 210 L400 240 Q370 255 340 240 Z" fill="url(#hr-grad-1)" fillOpacity="0.8" />
        {/* Headset */}
        <path d="M352 168 Q370 155 388 168" stroke="white" strokeWidth="2" strokeOpacity="0.6" fill="none" />
        <rect x="348" y="166" width="6" height="10" rx="3" fill="white" fillOpacity="0.5" />
        <rect x="386" y="166" width="6" height="10" rx="3" fill="white" fillOpacity="0.5" />
      </g>

      {/* Chat bubble */}
      <g transform="translate(320, 100)">
        <rect width="100" height="48" rx="12" fill="white" fillOpacity="0.06" stroke="white" strokeOpacity="0.1" />
        <rect x="14" y="14" width="60" height="5" rx="2.5" fill="white" fillOpacity="0.2" />
        <rect x="14" y="26" width="40" height="5" rx="2.5" fill="white" fillOpacity="0.1" />
        <circle cx="78" cy="36" r="8" fill="url(#hr-grad-1)" />
      </g>

      {/* Sparkles */}
      {[
        [120, 60], [200, 50], [300, 70], [420, 130],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="white" fillOpacity={0.4 + (i % 2) * 0.3} />
      ))}
    </svg>
  );
}
