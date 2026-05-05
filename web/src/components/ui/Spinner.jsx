import { Loader2 } from 'lucide-react';

export function Spinner({ size = 20, className = '' }) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-[var(--accent)] ${className}`}
      style={{ animation: 'spin-slow 0.8s linear infinite' }}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Spinner size={28} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center mb-4">
          <Icon size={24} className="text-[var(--text-muted)]" />
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
