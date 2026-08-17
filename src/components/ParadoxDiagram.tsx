/**
 * The product in one picture.
 *
 * These are not illustrative numbers. They are a real proposal from the
 * pipeline run: two clinics eleven kilometres apart in uMkhanyakude, one about
 * to bin insulin, one about to run out of it, neither able to see the other.
 * Nothing persuades better than the actual output.
 */
export function ParadoxDiagram() {
  return (
    <svg
      viewBox="0 0 720 260"
      className="w-full"
      role="img"
      aria-label="Two clinics eleven kilometres apart: one holds 418 vials of insulin expiring on 26 October, the other has none and faces 47 days without. MedMesh proposes moving the stock."
    >
      <defs>
        <linearGradient id="flowline" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-expiry)" />
          <stop offset="100%" stopColor="var(--color-shortage)" />
        </linearGradient>
        <filter id="soften" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Ambient glow under each node, so they read as live rather than drawn. */}
      <ellipse cx="150" cy="120" rx="52" ry="30" fill="var(--color-expiry)" opacity="0.16" filter="url(#soften)" />
      <ellipse cx="570" cy="120" rx="52" ry="30" fill="var(--color-shortage)" opacity="0.18" filter="url(#soften)" />

      {/* The route. Drawn left to right, the direction the medicine travels. */}
      <path
        d="M198 120 C 300 66, 420 66, 522 120"
        fill="none"
        stroke="url(#flowline)"
        strokeWidth="2"
        strokeDasharray="420"
        strokeLinecap="round"
        style={{ ['--dash' as string]: '420' }}
        className="animate-draw"
      />
      <text x="360" y="62" textAnchor="middle" className="fill-flow text-[12px] font-semibold tabular">
        11.1 km
      </text>
      <text x="360" y="96" textAnchor="middle" className="fill-ink-300 text-[11px]">
        one vehicle, two days
      </text>

      {/* Surplus side */}
      <circle cx="150" cy="120" r="15" className="fill-expiry glow-expiry" />
      <circle cx="150" cy="120" r="15" className="fill-expiry animate-pulse-ring" opacity="0.5" />
      <text x="150" y="172" textAnchor="middle" className="fill-ink-100 text-[13px] font-semibold">
        CHC Manguzi
      </text>
      <text x="150" y="192" textAnchor="middle" className="fill-expiry text-[12px] tabular">
        418 vials insulin
      </text>
      <text x="150" y="210" textAnchor="middle" className="fill-ink-400 text-[11px]">
        expire 26 October, unused
      </text>

      {/* Shortage side */}
      <circle cx="570" cy="120" r="15" className="fill-shortage glow-shortage" />
      <circle cx="570" cy="120" r="15" className="fill-shortage animate-pulse-ring" opacity="0.5" />
      <text x="570" y="172" textAnchor="middle" className="fill-ink-100 text-[13px] font-semibold">
        CHC Mtubatuba
      </text>
      <text x="570" y="192" textAnchor="middle" className="fill-shortage text-[12px] tabular">
        0 vials on the shelf
      </text>
      <text x="570" y="210" textAnchor="middle" className="fill-ink-400 text-[11px]">
        47 days without, projected
      </text>
    </svg>
  );
}

/**
 * Why fifteen years of logistics systems did not fix this.
 *
 * Every one of them is a tree. Stock reports up and comes back down, and there
 * is no sideways, so two neighbouring clinics are invisible to each other while
 * both are perfectly visible to a warehouse that can help neither in time.
 */
export function TreeVersusMesh() {
  return (
    <svg
      viewBox="0 0 720 250"
      className="w-full"
      role="img"
      aria-label="Existing systems form a tree where facilities only report upward to a warehouse. MedMesh adds direct links between neighbouring facilities."
    >
      {/* ---- the tree ---- */}
      <text x="20" y="24" className="fill-ink-300 text-[12px] font-semibold uppercase tracking-[0.14em]">
        Every system built so far
      </text>
      <circle cx="170" cy="66" r="11" className="fill-ink-400" />
      <text x="170" y="48" textAnchor="middle" className="fill-ink-300 text-[11px]">warehouse</text>
      {[70, 140, 210, 280].map((x) => (
        <g key={x}>
          <line x1="170" y1="66" x2={x} y2="170" className="stroke-ink-600" strokeWidth="1.4" />
          <circle cx={x} cy="170" r="8" className="fill-ink-700 stroke-ink-600" strokeWidth="1" />
        </g>
      ))}
      <circle cx="70" cy="170" r="8" className="fill-expiry" opacity="0.9" />
      <circle cx="280" cy="170" r="8" className="fill-shortage" opacity="0.9" />
      <text x="175" y="212" textAnchor="middle" className="fill-ink-400 text-[11px]">
        these two cannot see each other
      </text>

      <line x1="360" y1="40" x2="360" y2="220" className="stroke-ink-700" strokeWidth="1" strokeDasharray="4 6" />

      {/* ---- the mesh ---- */}
      <text x="420" y="24" className="fill-flow text-[12px] font-semibold uppercase tracking-[0.14em]">
        MedMesh adds one edge
      </text>
      <circle cx="560" cy="66" r="11" className="fill-ink-400" />
      <text x="560" y="48" textAnchor="middle" className="fill-ink-300 text-[11px]">warehouse</text>
      {[460, 530, 600, 670].map((x) => (
        <g key={x}>
          <line x1="560" y1="66" x2={x} y2="170" className="stroke-ink-600" strokeWidth="1.4" />
          <circle cx={x} cy="170" r="8" className="fill-ink-700 stroke-ink-600" strokeWidth="1" />
        </g>
      ))}
      <circle cx="460" cy="170" r="8" className="fill-expiry" />
      <circle cx="670" cy="170" r="8" className="fill-shortage" />
      <path
        d="M460 170 C 520 214, 610 214, 670 170"
        fill="none"
        className="stroke-flow glow-flow animate-draw"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="260"
        style={{ ['--dash' as string]: '260' }}
      />
      <text x="565" y="234" textAnchor="middle" className="fill-flow text-[11px] font-medium">
        surplus moves to shortage
      </text>
    </svg>
  );
}
