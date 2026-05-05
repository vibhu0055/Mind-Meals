import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import Card from '../ui/Card';

function getClassLabel(classItem) {
  const name = classItem.class_name || classItem.name || `Class ${classItem.id}`;
  return classItem.section ? `${name} - ${classItem.section}` : name;
}

export default function AssignedClassCards({
  classes = [],
  title = 'Assigned Classes',
  linkTo = '/students',
  className = '',
}) {
  if (!classes.length) return null;

  return (
    <div className={className}>
      {title && (
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          {title}
        </h2>
      )}

      <div className="grid grid-cols-2 gap-3">
        {classes.map((classItem) => (
          <Card key={classItem.id} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--amber-dim)] flex items-center justify-center flex-shrink-0">
              <BookOpen size={18} className="text-[var(--amber)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {getClassLabel(classItem)}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {classItem.studentCount ?? 0} student{classItem.studentCount !== 1 ? 's' : ''}
              </div>
            </div>
            {linkTo && (
              <Link to={linkTo} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                <ArrowRight size={16} />
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
