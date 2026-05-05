import { ChevronDown } from 'lucide-react';

export default function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            w-full appearance-none bg-[var(--bg-card)] border text-[var(--text-primary)]
            rounded-[var(--radius)] px-3 py-2.5 text-sm pr-9
            transition-all duration-150 cursor-pointer
            focus:outline-none focus:border-[var(--accent-border)] focus:bg-[var(--bg-hover)]
            ${error ? 'border-[var(--red)]' : 'border-[var(--border)]'}
          `}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
      </div>
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}
    </div>
  );
}
