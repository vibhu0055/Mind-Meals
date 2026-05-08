import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Spinner';
import { AlertTriangle, Zap, Beef, Wheat, Droplets, Activity, UtensilsCrossed } from 'lucide-react';
import { NUTRIENT_MAP, STATUS_META, getStatus, normaliseReport } from './nutrientUtils';

const ICON_MAP = {
  calories: Zap, protein: Beef, carbs: Wheat,
  fat: Droplets, fiber: Activity, iron: Activity, calcium: Activity,
};
const PIE_COLORS = ['#f59e0b','#60a5fa','#a78bfa','#fb923c','#34d399','#f87171','#38bdf8'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-3 text-xs shadow-xl">
      {label && <div className="font-semibold text-[var(--text-primary)] mb-1.5">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2.5 py-0.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-[var(--text-muted)]">{p.name}:</span>
          <span className="text-[var(--text-primary)] font-semibold mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatusSummaryRow({ breakdown }) {
  const counts = breakdown.reduce((acc, n) => {
    const s = n.status || getStatus(n.pct)?.id || 'adequate';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {['deficient','adequate','excess'].map((id) => {
        const m = STATUS_META[id];
        return (
          <div key={id} style={{ background: m.bg, borderColor: m.border }} className="border rounded-[10px] px-4 py-3.5 flex items-center gap-3">
            <span className="text-2xl leading-none">{m.dot}</span>
            <div>
              <div style={{ color: m.color }} className="text-2xl font-bold leading-none">{counts[id] || 0}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{m.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NutrientCard({ n }) {
  const meta = NUTRIENT_MAP[n.nutrient] || { label: n.nutrient, unit: 'g', color: '#8891a8' };
  const pct  = n.pct ?? (n.rda ? Math.round((n.received / n.rda) * 100) : 100);
  const st   = getStatus(pct) || STATUS_META.adequate;
  const Icon = ICON_MAP[n.nutrient] || Activity;
  const gap  = n.gap ?? (n.rda && n.received != null ? n.received - n.rda : null);
  return (
    <div style={{ background: 'var(--bg-card)', borderColor: st.id === 'deficient' ? 'rgba(248,113,113,0.35)' : 'var(--border)' }} className="border rounded-[12px] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div style={{ background: st.bg }} className="w-7 h-7 rounded-lg flex items-center justify-center">
            <Icon size={13} style={{ color: meta.color }} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{meta.label}</span>
        </div>
        <span className="text-lg leading-none">{st.dot}</span>
      </div>
      <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
        <span>Got: <strong className="text-[var(--text-primary)] mono">{n.received != null ? n.received.toFixed(1) : '—'}{meta.unit}</strong></span>
        <span>RDA: <strong className="mono">{n.rda != null ? n.rda.toFixed(1) : '—'}{meta.unit}</strong></span>
      </div>
      <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: st.color }} />
      </div>
      <div className="flex justify-between items-center">
        <span style={{ color: st.color }} className="text-xs font-bold mono">{pct}% of RDA</span>
        {gap !== null && (
          <span className={`text-[11px] mono font-medium ${gap < 0 ? 'text-[var(--red)]' : 'text-[var(--accent)]'}`}>
            {gap >= 0 ? '+' : ''}{gap.toFixed(1)}{meta.unit}
          </span>
        )}
      </div>
    </div>
  );
}

function DeficiencyAlert({ breakdown }) {
  const deficient = breakdown.filter((n) => (n.status || getStatus(n.pct)?.id) === 'deficient');
  if (!deficient.length) return null;
  return (
    <div className="mb-5 p-4 bg-[var(--red-dim)] border border-[rgba(248,113,113,0.3)] rounded-[12px]">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={15} className="text-[var(--red)]" />
        <span className="text-sm font-semibold text-[var(--red)]">{deficient.length} nutrient{deficient.length > 1 ? 's' : ''} below RDA threshold</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {deficient.map((n) => {
          const pct = n.pct ?? (n.rda ? Math.round((n.received / n.rda) * 100) : 0);
          return (
            <span key={n.nutrient} className="text-xs bg-[rgba(248,113,113,0.15)] text-[var(--red)] border border-[rgba(248,113,113,0.3)] px-2.5 py-1 rounded-full">
              {NUTRIENT_MAP[n.nutrient]?.label || n.nutrient} — {pct}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBarsSection({ breakdown }) {
  return (
    <Card className="mb-6">
      <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">📊 % RDA Completion</div>
      <div className="flex flex-col gap-3.5">
        {breakdown.map((n) => {
          const meta = NUTRIENT_MAP[n.nutrient] || { label: n.nutrient, unit: 'g' };
          const pct  = n.pct ?? (n.rda ? Math.round((n.received / n.rda) * 100) : 100);
          const st   = getStatus(pct);
          return (
            <div key={n.nutrient} className="flex items-center gap-3">
              <div className="w-16 text-xs text-[var(--text-muted)] flex-shrink-0 truncate">{meta.label}</div>
              <div className="flex-1 h-2.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: st?.color || 'var(--accent)' }} />
              </div>
              <div className="w-12 text-right">
                <span style={{ color: st?.color || 'var(--accent)' }} className="text-xs font-bold mono">{pct}%</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] w-16 text-right mono">
                {n.received != null ? n.received.toFixed(1) : '—'}{meta.unit}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NutrientAdequacyTable({ breakdown }) {
  return (
    <Card className="mb-6 overflow-hidden p-0">
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Nutrient adequacy table</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Nutrient', 'Received', 'Required', 'Adequacy', 'Category', 'Gap'].map((heading) => (
                <th key={heading} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breakdown.map((n) => {
              const meta = NUTRIENT_MAP[n.nutrient] || { label: n.nutrient, unit: 'g' };
              const pct = n.pct ?? (n.rda ? Math.round((n.received / n.rda) * 100) : null);
              const st = getStatus(pct) || STATUS_META.adequate;
              const gap = n.gap ?? (n.rda && n.received != null ? n.received - n.rda : null);
              return (
                <tr key={n.nutrient} className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{meta.label}</td>
                  <td className="px-4 py-3 text-xs mono text-[var(--text-secondary)]">{n.received != null ? n.received.toFixed(1) : '-'}{meta.unit}</td>
                  <td className="px-4 py-3 text-xs mono text-[var(--text-muted)]">{n.rda != null ? n.rda.toFixed(1) : '-'}{meta.unit}</td>
                  <td className="px-4 py-3">
                    <span style={{ color: st.color }} className="text-xs font-semibold mono">{pct == null ? '-' : `${pct}%`}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={st.badge}>{n.adequacy_category || st.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs mono text-[var(--text-muted)]">{gap == null ? '-' : `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}${meta.unit}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function IntakeVsRDAChart({ breakdown }) {
  const data = breakdown.map((n) => {
    const meta = NUTRIENT_MAP[n.nutrient];
    const pct  = n.pct ?? (n.rda ? Math.round((n.received / n.rda) * 100) : 100);
    return {
      name: meta?.label || n.nutrient,
      Received: parseFloat(n.received?.toFixed(1) ?? 0),
      RDA: parseFloat(n.rda?.toFixed(1) ?? 0),
      fill: getStatus(pct)?.color || 'var(--accent)',
    };
  });
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} barSize={16}>
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="Received" radius={[4,4,0,0]}>{data.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
          <Bar dataKey="RDA" fill="rgba(255,255,255,0.09)" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null;
  const radians = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * radians);
  const y = cy + radius * Math.sin(-midAngle * radians);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="700">{`${(percent * 100).toFixed(0)}%`}</text>;
}

function NutrientPieChart({ breakdown }) {
  const data = breakdown
    .map((n, i) => ({ name: NUTRIENT_MAP[n.nutrient]?.label || n.nutrient, value: parseFloat(n.received?.toFixed(2) ?? 0), fill: PIE_COLORS[i % PIE_COLORS.length] }))
    .filter((d) => d.value > 0);
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={76} dataKey="value" labelLine={false} label={renderPieLabel}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)' }} />
          <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: 'var(--text-primary)' }} formatter={(val, name) => [`${val}`, name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function NutritionInsightDashboard({ report, studentName, mealName }) {
  if (!report) return null;
  const norm      = normaliseReport(report);
  const breakdown = norm?.nutrient_breakdown || [];
  const sm        = STATUS_META[norm?.overall_status] || STATUS_META.adequate;

  if (!breakdown.length) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="No nutrient data in this report"
        description="The report was generated but contains no nutrient breakdown. Ensure the meal has ingredients and assigned class groups."
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-[var(--text-primary)]">{studentName || `Student ${norm.student_id}`}</h2>
            <Badge color={sm.badge}>{sm.dot} {sm.label}</Badge>
            {norm.bmi_flag && <Badge color="amber">BMI: {norm.bmi_category || 'flagged'}</Badge>}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1.5 flex-wrap">
            {mealName && <span className="text-[var(--accent)]">🍽 {mealName}</span>}
            {mealName && norm.age_group && <span>·</span>}
            {norm.age_group && <span>Age group: {norm.age_group}</span>}
            {norm.gender && <span>· {norm.gender}</span>}
          </p>
        </div>
        {norm.generated_at && (
          <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0">
            {new Date(norm.generated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <DeficiencyAlert breakdown={breakdown} />
      <StatusSummaryRow breakdown={breakdown} />
      <div className="grid grid-cols-4 gap-3 mb-6">
        {breakdown.map((n) => <NutrientCard key={n.nutrient} n={n} />)}
      </div>
      <ProgressBarsSection breakdown={breakdown} />
      <NutrientAdequacyTable breakdown={breakdown} />
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">📈 Intake vs RDA</div>
          <IntakeVsRDAChart breakdown={breakdown} />
        </Card>
        <Card>
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">🥧 Nutrient distribution</div>
          <NutrientPieChart breakdown={breakdown} />
        </Card>
      </div>
    </div>
  );
}
