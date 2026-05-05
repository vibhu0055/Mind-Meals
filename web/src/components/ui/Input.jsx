export default function Input({
  label,
  error,
  helper,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <Icon size={15} />
          </div>
        )}
        <input
          className={`
            w-full bg-[var(--bg-card)] border text-[var(--text-primary)]
            rounded-[var(--radius)] px-3 py-2.5 text-sm
            placeholder:text-[var(--text-muted)]
            transition-all duration-150
            focus:outline-none focus:border-[var(--accent-border)] focus:bg-[var(--bg-hover)]
            ${error ? 'border-[var(--red)] bg-[var(--red-dim)]' : 'border-[var(--border)]'}
            ${Icon ? 'pl-9' : ''}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}
      {helper && !error && <p className="text-xs text-[var(--text-muted)]">{helper}</p>}
    </div>
  );
}
