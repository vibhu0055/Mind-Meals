import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudentById, notifyParent } from '../api/students';
import { getClasses } from '../api/classes';
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
  ArrowLeft,
  HeartPulse,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  RefreshCw,
  UtensilsCrossed,
  BellRing,
  Mail,
  Phone,
} from 'lucide-react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const genderColor = {
  male: 'blue',
  female: 'purple',
  other: 'muted',
};


function malnutritionColor(label) {
  if (!label) return 'muted';
  const l = label.toLowerCase();
  if (l === 'critical') return 'red';
  if (l === 'high risk') return 'amber';
  if (l === 'moderate risk') return 'amber';
  if (l === 'safe') return 'green';
  if (l === 'obese') return 'red';
  return 'muted';
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-2.5 text-xs shadow-xl">
      <div className="font-semibold text-[var(--text-primary)] mb-1">
        {label}
      </div>

      {payload.map((p) => (
        <div key={p.name} className="flex gap-2">
          <span className="text-[var(--text-muted)]">{p.name}:</span>

          <span className="text-[var(--text-primary)] mono font-semibold">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function WeightTrendChart({ records }) {
  if (records.length < 2) {
    return (
      <div className="flex items-center justify-center h-28 text-xs text-[var(--text-muted)]">
        Add at least 2 records to see trend
      </div>
    );
  }

  const data = [...records]
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .map((r) => ({
      date: new Date(r.recorded_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
      Weight: Number(r.weight_kg || 0),
    }));

  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="Weight" stroke="var(--blue)" strokeWidth={2} dot={{ fill: 'var(--blue)', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatTile({ label, value, unit, trend }) {
  const TrendIcon =
    trend > 0
      ? TrendingUp
      : trend < 0
      ? TrendingDown
      : Minus;

  const trendColor =
    trend > 0
      ? 'text-[var(--amber)]'
      : trend < 0
      ? 'text-[var(--accent)]'
      : 'text-[var(--text-muted)]';

  return (
    <div className="bg-[var(--bg-hover)] rounded-[10px] p-3.5">
      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-[var(--text-primary)] mono">
          {value ?? '-'}
        </span>

        {unit && (
          <span className="text-xs text-[var(--text-muted)]">
            {unit}
          </span>
        )}
      </div>

      {trend !== undefined && (
        <div
          className={`flex items-center gap-1 mt-1 text-[11px] ${trendColor}`}
        >
          <TrendIcon size={11} />

          <span>
            {trend > 0 ? '+' : ''}
            {trend !== 0 ? trend.toFixed(1) : 'no change'}
          </span>
        </div>
      )}
    </div>
  );
}

function NutriHistoryCard({ report }) {
  const sm = {
    deficient: {
      dot: '!',
      color: 'red',
      label: 'Low',
    },

    adequate: {
      dot: 'OK',
      color: 'green',
      label: 'Adequate',
    },

    excess: {
      dot: 'HIGH',
      color: 'amber',
      label: 'Excess',
    },
  };

  const s = sm[report.overall_status] || sm.adequate;

  return (
    <div className="flex items-center gap-3 bg-[var(--bg-hover)] rounded-[10px] p-3">
      <Zap
        size={14}
        className="text-[var(--amber)] flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
          {report.meal_name || `Meal ${report.meal_id}`}
        </div>

        {report.generated_at && (
          <div className="text-[11px] text-[var(--text-muted)]">
            {new Date(report.generated_at).toLocaleDateString(
              'en-IN',
              {
                day: 'numeric',
                month: 'short',
              }
            )}
          </div>
        )}
      </div>

      <Badge color={s.color}>
        {s.dot} {s.label}
      </Badge>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();

  const { isTeacher } = useAuth();

  const toast = useToast();

  const [student, setStudent] = useState(null);

  const [healthRecords, setHealthRecords] = useState([]);

  const [nutriReports, setNutriReports] = useState([]);

  const [meals, setMeals] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showAnalyze, setShowAnalyze] = useState(false);

  const [selectedMeal, setSelectedMeal] = useState('');

  const [analyzing, setAnalyzing] = useState(false);

  const [liveReport, setLiveReport] = useState(null);
  const [notifying, setNotifying] = useState(false);

  const handleNotify = async () => {
    setNotifying(true);
    try {
      const res = await notifyParent(id);
      const { channels } = res.data;
      const parts = [];
      if (channels?.email?.status === 'sent') parts.push('Email sent');
      else if (channels?.email?.status === 'error') parts.push('Email failed');
      if (channels?.sms?.status === 'sent') parts.push('SMS sent');
      else if (channels?.sms?.status === 'error') parts.push('SMS failed');
      toast(parts.length ? parts.join(' · ') : 'Alert dispatched', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send alert', 'error');
    } finally {
      setNotifying(false);
    }
  };

  useEffect(() => {
    Promise.all([
      getStudentById(id),

      getHealthRecordsByStudent(id).catch(() => ({
        data: { records: [] },
      })),

      getStudentReports(id).catch(() => ({
        data: [],
      })),

      getMeals().catch(() => ({
        data: { meals: [] },
      })),

      getClasses().catch(() => ({ data: { classes: [] } })),
    ])
      .then(([s, h, n, m, c]) => {
        const classList = c.data.classes || [];
        const studentData = s.data.student;
        // enrich with class_name if not already present
        if (studentData && !studentData.class_name && studentData.class_id) {
          const matched = classList.find(cl => String(cl.id) === String(studentData.class_id));
          if (matched) studentData.class_name = matched.name;
        }
        setStudent(studentData);

        const normalizedRecords = (h.data.records || []).map(
          (r) => ({
            ...r,
            height_cm:
              r.height_cm != null
                ? Number(r.height_cm)
                : null,

            weight_kg:
              r.weight_kg != null
                ? Number(r.weight_kg)
                : null,

            muac_cm:
              r.muac_cm != null
                ? Number(r.muac_cm)
                : null,

            bmi:
              r.bmi != null
                ? Number(r.bmi)
                : null,
          })
        );

        setHealthRecords(normalizedRecords);

        const reports = Array.isArray(n.data)
          ? n.data
          : n.data?.reports || [];

        setNutriReports(reports);

        setMeals(m.data.meals || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAnalyze = async () => {
    if (!selectedMeal) return;

    setAnalyzing(true);

    try {
      const res = await generateReport(id, selectedMeal);

      const newReport = res.data.report || res.data;

      setLiveReport(newReport);

      const mealObj = meals.find(
        (m) => String(m.id) === selectedMeal
      );

      setNutriReports((prev) => [
        {
          ...newReport,
          meal_name: mealObj?.name,
        },
        ...prev,
      ]);

      toast('Nutrition report generated!', 'success');

      setShowAnalyze(false);
    } catch (err) {
      toast(
        err.response?.data?.message ||
          'Failed to generate nutrition report',
        'error'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!student) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="Student not found"
        description="This student may have been removed."
      />
    );
  }

  const latest = healthRecords[0];

  const prev = healthRecords[1];

  const weightTrend =
    latest && prev
      ? Number(latest.weight_kg) -
        Number(prev.weight_kg)
      : undefined;
    return (
  <div className="animate-fade-in">
    <Link
      to="/students"
      className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
    >
      <ArrowLeft size={14} />
      Back to Students
    </Link>

    <Card className="mb-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--purple-dim)] flex items-center justify-center text-xl font-bold text-[var(--purple)] flex-shrink-0">
          {student.name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              {student.name}
            </h1>

            <Badge color={genderColor[student.gender] || 'muted'}>
              {student.gender}
            </Badge>

            {latest && (
              <>
                <Badge color={malnutritionColor(latest.malnutrition_label)}>
                  {latest.malnutrition_label}
                </Badge>
              </>
            )}
          </div>

          <div className="flex gap-5 text-sm text-[var(--text-muted)] flex-wrap">
            <span>
              Age{' '}
              <strong className="text-[var(--text-primary)]">
                {student.age}
              </strong>
            </span>

            <span>
              Class{' '}
              <strong className="text-[var(--text-primary)]">
                {student.class_name || '—'}
              </strong>
            </span>

            {latest && (
              <span>
                Height{' '}
                <strong className="text-[var(--text-primary)] mono">
                  {latest.height_cm}cm
                </strong>
              </span>
            )}

            {latest && (
              <span>
                Weight{' '}
                <strong className="text-[var(--text-primary)] mono">
                  {latest.weight_kg}kg
                </strong>
              </span>
            )}
          </div>

          {(student.parent_email || student.parent_phone) && (
            <div className="flex gap-4 mt-2 text-xs text-[var(--text-muted)] flex-wrap">
              {student.parent_email && (
                <span className="flex items-center gap-1">
                  <Mail size={11} />
                  {student.parent_email}
                </span>
              )}
              {student.parent_phone && (
                <span className="flex items-center gap-1">
                  <Phone size={11} />
                  {student.parent_phone}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(latest?.malnutrition_label === 'Critical' || latest?.malnutrition_label === 'High Risk') &&
            (student.parent_email || student.parent_phone) && (
              <Button
                variant="danger"
                icon={BellRing}
                loading={notifying}
                onClick={handleNotify}
              >
                Notify Parent
              </Button>
          )}
          {isTeacher && (
            <Button
              icon={Zap}
              onClick={() => setShowAnalyze(true)}
              disabled={meals.length === 0}
            >
              Analyze Meal
            </Button>
          )}
        </div>
      </div>
    </Card>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <HeartPulse
            size={15}
            className="text-[var(--amber)]"
          />

          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Health Records
          </h2>
        </div>

        {healthRecords.length === 0 ? (
          <Card>
            <EmptyState
              icon={HeartPulse}
              title="No health records yet"
              description="Add a health record to start tracking."
            />
          </Card>
        ) : (
          <>
            {latest && (
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <StatTile
                  label="Weight"
                  value={latest.weight_kg}
                  unit="kg"
                  trend={weightTrend}
                />

                <StatTile
                  label="Height"
                  value={latest.height_cm}
                  unit="cm"
                />

                {latest.bmi != null && (
                  <StatTile
                    label="BMI"
                    value={Number(latest.bmi).toFixed(1)}
                    unit=""
                  />
                )}

                <StatTile
                  label="MUAC"
                  value={latest.muac_cm ?? '-'}
                  unit="cm"
                />
              </div>
            )}

            <Card className="mb-4">
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Weight Trend
              </div>

              <WeightTrendChart records={healthRecords} />
            </Card>

            <div className="flex flex-col gap-2">
              {healthRecords.map((r) => (
                <Card key={r.id} className="py-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(
                        r.recorded_at
                      ).toLocaleDateString('en-IN')}
                    </span>

                    <div className="flex items-center gap-2">
                      {r.malnutrition_label && (
                        <Badge color={malnutritionColor(r.malnutrition_label)} className="text-[11px]">
                          {r.malnutrition_label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[var(--text-muted)]">
                        H
                      </span>{' '}
                      <span className="mono">
                        {r.height_cm}
                      </span>
                    </div>

                    <div>
                      <span className="text-[var(--text-muted)]">
                        W
                      </span>{' '}
                      <span className="mono">
                        {r.weight_kg}
                      </span>
                    </div>

                    {r.bmi != null && (
                      <div>
                        <span className="text-[var(--text-muted)]">BMI</span>{' '}
                        <span className="mono">{Number(r.bmi).toFixed(1)}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-[var(--text-muted)]">
                        MUAC
                      </span>{' '}
                      <span className="mono">
                        {r.muac_cm ?? '-'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3
            size={15}
            className="text-[var(--blue)]"
          />

          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Nutrition History
          </h2>
        </div>

        {nutriReports.length === 0 ? (
          <Card>
            <EmptyState
              icon={UtensilsCrossed}
              title="No nutrition reports yet"
              description="Generate a meal analysis report."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {nutriReports.map((r, i) => (
              <NutriHistoryCard key={i} report={r} />
            ))}
          </div>
        )}
      </div>
    </div>

    <Modal
      isOpen={showAnalyze}
      onClose={() => setShowAnalyze(false)}
      title={`Analyze meal for ${student.name}`}
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Select Meal"
          value={selectedMeal}
          onChange={(e) => setSelectedMeal(e.target.value)}
        >
          <option value="">Choose a meal...</option>

          {meals.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>

        <div className="flex gap-3 mt-1">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowAnalyze(false)}
          >
            Cancel
          </Button>

          <Button
            className="flex-1"
            icon={RefreshCw}
            loading={analyzing}
            onClick={handleAnalyze}
            disabled={!selectedMeal}
          >
            Generate Report
          </Button>
        </div>
      </div>
    </Modal>
  </div>
);
}