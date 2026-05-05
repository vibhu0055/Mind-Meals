import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStudentById } from '../api/students';
import { getHealthRecordsByStudent } from '../api/health';
import { getStudentReports } from '../api/nutrition';
import { getMeals } from '../api/meals';
import { generateReport } from '../api/nutrition';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ui/Toast';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import NutritionInsightDashboard from '../features/nutrition/NutritionInsightDashboard';
import {
  ArrowLeft, HeartPulse, BarChart3, TrendingUp,
  TrendingDown, Minus, Zap, RefreshCw, UtensilsCrossed,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

const genderColor = { male: 'blue', female: 'purple', other: 'muted' };

function bmiColor(cat) {
  if (!cat) return 'muted';
  const c = cat.toLowerCase();
  if (c.includes('underweight')) return 'amber';
  if (c.includes('normal'))      return 'green';
  if (c.includes('overweight') || c.includes('obese')) return 'red';
  return 'muted';
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-2.5 text-xs shadow-xl">
      <div className="font-semibold text-[var(--text-primary)] mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex gap-2">
          <span className="text-[var(--text-muted)]">{p.name}:</span>
          <span className="text-[var(--text-primary)] mono font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── BMI trend chart ──────────────────────────────────────────────────────────
function BMITrendChart({ records }) {
  if (records.length < 2) return (
    <div className="flex items-center justify-center h-28 text-xs text-[var(--text-muted)]">
      Add at least 2 records to see trend
    </div>
  );

  const data = [...records]
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .map((r) => ({
      date:   new Date(r.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      BMI:    parseFloat(r.bmi?.toFixed(2) || 0),
      Weight: parseFloat(r.weight_kg?.toFixed(1) || 0),
    }));

  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="BMI"    stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
          <Line type="monotone" dataKey="Weight" stroke="var(--blue)"   strokeWidth={2} dot={{ fill: 'var(--blue)', r: 3 }} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Latest health stat tile ──────────────────────────────────────────────────
function StatTile({ label, value, unit, trend }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-[var(--amber)]' : trend < 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]';
  return (
    <div className="bg-[var(--bg-hover)] rounded-[10px] p-3.5">
      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-[var(--text-primary)] mono">{value ?? '—'}</span>
        {unit && <span className="text-xs text-[var(--text-muted)]">{unit}</span>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-[11px] ${trendColor}`}>
          <TrendIcon size={11} />
          <span>{trend > 0 ? '+' : ''}{trend !== 0 ? trend.toFixed(1) : 'no change'}</span>
        </div>
      )}
    </div>
  );
}

// ─── Nutrition history card ───────────────────────────────────────────────────
function NutriHistoryCard({ report }) {
  const sm = {
    deficient: { dot: '🔴', color: 'red',   label: 'Low'      },
    adequate:  { dot: '🟢', color: 'green', label: 'Adequate' },
    excess:    { dot: '🟡', color: 'amber', label: 'Excess'   },
  };
  const s = sm[report.overall_status] || sm.adequate;
  return (
    <div className="flex items-center gap-3 bg-[var(--bg-hover)] rounded-[10px] p-3">
      <Zap size={14} className="text-[var(--amber)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
          {report.meal_name || `Meal ${report.meal_id}`}
        </div>
        {report.generated_at && (
          <div className="text-[11px] text-[var(--text-muted)]">
            {new Date(report.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>
      <Badge color={s.color}>{s.dot} {s.label}</Badge>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudentDetailPage() {
  const { id } = useParams();
  const { isTeacher } = useAuth();
  const toast = useToast();

  const [student, setStudent]           = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [nutriReports, setNutriReports] = useState([]);
  const [meals, setMeals]               = useState([]);
  const [loading, setLoading]           = useState(true);

  // Inline analyze modal
  const [showAnalyze, setShowAnalyze]   = useState(false);
  const [selectedMeal, setSelectedMeal] = useState('');
  const [analyzing, setAnalyzing]       = useState(false);
  const [liveReport, setLiveReport]     = useState(null);

  useEffect(() => {
    Promise.all([
      getStudentById(id),
      getHealthRecordsByStudent(id).catch(() => ({ data: { records: [] } })),
      getStudentReports(id).catch(() => ({ data: [] })),
      getMeals().catch(() => ({ data: { meals: [] } })),
    ]).then(([s, h, n, m]) => {
      setStudent(s.data.student);
      setHealthRecords(h.data.records || []);
      const reports = Array.isArray(n.data) ? n.data : n.data?.reports || [];
      setNutriReports(reports);
      setMeals(m.data.meals || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleAnalyze = async () => {
    if (!selectedMeal) return;
    setAnalyzing(true);
    try {
      const res = await generateReport(id, selectedMeal);
      const newReport = res.data.report || res.data;
      setLiveReport(newReport);
      // Also prepend to history list
      const mealObj = meals.find((m) => String(m.id) === selectedMeal);
      setNutriReports((prev) => [{ ...newReport, meal_name: mealObj?.name }, ...prev]);
      toast('Nutrition report generated!', 'success');
      setShowAnalyze(false);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed — make sure meal is distributed first', 'error');
    } finally { setAnalyzing(false); }
  };

  if (loading) return <PageLoader />;
  if (!student) return (
    <EmptyState icon={HeartPulse} title="Student not found" description="This student may have been removed." />
  );

  const latest = healthRecords[0];
  const prev   = healthRecords[1];
  const bmiTrend   = latest && prev ? latest.bmi    - prev.bmi    : undefined;
  const weightTrend = latest && prev ? latest.weight_kg - prev.weight_kg : undefined;

  return (
    <div className="animate-fade-in">
      <Link to="/students" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6">
        <ArrowLeft size={14} /> Back to Students
      </Link>

      {/* ── Student header card ── */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--purple-dim)] flex items-center justify-center text-xl font-bold text-[var(--purple)] flex-shrink-0">
            {student.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-lg font-bold text-[var(--text-primary)]">{student.name}</h1>
              <Badge color={genderColor[student.gender] || 'muted'}>{student.gender}</Badge>
              {latest && <Badge color={bmiColor(latest.bmi_category)}>{latest.bmi_category}</Badge>}
            </div>
            <div className="flex gap-5 text-sm text-[var(--text-muted)] flex-wrap">
              <span>Age <strong className="text-[var(--text-primary)]">{student.age}</strong></span>
              <span>Class ID <strong className="text-[var(--text-primary)] mono">{student.class_id}</strong></span>
              {latest && <span>Height <strong className="text-[var(--text-primary)] mono">{latest.height_cm}cm</strong></span>}
              {latest && <span>Weight <strong className="text-[var(--text-primary)] mono">{latest.weight_kg}kg</strong></span>}
            </div>
          </div>
          {(isTeacher) && (
            <Button
              icon={Zap}
              onClick={() => setShowAnalyze(true)}
              disabled={meals.length === 0}
            >
              Analyze Meal
            </Button>
          )}
          {meals.length === 0 && (
            <span className="text-xs text-[var(--text-muted)]">No meals yet</span>
          )}
        </div>
      </Card>

      {/* ── Live report (after "Analyze Meal" on this page) ── */}
      {liveReport && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={13} className="text-[var(--accent)]" />
            Latest Nutrition Analysis
          </div>
          <NutritionInsightDashboard
            report={liveReport}
            studentName={student.name}
            mealName={meals.find((m) => String(m.id) === selectedMeal)?.name}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* ── Health Records ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <HeartPulse size={15} className="text-[var(--amber)]" />
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Health Records</h2>
            <span className="text-xs text-[var(--text-muted)] ml-auto mono">{healthRecords.length} records</span>
          </div>

          {healthRecords.length === 0 ? (
            <Card>
              <EmptyState
                icon={HeartPulse}
                title="No health records yet"
                description="Add a health record from the Health page to start tracking this student's measurements."
              />
            </Card>
          ) : (
            <>
              {/* Latest stats */}
              {latest && (
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <StatTile label="BMI"    value={latest.bmi?.toFixed(1)}  unit=""     trend={bmiTrend}    />
                  <StatTile label="Weight" value={latest.weight_kg}         unit="kg"   trend={weightTrend} />
                  <StatTile label="Height" value={latest.height_cm}         unit="cm"   />
                  <StatTile label="MUAC"   value={latest.muac_cm ?? '—'}    unit="cm"   />
                </div>
              )}

              {/* BMI trend chart */}
              <Card className="mb-4">
                <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  📈 BMI & Weight trend
                </div>
                <BMITrendChart records={healthRecords} />
              </Card>

              {/* Record history */}
              <div className="flex flex-col gap-2">
                {healthRecords.map((r) => (
                  <Card key={r.id} className="py-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(r.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <Badge color={bmiColor(r.bmi_category)}>{r.bmi_category}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div><span className="text-[var(--text-muted)]">H </span><span className="mono">{r.height_cm}</span></div>
                      <div><span className="text-[var(--text-muted)]">W </span><span className="mono">{r.weight_kg}</span></div>
                      <div><span className="text-[var(--text-muted)]">BMI </span><span className="mono">{r.bmi?.toFixed(1)}</span></div>
                      <div><span className="text-[var(--text-muted)]">MUAC </span><span className="mono">{r.muac_cm ?? '—'}</span></div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Nutrition History ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} className="text-[var(--blue)]" />
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Nutrition History</h2>
            <span className="text-xs text-[var(--text-muted)] ml-auto mono">{nutriReports.length} reports</span>
          </div>

          {nutriReports.length === 0 ? (
            <Card>
              <EmptyState
                icon={UtensilsCrossed}
                title="No nutrition reports yet"
                description={
                  meals.length === 0
                    ? 'No meals added yet. Add a meal and distribute it first.'
                    : 'Click "Analyze Meal" on this profile to generate a report.'
                }
                action={
                  isTeacher && meals.length > 0 ? (
                    <Button icon={Zap} size="sm" onClick={() => setShowAnalyze(true)}>Analyze Meal</Button>
                  ) : null
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {nutriReports.map((r, i) => <NutriHistoryCard key={i} report={r} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Analyze Meal Modal ── */}
      <Modal isOpen={showAnalyze} onClose={() => setShowAnalyze(false)} title={`Analyze meal for ${student.name}`}>
        <div className="flex flex-col gap-4">
          <Select
            label="Select Meal"
            value={selectedMeal}
            onChange={(e) => setSelectedMeal(e.target.value)}
          >
            <option value="">Choose a meal...</option>
            {meals.map((m) => (
              <option key={m.id} value={m.id}>{m.name} — {m.meal_type} ({new Date(m.served_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})</option>
            ))}
          </Select>
          <div className="flex items-start gap-2.5 p-3 bg-[var(--blue-dim)] border border-[rgba(96,165,250,0.2)] rounded-[8px]">
            <span className="text-[var(--blue)] text-xs mt-0.5">💡</span>
            <p className="text-xs text-[var(--blue)]">Make sure the meal has been <strong>distributed</strong> before analyzing. Go to the Meals page → View → Distribute.</p>
          </div>
          <div className="flex gap-3 mt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAnalyze(false)}>Cancel</Button>
            <Button className="flex-1" icon={RefreshCw} loading={analyzing} onClick={handleAnalyze} disabled={!selectedMeal}>
              Generate Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
