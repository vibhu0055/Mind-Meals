import { useEffect, useState, useMemo } from 'react';
import { getSchoolReports } from '../api/nutrition';
import { getStudents } from '../api/students';
import { getIngredients } from '../api/meals';
import { useToast } from '../components/ui/Toast';
import Card from '../components/ui/Card';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import {
  Sparkles, TrendingUp, ChevronDown, ChevronUp,
  Zap, Flame, Droplets, Leaf, Info,
} from 'lucide-react';

const NUTRIENTS = [
  { key: 'calories', col: 'calories_per_100g',  label: 'Calories', unit: 'kcal', icon: Flame,    color: 'var(--amber)'  },
  { key: 'protein',  col: 'protein_per_100g',   label: 'Protein',  unit: 'g',    icon: Zap,      color: 'var(--blue)'   },
  { key: 'iron',     col: 'iron_mg_per_100g',   label: 'Iron',     unit: 'mg',   icon: Droplets, color: 'var(--red)'    },
  { key: 'calcium',  col: 'calcium_mg_per_100g',label: 'Calcium',  unit: 'mg',   icon: Droplets, color: 'var(--purple)' },
  { key: 'fiber',    col: 'fiber_per_100g',     label: 'Fiber',    unit: 'g',    icon: Leaf,     color: 'var(--green)'  },
];

const REPORT_FIELDS = {
  calories: { received: 'received_calories', rda: 'rda_calories' },
  protein:  { received: 'received_protein',  rda: 'rda_protein'  },
  iron:     { received: 'received_iron',     rda: 'rda_iron'     },
  calcium:  { received: 'received_calcium',  rda: 'rda_calcium'  },
};

