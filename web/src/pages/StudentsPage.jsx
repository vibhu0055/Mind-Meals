import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudents, getStudentsByClass, addStudent, updateStudent, deleteStudent, notifyParent } from '../api/students';
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
import { Users, Plus, Trash2, Pencil, HeartPulse, UserRound, ChevronRight, BellRing } from 'lucide-react';

const genderColor = { male: 'blue', female: 'purple', other: 'muted' };

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

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



export default function StudentsPage() {
  const { isTeacher } = useAuth();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');

  const [filterMalnutrition, setFilterMalnutrition] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null); // student object being edited
  const [form, setForm] = useState({ name: '', age: '', gender: 'male', class_id: '', date_of_birth: '', parent_email: '', parent_phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [notifying, setNotifying] = useState(null); // student id being notified

  const loadClasses = async () => {
    try {
      const c = await getClasses();
      setClasses(c.data.classes || []);
    } catch { toast('Failed to load classes', 'error'); }
  };

  const loadStudents = async (class_id, malnutrition_label) => {
    try {
      const params = {};
      if (malnutrition_label) params.malnutrition_label = malnutrition_label;
      const s = class_id
        ? await getStudentsByClass(class_id, params)
        : await getStudents(params);
      const raw = s.data.students || [];
      setStudents(raw.map((stu) => ({
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
  useEffect(() => { loadStudents(filterClass, filterMalnutrition); }, [filterClass, filterMalnutrition]);

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
      setForm({ name: '', age: '', gender: 'male', class_id: '', date_of_birth: '', parent_email: '', parent_phone: '' });
      loadStudents(filterClass, filterMalnutrition);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (student) => {
    setEditStudent(student);
    setForm({
      name: student.name || '',
      age: student.age != null ? String(student.age) : '',
      gender: student.gender || 'male',
      class_id: student.class_id != null ? String(student.class_id) : '',
      date_of_birth: student.date_of_birth || '',
      parent_email: student.parent_email || '',
      parent_phone: student.parent_phone || '',
    });
    setErrors({});
  };

  const closeEdit = () => {
    setEditStudent(null);
    setForm({ name: '', age: '', gender: 'male', class_id: '', date_of_birth: '', parent_email: '', parent_phone: '' });
    setErrors({});
  };

  const handleEdit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        age: parseInt(form.age),
        gender: form.gender,
        class_id: parseInt(form.class_id),
        date_of_birth: form.date_of_birth || null,
        parent_email: form.parent_email || null,
        parent_phone: form.parent_phone || null,
      };
      await updateStudent(editStudent.id, payload);
      toast('Student updated!', 'success');
      closeEdit();
      loadStudents(filterClass, filterMalnutrition);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update', 'error');
    } finally {
      setSubmitting(false);
    }
  };


  const handleNotify = async (id) => {
    setNotifying(id);
    try {
      const res = await notifyParent(id);
      const { channels } = res.data;
      const emailStatus = channels?.email?.status;
      const smsStatus = channels?.sms?.status;
      const parts = [];
      if (emailStatus === 'sent') parts.push('Email sent');
      else if (emailStatus === 'error') parts.push('Email failed');
      if (smsStatus === 'sent') parts.push('SMS sent');
      else if (smsStatus === 'error') parts.push('SMS failed');
      toast(parts.length ? parts.join(' · ') : 'Alert dispatched', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send alert', 'error');
    } finally {
      setNotifying(null);
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
    <div>
      <PageHeader
        title="Students"
        description={`${total} student${total !== 1 ? 's' : ''}${filterClass ? ' in selected class' : ''}` + (filterMalnutrition ? ` · ${filterMalnutrition}` : '')}
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
          className="w-52"
          value={filterMalnutrition}
          onChange={(e) => setFilterMalnutrition(e.target.value)}
        >
          <option value="">All WHO categories</option>
          <option value="Critical">Critical</option>
          <option value="High Risk">High Risk</option>
          <option value="Moderate Risk">Moderate Risk</option>
          <option value="Safe">Safe</option>
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

                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* WHO (malnutrition) shown prominently, BMI is optional and less emphasized */}
                  <div className="flex flex-col items-center mr-4">
                    {s.malnutrition_label ? (
                      <Badge color={malnutritionColor(s.malnutrition_label)} className="px-3 py-1.5 text-sm font-semibold">
                        {s.malnutrition_label}
                      </Badge>
                    ) : (
                      <div className="text-[10px] text-[var(--text-muted)]">WHO: —</div>
                    )}

                  </div>


                  <div className="flex items-center gap-2">
                    <Link to={`/students/${s.id}`}>
                      <Button variant="secondary" size="sm" icon={UserRound}>Profile</Button>
                    </Link>
                    {(s.malnutrition_label === 'Critical' || s.malnutrition_label === 'High Risk') &&
                      (s.parent_email || s.parent_phone) && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={BellRing}
                          loading={notifying === s.id}
                          onClick={() => handleNotify(s.id)}
                        >
                          Notify
                        </Button>
                    )}
                    {isTeacher && (
                      <>
                        <Link to={`/health?student_id=${s.id}`}>
                          <Button variant="secondary" size="sm" icon={HeartPulse}>Health</Button>
                        </Link>
                        <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(s)} />
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
          <Input label="Date of Birth (optional)" type="date" value={form.date_of_birth} onChange={set('date_of_birth')}
            placeholder="YYYY-MM-DD" />
          <div className="text-[11px] text-[var(--text-muted)] -mt-2">
            Required for WHO malnutrition classification. Can be added later.
          </div>
          <Select label="Class" value={form.class_id} onChange={set('class_id')} error={errors.class_id}>
            <option value="">Select class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
            ))}
          </Select>
          <div className="border-t border-[var(--border)] pt-3">
            <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Parent Contact <span className="font-normal normal-case text-[var(--text-muted)]">(optional — enables alert notifications)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Parent Email" type="email" placeholder="parent@gmail.com" value={form.parent_email} onChange={set('parent_email')} />
              <Input label="Parent Phone" type="tel" placeholder="+919876543210" value={form.parent_phone} onChange={set('parent_phone')} />
            </div>
          </div>
          <div className="flex gap-3 mt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">Cancel</Button>
            <Button className="flex-1" loading={submitting} type="submit">Add Student</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editStudent} onClose={closeEdit} title={`Edit — ${editStudent?.name || 'Student'}`}>
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <Input label="Student Name" placeholder="Full name" value={form.name} onChange={set('name')} error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Age" type="number" placeholder="8" min="1" max="20" value={form.age} onChange={set('age')} error={errors.age} />
            <Select label="Gender" value={form.gender} onChange={set('gender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} placeholder="YYYY-MM-DD" />
          <div className="text-[11px] text-[var(--text-muted)] -mt-2">
            Used for WHO malnutrition classification accuracy.
          </div>
          <Select label="Class" value={form.class_id} onChange={set('class_id')} error={errors.class_id}>
            <option value="">Select class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
            ))}
          </Select>
          <div className="border-t border-[var(--border)] pt-3">
            <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Parent Contact <span className="font-normal normal-case text-[var(--text-muted)]">(optional — enables alert notifications)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Parent Email" type="email" placeholder="parent@gmail.com" value={form.parent_email} onChange={set('parent_email')} />
              <Input label="Parent Phone" type="tel" placeholder="+919876543210" value={form.parent_phone} onChange={set('parent_phone')} />
            </div>
          </div>
          <div className="flex gap-3 mt-1">
            <Button variant="secondary" className="flex-1" onClick={closeEdit} type="button">Cancel</Button>
            <Button className="flex-1" loading={submitting} type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}