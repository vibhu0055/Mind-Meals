import { useEffect, useState } from 'react';
import { getClasses, createClass, deleteClass, assignTeacherToClass } from '../api/classes';
import { getTeachers } from '../api/teachers';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import { BookOpen, Plus, Trash2, UserPlus } from 'lucide-react';
import {
  mergeClassAssignments,
  removeTeacherAssignmentCache,
  saveTeacherAssignmentCache,
} from '../utils/teacherAssignmentCache';

function getAssignedTeacherId(classItem) {
  return (
    classItem.assigned_teacher_id ||
    classItem.teacher_id ||
    classItem.teacher?.id ||
    classItem.assigned_teacher?.id ||
    ''
  );
}

function getAssignedTeacherName(classItem, teachers) {
  const teacherId = getAssignedTeacherId(classItem);
  const teacher = teachers.find((t) => String(t.id) === String(teacherId));

  return (
    classItem.assigned_teacher_name ||
    classItem.teacher_name ||
    classItem.teacher?.name ||
    classItem.assigned_teacher?.name ||
    teacher?.name ||
    ''
  );
}

function getAssignPayload(data) {
  return data?.mapping && typeof data.mapping === 'object' ? data.mapping : data;
}

export default function ClassesPage() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [form, setForm] = useState({ name: '', section: '' });
  const [assignForm, setAssignForm] = useState({ teacher_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const load = async () => {
    try {
      const [c, t] = await Promise.all([getClasses(), getTeachers()]);
      const nextTeachers = t.data.teachers || [];
      setTeachers(nextTeachers);
      setClasses(mergeClassAssignments(c.data.classes || [], nextTeachers));
    } catch { toast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: '' })); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) { setErrors({ name: 'Required' }); return; }
    setSubmitting(true);
    try {
      await createClass(form);
      toast('Class created!', 'success');
      setShowCreate(false);
      setForm({ name: '', section: '' });
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this class?')) return;
    try {
      await deleteClass(id);
      toast('Class deleted', 'success');
      removeTeacherAssignmentCache(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch { toast('Failed to delete', 'error'); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.teacher_id) return;
    setSubmitting(true);
    try {
      const res = await assignTeacherToClass({ teacher_id: parseInt(assignForm.teacher_id), class_id: assignTarget.id });
      const mapping = getAssignPayload(res.data);
      const selectedTeacher = teachers.find((t) => String(t.id) === String(assignForm.teacher_id));
      const nextAssignment = {
        class_id: mapping.class_id || assignTarget.id,
        class_name: mapping.class_name || assignTarget.name,
        section: mapping.section || assignTarget.section || '',
        teacher_id: mapping.teacher_id || assignForm.teacher_id,
        teacher_name: mapping.teacher_name || selectedTeacher?.name || '',
      };

      saveTeacherAssignmentCache(nextAssignment);
      toast('Teacher assigned!', 'success');
      setClasses((prev) =>
        prev.map((c) =>
          String(c.id) === String(assignTarget.id)
            ? {
                ...c,
                assigned_teacher_id: nextAssignment.teacher_id,
                assigned_teacher_name: nextAssignment.teacher_name,
              }
            : c
        )
      );
      setShowAssign(false);
      setAssignForm({ teacher_id: '' });
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setSubmitting(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Classes"
        description={`${classes.length} class${classes.length !== 1 ? 'es' : ''}`}
        action={<Button icon={Plus} onClick={() => setShowCreate(true)}>Create Class</Button>}
      />

      {classes.length === 0 ? (
        <EmptyState icon={BookOpen} title="No classes yet" description="Create your first class" action={<Button icon={Plus} onClick={() => setShowCreate(true)}>Create Class</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {classes.map((c) => {
            const teacherName = getAssignedTeacherName(c, teachers);

            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--amber-dim)] flex items-center justify-center">
                    <BookOpen size={18} className="text-[var(--amber)]" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={UserPlus}
                      onClick={() => {
                        const teacherId = getAssignedTeacherId(c);
                        setAssignTarget(c);
                        setAssignForm({ teacher_id: teacherId ? String(teacherId) : '' });
                        setShowAssign(true);
                      }}
                    >
                      Assign
                    </Button>
                    <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(c.id)} />
                  </div>
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{c.name}</div>
                {c.section && <div className="text-xs text-[var(--text-muted)] mt-0.5">Section {c.section}</div>}
                <div className="text-xs text-[var(--text-muted)] mt-2">
                  Teacher: <span className="text-[var(--text-secondary)]">{teacherName || 'Not assigned'}</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-2 font-mono">ID: {c.id}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Class">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Class Name" placeholder="e.g. Class 5, Grade 3" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Section (optional)" placeholder="e.g. A, B, C" value={form.section} onChange={set('section')} />
          <div className="flex gap-3 mt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)} type="button">Cancel</Button>
            <Button className="flex-1" loading={submitting} type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      {/* Assign teacher modal */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title={`Assign Teacher to ${assignTarget?.name}`}>
        <form onSubmit={handleAssign} className="flex flex-col gap-4">
          <Select
            label="Select Teacher"
            value={assignForm.teacher_id}
            onChange={(e) => setAssignForm({ teacher_id: e.target.value })}
          >
            <option value="">Choose a teacher...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.email}</option>
            ))}
          </Select>
          <div className="flex gap-3 mt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAssign(false)} type="button">Cancel</Button>
            <Button className="flex-1" loading={submitting} type="submit">Assign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
