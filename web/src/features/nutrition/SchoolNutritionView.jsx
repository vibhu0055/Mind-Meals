import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Spinner';
import { School, Users } from 'lucide-react';
import { STATUS_META, normaliseReport } from './nutrientUtils';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-3 text-xs shadow-xl">
      {label && <div className="font-semibold text-[var(--text-primary)] mb-1.5">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-[var(--text-muted)]">{p.name}:</span>
          <span className="text-[var(--text-primary)] font-semibold mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryCards({ reports, statusCounts }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Total Records</div>
        <div className="text-2xl font-bold text-[var(--text-primary)]">{reports.length}</div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">students</div>
      </Card>
      {['deficient','adequate','excess'].map((s) => {
        const m   = STATUS_META[s];
        const ct  = statusCounts[s] || 0;
        const pct = reports.length ? Math.round((ct / reports.length) * 100) : 0;
        return (
          <div key={s} style={{ background: m.bg, borderColor: m.border }} className="border rounded-[12px] p-4">
            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">{m.label}</div>
            <div style={{ color: m.color }} className="text-2xl font-bold leading-none">{ct}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{pct}% of students</div>
          </div>
        );
      })}
    </div>
  );
}

function StatusByClassChart({ reports }) {
  const classCounts = {};
  reports.forEach((r) => {
    const norm = normaliseReport(r);
    const cls  = norm?.class_name || r.class_name || 'Unknown';
    const s    = norm?.overall_status || r.overall_status || 'adequate';
    if (!classCounts[cls]) classCounts[cls] = { Adequate: 0, Deficient: 0, Excess: 0 };
    if (s === 'adequate')  classCounts[cls].Adequate++;
    else if (s === 'deficient') classCounts[cls].Deficient++;
    else if (s === 'excess')    classCounts[cls].Excess++;
  });

  const data = Object.entries(classCounts).map(([name, v]) => ({ name, ...v }));
  if (!data.length) return null;

  return (
    <Card className="mb-6">
      <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">📊 Status by class</div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={14} barGap={3}>
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)' }} />
            <Bar dataKey="Adequate"  fill="var(--accent)" radius={[3,3,0,0]} />
            <Bar dataKey="Deficient" fill="var(--red)"    radius={[3,3,0,0]} />
            <Bar dataKey="Excess"    fill="var(--amber)"  radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const SORT_OPTIONS = [
  { value: 'student_name', label: 'Student' },
  { value: 'class_name',   label: 'Class' },
  { value: 'overall_status', label: 'Status' },
];

export default function SchoolNutritionView({ reports }) {
  const [sort, setSort] = useState('student_name');

  if (!reports?.length) {
    return (
      <EmptyState
        icon={School}
        title="No school-wide reports found"
        description="Apply optional filters above and click Load Reports. Make sure meals have been distributed first."
      />
    );
  }

  const normalised = reports.map((r) => ({ ...r, _norm: normaliseReport(r) }));
  const sorted = [...normalised].sort((a, b) => {
    const aVal = String(a[sort] || a._norm?.[sort] || '');
    const bVal = String(b[sort] || b._norm?.[sort] || '');
    return aVal.localeCompare(bVal);
  });

  const statusCounts = normalised.reduce((acc, r) => {
    const s = r._norm?.overall_status || r.overall_status || 'adequate';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <SummaryCards reports={reports} statusCounts={statusCounts} />
      <StatusByClassChart reports={reports} />

      {/* Sortable table */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">All Records</span>
          </div>
          <select
            className="text-xs bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-border)]"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>Sort by {label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Student','Class','Age Group','Gender','Status','Energy','Protein','Iron','Calcium'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const norm = r._norm || r;
                const sm = STATUS_META[norm.overall_status] || STATUS_META.adequate;

                // Try to get pct from breakdown or flat fields
                const getPct = (key) => {
                  const fromBreakdown = norm.nutrient_breakdown?.find((n) => n.nutrient === key);
                  if (fromBreakdown) {
                    return fromBreakdown.pct ?? (fromBreakdown.rda ? Math.round((fromBreakdown.received / fromBreakdown.rda) * 100) : null);
                  }
                  return r[`${key}_pct`] ?? (r[`rda_${key}`] ? Math.round((r[`received_${key}`] / r[`rda_${key}`]) * 100) : null);
                };

                const pcts = [getPct('calories'), getPct('protein'), getPct('iron'), getPct('calcium')];

                return (
                  <tr key={i} className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                      {norm.student_name || r.student_name || `#${norm.student_id}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{norm.class_name || r.class_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] mono">{norm.age_group || '—'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{norm.gender || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={sm.badge}>{sm.dot} {norm.overall_status || 'processed'}</Badge>
                    </td>
                    {pcts.map((pct, j) => {
                      const c = pct === null ? 'var(--text-muted)' : pct < 90 ? 'var(--red)' : pct > 120 ? 'var(--amber)' : 'var(--accent)';
                      return (
                        <td key={j} className="px-4 py-3">
                          <span style={{ color: c }} className="text-xs font-semibold mono">{pct === null ? '—' : `${pct}%`}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
