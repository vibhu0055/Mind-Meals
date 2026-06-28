export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="mb-1 text-xl font-bold text-[var(--text-primary)]">{title}</h1>
        {description && <p className="text-sm text-[var(--text-muted)]">{description}</p>}
      </div>
      {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
