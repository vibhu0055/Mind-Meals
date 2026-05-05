// ─── Pure SVG Chart Components ───────────────────────────────────────────────
// No external deps. Used by NutritionPage, NutritionInsightDashboard, etc.

// ── Intake vs RDA Bar Chart ───────────────────────────────────────────────────
export function IntakeBarChart({ nutrients, width = 480, height = 220 }) {
  if (!nutrients?.length) return null;

  const pad = { top: 16, right: 16, bottom: 48, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const barW = Math.min(24, (innerW / nutrients.length) * 0.38);
  const gap = innerW / nutrients.length;

  const maxVal = Math.max(...nutrients.flatMap((n) => [n.received, n.rda]), 1);

  const statusColor = (s) =>
    s === 'adequate' ? 'var(--accent)' : s === 'excess' ? 'var(--amber)' : 'var(--red)';

  const yScale = (v) => innerH - (v / maxVal) * innerH;

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: yScale(t * maxVal),
    label: Math.round(t * maxVal),
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {/* Grid lines */}
        {ticks.map((t) => (
          <g key={t.label}>
            <line x1={0} y1={t.y} x2={innerW} y2={t.y} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={-8} y={t.y + 4} fontSize={9} fill="var(--text-muted)" textAnchor="end">{t.label}</text>
          </g>
        ))}

        {/* Bars */}
        {nutrients.map((n, i) => {
          const cx = i * gap + gap / 2;
          const recvH = (n.received / maxVal) * innerH;
          const rdaH = (n.rda / maxVal) * innerH;
          const color = statusColor(n.status);

          return (
            <g key={n.nutrient}>
              {/* RDA bar (ghost) */}
              <rect
                x={cx - barW - 2}
                y={yScale(n.rda)}
                width={barW}
                height={rdaH}
                rx={3}
                fill="var(--bg-hover)"
                stroke="var(--border)"
                strokeWidth={1}
              />
              {/* Received bar */}
              <rect
                x={cx + 2}
                y={yScale(n.received)}
                width={barW}
                height={recvH}
                rx={3}
                fill={color}
                opacity={0.85}
              />
              {/* X-axis label */}
              <text
                x={cx}
                y={innerH + 14}
                fontSize={9}
                fill="var(--text-muted)"
                textAnchor="middle"
              >
                {n.nutrient.slice(0, 3).toUpperCase()}
              </text>
              {/* Value label on top of received bar */}
              {recvH > 12 && (
                <text
                  x={cx + 2 + barW / 2}
                  y={yScale(n.received) - 3}
                  fontSize={8}
                  fill={color}
                  textAnchor="middle"
                >
                  {n.received.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(0, ${innerH + 28})`}>
          <rect x={0} y={0} width={10} height={10} rx={2} fill="var(--bg-hover)" stroke="var(--border)" strokeWidth={1} />
          <text x={14} y={8} fontSize={9} fill="var(--text-muted)">RDA</text>
          <rect x={50} y={0} width={10} height={10} rx={2} fill="var(--accent)" opacity={0.85} />
          <text x={64} y={8} fontSize={9} fill="var(--text-muted)">Received</text>
        </g>
      </g>
    </svg>
  );
}

// ── Nutrient Distribution Pie Chart ──────────────────────────────────────────
export function NutrientPieChart({ nutrients, size = 160 }) {
  if (!nutrients?.length) return null;

  // Only macro nutrients for pie
  const macros = nutrients.filter((n) => ['calories', 'protein', 'carbs', 'fat'].includes(n.nutrient));
  const total = macros.reduce((sum, n) => sum + (n.received || 0), 0);
  if (total === 0) return null;

  const COLORS = {
    calories: 'var(--amber)',
    protein: 'var(--blue)',
    carbs: 'var(--accent)',
    fat: 'var(--purple)',
  };

  const cx = size / 2, cy = size / 2, r = size / 2 - 8, innerR = r * 0.52;

  let currentAngle = -Math.PI / 2;
  const slices = macros.map((n) => {
    const pct = n.received / total;
    const startAngle = currentAngle;
    const endAngle = currentAngle + pct * 2 * Math.PI;
    currentAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle);
    const iy2 = cy + innerR * Math.sin(endAngle);

    const largeArc = pct > 0.5 ? 1 : 0;

    return {
      ...n,
      pct,
      path: `M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`,
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {slices.map((s) => (
          <path key={s.nutrient} d={s.path} fill={COLORS[s.nutrient] || 'var(--text-muted)'} opacity={0.9} />
        ))}
        {/* Center label */}
        <text x={cx} y={cy - 4} fontSize={10} fill="var(--text-muted)" textAnchor="middle">Total</text>
        <text x={cx} y={cy + 10} fontSize={11} fontWeight="600" fill="var(--text-primary)" textAnchor="middle">
          {total.toFixed(0)}
        </text>
        <text x={cx} y={cy + 22} fontSize={8} fill="var(--text-muted)" textAnchor="middle">kcal</text>
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-1.5">
        {slices.map((s) => (
          <div key={s.nutrient} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[s.nutrient] }} />
            <span className="text-xs text-[var(--text-muted)] capitalize w-14">{s.nutrient}</span>
            <span className="text-xs font-medium text-[var(--text-primary)] mono">{(s.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BMI Trend Sparkline ───────────────────────────────────────────────────────
export function BmiSparkline({ records, width = 120, height = 40 }) {
  if (!records?.length || records.length < 2) return null;

  const bmis = records.map((r) => r.bmi || 0).filter(Boolean);
  const min = Math.min(...bmis) - 1;
  const max = Math.max(...bmis) + 1;
  const n = bmis.length;

  const x = (i) => (i / (n - 1)) * width;
  const y = (v) => height - ((v - min) / (max - min)) * height;

  const points = bmis.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPoints = `${x(0)},${height} ${points} ${x(n - 1)},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Latest point */}
      <circle cx={x(n - 1)} cy={y(bmis[n - 1])} r={3} fill="var(--accent)" />
    </svg>
  );
}
