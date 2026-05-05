import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudents, getStudentsByClass, addStudent, deleteStudent } from '../api/students';
import { getClasses } from '../api/classes';
import { getLatestHealthRecord } from '../api/health';
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

function getHealthRecord(data) {
  return data?.record || data?.health_record || data?.latest || data || null;
}

export default function StudentsPage() {
  const { isTeacher } = useAuth();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [latestHealthByStudent, setLatestHealthByStudent] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', age: '', gender: 'male', class_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const load = async (class_id = '') => {
    try {
      const [s, c] = await Promise.all([
        class_id ? getStudentsByClass(class_id) : getStudents(),
        getClasses(),
      ]);
      const nextStudents = s.data.students || [];
      setStudents(nextStudents);
      setClasses(c.data.classes || []);

      const healthResults = await Promise.all(
        nextStudents.map(async (student) => {
          const res = await getLatestHealthRecord(student.id).catch(() => null);
          return [student.id, res ? getHealthRecord(res.data) : null];
        })
      );
      setLatestHealthByStudent(Object.fromEntries(healthResults));
    } catch {
      toast('Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filterClass); }, [filterClass]);

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
      load(filterClass);
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
      setLatestHealthByStudent((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      toast('Failed', 'error');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Students"
        description={`${students.length} student${students.length !== 1 ? 's' : ''}${filterClass ? ' in selected class' : ''}`}
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
            const latestHealth = latestHealthByStudent[s.id];
            const bmi = latestHealth?.bmi;
            const bmiCategory = latestHealth?.bmi_category || latestHealth?.category;

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
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      Age {s.age} - {s.class_name || `Class ID ${s.class_id}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right min-w-14">
                    <div className="text-xs text-[var(--text-muted)]">BMI</div>
                    <div className="text-sm font-semibold text-[var(--text-primary)] mono">
                      {typeof bmi === 'number' ? bmi.toFixed(1) : '-'}
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
