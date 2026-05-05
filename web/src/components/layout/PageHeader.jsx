export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{title}</h1>
        {description && <p className="text-sm text-[var(--text-muted)]">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  );
}
