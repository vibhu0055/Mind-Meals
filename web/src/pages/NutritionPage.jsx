import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getSchoolReports, getStudentReports, generateReport,
  generateClassReport,
} from '../api/nutrition';
import { getStudents } from '../api/students';
import { getClasses } from '../api/classes';
import { getMeals } from '../api/meals';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import NutritionInsightDashboard from '../features/nutrition/NutritionInsightDashboard';
import ClassNutritionView from '../features/nutrition/ClassNutritionView';
import SchoolNutritionView from '../features/nutrition/SchoolNutritionView';
import { BarChart3, RefreshCw, UtensilsCrossed, Users, School, Info } from 'lucide-react';

const TABS = [
  { id: 'student', label: 'Student',     icon: Users    },
  { id: 'class',   label: 'Class',       icon: School   },
  { id: 'school',  label: 'School-wide', icon: BarChart3, schoolOnly: true },
];

function NoMealsBanner() {
  return (
    <div className="flex items-start gap-3 p-4 bg-[var(--amber-dim)] border border-[rgba(245,158,11,0.25)] rounded-[10px] mt-4">
      <UtensilsCrossed size={16} className="text-[var(--amber)] flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-[var(--amber)]">No meal added today</p>
        <p className="text-xs text-[var(--amber)] opacity-80 mt-0.5">
          Add a meal and distribute it before generating a nutrition report.
        </p>
      </div>
    </div>
  );
}

function DistributeHint() {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-[var(--blue-dim)] border border-[rgba(96,165,250,0.2)] rounded-[8px] mt-3">
      <Info size={14} className="text-[var(--blue)] flex-shrink-0 mt-0.5" />
      <p className="text-xs text-[var(--blue)]">
        Tip: Make sure you've clicked <strong>Distribute</strong> on the meal before analyzing nutrition.
      </p>
    </div>
  );
}

