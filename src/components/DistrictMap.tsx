'use client';

import { useMemo, useState } from 'react';
import type { Facility, RiskAssessment, TransferProposal } from '@/lib/types';

/**
 * The district network, drawn from real coordinates.
 *
 * Deliberately not a tile map. Roads and terrain are noise for this decision;
 * what matters is which facility is in trouble, which has stock to spare, and
 * which pairs are close enough for a transfer to be worth making. A custom
 * projection also means no external tile requests, so the demo works on a
 * conference network that is refusing to cooperate.
 */

const STATUS_FILL: Record<RiskAssessment['status'], string> = {
  stocked_out: 'var(--color-shortage)',
  critical: '#ff8a75',
  expiring_unused: 'var(--color-expiry)',
  surplus: '#c99a3f',
  adequate: 'var(--color-ink-600)',
};

const TIER_RADIUS: Record<Facility['tier'], number> = {
  warehouse: 9,
  district_hospital: 8,
  community: 6,
  primary: 4.6,
  health_post: 4,
};

const W = 900;
const H = 560;
const PAD = 54;

export function DistrictMap({
  facilities,
  worst,
  proposals,
  selectedId,
  onSelect,
}: {
  facilities: Facility[];
  worst: Record<string, RiskAssessment>;
  proposals: TransferProposal[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const project = useMemo(() => {
    const lats = facilities.map((f) => f.lat);
    const lons = facilities.map((f) => f.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const spanLat = maxLat - minLat || 1;
    const spanLon = maxLon - minLon || 1;

    return (f: { lat: number; lon: number }) => ({
      /* Latitude grows north, SVG y grows south, so it inverts. */
      x: PAD + ((f.lon - minLon) / spanLon) * (W - PAD * 2),
      y: PAD + (1 - (f.lat - minLat) / spanLat) * (H - PAD * 2),
    });
  }, [facilities]);

  const byId = useMemo(
    () => Object.fromEntries(facilities.map((f) => [f.id, f])),
    [facilities]);

  /* Too many arcs is a hairball nobody can read. Show the strongest, unless a
     facility is selected, in which case show everything touching it. */
  const arcs = useMemo(() => {
    const relevant = selectedId
      ? proposals.filter(
        (p) => p.fromFacilityId === selectedId || p.toFacilityId === selectedId)
      : proposals.slice(0, 28);

    return relevant
      .map((p) => {
        const from = byId[p.fromFacilityId];
        const to = byId[p.toFacilityId];
        if (!from || !to) return null;
        const a = project(from);
        const b = project(to);
        /* Bow each arc perpendicular to its own line so parallel routes between
           the same pair stay distinguishable instead of overlapping exactly. */
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const lift = Math.min(60, len * 0.28);
        const mx = (a.x + b.x) / 2 - (dy / len) * lift;
        const my = (a.y + b.y) / 2 + (dx / len) * lift;
        return { p, d: `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`, len };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [proposals, selectedId, byId, project]);

  const hovered = hover ? byId[hover] : null;
  const hoveredRisk = hover ? worst[hover] : null;
  const hoveredPos = hovered ? project(hovered) : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label="Map of health facilities in this district, coloured by stock status, with proposed transfers drawn between them.">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-flow)" />
          </marker>
        </defs>

        {/* Transfer routes, drawn under the facilities so nodes stay readable. */}
        <g>
          {arcs.map(({ p, d, len }) => {
            const active = selectedId
              && (p.fromFacilityId === selectedId || p.toFacilityId === selectedId);
            return (
              <path
                key={p.id}
                d={d}
                fill="none"
                stroke="var(--color-flow)"
                strokeWidth={active ? 2.2 : 1.1}
                strokeOpacity={active ? 0.95 : 0.28}
                strokeLinecap="round"
                markerEnd={active ? 'url(#arrow)' : undefined}
                strokeDasharray={len * 1.4}
                style={{ ['--dash' as string]: String(len * 1.4) }}
                className={active ? 'animate-draw glow-flow' : 'animate-draw'}
              />
            );
          })}
        </g>

        {/* Facilities */}
        <g>
          {facilities.map((f) => {
            const pos = project(f);
            const risk = worst[f.id];
            const status = risk?.status ?? 'adequate';
            const r = TIER_RADIUS[f.tier];
            const isSelected = selectedId === f.id;
            const urgent = status === 'stocked_out';

            return (
              <g
                key={f.id}
                transform={`translate(${pos.x} ${pos.y})`}
                onMouseEnter={() => setHover(f.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(isSelected ? null : f.id)}
                className="cursor-pointer"
              >
                {urgent && (
                  <circle r={r} fill={STATUS_FILL[status]}
                    opacity="0.45" className="animate-pulse-ring" />
                )}
                {isSelected && (
                  <circle r={r + 7} fill="none" stroke="var(--color-flow)"
                    strokeWidth="1.6" strokeDasharray="3 3" />
                )}
                <circle
                  r={r}
                  fill={STATUS_FILL[status]}
                  stroke="var(--color-ink-950)"
                  strokeWidth="1.4"
                  className={urgent ? 'glow-shortage' : undefined}
                />
                {/* Warehouses are labelled always: they anchor the district. */}
                {f.tier === 'warehouse' && (
                  <text y={-r - 8} textAnchor="middle"
                    className="fill-ink-300 text-[10px] font-medium">
                    {f.admin2}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip, positioned in percentage space so it tracks the responsive svg. */}
      {hovered && hoveredPos && (
        <div
          className="panel pointer-events-none absolute z-20 w-56 p-3 shadow-2xl"
          style={{
            left: `${(hoveredPos.x / W) * 100}%`,
            top: `${(hoveredPos.y / H) * 100}%`,
            transform: 'translate(-50%, -125%)',
          }}
        >
          <p className="text-[13px] font-semibold leading-tight">{hovered.name}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">
            {hovered.admin2}
            {hovered.populationServed > 0
              && `, ${hovered.populationServed.toLocaleString()} people`}
          </p>
          {hoveredRisk && (
            <div className="mt-2 border-t rule pt-2">
              <span className="pill" data-state={hoveredRisk.status}>
                {hoveredRisk.status.replace('_', ' ')}
              </span>
              {hoveredRisk.daysToStockout !== null && (
                <p className="mt-1.5 text-[11px] text-ink-300">
                  <span className="tabular text-shortage">{hoveredRisk.daysToStockout}d</span>
                  {' '}until empty
                </p>
              )}
              {hoveredRisk.unitsAtRiskOfExpiry > 0 && (
                <p className="text-[11px] text-ink-300">
                  <span className="tabular text-expiry">
                    {hoveredRisk.unitsAtRiskOfExpiry.toLocaleString()}
                  </span>{' '}
                  units expiring unused
                </p>
              )}
            </div>
          )}
          {!hovered.hasColdChain && (
            <p className="mt-1.5 text-[10px] text-ink-400">No cold chain</p>
          )}
        </div>
      )}

      <MapLegend />
    </div>
  );
}

function MapLegend() {
  const items: { status: RiskAssessment['status']; label: string }[] = [
    { status: 'stocked_out', label: 'Stocked out' },
    { status: 'critical', label: 'Runs out within 30 days' },
    { status: 'expiring_unused', label: 'Expiring unused' },
    { status: 'surplus', label: 'Surplus' },
    { status: 'adequate', label: 'Adequate' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t rule px-4 py-3">
      {items.map((i) => (
        <span key={i.status} className="flex items-center gap-2 text-[11px] text-ink-300">
          <span className="h-2.5 w-2.5 rounded-full"
            style={{ background: STATUS_FILL[i.status] }} />
          {i.label}
        </span>
      ))}
      <span className="ml-auto flex items-center gap-2 text-[11px] text-ink-300">
        <svg width="22" height="8" aria-hidden>
          <path d="M0 4 H18" stroke="var(--color-flow)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Proposed transfer
      </span>
    </div>
  );
}
