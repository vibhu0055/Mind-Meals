import { Loader2 } from 'lucide-react';

const variants = {
  primary: {
    base: 'bg-[var(--accent)] text-[#0d0f14] hover:bg-green-300',
    disabled: 'bg-[var(--accent-dim)] text-[var(--text-muted)]',
  },
  secondary: {
    base: 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]',
    disabled: 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-soft)]',
  },
  danger: {
    base: 'bg-[var(--red-dim)] text-[var(--red)] border border-[rgba(248,113,113,0.2)] hover:bg-[rgba(248,113,113,0.2)]',
    disabled: 'bg-[var(--bg-card)] text-[var(--text-muted)]',
  },
  ghost: {
    base: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
    disabled: 'text-[var(--text-muted)]',
  },
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-sm gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-[var(--radius)]
        transition-all duration-150 cursor-pointer select-none whitespace-nowrap
        ${s}
        ${isDisabled ? `${v.disabled} opacity-60 cursor-not-allowed` : v.base}
        ${className}
      `}
      {...props}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin" />
        : Icon && <Icon size={14} />}
      {children}
    </button>
  );
}
