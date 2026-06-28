import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getTeachers } from '../api/teachers';
import { getClasses } from '../api/classes';
import { getStudents, getStudentsByClass } from '../api/students';
import { getMeals, getTodaysMeal, getMealScore } from '../api/meals';
import { getTeacherProfile } from '../api/teachers';
import { getSchoolReports } from '../api/nutrition';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import AssignedClassCards from '../components/dashboard/AssignedClassCards';
import {
  UserSquare2, BookOpen, Users, UtensilsCrossed,
  ArrowRight, ShieldAlert, AlertTriangle,
  BellRing, CalendarDays, ChevronRight, Activity,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function getTeacherId(user, profile) {
  return profile?.id || user?.id || user?.user_id || null;
}
function getClassTeacherId(c) {
  return c.assigned_teacher_id || c.teacher_id || c.teacher?.id || c.assigned_teacher?.id || '';
}
function hasTeacherAssignment(c) { return !!getClassTeacherId(c); }

function normaliseAssignedClasses(profile, classes, teacherId) {
  const raw = profile?.assigned_classes || profile?.classes || profile?.class_names;
  let parsed = raw;
  if (typeof raw === 'string') { try { parsed = JSON.parse(raw); } catch { parsed = []; } }
  if (Array.isArray(parsed) && parsed.length) {
    return parsed.map((c) => ({ id: c.id || c.class_id, name: c.name || c.class_name, section: c.section })).filter((c) => c.id);
  }
  const withAssign = classes.filter(hasTeacherAssignment);
  const src = withAssign.length ? withAssign.filter((c) => String(getClassTeacherId(c)) === String(teacherId)) : classes;
  return src.map((c) => ({ id: c.id, name: c.name || c.class_name, section: c.section }));
}

function getStudentArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.students)) return data.students;
  return [];
}

