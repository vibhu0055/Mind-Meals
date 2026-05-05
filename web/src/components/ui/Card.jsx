export default function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`
        bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5
        ${hover ? 'transition-all duration-200 hover:border-[var(--accent-border)] hover:bg-[var(--bg-hover)] cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
