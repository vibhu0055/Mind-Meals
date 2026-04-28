// components/ui.jsx — reusable building blocks

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-100 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Badge({ children, variant = 'default' }) {
  const variants = {
    default:     'bg-stone-100 text-stone-600',
    healthy:     'bg-emerald-100 text-emerald-700',
    'at-risk':   'bg-amber-100 text-amber-700',
    underweight: 'bg-red-100 text-red-700',
    overweight:  'bg-orange-100 text-orange-700',
    critical:    'bg-red-100 text-red-700 border border-red-200',
    warning:     'bg-amber-100 text-amber-700 border border-amber-200',
    info:        'bg-blue-100 text-blue-700 border border-blue-200',
    success:     'bg-emerald-100 text-emerald-700 border border-emerald-200',
    approved:    'bg-emerald-100 text-emerald-700',
    pending:     'bg-amber-100 text-amber-700',
    flagged:     'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${variants[variant] || variants.default}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    'Healthy':     'healthy',
    'At Risk':     'at-risk',
    'Underweight': 'underweight',
    'Overweight':  'overweight',
    'Complete':    'healthy',
    'Flagged':     'critical',
    'Follow-up':   'warning',
    'Scheduled':   'info',
    'approved':    'approved',
    'pending':     'pending',
  }
  return <Badge variant={map[status] || 'default'}>{status}</Badge>
}

export function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <span className="w-8 h-8 border-2 border-stone-200 border-t-forest-600 rounded-full animate-spin" />
    </div>
  )
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="font-display font-semibold text-stone-800 text-base">{title}</h2>
        {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, sub, subType = 'neutral', icon: Icon, iconBg, delay = 1 }) {
  const subColors = {
    up:      'bg-emerald-100 text-emerald-700',
    down:    'bg-red-100 text-red-600',
    neutral: 'bg-stone-100 text-stone-600',
  }
  return (
    <div className={`bg-white rounded-2xl p-5 border border-stone-100 shadow-sm hover:shadow-md transition-shadow anim-fade-up anim-d${delay}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-display font-bold text-stone-900 mt-1.5 leading-none">{value}</p>
          {sub && (
            <span className={`inline-flex items-center mt-2.5 text-xs font-semibold px-2 py-0.5 rounded-full ${subColors[subType]}`}>
              {sub}
            </span>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-lg px-3 py-2.5 text-sm">
      <p className="font-semibold text-stone-700 mb-1.5 font-display">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-stone-600">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-semibold text-stone-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-stone-400">
      <Icon className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
