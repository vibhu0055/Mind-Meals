import { useEffect, useState } from 'react';
import { getClasses, createClass, updateClass, deleteClass, assignTeacherToClass } from '../api/classes';
import { getTeachers } from '../api/teachers';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import { Pencil, Plus, Trash2, UserPlus, ArrowRightLeft, Users, UserRound } from 'lucide-react';


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

function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ClassesPage() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [form, setForm] = useState({ name: '', section: '', level: '' });
  const [assignForm, setAssignForm] = useState({ teacher_id: '' });
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', section: '', level: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const load = async () => {
    try {
      const [c, t] = await Promise.all([getClasses(), getTeachers()]);
      setTeachers(t.data.teachers || []);
      setClasses(c.data.classes || []);
    } catch {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: '' }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) { setErrors({ name: 'Required' }); return; }
    setSubmitting(true);
    try {
      await createClass(form);
      toast('Class created!', 'success');
      setShowCreate(false);
      setForm({ name: '', section: '', level: '' });
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
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch { toast('Failed to delete', 'error'); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.teacher_id) return;
    setSubmitting(true);
    try {
      await assignTeacherToClass({ teacher_id: parseInt(assignForm.teacher_id), class_id: assignTarget.id });
      toast('Teacher assigned!', 'success');
      setShowAssign(false);
      setAssignForm({ teacher_id: '' });
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setSubmitting(false); }
  };

  const openEdit = (c) => {
    setEditTarget(c);
    setEditForm({ name: c.name || '', section: c.section || '', level: c.level || '' });
    setErrors({});
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name) { setErrors({ editName: 'Required' }); return; }
    setSubmitting(true);
    try {
      await updateClass(editTarget.id, {
        name: editForm.name.trim(),
        section: editForm.section.trim() || null,
        level: editForm.level || null,
      });
      toast('Class updated!', 'success');
      setShowEdit(false);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update', 'error');
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
        <EmptyState
          icon={Plus}
          title="No classes yet"
          description="Create your first class"
          action={<Button icon={Plus} onClick={() => setShowCreate(true)}>Create Class</Button>}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => {
            const teacherName = getAssignedTeacherName(c, teachers);
            const isAssigned = !!getAssignedTeacherId(c);

            return (
              <Card
                key={c.id}
                className="overflow-hidden p-0 border border-[var(--border)] rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-300 group"
              >

                {/* Header */}
                <div className="px-4 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">

                  {/* Left Side */}
                  <div className="flex items-center gap-3 min-w-0">

                    {/* Class Badge */}
                    <div className="w-11 h-11 rounded-xl bg-purple-100 border border-[rgba(59,130,246,0.15)] flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-700 font-bold text-lg">
                        {(c.name.match(/\d+/)?.[0] || c.name.charAt(0).toUpperCase()) + (c.section || '')}
                      </span>
                    </div>

                  </div>

                  {/* Level Badge */}
                  {c.level && (
                    <span
                      className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${c.level === 'primary'
                        ? 'bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(59,130,246,0.25)]'
                        : 'bg-[var(--purple-dim)] text-[var(--purple)] border-[rgba(168,85,247,0.25)]'
                        }`}
                    >
                      {c.level === 'primary' ? 'Primary' : 'Upper Primary'}
                    </span>
                  )}

                </div>

                {/* Body */}
                <div className="px-4 py-3 flex flex-col gap-2.5 border-b border-[var(--border)]">
                  {/* Student count */}
                  <div className="flex items-center font-semibold gap-2 text-[13px] text-[var(--text-primary)]">
                    <Users size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                    <span>{c.student_count ?? 0} students</span>
                  </div>

                  {/* Teacher */}
                  <div className="flex items-center gap-2">
                    <UserRound size={14} className="text-[var(--text-muted)] flex-shrink-0" />

                    <span
                      className={`text-xs font-semibold truncate ${teacherName
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-muted)] italic"
                        }`}
                    >
                      {teacherName || "Not Assigned"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={isAssigned ? ArrowRightLeft : UserPlus}
                    onClick={() => {
                      const teacherId = getAssignedTeacherId(c);
                      setAssignTarget(c);
                      setAssignForm({ teacher_id: teacherId ? String(teacherId) : '' });
                      setShowAssign(true);
                    }}
                  >
                    {isAssigned ? 'Reassign' : 'Assign'}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Pencil}
                    onClick={() => openEdit(c)}
                  >
                    Edit
                  </Button>

                  {/* Destructive action pushed to the right, icon-only */}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="ml-auto flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] bg-red-100 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
                    aria-label="Delete class"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create modal ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Class">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Class Name"
            placeholder="e.g. Class 5, Grade 3"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
          />
          <Input
            label="Section (optional)"
            placeholder="e.g. A, B, C"
            value={form.section}
            onChange={set('section')}
          />
          <Select label="Level (optional)" value={form.level} onChange={set('level')}>
            <option value="">Not set</option>
            <option value="primary">Primary</option>
            <option value="upper_primary">Upper Primary</option>
          </Select>
          <p className="text-[11px] text-[var(--text-muted)] -mt-2">
            Level is used to calculate PM POSHAN benchmarks for this class.
          </p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)} type="button">
              Cancel
            </Button>
            <Button className="flex-1" loading={submitting} type="submit">
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Assign / Reassign teacher modal ── */}
      <Modal
        isOpen={showAssign}
        onClose={() => { setShowAssign(false); setAssignForm({ teacher_id: '' }); }}
        title={
          getAssignedTeacherId(assignTarget || {})
            ? `Reassign Teacher — ${assignTarget?.name}`
            : `Assign Teacher — ${assignTarget?.name}`
        }
      >
        <form onSubmit={handleAssign} className="flex flex-col gap-4">
          {assignTarget && getAssignedTeacherId(assignTarget) && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--bg-hover)] rounded-[10px] border border-[var(--border)]">
              <div className="w-7 h-7 rounded-lg bg-[var(--blue-dim)] flex items-center justify-center flex-shrink-0">
                <UserPlus size={13} className="text-[var(--blue)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Currently assigned</div>
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {getAssignedTeacherName(assignTarget, teachers)}
                </div>
              </div>
              <ArrowRightLeft size={14} className="text-[var(--text-muted)] flex-shrink-0" />
            </div>
          )}

          <Select
            label={getAssignedTeacherId(assignTarget || {}) ? 'Reassign to' : 'Select Teacher'}
            value={assignForm.teacher_id}
            onChange={(e) => setAssignForm({ teacher_id: e.target.value })}
          >
            <option value="">Choose a teacher...</option>
            {teachers
              .filter((t) => String(t.id) !== String(getAssignedTeacherId(assignTarget || {})))
              .map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.email}</option>
              ))
            }
          </Select>

          {assignTarget && getAssignedTeacherId(assignTarget) && (
            <p className="text-xs text-[var(--text-muted)] -mt-1">
              The current teacher will lose access to this class immediately after reassignment.
            </p>
          )}

          <div className="mt-1 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setShowAssign(false); setAssignForm({ teacher_id: '' }); }}
              type="button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={submitting}
              disabled={!assignForm.teacher_id}
              type="submit"
            >
              {getAssignedTeacherId(assignTarget || {}) ? 'Reassign' : 'Assign'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit class modal ── */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title={`Edit Class — ${editTarget?.name}`}
      >
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <Input
            label="Class Name"
            placeholder="e.g. Class 5, Grade 3"
            value={editForm.name}
            onChange={(e) => {
              setEditForm((f) => ({ ...f, name: e.target.value }));
              setErrors((er) => ({ ...er, editName: '' }));
            }}
            error={errors.editName}
          />
          <Input
            label="Section (optional)"
            placeholder="e.g. A, B, C"
            value={editForm.section}
            onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
          />
          <Select
            label="Level"
            value={editForm.level}
            onChange={(e) => setEditForm((f) => ({ ...f, level: e.target.value }))}
          >
            <option value="">Not set</option>
            <option value="primary">Primary</option>
            <option value="upper_primary">Upper Primary</option>
          </Select>
          <p className="text-[11px] text-[var(--text-muted)] -mt-2">
            Setting a level enables PM POSHAN benchmarks for students in this class.
          </p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEdit(false)} type="button">
              Cancel
            </Button>
            <Button className="flex-1" loading={submitting} type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
