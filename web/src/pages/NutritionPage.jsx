import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  generateClassReport,
  generateReport,
  getSchoolReports,
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
import { BarChart3, RefreshCw, School, UtensilsCrossed, Users } from 'lucide-react';

const TABS = [
  { id: 'student', label: 'Student', icon: Users },
  { id: 'class', label: 'Class', icon: School },
  { id: 'school', label: 'School-wide', icon: BarChart3, schoolOnly: true },
];

const parseLocalDate = (dateString) => {
  if (!dateString) return null;

  const [year, month, day] = String(dateString)
    .split('T')[0]
    .split('-')
    .map(Number);

  return new Date(year, month - 1, day);
};

function mealOptionLabel(meal) {
  const parsed = parseLocalDate(meal.served_date);

  const date = parsed
    ? parsed.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  return date ? `${meal.name} - ${date}` : meal.name;
}

function NoMealsBanner() {
  return (
    <div className="flex items-start gap-3 p-4 bg-[var(--amber-dim)] border border-[rgba(245,158,11,0.25)] rounded-[10px] mt-4">
      <UtensilsCrossed size={16} className="text-[var(--amber)] flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-[var(--amber)]">No meals available</p>
        <p className="text-xs text-[var(--amber)] opacity-80 mt-0.5">
          Add a meal with ingredients before generating nutrition reports.
        </p>
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const { isSchool } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState('student');
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [meals, setMeals] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMeal, setSelectedMeal] = useState(searchParams.get('meal_id') || '');
  const [report, setReport] = useState(null);
  const [classReports, setClassReports] = useState([]);
  const [schoolReports, setSchoolReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [schoolStatus, setSchoolStatus] = useState('');
  const [schoolNutrient, setSchoolNutrient] = useState('');

  useEffect(() => {
    Promise.all([
      getStudents().catch(() => ({ data: { students: [] } })),
      getClasses().catch(() => ({ data: { classes: [] } })),
      getMeals().catch(() => ({ data: { meals: [] } })),
    ]).then(([studentRes, classRes, mealRes]) => {
      setStudents(studentRes.data.students || []);
      setClasses(classRes.data.classes || []);
      setMeals(mealRes.data.meals || []);
    }).finally(() => setLoading(false));
  }, []);

  const resetResults = () => {
    setReport(null);
    setClassReports([]);
    setSchoolReports([]);
    setSchoolReportsLoaded(false);
  };

  const handleGenerateStudent = async () => {
    if (!selectedStudent || !selectedMeal) {
      toast('Select both student and meal', 'warning');
      return;
    }

    setGenerating(true);
    try {
      const res = await generateReport(selectedStudent, selectedMeal);
      setReport(res.data.report || res.data);
      toast('Report generated', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Report generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateClass = async () => {
    if (!selectedClass || !selectedMeal) {
      toast('Select both class and meal', 'warning');
      return;
    }

    setGenerating(true);
    try {
      const res = await generateClassReport(selectedClass, selectedMeal);
      setClassReports(res.data.reports || []);
      toast(`Reports generated for ${res.data.reports?.length ?? 0} students`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Report generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const [schoolReportsLoaded, setSchoolReportsLoaded] = useState(false);

  const handleSchoolReports = async () => {
    setGenerating(true);
    setSchoolReportsLoaded(false);
    try {
      const res = await getSchoolReports({
        meal_id: selectedMeal || undefined,
        status: schoolStatus || undefined,
        nutrient: schoolNutrient || undefined,
      });
      const reports = res.data.reports || [];
      setSchoolReports(reports);
      setSchoolReportsLoaded(true);
      if (reports.length === 0) {
        toast('No reports found. Generate student or class reports first, then load here.', 'warning');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load reports', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const visibleTabs = TABS.filter((tabItem) => !tabItem.schoolOnly || isSchool);
  const currentMeal = meals.find((meal) => String(meal.id) === String(selectedMeal));
  const currentStudent = students.find((student) => String(student.id) === String(selectedStudent));
  const currentClass = classes.find((classItem) => String(classItem.id) === String(selectedClass));

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nutrition Insights"
        description="Personalized RDA, adequacy, deficiency, and BMI-linked reports"
      />

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

      {tab === 'student' && (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <Select
                label="Student"
                className="w-52"
                value={selectedStudent}
                onChange={(event) => { setSelectedStudent(event.target.value); setReport(null); }}
              >
                <option value="">Select student...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name} (Age {student.age})</option>
                ))}
              </Select>
              <Select
                label="Meal"
                className="w-52"
                value={selectedMeal}
                onChange={(event) => { setSelectedMeal(event.target.value); setReport(null); }}
              >
                <option value="">Select meal...</option>
                {meals.map((meal) => <option key={meal.id} value={meal.id}>{mealOptionLabel(meal)}</option>)}
              </Select>
              <Button icon={RefreshCw} loading={generating} onClick={handleGenerateStudent}>
                Analyze Meal
              </Button>
            </div>
            {meals.length === 0 && <NoMealsBanner />}
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
                meals.length === 0 ? 'No meals added yet' :
                selectedStudent && selectedMeal ? 'Ready to analyze' :
                'Select a student and meal'
              }
              description={
                students.length === 0 ? 'Add students before generating nutrition reports.' :
                meals.length === 0 ? 'Add a meal with ingredients, then come back to analyze nutrition.' :
                !selectedStudent ? 'Choose a student from the dropdown above.' :
                !selectedMeal ? 'Now select a meal to analyse.' :
                'Click Analyze Meal to generate the personalized nutrition report.'
              }
            />
          )}
        </>
      )}

      {tab === 'class' && (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <Select
                label="Class"
                className="w-52"
                value={selectedClass}
                onChange={(event) => { setSelectedClass(event.target.value); setClassReports([]); }}
              >
                <option value="">Select class...</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}{classItem.section ? ` - ${classItem.section}` : ''}
                  </option>
                ))}
              </Select>
              <Select
                label="Meal"
                className="w-52"
                value={selectedMeal}
                onChange={(event) => { setSelectedMeal(event.target.value); setClassReports([]); }}
              >
                <option value="">Select meal...</option>
                {meals.map((meal) => <option key={meal.id} value={meal.id}>{mealOptionLabel(meal)}</option>)}
              </Select>
              <Button icon={RefreshCw} loading={generating} onClick={handleGenerateClass}>
                Analyze Class
              </Button>
            </div>
            {meals.length === 0 && <NoMealsBanner />}
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
                meals.length === 0 ? 'No meals added yet' :
                'Select a class and meal'
              }
              description={
                classes.length === 0 ? 'Create classes before generating class reports.' :
                meals.length === 0 ? 'Add a meal with ingredients before analyzing nutrition.' :
                !selectedClass ? 'Choose a class from the dropdown above.' :
                !selectedMeal ? 'Select a meal, then click Analyze Class.' :
                'Click Analyze Class to generate student-level reports.'
              }
            />
          )}
        </>
      )}

      {tab === 'school' && (
        <>
          <div className="flex items-start gap-3 p-4 bg-[var(--accent-dim)] border border-[var(--accent-border)] rounded-[10px] mb-4">
            <BarChart3 size={16} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--accent)]">How to use School-wide Reports</p>
              <p className="text-xs text-[var(--accent)] opacity-80 mt-0.5">
                First generate reports using the <strong>Student</strong> or <strong>Class</strong> tabs above — then come back here to view and filter all results across the school.
              </p>
            </div>
          </div>
          <Card className="mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <Select
                label="Meal (optional)"
                className="w-52"
                value={selectedMeal}
                onChange={(event) => { setSelectedMeal(event.target.value); setSchoolReports([]); }}
              >
                <option value="">All meals</option>
                {meals.map((meal) => <option key={meal.id} value={meal.id}>{mealOptionLabel(meal)}</option>)}
              </Select>
              <Select
                label="Status filter"
                className="w-40"
                value={schoolStatus}
                onChange={(event) => setSchoolStatus(event.target.value)}
              >
                <option value="">Any status</option>
                <option value="deficient">Deficient</option>
                <option value="adequate">Adequate</option>
                <option value="excess">Excess</option>
              </Select>
              <Select
                label="Nutrient filter"
                className="w-44"
                value={schoolNutrient}
                onChange={(event) => setSchoolNutrient(event.target.value)}
              >
                <option value="">Any nutrient</option>
                {['calories', 'protein', 'carbs', 'fat', 'fiber', 'iron', 'calcium'].map((nutrient) => (
                  <option key={nutrient} value={nutrient}>{nutrient.charAt(0).toUpperCase() + nutrient.slice(1)}</option>
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
              title={
                meals.length === 0 ? 'No meals added yet' :
                schoolReportsLoaded ? 'No reports match your filters' :
                'No school-wide reports loaded'
              }
              description={
                meals.length === 0
                  ? 'Add meals with ingredients before loading school-wide reports.'
                  : schoolReportsLoaded
                  ? 'Try removing filters, or generate student/class reports first via the Student or Class tabs.'
                  : 'Apply optional filters above and click Load Reports. Reports only appear here after generating them from the Student or Class tabs.'
              }
            />
          )}
        </>
      )}
    </div>
  );
}