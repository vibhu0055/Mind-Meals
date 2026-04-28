import { useState } from 'react'
import { Bell, CheckCheck, AlertTriangle, Info } from 'lucide-react'
import { ALERTS } from '../../data/mockData.js'
import { Badge } from '../../components/ui.jsx'

export default function PrincipalAlerts() {
  const [alerts, setAlerts] = useState(ALERTS)
  const [filter, setFilter] = useState('all')

  function markRead(id) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a))
  }
  function markAllRead() {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
  }

  const filtered = alerts.filter(a => filter === 'all' || a.type === filter || (filter === 'unread' && !a.read))

  const icons = {
    critical: <AlertTriangle className="w-4 h-4 text-red-600" />,
    warning:  <AlertTriangle className="w-4 h-4 text-amber-600" />,
    info:     <Info className="w-4 h-4 text-blue-600" />,
  }
  const bgs = {
    critical: 'bg-red-50 border-red-100',
    warning:  'bg-amber-50 border-amber-100',
    info:     'bg-blue-50 border-blue-100',
  }
  const iconBgs = {
    critical: 'bg-red-100',
    warning:  'bg-amber-100',
    info:     'bg-blue-100',
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6 anim-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-1">Principal Overview</p>
          <h1 className="text-3xl font-display font-bold text-stone-900">Alerts</h1>
          <p className="text-stone-400 mt-1">{alerts.filter(a => !a.read).length} unread notifications</p>
        </div>
        <button onClick={markAllRead}
          className="flex items-center gap-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium px-4 py-2.5 rounded-xl transition">
          <CheckCheck className="w-4 h-4" /> Mark all read
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {[['all','All'], ['unread','Unread'], ['critical','Critical'], ['warning','Warning'], ['info','Info']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`text-sm font-medium px-4 py-2 rounded-xl transition ${filter === v ? 'bg-forest-800 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(alert => (
          <div key={alert.id}
            className={`flex items-start gap-4 p-4 rounded-2xl border transition ${bgs[alert.type]} ${alert.read ? 'opacity-60' : ''}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgs[alert.type]}`}>
              {icons[alert.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-stone-800 text-sm">{alert.title}</p>
                <Badge variant={alert.type}>{alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}</Badge>
                {!alert.read && <span className="w-2 h-2 rounded-full bg-forest-600 flex-shrink-0" />}
              </div>
              <p className="text-sm text-stone-500 mt-0.5">{alert.body}</p>
              <p className="text-xs text-stone-400 mt-1">{alert.time}</p>
            </div>
            {!alert.read && (
              <button onClick={() => markRead(alert.id)}
                className="text-xs font-medium text-forest-700 hover:text-forest-900 flex-shrink-0 border border-forest-200 px-2.5 py-1 rounded-lg transition">
                Dismiss
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 flex flex-col items-center justify-center py-16 text-stone-400">
            <Bell className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No alerts in this category</p>
          </div>
        )}
      </div>
    </div>
  )
}
