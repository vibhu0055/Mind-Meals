import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addHealthRecord, getHealthRecordsByStudent, deleteHealthRecord } from '../api/health';
import { getStudents } from '../api/students';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import { HeartPulse, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

function bmiColor(cat) {
  if (!cat) return 'muted';
  const c = cat.toLowerCase();
  if (c.includes('underweight')) return 'amber';
  if (c.includes('normal')) return 'green';
  if (c.includes('overweight') || c.includes('obese')) return 'red';
  return 'muted';
}

export default function HealthPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const initialStudent = searchParams.get('student_id') || '';

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(initialStudent);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ student_id: initialStudent, height_cm: '', weight_kg: '', muac_cm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getStudents()
      .then((res) => setStudents(res.data.students || []))
      .catch(() => toast('Failed to load students', 'error'))
      .finally(() => setStudentsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedStudent) { setRecords([]); return; }
    setLoading(true);
    getHealthRecordsByStudent(selectedStudent)
      .then((res) => setRecords(res.data.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [selectedStudent]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.student_id) e.student_id = 'Required';
    if (!form.height_cm) e.height_cm = 'Required';
    if (!form.weight_kg) e.weight_kg = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleAdd = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await addHealthRecord({
        student_id: parseInt(form.student_id),
        height_cm: parseFloat(form.height_cm),
        weight_kg: parseFloat(form.weight_kg),
        muac_cm: form.muac_cm ? parseFloat(form.muac_cm) : undefined,
      });
      toast('Health record added!', 'success');
      setShowModal(false);
      if (form.student_id === selectedStudent || !selectedStudent) {
        setSelectedStudent(form.student_id);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return;
    try {
      await deleteHealthRecord(id);
      toast('Record deleted', 'success');
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch { toast('Failed', 'error'); }
  };

  const studentName = students.find((s) => String(s.id) === String(selectedStudent))?.name;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Health Records"
        description="Track student anthropometric measurements"
        action={<Button icon={Plus} onClick={() => setShowModal(true)}>Add Record</Button>}
      />

      {/* Student filter */}
      <div className="flex gap-3 mb-6">
        <Select
          className="w-64"
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          disabled={studentsLoading}
        >
          <option value="">Select student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name} (Age {s.age})</option>
          ))}
        </Select>
      </div>

      {!selectedStudent ? (
        <EmptyState icon={HeartPulse} title="Select a student" description="Choose a student above to view their health records" />
      ) : loading ? (
        <PageLoader />
      ) : records.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title={`No records for ${studentName}`}
          description="Add the first health measurement"
          action={<Button icon={Plus} onClick={() => setShowModal(true)}>Add Record</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {records.map((r) => (
            <Card key={r.id} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {new Date(r.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <Badge color={bmiColor(r.bmi_category)}>{r.bmi_category}</Badge>
                  <span className="text-xs text-[var(--text-muted)]">by {r.teacher_name}</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Height', value: `${r.height_cm} cm` },
                    { label: 'Weight', value: `${r.weight_kg} kg` },
                    { label: 'BMI', value: r.bmi?.toFixed(1) },
                    { label: 'MUAC', value: r.muac_cm ? `${r.muac_cm} cm` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 mono">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(r.id)} />
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Health Record">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Select
            label="Student"
            value={form.student_id}
            onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
            error={errors.student_id}
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Height (cm)" type="number" step="0.1" placeholder="120.5" value={form.height_cm} onChange={set('height_cm')} error={errors.height_cm} />
            <Input label="Weight (kg)" type="number" step="0.1" placeholder="25.0" value={form.weight_kg} onChange={set('weight_kg')} error={errors.weight_kg} />
          </div>
          <Input label="MUAC (cm) — optional" type="number" step="0.1" placeholder="Mid-upper arm circumference" value={form.muac_cm} onChange={set('muac_cm')} />
          <p className="text-xs text-[var(--text-muted)]">BMI will be calculated automatically.</p>
          <div className="flex gap-3 mt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)} type="button">Cancel</Button>
            <Button className="flex-1" loading={submitting} type="submit">Save Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
