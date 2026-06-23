import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Spinner';
import { ChevronDown, ChevronUp, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { NUTRIENT_MAP, STATUS_META, getStatus, normaliseReport } from './nutrientUtils';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-3 text-xs shadow-xl">
      {label && <div className="font-semibold text-[var(--text-primary)] mb-1">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex gap-2 py-0.5">
          <span className="text-[var(--text-muted)]">{p.name}:</span>
          <span className="text-[var(--text-primary)] font-semibold mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function ClassSummaryStats({ reports }) {
  const statusCounts = reports.reduce((acc, r) => {
    const norm = normaliseReport(r);
    const s = norm?.overall_status || 'adequate';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Most common deficiencies across all students
  const defNutrients = {};
  reports.forEach((r) => {
    const norm = normaliseReport(r);
    (norm?.nutrient_breakdown || []).forEach((n) => {
      if ((n.status || getStatus(n.pct)?.id) === 'deficient') {
        defNutrients[n.nutrient] = (defNutrients[n.nutrient] || 0) + 1;
      }
    });
  });
  const topDef = Object.entries(defNutrients).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const adequatePct = Math.round(((statusCounts.adequate || 0) / reports.length) * 100);

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Status breakdown */}
      <Card>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Overall Status</div>
        <div className="flex flex-col gap-2">
          {['deficient','adequate','excess'].map((s) => {
            const m  = STATUS_META[s];
            const ct = statusCounts[s] || 0;
            return (
              <div key={s} className="flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-secondary)] w-20 flex-shrink-0">{m.dot} {m.label}</span>
                <div className="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((ct / reports.length) * 100)}%`, backgroundColor: m.color }} />
                </div>
                <span style={{ color: m.color }} className="text-xs font-bold mono w-5 text-right">{ct}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top deficiencies */}
      <Card>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Top Deficiencies</div>
        {topDef.length === 0 ? (
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <CheckCircle size={14} />
            <span className="text-sm">No common deficiencies</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {topDef.map(([nutrient, count]) => (
              <div key={nutrient} className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-primary)]">{NUTRIENT_MAP[nutrient]?.label || nutrient}</span>
                <span className="text-xs text-[var(--red)] font-medium mono">{count}/{reports.length}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Coverage */}
      <Card>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Coverage</div>
        <div className="text-2xl font-bold text-[var(--text-primary)]">{reports.length}</div>
        <div className="text-xs text-[var(--text-muted)] mb-3">students analysed</div>
        <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden mb-1.5">
          <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${adequatePct}%` }} />
        </div>
        <span className="text-xs text-[var(--accent)] mono font-medium">{adequatePct}% adequate</span>
      </Card>
    </div>
  );
}

function ClassRadarChart({ reports }) {
  const nutrientTotals = {};
  reports.forEach((r) => {
    const norm = normaliseReport(r);
    (norm?.nutrient_breakdown || []).forEach((n) => {
      const pct = n.pct ?? (n.rda ? Math.round((n.received / n.rda) * 100) : null);
      if (pct === null) return;
      if (!nutrientTotals[n.nutrient]) nutrientTotals[n.nutrient] = [];
      nutrientTotals[n.nutrient].push(pct);
    });
  });

  const data = Object.entries(nutrientTotals).map(([key, pcts]) => ({
    nutrient: NUTRIENT_MAP[key]?.label || key,
    avgPct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
    fullMark: 150,
  }));

  if (!data.length) return null;

  return (
    <Card className="mb-6">
      <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
        📡 Class average — % of RDA met
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={90}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="nutrient" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
            <Radar dataKey="avgPct" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.18} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v}%`, 'Avg RDA coverage']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StudentRow({ r }) {
  const [open, setOpen] = useState(false);
  const norm      = normaliseReport(r);
  const sm        = STATUS_META[norm?.overall_status] || STATUS_META.adequate;
  const breakdown = norm?.nutrient_breakdown || [];

  return (
    <div className="border border-[var(--border)] rounded-[10px] overflow-hidden mb-2 transition-colors hover:border-[var(--border-soft)]">
      <button
        className="w-full flex items-center gap-4 px-4 py-3 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-all text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--purple-dim)] text-[var(--purple)] font-bold text-sm flex items-center justify-center flex-shrink-0">
          {norm?.student_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{norm?.student_name || `Student ${norm?.student_id}`}</div>
          <div className="text-xs text-[var(--text-muted)]">
            {norm?.age_group && <span>Age group: {norm.age_group}</span>}
            {norm?.gender && <span> · {norm.gender}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge color={sm.badge}>{sm.dot} {norm?.overall_status || 'processed'}</Badge>

          {open ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
        </div>
      </button>

      {open && breakdown.length > 0 && (
        <div className="px-4 pb-4 pt-3 bg-[var(--bg-surface)] border-t border-[var(--border)]">
          <div className="grid grid-cols-4 gap-2.5">
            {breakdown.map((n) => {
              const pct = n.pct ?? (n.rda ? Math.round((n.received / n.rda) * 100) : 100);
              const st  = getStatus(pct) || STATUS_META.adequate;
              return (
                <div key={n.nutrient} className="bg-[var(--bg-card)] rounded-[8px] p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-[var(--text-muted)]">{NUTRIENT_MAP[n.nutrient]?.label || n.nutrient}</span>
                    <span className="text-xs">{st.dot}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: st.color }} />
                  </div>
                  <div style={{ color: st.color }} className="text-xs font-bold mono">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClassNutritionView({ reports, className, mealName }) {
  if (!reports?.length) {
    return (
      <EmptyState
        icon={Users}
        title="No student reports in this class"
        description="Make sure students are enrolled and the meal has ingredients before analyzing."
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">{className || 'Class'} — Nutrition Analysis</h2>
          {mealName && <p className="text-xs text-[var(--text-muted)] mt-0.5">🍽 {mealName}</p>}
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Users size={14} />
          <span className="text-sm mono">{reports.length} students</span>
        </div>
      </div>
      <ClassSummaryStats reports={reports} />
      <ClassRadarChart reports={reports} />
      <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Per-student breakdown</div>
      {reports.map((r, i) => <StudentRow key={r.student_id || i} r={r} />)}
    </div>
  );
}