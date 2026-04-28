import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { StatusBadge } from '../../components/ui.jsx'
import { CHECKUPS } from '../../data/mockData.js'

export default function PrincipalCheckups() {
  const [search, setSearch] = useState('')
  const filtered = CHECKUPS.filter(c => c.student.toLowerCase().includes(search.toLowerCase()))

  const upcoming = CHECKUPS.filter(c => c.status === 'Scheduled').length
  const flagged  = CHECKUPS.filter(c => c.status === 'Flagged').length
  const complete = CHECKUPS.filter(c => c.status === 'Complete').length

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6 anim-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-1">Principal Overview</p>
          <h1 className="text-3xl font-display font-bold text-stone-900">Schedule Checkups</h1>
          <p className="text-stone-400 mt-1">Manage health screenings and medical records</p>
        </div>
        <button className="flex items-center gap-2 bg-forest-800 hover:bg-forest-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus className="w-4 h-4" /> Schedule Checkup
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Completed', value: complete, color: 'text-forest-700 bg-forest-50 border-forest-100' },
          { label: 'Flagged',   value: flagged,  color: 'text-red-700 bg-red-50 border-red-100' },
          { label: 'Scheduled', value: upcoming, color: 'text-amber-700 bg-amber-50 border-amber-100' },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border p-5 ${c.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{c.label}</p>
            <p className="text-4xl font-display font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400" />
            <input className="bg-transparent text-sm text-stone-700 placeholder-stone-400 outline-none flex-1"
              placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wide border-b border-stone-100">
                {['Student', 'Grade', 'Date', 'Height (cm)', 'Weight (kg)', 'BMI', 'Vision', 'Dental', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-stone-50/60 transition">
                  <td className="px-5 py-3.5 font-semibold text-stone-800">{c.student}</td>
                  <td className="px-5 py-3.5 text-stone-500">{c.grade}</td>
                  <td className="px-5 py-3.5 text-stone-400 text-xs">{c.date || '—'}</td>
                  <td className="px-5 py-3.5 text-stone-600">{c.height ?? '—'}</td>
                  <td className="px-5 py-3.5 text-stone-600">{c.weight ?? '—'}</td>
                  <td className="px-5 py-3.5 font-mono text-stone-700">{c.bmi ?? '—'}</td>
                  <td className="px-5 py-3.5 text-stone-500">{c.vision ?? '—'}</td>
                  <td className="px-5 py-3.5 text-stone-500">{c.dental ?? '—'}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
