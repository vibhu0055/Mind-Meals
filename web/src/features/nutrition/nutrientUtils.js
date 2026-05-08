// Shared constants and helpers for nutrition components.

export const NUTRIENTS = [
  { key: 'calories', label: 'Energy', unit: 'kcal', icon: 'ENERGY', color: '#f59e0b', rdaRef: 600 },
  { key: 'protein', label: 'Protein', unit: 'g', icon: 'PROTEIN', color: '#60a5fa', rdaRef: 30 },
  { key: 'carbs', label: 'Carbs', unit: 'g', icon: 'CARBS', color: '#a78bfa', rdaRef: 100 },
  { key: 'fat', label: 'Fat', unit: 'g', icon: 'FAT', color: '#fb923c', rdaRef: 30 },
  { key: 'fiber', label: 'Fiber', unit: 'g', icon: 'FIBER', color: '#34d399', rdaRef: 10 },
  { key: 'iron', label: 'Iron', unit: 'mg', icon: 'IRON', color: '#f87171', rdaRef: 10 },
  { key: 'calcium', label: 'Calcium', unit: 'mg', icon: 'CALCIUM', color: '#38bdf8', rdaRef: 400 },
];

export const NUTRIENT_MAP = Object.fromEntries(NUTRIENTS.map((nutrient) => [nutrient.key, nutrient]));

export function getAdequacyCategory(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct < 50) return 'Severe Deficiency';
  if (pct < 75) return 'Moderate Deficiency';
  if (pct < 100) return 'Acceptable';
  return 'Excellent';
}

export function getStatus(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct < 75) {
    return {
      id: 'deficient',
      label: pct < 50 ? 'Severe' : 'Moderate',
      dot: '!',
      color: 'var(--red)',
      bg: 'var(--red-dim)',
      border: 'rgba(248,113,113,0.25)',
      badge: 'red',
    };
  }
  if (pct < 100) {
    return {
      id: 'adequate',
      label: 'Acceptable',
      dot: 'OK',
      color: 'var(--blue)',
      bg: 'var(--blue-dim)',
      border: 'rgba(96,165,250,0.25)',
      badge: 'blue',
    };
  }
  return {
    id: 'adequate',
    label: 'Excellent',
    dot: 'OK',
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
    border: 'var(--accent-border)',
    badge: 'green',
  };
}

export const STATUS_META = {
  deficient: {
    label: 'Low',
    dot: '!',
    color: 'var(--red)',
    bg: 'var(--red-dim)',
    border: 'rgba(248,113,113,0.25)',
    badge: 'red',
  },
  adequate: {
    label: 'Adequate',
    dot: 'OK',
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
    border: 'var(--accent-border)',
    badge: 'green',
  },
  excess: {
    label: 'Excess',
    dot: 'HIGH',
    color: 'var(--amber)',
    bg: 'var(--amber-dim)',
    border: 'rgba(245,158,11,0.25)',
    badge: 'amber',
  },
};

function normaliseBreakdownItem(item) {
  const pct = item.pct ?? item.adequacy_pct ?? (item.rda ? Math.round((item.received / item.rda) * 100) : null);
  const status = item.status || getStatus(pct)?.id || 'adequate';
  return {
    ...item,
    pct,
    status,
    gap: item.gap ?? (item.rda != null && item.received != null ? item.received - item.rda : null),
    adequacy_category: item.adequacy_category || getAdequacyCategory(pct),
  };
}

// Normalise a report that might come in flat shape (calories_pct, protein_pct...)
// or nested (nutrient_breakdown array).
export function normaliseReport(report) {
  if (!report) return null;

  if (report.nutrient_breakdown?.length) {
    return {
      ...report,
      nutrient_breakdown: report.nutrient_breakdown.map(normaliseBreakdownItem),
    };
  }

  const breakdown = NUTRIENTS
    .map(({ key }) => {
      const pct = report[`${key}_pct`];
      if (pct === undefined || pct === null) return null;
      const rda = report[`rda_${key}`] || null;
      const received = rda ? (pct / 100) * rda : null;
      const status = getStatus(pct);
      return {
        nutrient: key,
        received,
        rda,
        pct,
        status: status?.id || 'adequate',
        gap: rda && received !== null ? received - rda : null,
        adequacy_category: getAdequacyCategory(pct),
      };
    })
    .filter(Boolean);

  return { ...report, nutrient_breakdown: breakdown };
}

export function aggregateReports(reports) {
  if (!reports?.length) return null;
  const result = {};

  NUTRIENTS.forEach(({ key }) => {
    const pctKey = `${key}_pct`;
    const vals = reports
      .map((report) => {
        const norm = normaliseReport(report);
        const found = norm?.nutrient_breakdown?.find((nutrient) => nutrient.nutrient === key);
        return found?.pct ?? report[pctKey];
      })
      .filter((value) => value !== null && value !== undefined);

    if (!vals.length) return;
    result[pctKey] = vals.reduce((sum, value) => sum + value, 0) / vals.length;
    result[`${key}_low`] = vals.filter((value) => value < 75).length;
    result[`${key}_adequate`] = vals.filter((value) => value >= 75 && value < 100).length;
    result[`${key}_excellent`] = vals.filter((value) => value >= 100).length;
  });

  return result;
}
