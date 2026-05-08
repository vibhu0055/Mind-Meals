import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getTeachers } from '../api/teachers';
import { getClasses } from '../api/classes';
import { getStudents, getStudentsByClass } from '../api/students';
import { getMeals } from '../api/meals';
import { getTeacherProfile } from '../api/teachers';
import Card from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import AssignedClassCards from '../components/dashboard/AssignedClassCards';
import {
  UserSquare2, BookOpen, Users, UtensilsCrossed,
  ArrowRight, TrendingUp, HeartPulse
} from 'lucide-react';

function StatCard({ label, value, icon: Icon, color = 'green', to }) {
  const colors = {
    green: 'text-[var(--accent)] bg-[var(--accent-dim)]',
    amber: 'text-[var(--amber)] bg-[var(--amber-dim)]',
    blue: 'text-[var(--blue)] bg-[var(--blue-dim)]',
    purple: 'text-[var(--purple)] bg-[var(--purple-dim)]',
  };

  return (
    <Card className="flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
      </div>
      {to && (
        <Link to={to} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
          <ArrowRight size={16} />
        </Link>
      )}
    </Card>
  );
}

function getTeacherId(user, profile) {
  return profile?.id || user?.id || user?.user_id || null;
}

function getClassTeacherId(classItem) {
  return (
    classItem.assigned_teacher_id ||
    classItem.teacher_id ||
    classItem.teacher?.id ||
    classItem.assigned_teacher?.id ||
    ''
  );
}

function hasTeacherAssignment(classItem) {
  return !!getClassTeacherId(classItem);
}

function normaliseAssignedClasses(profile, classes, teacherId) {
  const rawProfileClasses = profile?.assigned_classes || profile?.classes || profile?.class_names;
  let profileClasses = rawProfileClasses;

  if (typeof rawProfileClasses === 'string') {
    try {
      profileClasses = JSON.parse(rawProfileClasses);
    } catch {
      profileClasses = [];
    }
  }

  if (Array.isArray(profileClasses) && profileClasses.length) {
    return profileClasses
      .map((c) => ({
        id: c.id || c.class_id,
        name: c.name || c.class_name,
        section: c.section,
      }))
      .filter((c) => c.id);
  }

  const classesWithAssignments = classes.filter(hasTeacherAssignment);
  const sourceClasses = classesWithAssignments.length
    ? classesWithAssignments.filter((c) => String(getClassTeacherId(c)) === String(teacherId))
    : classes;

  return sourceClasses.map((c) => ({ id: c.id, name: c.name || c.class_name, section: c.section }));
}

function getStudentArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.students)) return data.students;
  return [];
}

export default function DashboardPage() {
  const { user, isSchool, isTeacher } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (isSchool) {
          const [t, c, s, m] = await Promise.allSettled([
            getTeachers(), getClasses(), getStudents(), getMeals()
          ]);

          setStats({
            teachers: t.value?.data?.teachers?.length ?? '-',
            classes: c.value?.data?.classes?.length ?? '-',
            students: s.value?.data?.students?.length ?? '-',
            meals: m.value?.data?.meals?.length ?? '-',
          });
        } else {
          const [profile, meals, classRes] = await Promise.allSettled([
            getTeacherProfile(), getMeals(), getClasses()
          ]);
          const profileData = profile.value?.data?.teacher;
          const teacherId = getTeacherId(user, profileData);
          const classList = classRes.value?.data?.classes || [];
          const assignedClasses = normaliseAssignedClasses(profileData, classList, teacherId);
          const assignedClassesWithCounts = await Promise.all(
            assignedClasses.map(async (classItem) => {
              const res = await getStudentsByClass(classItem.id).catch(() => null);
              return {
                ...classItem,
                studentCount: getStudentArray(res?.data).length,
              };
            })
          );
          const studentCount = assignedClassesWithCounts.reduce((sum, classItem) => sum + classItem.studentCount, 0);

          setStats({
            profile: profileData,
            classes: assignedClassesWithCounts.length,
            assignedClasses: assignedClassesWithCounts,
            students: studentCount,
            meals: meals.value?.data?.meals?.length ?? '-',
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isSchool, user]);

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Good day, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {isSchool ? 'School administration overview' : 'Your teaching dashboard'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {isSchool ? (
          <>
            <StatCard label="Teachers" value={stats?.teachers} icon={UserSquare2} color="blue" to="/teachers" />
            <StatCard label="Classes" value={stats?.classes} icon={BookOpen} color="amber" to="/classes" />
            <StatCard label="Students" value={stats?.students} icon={Users} color="purple" to="/students" />
            <StatCard label="Meals logged" value={stats?.meals} icon={UtensilsCrossed} color="green" to="/meals" />
          </>
        ) : (
          <>
            <StatCard label="Assigned Classes" value={stats?.classes} icon={BookOpen} color="amber" />
            <StatCard label="Students" value={stats?.students} icon={Users} color="purple" to="/students" />
            <StatCard label="Meals logged" value={stats?.meals} icon={UtensilsCrossed} color="green" to="/meals" />
          </>
        )}
      </div>

      {isTeacher && (
        <AssignedClassCards
          classes={stats?.assignedClasses || []}
          className="mb-8"
        />
      )}

      <div>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {isSchool && (
            <>
              <QuickAction to="/teachers" icon={UserSquare2} title="Manage Teachers" desc="Add, remove, or update meal permissions" color="blue" />
              <QuickAction to="/classes" icon={BookOpen} title="Manage Classes" desc="Create classes and assign teachers" color="amber" />
              <QuickAction to="/students" icon={Users} title="View All Students" desc="Browse students by class" color="purple" />
            </>
          )}
          <QuickAction to="/meals" icon={UtensilsCrossed} title="Log a Meal" desc="Record ingredients and review nutrition" color="green" />
          {isTeacher && (
            <QuickAction to="/health" icon={HeartPulse} title="Add Health Record" desc="Record student height, weight and BMI" color="amber" />
          )}
          <QuickAction to="/nutrition" icon={TrendingUp} title="Nutrition Reports" desc="View adequacy and deficiency data" color="purple" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, desc, color }) {
  const colors = {
    green: 'text-[var(--accent)] bg-[var(--accent-dim)]',
    amber: 'text-[var(--amber)] bg-[var(--amber-dim)]',
    blue: 'text-[var(--blue)] bg-[var(--blue-dim)]',
    purple: 'text-[var(--purple)] bg-[var(--purple-dim)]',
  };

  return (
    <Link to={to}>
      <Card hover className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
          <div className="text-xs text-[var(--text-muted)] truncate">{desc}</div>
        </div>
        <ArrowRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
      </Card>
    </Link>
  );
}