function DeficiencyBar({ label, avgPct, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
        <span className="text-[11px] font-semibold" style={{ color }}>
          {avgPct != null ? `${avgPct}%` : 'No data'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(avgPct ?? 0, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Nutrition pill row for the meal suggestion card ──────────
function NutritionPills({ ing }) {
  const pills = NUTRIENTS
    .map((n) => {
      const val = parseFloat(ing[n.col]);
      if (isNaN(val) || val === 0) return null;
      return { label: n.label, val, unit: n.unit, color: n.color, icon: n.icon };
    })
    .filter(Boolean);

  if (!pills.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {pills.map(({ label, val, unit, color, icon: Icon }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium"
          style={{ color, background: `${color}18`, borderColor: `${color}33` }}
        >
          <Icon size={9} />
          {label}: {val % 1 === 0 ? val : val.toFixed(1)}{unit}
        </span>
      ))}
    </div>
  );
}

// ── Per-nutrient breakdown: top deficient students ───────────
function NutrientBreakdown({ nutrientStats, reports }) {
  const [openNutrient, setOpenNutrient] = useState(null);

  // For each nutrient with report data, compute per-student avg pct
  const breakdown = useMemo(() => {
    return nutrientStats
      .filter((n) => REPORT_FIELDS[n.key]) // only nutrients with report fields
      .map((n) => {
        const fields = REPORT_FIELDS[n.key];

        // group reports by student, average their pct
        const byStudent = {};
        reports.forEach((r) => {
          const received = parseFloat(r[fields.received]);
          const rda      = parseFloat(r[fields.rda]);
          if (isNaN(received) || isNaN(rda) || rda === 0) return;
          const pct = Math.round((received / rda) * 100);
          if (!byStudent[r.student_id]) {
            byStudent[r.student_id] = { name: r.student_name, total: 0, count: 0 };
          }
          byStudent[r.student_id].total += pct;
          byStudent[r.student_id].count++;
        });

        const students = Object.entries(byStudent)
          .map(([id, { name, total, count }]) => ({
            id,
            name,
            avgPct: Math.round(total / count),
          }))
          .filter((s) => s.avgPct < 75)
          .sort((a, b) => a.avgPct - b.avgPct)
          .slice(0, 5); // top 5 most deficient

        return { ...n, students };
      })
      .filter((n) => n.students.length > 0); // only show nutrients with deficient students
  }, [nutrientStats, reports]);

  if (breakdown.length === 0) {
    return (
      <Card>
        <div className="text-xs text-[var(--text-muted)] text-center py-6">
          No per-nutrient deficiencies found across students.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={14} className="text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Most Deficient Students
        </h2>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Top students most deficient in each nutrient, based on their meal reports.
      </p>

      <div className="flex flex-col gap-2">
        {breakdown.map((n) => {
          const isOpen = openNutrient === n.key;
          return (
            <div
              key={n.key}
              className="rounded-[10px] border border-[var(--border)] overflow-hidden"
            >
              {/* Nutrient header — clickable */}
              <button
                onClick={() => setOpenNutrient(isOpen ? null : n.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: `${n.color}18` }}
                >
                  <n.icon size={12} style={{ color: n.color }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-semibold" style={{ color: n.color }}>{n.label}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {n.students.length} student{n.students.length !== 1 ? 's' : ''} below 75%
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: n.color, background: `${n.color}18` }}
                  >
                    avg {n.avgPct ?? '—'}%
                  </span>
                  {isOpen ? <ChevronUp size={12} className="text-[var(--text-muted)]" /> : <ChevronDown size={12} className="text-[var(--text-muted)]" />}
                </div>
              </button>

              {/* Student list — expandable */}
              {isOpen && (
                <div className="border-t border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 flex flex-col gap-1.5">
                  {n.students.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="flex-1 text-xs text-[var(--text-primary)] truncate">{s.name}</div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* mini bar */}
                        <div className="w-16 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(s.avgPct, 100)}%`,
                              background: s.avgPct < 50 ? 'var(--red)' : 'var(--amber)',
                            }}
                          />
                        </div>
                        <span
                          className="text-[10px] font-bold w-8 text-right"
                          style={{ color: s.avgPct < 50 ? 'var(--red)' : 'var(--amber)' }}
                        >
                          {s.avgPct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function MealPlannerPage() {
  const toast = useToast();
  const [loading, setLoading]         = useState(true);
  const [reports, setReports]         = useState([]);
  const [students, setStudents]       = useState([]);
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => {
    Promise.all([
      getSchoolReports({}).catch(() => ({ data: { reports: [] } })),
      getStudents().catch(() => ({ data: { students: [] } })),
      getIngredients({ limit: 1000 }).catch(() => ({ data: { ingredients: [] } })),
    ]).then(([r, s, ing]) => {
      setReports(r.data.reports || []);
      setStudents(s.data.students || []);
      setIngredients(ing.data.ingredients || []);
    }).catch(() => toast('Failed to load data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const nutrientStats = useMemo(() => {
    return NUTRIENTS.map((n) => {
      const fields = REPORT_FIELDS[n.key];
      if (!fields) return { ...n, avgPct: null, deficient: false };

      const vals = reports
        .map((r) => {
          const received = parseFloat(r[fields.received]);
          const rda      = parseFloat(r[fields.rda]);
          return (!isNaN(received) && !isNaN(rda) && rda > 0)
            ? Math.round((received / rda) * 100)
            : null;
        })
        .filter((v) => v !== null);

      const avgPct = vals.length
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : null;

      return { ...n, avgPct, deficient: avgPct != null && avgPct < 75 };
    });
  }, [reports]);

  const neededNutrients = nutrientStats.filter((n) => n.deficient);

  const rankedIngredients = useMemo(() => {
    if (!neededNutrients.length || !ingredients.length) return [];

    return ingredients
      .map((ing) => {
        let score = 0;
        const reasons = [];

        neededNutrients.forEach((n) => {
          const val = parseFloat(ing[n.col]);
          if (!isNaN(val) && val > 0) {
            const weight = Math.max(0, (100 - n.avgPct) / 100);
            score += weight * (val / 100);
            reasons.push({ label: n.label, val: val.toFixed(1), unit: n.unit, color: n.color });
          }
        });

        return { ing, score, reasons };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [ingredients, neededNutrients]);

  const mealSuggestion = rankedIngredients.slice(0, 5);
  const deficientStudents = [...new Set(reports.map((r) => r.student_id))].length;

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Smart Meal Planner"
        description="Ingredient recommendations based on school-wide nutrition deficiency patterns"
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No nutrition data yet"
          description="Generate nutrition reports on the Nutrition page first. The planner uses those reports to identify what the school needs most."
        />
      ) : (
        <div className="flex gap-5 items-start">
          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            <Card>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  School Nutrition Overview
                </h2>
              </div>
              <div className="flex gap-4 mb-4 text-center">
                <div className="flex-1 bg-[var(--bg-hover)] rounded-[10px] py-3 px-2">
                  <div className="text-xl font-bold text-[var(--text-primary)]">{deficientStudents}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">students with deficiencies</div>
                </div>
                <div className="flex-1 bg-[var(--bg-hover)] rounded-[10px] py-3 px-2">
                  <div className="text-xl font-bold text-[var(--red)]">{neededNutrients.length}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">nutrients below target</div>
                </div>
                <div className="flex-1 bg-[var(--bg-hover)] rounded-[10px] py-3 px-2">
                  <div className="text-xl font-bold text-[var(--accent)]">{reports.length}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">reports analysed</div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {nutrientStats.map((n) => (
                  <DeficiencyBar
                    key={n.key}
                    label={`${n.label} avg adequacy`}
                    avgPct={n.avgPct}
                    color={
                      n.avgPct == null ? 'var(--text-muted)'
                      : n.avgPct >= 75 ? 'var(--green)'
                      : n.avgPct >= 50 ? 'var(--amber)'
                      : 'var(--red)'
                    }
                  />
                ))}
              </div>
            </Card>

            {/* Recommended add-ons */}
            {mealSuggestion.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={15} className="text-[var(--accent)]" />
                  <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Recommended Ingredients to Add
                  </h2>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Adding any of these to your existing meals can help cover the school's current nutrient gaps. You don't need to use all of them — pick what fits your menu.
                </p>
                <div className="flex flex-col gap-3">
                  {mealSuggestion.map(({ ing }, i) => (
                    <div
                      key={ing.id}
                      className="px-3 py-2.5 bg-[var(--bg-hover)] rounded-[10px] border border-[var(--border)]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-md bg-[var(--accent-dim)] text-[var(--accent)] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-[var(--text-primary)] font-semibold flex-1">
                          {ing.display_name}
                        </span>
                        {ing.category && (
                          <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{ing.category}</span>
                        )}
                      </div>
                      <NutritionPills ing={ing} />
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 mt-3 p-2.5 bg-[var(--accent-dim)] rounded-[8px]">
                  <Info size={12} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[var(--accent)] opacity-80">
                    These are suggestions based on current deficiency data. Choose ingredients that are practical for your school's kitchen and available locally.
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* ── Right column: per-nutrient student breakdown ── */}
          <div className="w-80 flex-shrink-0">
            <NutrientBreakdown nutrientStats={nutrientStats} reports={reports} />
          </div>
        </div>
      )}
    </div>
  );
}