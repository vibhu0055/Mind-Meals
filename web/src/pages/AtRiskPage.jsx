import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudents, notifyParent } from '../api/students';
import { useToast } from '../components/ui/Toast';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import {
  AlertTriangle, ArrowRight, ShieldAlert, Users, BellRing,
} from 'lucide-react';

const RISK_CATEGORIES = [
  {
    label: 'Critical',
    param: 'Critical',
    color: 'var(--red)',
    dim: 'var(--red-dim)',
    icon: ShieldAlert,
    desc: 'Severe thinness or SAM',
    badgeColor: 'red',
  },
  {
    label: 'High Risk',
    param: 'High Risk',
    color: 'var(--amber)',
    dim: 'var(--amber-dim)',
    icon: AlertTriangle,
    desc: 'Thinness, needs attention',
    badgeColor: 'amber',
  },
  {
    label: 'Moderate Risk',
    param: 'Moderate Risk',
    color: 'var(--yellow, #eab308)',
    dim: 'rgba(234,179,8,0.12)',
    icon: AlertTriangle,
    desc: 'At-risk, monitor closely',
    badgeColor: 'amber',
  },
];

function StudentCard({ student, categoryLabel, categoryColor, badgeColor, onNotify, notifying }) {
  const canNotify = (categoryLabel === 'Critical' || categoryLabel === 'High Risk') &&
    (student.parent_email || student.parent_phone);

  return (
    <Card>
      <div className="flex items-center gap-4">
        {/* WHO label pill */}
        <div
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: `${categoryColor}22`, color: categoryColor, border: `1.5px solid ${categoryColor}44` }}
        >
          {categoryLabel}
        </div>

        {/* Student info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {student.name}
            </span>
            {student.class_name && (
              <span className="text-xs text-[var(--text-muted)]">{student.class_name}</span>
            )}

            {student.gender && (
              <Badge color={student.gender === 'male' ? 'blue' : 'purple'}>
                {student.gender}
              </Badge>
            )}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {student.age && `Age ${student.age}`}
            {student.age && student.health_recorded_at && ' · '}
            {student.health_recorded_at && `Recorded ${new Date(student.health_recorded_at).toLocaleDateString()}`}
            {(student.parent_email || student.parent_phone) && (
              <span className="ml-1.5 text-[var(--green)] font-medium">· Contact on file</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canNotify && (
            <Button
              variant="danger"
              size="sm"
              icon={BellRing}
              loading={notifying === student.id}
              onClick={() => onNotify(student.id)}
            >
              Notify
            </Button>
          )}
          <Link
            to={`/students/${student.id}`}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium"
          >
            Profile <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default function AtRiskPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [byCategory, setByCategory] = useState({ Critical: [], 'High Risk': [], 'Moderate Risk': [] });
  const [notifying, setNotifying] = useState(null);

  const handleNotify = async (id) => {
    setNotifying(id);
    try {
      const res = await notifyParent(id);
      const { channels } = res.data;
      const parts = [];
      if (channels?.email?.status === 'sent') parts.push('Email sent');
      else if (channels?.email?.status === 'error') parts.push('Email failed');
      if (channels?.sms?.status === 'sent') parts.push('SMS sent');
      else if (channels?.sms?.status === 'error') parts.push('SMS failed');
      toast(parts.length ? parts.join(' · ') : 'Alert dispatched', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send alert', 'error');
    } finally {
      setNotifying(null);
    }
  };

  useEffect(() => {
    Promise.allSettled([
      getStudents({ malnutrition_label: 'Critical' }),
      getStudents({ malnutrition_label: 'High Risk' }),
      getStudents({ malnutrition_label: 'Moderate Risk' }),
    ]).then(([critical, high, moderate]) => {
      setByCategory({
        'Critical':      critical.value?.data?.students  || [],
        'High Risk':     high.value?.data?.students      || [],
        'Moderate Risk': moderate.value?.data?.students  || [],
      });
    }).catch(() => {
      toast('Failed to load at-risk students', 'error');
    }).finally(() => setLoading(false));
  }, []);

  const total = Object.values(byCategory).reduce((sum, arr) => sum + arr.length, 0);

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="At-Risk Students"
        description={`${total} student${total !== 1 ? 's' : ''} flagged by WHO malnutrition classification`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {RISK_CATEGORIES.map(({ label, color, dim, icon: Icon, desc }) => (
          <Card key={label}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: dim }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-2xl font-bold mb-0.5" style={{ color }}>
              {byCategory[label].length}
            </div>
            <div className="text-xs font-medium" style={{ color }}>{label}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{desc}</div>
          </Card>
        ))}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No at-risk students found"
          description="Add health records (height & weight) for students to enable WHO malnutrition classification."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {RISK_CATEGORIES.map(({ label, color, dim, icon: Icon, badgeColor }) => {
            const students = byCategory[label];
            if (students.length === 0) return null;
            return (
              <div key={label}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: dim }}>
                    <Icon size={12} style={{ color }} />
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color }}>{label}</h2>
                  <span className="text-xs text-[var(--text-muted)]">({students.length})</span>
                </div>

                <div className="flex flex-col gap-2">
                  {students.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      categoryLabel={label}
                      categoryColor={color}
                      badgeColor={badgeColor}
                      onNotify={handleNotify}
                      notifying={notifying}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}