export default function NutritionPage() {
  const { isSchool } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [tab, setTab]                   = useState('student');
  const [students, setStudents]         = useState([]);
  const [classes, setClasses]           = useState([]);
  const [meals, setMeals]               = useState([]);
  const [selectedStudent, setSStudent]  = useState('');
  const [selectedClass, setSClass]      = useState('');
  const [selectedMeal, setSMeal]        = useState(searchParams.get('meal_id') || '');
  const [report, setReport]             = useState(null);
  const [classReports, setClassReports] = useState([]);
  const [schoolReports, setSchoolReports] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [swStatus, setSwStatus]         = useState('');
  const [swNutrient, setSwNutrient]     = useState('');

  useEffect(() => {
    Promise.all([
      getStudents().catch(() => ({ data: { students: [] } })),
      getClasses().catch(() => ({ data: { classes: [] } })),
      getMeals().catch(() => ({ data: { meals: [] } })),
    ]).then(([s, c, m]) => {
      setStudents(s.data.students || []);
      setClasses(c.data.classes || []);
      setMeals(m.data.meals || []);
    }).finally(() => setLoading(false));
  }, []);

  const resetResults = () => { setReport(null); setClassReports([]); setSchoolReports([]); };

  const handleGenerateStudent = async () => {
    if (!selectedStudent || !selectedMeal) { toast('Select both student and meal', 'warning'); return; }
    setGenerating(true);
    try {
      const res = await generateReport(selectedStudent, selectedMeal);
      setReport(res.data.report || res.data);
      toast('Report generated!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Generation failed — make sure meal is distributed first', 'error');
    } finally { setGenerating(false); }
  };

  const handleGenerateClass = async () => {
    if (!selectedClass || !selectedMeal) { toast('Select both class and meal', 'warning'); return; }
    setGenerating(true);
    try {
      const res = await generateClassReport(selectedClass, selectedMeal);
      setClassReports(res.data.reports || []);
      toast(`Reports generated for ${res.data.reports?.length ?? 0} students`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Generation failed', 'error');
    } finally { setGenerating(false); }
  };

  const handleSchoolReports = async () => {
    setGenerating(true);
    try {
      const res = await getSchoolReports({
        meal_id:  selectedMeal  || undefined,
        status:   swStatus      || undefined,
        nutrient: swNutrient    || undefined,
      });
      setSchoolReports(res.data.reports || []);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setGenerating(false); }
  };

  const visibleTabs    = TABS.filter((t) => !t.schoolOnly || isSchool);
  const currentMeal    = meals.find((m) => String(m.id) === String(selectedMeal));
  const currentStudent = students.find((s) => String(s.id) === String(selectedStudent));
  const currentClass   = classes.find((c) => String(c.id) === String(selectedClass));

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nutrition Insights"
        description="Analyse intake vs. RDA per student, class, or school"
      />

      {/* Tab strip */}
      <div className="flex gap-1 mb-6 p-1 bg-[var(--bg-surface)] rounded-[10px] w-fit border border-[var(--border)]">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); resetResults(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
              ${tab === id
                ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── STUDENT TAB ── */}
      {tab === 'student' && (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <Select
                label="Student" className="w-52"
                value={selectedStudent}
                onChange={(e) => { setSStudent(e.target.value); setReport(null); }}
              >
                <option value="">Select student...</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} (Age {s.age})</option>)}
              </Select>
              <Select
                label="Meal" className="w-52"
                value={selectedMeal}
                onChange={(e) => { setSMeal(e.target.value); setReport(null); }}
              >
                <option value="">Select meal...</option>
                {meals.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.meal_type}</option>)}
              </Select>
              <Button icon={RefreshCw} loading={generating} onClick={handleGenerateStudent}>
                Analyze Meal
              </Button>
            </div>
            {meals.length === 0 && <NoMealsBanner />}
            {meals.length > 0 && selectedMeal && !report && <DistributeHint />}
          </Card>

          {report ? (
            <NutritionInsightDashboard
              report={report}
              studentName={currentStudent?.name}
              mealName={currentMeal?.name}
            />
          ) : (
            <EmptyState
              icon={BarChart3}
              title={
                students.length === 0 ? 'No students yet' :
                meals.length === 0    ? 'No meals added yet' :
                selectedStudent && selectedMeal ? 'Ready to analyze' :
                'Select a student and meal'
              }
              description={
                students.length === 0 ? 'Add students before generating nutrition reports.' :
                meals.length === 0    ? 'Add a meal and distribute it, then come back to analyze nutrition.' :
                !selectedStudent      ? 'Choose a student from the dropdown above.' :
                !selectedMeal         ? 'Now select a meal to analyse.' :
                'Click "Analyze Meal" to generate the nutrition report.'
              }
              action={
                students.length === 0 || meals.length === 0 ? null : undefined
              }
            />
          )}
        </>
      )}

      {/* ── CLASS TAB ── */}
      {tab === 'class' && (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <Select
                label="Class" className="w-52"
                value={selectedClass}
                onChange={(e) => { setSClass(e.target.value); setClassReports([]); }}
              >
                <option value="">Select class...</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` – ${c.section}` : ''}</option>)}
              </Select>
              <Select
                label="Meal" className="w-52"
                value={selectedMeal}
                onChange={(e) => { setSMeal(e.target.value); setClassReports([]); }}
              >
                <option value="">Select meal...</option>
                {meals.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.meal_type}</option>)}
              </Select>
              <Button icon={RefreshCw} loading={generating} onClick={handleGenerateClass}>
                Analyze Class
              </Button>
            </div>
            {meals.length === 0 && <NoMealsBanner />}
            {meals.length > 0 && selectedMeal && classReports.length === 0 && <DistributeHint />}
          </Card>

          {classReports.length > 0 ? (
            <ClassNutritionView
              reports={classReports}
              className={currentClass?.name}
              mealName={currentMeal?.name}
            />
          ) : (
            <EmptyState
              icon={Users}
              title={
                classes.length === 0 ? 'No classes yet' :
                meals.length === 0   ? 'No meals added yet' :
                'Select a class and meal'
              }
              description={
                classes.length === 0 ? 'Create classes before generating class reports.' :
                meals.length === 0   ? 'Add and distribute a meal before analyzing nutrition.' :
                !selectedClass       ? 'Choose a class from the dropdown above.' :
                !selectedMeal        ? 'Select a meal, then click Analyze Class.' :
                'Click "Analyze Class" to generate the report.'
              }
            />
          )}
        </>
      )}

      {/* ── SCHOOL TAB ── */}
      {tab === 'school' && (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <Select
                label="Meal (optional)" className="w-52"
                value={selectedMeal}
                onChange={(e) => { setSMeal(e.target.value); setSchoolReports([]); }}
              >
                <option value="">All meals</option>
                {meals.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
              <Select
                label="Status filter" className="w-40"
                value={swStatus}
                onChange={(e) => setSwStatus(e.target.value)}
              >
                <option value="">Any status</option>
                <option value="deficient">🔴 Deficient</option>
                <option value="adequate">🟢 Adequate</option>
                <option value="excess">🟡 Excess</option>
              </Select>
              <Select
                label="Nutrient filter" className="w-44"
                value={swNutrient}
                onChange={(e) => setSwNutrient(e.target.value)}
              >
                <option value="">Any nutrient</option>
                {['calories','protein','carbs','fat','fiber','iron','calcium'].map((n) => (
                  <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
                ))}
              </Select>
              <Button icon={RefreshCw} loading={generating} onClick={handleSchoolReports}>
                Load Reports
              </Button>
            </div>
            {meals.length === 0 && <NoMealsBanner />}
          </Card>

          {schoolReports.length > 0 ? (
            <SchoolNutritionView reports={schoolReports} />
          ) : (
            <EmptyState
              icon={School}
              title={meals.length === 0 ? 'No meals added yet' : 'No school-wide reports'}
              description={
                meals.length === 0
                  ? 'Add meals and distribute them before loading school-wide reports.'
                  : 'Apply optional filters above and click "Load Reports".'
              }
            />
          )}
        </>
      )}
    </div>
  );
}