function scoreColor(score) {
  if (score >= 85) return 'var(--accent)';
  if (score >= 65) return 'var(--amber)';
  return 'var(--red)';
}
function scoreLabel(score) {
  if (score >= 85) return 'Balanced';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'Average';
  return 'Poor';
}
function scoreColorName(score) {
  if (score >= 85) return 'green';
  if (score >= 65) return 'amber';
  return 'red';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── StatCard ────────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color = 'green', to, sublabel }) {
  const palette = {
    green:  { icon: 'text-[var(--accent)]  bg-[var(--accent-dim)]' },
    amber:  { icon: 'text-[var(--amber)]   bg-[var(--amber-dim)]' },
    blue:   { icon: 'text-[var(--blue)]    bg-[var(--blue-dim)]' },
    purple: { icon: 'text-[var(--purple)]  bg-[var(--purple-dim)]' },
    red:    { icon: 'text-[var(--red)]     bg-[var(--red-dim)]' },
  };
  const p = palette[color] || palette.green;

  const inner = (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 h-full flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${p.icon}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-3xl font-bold text-[var(--text-primary)] leading-none">{value}</div>
        <div className="text-xs text-[var(--text-muted)] mt-1.5 truncate">{label}</div>
        {sublabel && <div className="text-[10px] text-[var(--text-muted)] opacity-60 truncate mt-0.5">{sublabel}</div>}
      </div>
      {to && <ChevronRight size={15} className="text-[var(--text-muted)] flex-shrink-0" />}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}

/* ─── TodaysMealCard ──────────────────────────────────────────────────────── */
function TodaysMealCard({ meal, score }) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  const sc = typeof score === 'number' ? score : null;

  if (!meal) {
    return (
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={15} className="text-[var(--text-muted)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Today's Meal</span>
          <span className="text-xs text-[var(--text-muted)] ml-auto">{today}</span>
        </div>
        <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-[var(--bg-hover)] border border-dashed border-[var(--border)]">
          <UtensilsCrossed size={18} className="text-[var(--text-muted)]" />
          <div>
            <div className="text-sm font-medium text-[var(--text-secondary)]">No meal logged yet</div>
            <div className="text-xs text-[var(--text-muted)]">Log today's meal to track nutrition</div>
          </div>
          <Link to="/meals" className="ml-auto text-xs font-semibold text-[var(--accent)] hover:opacity-80 flex-shrink-0">
            Log now →
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={15} className="text-[var(--text-muted)]" />
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Today's Meal</span>
        <span className="text-xs text-[var(--text-muted)] ml-auto">{today}</span>
      </div>
      <div className="flex items-center gap-4">
        {sc !== null && (
          <div className="flex flex-col items-center flex-shrink-0">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26" fill="none"
                stroke={scoreColor(sc)} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${(sc / 100) * 163.4} 163.4`}
                transform="rotate(-90 32 32)"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
              <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700" fill={scoreColor(sc)}>{sc}</text>
            </svg>
            <Badge color={scoreColorName(sc)} className="text-[10px] mt-1">{scoreLabel(sc)}</Badge>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-[var(--text-primary)] truncate">{meal.name}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {meal.ingredients?.length > 0
              ? `${meal.ingredients.length} ingredient${meal.ingredients.length !== 1 ? 's' : ''}`
              : 'No ingredients yet'}
          </div>
          <Link
            to={`/meals/${meal.id}`}
            className="inline-flex items-center gap-1 mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            View details <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </Card>
  );
}

/* ─── NutritionStatusRow ─────────────────────────────────────────────────── */
function NutritionStatusRow({ reports }) {
  if (!reports?.length) return null;
  const total = reports.length;
  const adequate  = reports.filter((r) => r.overall_status === 'adequate').length;
  const deficient = reports.filter((r) => r.overall_status === 'deficient').length;
  const excess    = reports.filter((r) => r.overall_status === 'excess').length;

  return (
    <Card className="mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={15} className="text-[var(--text-muted)]" />
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Latest Nutrition Reports</span>
        <Link to="/nutrition" className="ml-auto text-xs text-[var(--accent)] hover:opacity-80 flex items-center gap-1">
          All reports <ArrowRight size={11} />
        </Link>
      </div>
      <div className="flex rounded-full overflow-hidden h-3 mb-4 gap-0.5">
        {adequate  > 0 && <div className="h-full rounded-full" style={{ width: `${Math.round((adequate  / total) * 100)}%`, background: 'var(--accent)' }} />}
        {deficient > 0 && <div className="h-full rounded-full" style={{ width: `${Math.round((deficient / total) * 100)}%`, background: 'var(--red)' }} />}
        {excess    > 0 && <div className="h-full rounded-full" style={{ width: `${Math.round((excess    / total) * 100)}%`, background: 'var(--amber)' }} />}
      </div>
      <div className="flex gap-5">
        {[
          { label: 'Adequate',  count: adequate,  color: 'var(--accent)' },
          { label: 'Deficient', count: deficient, color: 'var(--red)' },
          { label: 'Excess',    count: excess,    color: 'var(--amber)' },
        ].map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-xs text-[var(--text-muted)]">{label}</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{count}</span>
          </div>
        ))}
        <span className="ml-auto text-xs text-[var(--text-muted)]">{total} total</span>
      </div>
    </Card>
  );
}

/* ─── AtRiskPanel ────────────────────────────────────────────────────────── */
function AtRiskPanel({ riskStats, totalStudents }) {
  const rows = [
    { label: 'Critical',      count: riskStats?.critical ?? 0, icon: ShieldAlert,   color: 'var(--red)',   dim: 'var(--red-dim)',   desc: 'Severe / SAM' },
    { label: 'High Risk',     count: riskStats?.highRisk  ?? 0, icon: AlertTriangle, color: 'var(--amber)', dim: 'var(--amber-dim)', desc: 'Needs attention' },
    { label: 'Moderate Risk', count: riskStats?.moderate  ?? 0, icon: AlertTriangle, color: 'var(--amber)', dim: 'var(--amber-dim)', desc: 'Monitor closely' },
  ];
  const flagged = (riskStats?.critical ?? 0) + (riskStats?.highRisk ?? 0) + (riskStats?.moderate ?? 0);
  const pct = totalStudents ? Math.round((flagged / totalStudents) * 100) : null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[var(--red-dim)] flex items-center justify-center">
          <ShieldAlert size={14} className="text-[var(--red)]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">Health Risk</div>
          <div className="text-[10px] text-[var(--text-muted)]">WHO malnutrition classification</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {rows.map(({ label, count, icon: Icon, color, dim, desc }) => (
          <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--border)]"
            style={{ background: dim + '66' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: dim }}>
              <Icon size={13} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color }}>{label}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{desc}</div>
            </div>
            <div className="text-xl font-bold flex-shrink-0" style={{ color }}>{count}</div>
          </div>
        ))}
      </div>

      {pct !== null && (
        <div className="px-3 py-2.5 bg-[var(--bg-hover)] rounded-xl border border-[var(--border)] mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)]">Total flagged</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{flagged} <span className="text-[var(--text-muted)] font-normal">({pct}%)</span></span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(pct, 100)}%`, background: pct > 20 ? 'var(--red)' : pct > 10 ? 'var(--amber)' : 'var(--accent)' }} />
          </div>
        </div>
      )}

      <Link to="/at-risk"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-semibold hover:opacity-80 transition-opacity border border-[var(--accent-border)]">
        View At-Risk Students <ArrowRight size={12} />
      </Link>
    </Card>
  );
}

