import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudents, getStudentsByClass, addStudent, deleteStudent } from '../api/students';
import { getClasses } from '../api/classes';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import { Users, Plus, Trash2, HeartPulse, UserRound, ChevronRight } from 'lucide-react';

const genderColor = { male: 'blue', female: 'purple', other: 'muted' };

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function bmiColor(category) {
  if (!category) return 'muted';
  const value = category.toLowerCase();
  if (value.includes('normal')) return 'green';
  if (value.includes('underweight')) return 'amber';
  if (value.includes('overweight') || value.includes('obese')) return 'red';
  return 'muted';
}


export default function StudentsPage() {
  const { isTeacher } = useAuth();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterBmi, setFilterBmi]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', age: '', gender: 'male', class_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const loadClasses = async () => {
    try {
      const c = await getClasses();
      setClasses(c.data.classes || []);
    } catch { toast('Failed to load classes', 'error'); }
  };

  const loadStudents = async (class_id, bmi_category) => {
    try {
      const params = {};
      if (bmi_category) params.bmi_category = bmi_category;
      const s = class_id
        ? await getStudentsByClass(class_id, params)
        : await getStudents(params);
      setStudents((s.data.students || []).map((stu) => ({
        ...stu,
        class_name: stu.class_name || classes.find(c => String(c.id) === String(stu.class_id))?.name || '—',
      })));
      setTotal(s.data.total ?? (s.data.students || []).length);
    } catch {
      toast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch classes once on mount
  useEffect(() => { loadClasses(); }, []);

  // Re-fetch students whenever filters change
  useEffect(() => { loadStudents(filterClass, filterBmi); }, [filterClass, filterBmi]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Required';
    if (!form.age || isNaN(form.age)) e.age = 'Valid age required';
    if (!form.class_id) e.class_id = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleAdd = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await addStudent({ ...form, age: parseInt(form.age), class_id: parseInt(form.class_id) });
      toast('Student added!', 'success');
      setShowModal(false);
      setForm({ name: '', age: '', gender: 'male', class_id: '' });
      loadStudents(filterClass, filterBmi);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    try {
      await deleteStudent(id);
      toast('Student deleted', 'success');
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast('Failed', 'error');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Students"
        description={`${total} student${total !== 1 ? 's' : ''}${filterClass ? ' in selected class' : ''}` + (filterBmi ? ` · ${filterBmi}` : '')}
        action={
          isTeacher && (
            <Button icon={Plus} onClick={() => setShowModal(true)}>Add Student</Button>
          )
        }
      />

      <div className="flex gap-3 mb-6">
        <Select
          className="w-56"
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
          ))}
        </Select>
        <Select
          className="w-48"
          value={filterBmi}
          onChange={(e) => setFilterBmi(e.target.value)}
        >
          <option value="">All BMI categories</option>
          <option value="Underweight">Underweight</option>
          <option value="Normal">Normal</option>
          <option value="Overweight">Overweight</option>
          <option value="Obese">Obese</option>
        </Select>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description={isTeacher ? 'Add students to your assigned classes' : 'No students in this class yet'}
          action={isTeacher && <Button icon={Plus} onClick={() => setShowModal(true)}>Add Student</Button>}
        />
      ) : (
        <div className="grid gap-2">
          {students.map((s) => {
            const bmi = s.bmi != null ? Number(s.bmi) : null;
            const bmiCategory = s.bmi_category || null;

            return (
              <Card key={s.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-[var(--purple-dim)] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[var(--purple)]">
                    {getInitials(s.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{s.name}</span>
                      <Badge color={genderColor[s.gender] || 'muted'}>{s.gender}</Badge>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>Age {s.age}</span>
                      <span>·</span>
                      <span>{s.class_name || '—'}</span>
                      {s.class_level && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          s.class_level === 'primary'
                            ? 'bg-[var(--blue-dim)] text-[var(--blue)]'
                            : 'bg-[var(--purple-dim)] text-[var(--purple)]'
                        }`}>
                          {s.class_level === 'primary' ? 'Primary' : 'Upper Primary'}
                        </span>
                      )}
                    </div>
                    {s.bmi_recorded_at && (
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        BMI recorded {new Date(s.bmi_recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right min-w-14">
                    <div className="text-xs text-[var(--text-muted)]">BMI</div>
                    <div className="text-sm font-semibold text-[var(--text-primary)] mono">
                      {bmi != null ? bmi.toFixed(1) : '-'}
                    </div>
                  </div>
                  <Badge color={bmiColor(bmiCategory)} className="min-w-20 justify-center">
                    {bmiCategory || 'No record'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Link to={`/students/${s.id}`}>
                      <Button variant="secondary" size="sm" icon={UserRound}>Profile</Button>
                    </Link>
                    {isTeacher && (
                      <>
                        <Link to={`/health?student_id=${s.id}`}>
                          <Button variant="secondary" size="sm" icon={HeartPulse}>Health</Button>
                        </Link>
                        <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(s.id)} />
                      </>
                    )}
                    <Link to={`/students/${s.id}`}>
                      <Button variant="ghost" size="sm" icon={ChevronRight} />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Student">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input label="Student Name" placeholder="Full name" value={form.name} onChange={set('name')} error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Age" type="number" placeholder="8" min="1" max="20" value={form.age} onChange={set('age')} error={errors.age} />
            <Select label="Gender" value={form.gender} onChange={set('gender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <Select label="Class" value={form.class_id} onChange={set('class_id')} error={errors.class_id}>
            <option value="">Select class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
            ))}
          </Select>
          <div className="flex gap-3 mt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">Cancel</Button>
            <Button className="flex-1" loading={submitting} type="submit">Add Student</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}