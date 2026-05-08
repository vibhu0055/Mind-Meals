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

  const { slices } = macros.reduce((acc, n) => {
    const pct = n.received / total;
    const startAngle = acc.angle;
    const endAngle = acc.angle + pct * 2 * Math.PI;

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
      angle: endAngle,
      slices: [
        ...acc.slices,
        {
          ...n,
          pct,
          path: `M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`,
        },
      ],
    };
  }, { angle: -Math.PI / 2, slices: [] });

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

// Meal score ring used by the meal summary dashboard.
export function ScoreRing({ score = 0, label = '', size = 132 }) {
  const value = Math.max(0, Math.min(Number(score) || 0, 100));
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;
  const color =
    value >= 90 ? 'var(--accent)' :
    value >= 70 ? 'var(--blue)' :
    value >= 50 ? 'var(--amber)' :
    'var(--red)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-hover)"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[var(--text-primary)] mono">{value.toFixed(0)}</span>
        {label && <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>}
      </div>
    </div>
  );
}

export function AdequacyProgressBars({ nutrients = [] }) {
  if (!nutrients.length) return null;

  const colorFor = (pct) =>
    pct >= 100 ? 'var(--accent)' :
    pct >= 75 ? 'var(--blue)' :
    pct >= 50 ? 'var(--amber)' :
    'var(--red)';

  return (
    <div className="flex flex-col gap-3">
      {nutrients.map((nutrient) => {
        const pct = Math.max(0, Number(nutrient.adequacy) || 0);
        return (
          <div key={nutrient.nutrient} className="grid grid-cols-[88px_1fr_52px] items-center gap-3">
            <span className="text-xs text-[var(--text-muted)] truncate">{nutrient.label}</span>
            <div className="h-2.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: colorFor(pct) }}
              />
            </div>
            <span className="text-xs font-semibold mono text-right" style={{ color: colorFor(pct) }}>
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function NutrientComparisonChart({ nutrients = [], width = 560, height = 220 }) {
  if (!nutrients.length) return null;

  const pad = { top: 18, right: 16, bottom: 42, left: 42 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxVal = Math.max(...nutrients.flatMap((n) => [Number(n.provided) || 0, Number(n.rda) || 0]), 1);
  const gap = innerW / nutrients.length;
  const barW = Math.min(22, gap * 0.28);
  const y = (value) => innerH - ((Number(value) || 0) / maxVal) * innerH;
  const ticks = [0, 0.5, 1].map((factor) => ({ value: factor * maxVal, y: y(factor * maxVal) }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line x1={0} y1={tick.y} x2={innerW} y2={tick.y} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={-8} y={tick.y + 4} fontSize={9} fill="var(--text-muted)" textAnchor="end">
              {Math.round(tick.value)}
            </text>
          </g>
        ))}

        {nutrients.map((nutrient, index) => {
          const center = index * gap + gap / 2;
          const providedH = innerH - y(nutrient.provided);
          const rdaH = innerH - y(nutrient.rda);
          const adequate = (Number(nutrient.adequacy) || 0) >= 90;

          return (
            <g key={nutrient.nutrient}>
              <rect
                x={center - barW - 2}
                y={y(nutrient.rda)}
                width={barW}
                height={rdaH}
                rx={3}
                fill="var(--bg-hover)"
                stroke="var(--border)"
              />
              <rect
                x={center + 2}
                y={y(nutrient.provided)}
                width={barW}
                height={providedH}
                rx={3}
                fill={adequate ? 'var(--accent)' : 'var(--amber)'}
                opacity={0.9}
              />
              <text x={center} y={innerH + 16} fontSize={9} fill="var(--text-muted)" textAnchor="middle">
                {nutrient.shortLabel || nutrient.label?.slice(0, 3).toUpperCase() || nutrient.nutrient.slice(0, 3).toUpperCase()}
              </text>
            </g>
          );
        })}

        <g transform={`translate(0, ${innerH + 29})`}>
          <rect x={0} y={0} width={10} height={10} rx={2} fill="var(--bg-hover)" stroke="var(--border)" />
          <text x={14} y={8} fontSize={9} fill="var(--text-muted)">Required</text>
          <rect x={78} y={0} width={10} height={10} rx={2} fill="var(--amber)" />
          <text x={92} y={8} fontSize={9} fill="var(--text-muted)">Provided</text>
        </g>
      </g>
    </svg>
  );
}

export function PmPoshanComparisonChart({ pmPoshan, width = 480, height = 190 }) {
  const rows = [
    { key: 'primary', label: 'Primary', data: pmPoshan?.primary },
    { key: 'upper_primary', label: 'Upper Primary', data: pmPoshan?.upper_primary },
  ].filter((row) => row.data);

  if (!rows.length) return null;

  const pad = { top: 18, right: 18, bottom: 32, left: 94 };
  const innerW = width - pad.left - pad.right;
  const rowH = (height - pad.top - pad.bottom) / rows.length;
  const colorFor = (pct) => (pct >= 90 ? 'var(--accent)' : pct >= 70 ? 'var(--amber)' : 'var(--red)');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {[0, 50, 100].map((tick) => (
          <g key={tick}>
            <line x1={(tick / 100) * innerW} y1={0} x2={(tick / 100) * innerW} y2={rowH * rows.length} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={(tick / 100) * innerW} y={rowH * rows.length + 18} fontSize={9} fill="var(--text-muted)" textAnchor="middle">
              {tick}%
            </text>
          </g>
        ))}

        {rows.map((row, index) => {
          const yBase = index * rowH + 8;
          const caloriePct = Math.max(0, Number(row.data.calorie_pct) || 0);
          const proteinPct = Math.max(0, Number(row.data.protein_pct) || 0);

          return (
            <g key={row.key}>
              <text x={-12} y={yBase + 13} fontSize={10} fill="var(--text-secondary)" textAnchor="end">
                {row.label}
              </text>
              <rect x={0} y={yBase} width={innerW} height={9} rx={4} fill="var(--bg-hover)" />
              <rect x={0} y={yBase} width={Math.min(caloriePct, 120) / 120 * innerW} height={9} rx={4} fill={colorFor(caloriePct)} />
              <text x={innerW + 6} y={yBase + 8} fontSize={9} fill={colorFor(caloriePct)}>
                C {caloriePct.toFixed(0)}%
              </text>
              <rect x={0} y={yBase + 16} width={innerW} height={9} rx={4} fill="var(--bg-hover)" />
              <rect x={0} y={yBase + 16} width={Math.min(proteinPct, 120) / 120 * innerW} height={9} rx={4} fill={colorFor(proteinPct)} />
              <text x={innerW + 6} y={yBase + 24} fontSize={9} fill={colorFor(proteinPct)}>
                P {proteinPct.toFixed(0)}%
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