/* ─── RecentMeals ────────────────────────────────────────────────────────── */
function RecentMeals({ meals }) {
  if (!meals?.length) return null;
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Recent Meals</div>
        <Link to="/meals" className="text-xs text-[var(--accent)] hover:opacity-80">All →</Link>
      </div>
      <div className="flex flex-col gap-1">
        {meals.slice(0, 4).map((m) => (
          <Link key={m.id} to={`/meals/${m.id}`}>
            <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors group">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed size={12} className="text-[var(--accent)]" />
              </div>
              <span className="flex-1 text-xs font-semibold text-[var(--text-primary)] truncate">{m.name}</span>
              <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                {new Date(m.served_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
              <ChevronRight size={12} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user, isSchool, isTeacher } = useAuth();
  const [stats, setStats]                   = useState(null);
  const [riskStats, setRiskStats]           = useState(null);
  const [todaysMeal, setTodaysMeal]         = useState(undefined);
  const [mealScore, setMealScore]           = useState(null);
  const [recentMeals, setRecentMeals]       = useState([]);
  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const mealRes = await getTodaysMeal().catch(() => null);
        const meal = mealRes?.data?.meal ?? null;
        setTodaysMeal(meal ? { ...meal, ingredients: mealRes?.data?.ingredients || [] } : null);
        if (meal?.id) getMealScore(meal.id).then((r) => setMealScore(r.data?.score ?? null)).catch(() => {});

        const mealsRes = await getMeals().catch(() => null);
        const allMeals = mealsRes?.data?.meals || [];
        setRecentMeals([...allMeals].sort((a, b) => new Date(b.served_date) - new Date(a.served_date)));

        if (isSchool) {
          const [t, c, s, critical, highRisk, moderate, reports] = await Promise.allSettled([
            getTeachers(), getClasses(), getStudents(),
            getStudents({ malnutrition_label: 'Critical' }),
            getStudents({ malnutrition_label: 'High Risk' }),
            getStudents({ malnutrition_label: 'Moderate Risk' }),
            meal?.id ? getSchoolReports({ meal_id: meal.id }) : Promise.resolve(null),
          ]);
          setStats({ teachers: t.value?.data?.teachers?.length ?? '-', classes: c.value?.data?.classes?.length ?? '-', students: s.value?.data?.total ?? s.value?.data?.students?.length ?? '-', meals: allMeals.length });
          setRiskStats({ critical: critical.value?.data?.total ?? critical.value?.data?.students?.length ?? 0, highRisk: highRisk.value?.data?.total ?? highRisk.value?.data?.students?.length ?? 0, moderate: moderate.value?.data?.total ?? moderate.value?.data?.students?.length ?? 0 });
          if (reports.value?.data?.reports?.length) setNutritionSummary(reports.value.data.reports);
        } else {
          const [profile, classRes] = await Promise.allSettled([getTeacherProfile(), getClasses()]);
          const profileData = profile.value?.data?.teacher;
          const teacherId = getTeacherId(user, profileData);
          const classList = classRes.value?.data?.classes || [];
          const assignedClasses = normaliseAssignedClasses(profileData, classList, teacherId);
          const classesWithCounts = await Promise.all(
            assignedClasses.map(async (cl) => {
              const res = await getStudentsByClass(cl.id).catch(() => null);
              return { ...cl, studentCount: getStudentArray(res?.data).length };
            })
          );
          const studentCount = classesWithCounts.reduce((s, c) => s + c.studentCount, 0);
          const riskResults = await Promise.allSettled(
            assignedClasses.map((cl) => Promise.allSettled([
              getStudentsByClass(cl.id, { malnutrition_label: 'Critical' }),
              getStudentsByClass(cl.id, { malnutrition_label: 'High Risk' }),
              getStudentsByClass(cl.id, { malnutrition_label: 'Moderate Risk' }),
            ]))
          );
          let tCritical = 0, tHigh = 0, tModerate = 0;
          riskResults.forEach((r) => {
            if (r.status === 'fulfilled') {
              tCritical += r.value[0].value?.data?.total ?? r.value[0].value?.data?.students?.length ?? 0;
              tHigh     += r.value[1].value?.data?.total ?? r.value[1].value?.data?.students?.length ?? 0;
              tModerate += r.value[2].value?.data?.total ?? r.value[2].value?.data?.students?.length ?? 0;
            }
          });
          setRiskStats({ critical: tCritical, highRisk: tHigh, moderate: tModerate });
          setStats({ profile: profileData, classes: assignedClasses.length, assignedClasses: classesWithCounts, students: studentCount, meals: allMeals.length });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [isSchool, user]);

  if (loading) return <PageLoader />;

  const totalStudents = typeof stats?.students === 'number' ? stats.students : null;
  const flagged = (riskStats?.critical ?? 0) + (riskStats?.highRisk ?? 0);
  const isCritical = (riskStats?.critical ?? 0) > 0;

  return (
    <div>

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {isSchool ? 'School administration overview' : 'Your teaching dashboard'}
          </p>
        </div>
        <div className="flex-shrink-0 text-left sm:text-right">
          <div className="text-[15px] font-semibold text-[var(--text-primary)]">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long' })}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Alert banner ── */}
      {flagged > 0 && (
        <Link to="/at-risk">
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#F09595] bg-[#f3e1e1] px-5 py-3 transition-colors duration-150 hover:border-[#E24B4A] cursor-pointer sm:flex-row sm:items-start">
            <div className="w-2 h-2 rounded-full bg-[#E24B4A] flex-shrink-0 mt-[5px]" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-[#b12020] uppercase tracking-wider mb-1">
                High priority
              </div>
              <div className="text-[13px] text-[#c61515] leading-snug">
                {isCritical
                  ? `${riskStats.critical} student${riskStats.critical !== 1 ? 's' : ''} in critical condition — requires close attention.`
                  : `${riskStats.highRisk} student${riskStats.highRisk !== 1 ? 's' : ''} flagged as high risk — review recommended.`}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[12px] font-semibold text-[#A32D2D] flex-shrink-0 self-end">
              Review <ArrowRight size={12} />
            </div>
          </div>
        </Link>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left column */}
        <div className="min-w-0 flex-1">

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isSchool ? (
              <>
                <StatCard label="Teachers"      value={stats?.teachers} icon={UserSquare2}    color="blue"   to="/teachers" />
                <StatCard label="Classes"        value={stats?.classes}  icon={BookOpen}        color="amber"  to="/classes" />
                <StatCard label="Total Students" value={stats?.students} icon={Users}           color="purple" to="/students" />
                <StatCard label="Meals Logged"   value={stats?.meals}    icon={UtensilsCrossed} color="green"  to="/meals" sublabel={`${recentMeals.length} this period`} />
              </>
            ) : (
              <>
                <StatCard label="Assigned Classes"  value={stats?.classes}  icon={BookOpen}        color="amber" />
                <StatCard label="My Students"        value={stats?.students} icon={Users}           color="purple" to="/students" />
                <StatCard label="Meals Logged"       value={stats?.meals}    icon={UtensilsCrossed} color="green"  to="/meals" />
                <StatCard label="At-Risk Students"   value={(riskStats?.critical ?? 0) + (riskStats?.highRisk ?? 0)} icon={ShieldAlert} color={(riskStats?.critical ?? 0) > 0 ? 'red' : 'amber'} to="/at-risk" sublabel="Critical + High Risk" />
              </>
            )}
          </div>

          <TodaysMealCard meal={todaysMeal?.id ? todaysMeal : null} score={mealScore} />
          {isSchool && nutritionSummary && <NutritionStatusRow reports={nutritionSummary} />}
          {isTeacher && <AssignedClassCards classes={stats?.assignedClasses || []} className="mb-5" />}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 lg:w-72 lg:flex-shrink-0">
          <AtRiskPanel riskStats={riskStats} totalStudents={totalStudents} />
          <RecentMeals meals={recentMeals} />
        </div>
      </div>
    </div>
  );
}