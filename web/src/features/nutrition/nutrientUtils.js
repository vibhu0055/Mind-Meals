// Shared constants and helpers for nutrition components

export const NUTRIENTS = [
  { key: 'calories', label: 'Energy',    unit: 'kcal', icon: '⚡', color: '#f59e0b', rdaRef: 600  },
  { key: 'protein',  label: 'Protein',   unit: 'g',    icon: '💪', color: '#60a5fa', rdaRef: 30   },
  { key: 'carbs',    label: 'Carbs',     unit: 'g',    icon: '🌾', color: '#a78bfa', rdaRef: 100  },
  { key: 'fat',      label: 'Fat',       unit: 'g',    icon: '🫒', color: '#fb923c', rdaRef: 30   },
  { key: 'fiber',    label: 'Fiber',     unit: 'g',    icon: '🌿', color: '#34d399', rdaRef: 10   },
  { key: 'iron',     label: 'Iron',      unit: 'mg',   icon: '🩸', color: '#f87171', rdaRef: 10   },
  { key: 'calcium',  label: 'Calcium',   unit: 'mg',   icon: '🦴', color: '#38bdf8', rdaRef: 400  },
];

export const NUTRIENT_MAP = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n]));

// Given a pct (0–200+), return a status object
export function getStatus(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct < 60)   return { id: 'deficient', label: 'Low',      dot: '🔴', color: 'var(--red)',    bg: 'var(--red-dim)',    border: 'rgba(248,113,113,0.25)', badge: 'red'   };
  if (pct <= 110) return { id: 'adequate',  label: 'Adequate', dot: '🟢', color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'var(--accent-border)',   badge: 'green' };
  return           { id: 'excess',    label: 'Excess',   dot: '🟡', color: 'var(--amber)',  bg: 'var(--amber-dim)', border: 'rgba(245,158,11,0.25)',  badge: 'amber' };
}

export const STATUS_META = {
  deficient: { label: 'Low',      dot: '🔴', color: 'var(--red)',    bg: 'var(--red-dim)',    border: 'rgba(248,113,113,0.25)', badge: 'red'   },
  adequate:  { label: 'Adequate', dot: '🟢', color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'var(--accent-border)',   badge: 'green' },
  excess:    { label: 'Excess',   dot: '🟡', color: 'var(--amber)',  bg: 'var(--amber-dim)', border: 'rgba(245,158,11,0.25)',  badge: 'amber' },
};

// Normalise a report that might come in flat shape (calories_pct, protein_pct…)
// or nested (nutrient_breakdown array). Returns normalised { breakdown, overall_status }
export function normaliseReport(report) {
  if (!report) return null;

  // Already has breakdown array — use it
  if (report.nutrient_breakdown?.length) return report;

  // Flat shape — synthesise a breakdown
  const breakdown = NUTRIENTS
    .map(({ key }) => {
      const pct = report[`${key}_pct`];
      if (pct === undefined || pct === null) return null;
      const rda   = report[`rda_${key}`] || null;
      const received = rda ? (pct / 100) * rda : null;
      const s = getStatus(pct);
      return {
        nutrient: key,
        received,
        rda,
        pct,
        status: s?.id || 'adequate',
        gap: rda && received !== null ? received - rda : null,
      };
    })
    .filter(Boolean);

  return { ...report, nutrient_breakdown: breakdown };
}

// Aggregate an array of reports into per-nutrient averages
export function aggregateReports(reports) {
  if (!reports?.length) return null;
  const result = {};
  NUTRIENTS.forEach(({ key }) => {
    const pctKey = `${key}_pct`;
    const vals = reports
      .map((r) => {
        const norm = normaliseReport(r);
        const found = norm?.nutrient_breakdown?.find((n) => n.nutrient === key);
        return found?.pct ?? r[pctKey];
      })
      .filter((v) => v !== null && v !== undefined);
    if (!vals.length) return;
    result[pctKey] = vals.reduce((a, b) => a + b, 0) / vals.length;
    result[`${key}_low`]      = vals.filter((v) => v < 60).length;
    result[`${key}_adequate`] = vals.filter((v) => v >= 60 && v <= 110).length;
    result[`${key}_excess`]   = vals.filter((v) => v > 110).length;
  });
  return result;
}
