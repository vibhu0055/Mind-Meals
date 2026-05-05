const colors = {
  green: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]',
  amber: 'bg-[var(--amber-dim)] text-[var(--amber)] border-[rgba(245,158,11,0.3)]',
  blue: 'bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(96,165,250,0.3)]',
  red: 'bg-[var(--red-dim)] text-[var(--red)] border-[rgba(248,113,113,0.3)]',
  purple: 'bg-[var(--purple-dim)] text-[var(--purple)] border-[rgba(167,139,250,0.3)]',
  muted: 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border)]',
};

export default function Badge({ children, color = 'muted', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${colors[color] || colors.muted} ${className}`}>
      {children}
    </span>
  );
}
