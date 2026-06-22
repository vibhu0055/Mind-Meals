import { useEffect, useState } from 'react';
import { getTeachers, createTeacher, deleteTeacher, updateMealPermission } from '../api/teachers';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import { UserSquare2, Plus, Trash2, UtensilsCrossed, Phone, Mail } from 'lucide-react';


function getClassLabel(c) {
  if (typeof c === 'string') return c;
  const name = c?.class_name || c?.name || c?.label || `Class ${c?.id}`;
  return c?.section ? `${name} - ${c.section}` : name;
}

function getAssignedClasses(teacher) {
  const assigned = teacher.assigned_classes || teacher.classes || teacher.class_names || [];

  if (Array.isArray(assigned)) return assigned.map(getClassLabel);

  if (typeof assigned === 'string') {
    try {
      const parsed = JSON.parse(assigned);
      return Array.isArray(parsed) ? parsed.map(getClassLabel) : [];
    } catch {
      return assigned ? [assigned] : [];
    }
  }

  return [];
}

export default function TeachersPage() {
  const toast = useToast();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const load = async () => {
    try {
      const teacherRes = await getTeachers();
      setTeachers(teacherRes.data.teachers || []);
    } catch { toast('Failed to load teachers', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Required';
    if (!form.email) e.email = 'Required';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 chars';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createTeacher(form);
      toast('Teacher created!', 'success');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', phone: '' });
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this teacher?')) return;
    try {
      await deleteTeacher(id);
      toast('Teacher deleted', 'success');
      setTeachers((prev) => prev.filter((t) => t.id !== id));
    } catch { toast('Failed to delete', 'error'); }
  };

  const handleToggleMeal = async (id, current) => {
    try {
      await updateMealPermission(id, !current);
      toast(`Meal permission ${!current ? 'granted' : 'revoked'}`, 'success');
      setTeachers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, can_manage_meals: !current } : t))
      );
    } catch { toast('Failed to update permission', 'error'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Teachers"
        description={`${teachers.length} teacher${teachers.length !== 1 ? 's' : ''} in your school`}
        action={
          <Button icon={Plus} onClick={() => setShowModal(true)}>Add Teacher</Button>
        }
      />

      {teachers.length === 0 ? (
        <EmptyState
          icon={UserSquare2}
          title="No teachers yet"
          description="Add your first teacher to get started"
          action={<Button icon={Plus} onClick={() => setShowModal(true)}>Add Teacher</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {teachers.map((t) => {
            const assignedClasses = getAssignedClasses(t);

            return (
              <Card key={t.id} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--blue-dim)] flex items-center justify-center flex-shrink-0">
                  <UserSquare2 size={18} className="text-[var(--blue)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</span>
                    {t.can_manage_meals && <Badge color="green">Meal Access</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1"><Mail size={11} />{t.email}</span>
                    {t.phone && <span className="flex items-center gap-1"><Phone size={11} />{t.phone}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[11px] text-[var(--text-muted)]">Classes:</span>
                    {assignedClasses.length > 0 ? (
                      assignedClasses.map((className) => (
                        <Badge key={className} color="amber">{className}</Badge>
                      ))
                    ) : (
                      <span className="text-[11px] text-[var(--text-muted)]">Not assigned</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={UtensilsCrossed}
                    onClick={() => handleToggleMeal(t.id, t.can_manage_meals)}
                  >
                    {t.can_manage_meals ? 'Revoke' : 'Grant'} Meals
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(t.id)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Teacher">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Full Name" placeholder="Jane Smith" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Email" type="email" placeholder="jane@school.edu" value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Password" type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} error={errors.password} />
          <Input label="Phone (optional)" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
          <div className="flex gap-3 mt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">Cancel</Button>
            <Button className="flex-1" loading={submitting} type="submit">Create Teacher</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}