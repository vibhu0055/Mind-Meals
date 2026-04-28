import { useState } from 'react'
import { Search, Plus, Filter, ArrowUpRight, Download } from 'lucide-react'
import { StatusBadge, Card } from '../../components/ui.jsx'
import { STUDENTS } from '../../data/mockData.js'

export default function PrincipalStudents() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = STUDENTS.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search)
    const matchFilter = filter === 'All' || s.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6 anim-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-1">Principal Overview</p>
          <h1 className="text-3xl font-display font-bold text-stone-900">Students</h1>
          <p className="text-stone-400 mt-1">Manage and monitor all enrolled students</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium px-4 py-2.5 rounded-xl transition">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-2 bg-forest-800 hover:bg-forest-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: STUDENTS.length, color: 'bg-stone-800' },
          { label: 'Healthy', value: STUDENTS.filter(s => s.status === 'Healthy').length, color: 'bg-forest-700' },
          { label: 'At Risk', value: STUDENTS.filter(s => s.status === 'At Risk').length, color: 'bg-amber-600' },
          { label: 'Critical', value: STUDENTS.filter(s => s.status === 'Underweight' || s.status === 'Overweight').length, color: 'bg-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400 font-medium">{c.label}</p>
              <p className="text-3xl font-display font-bold text-stone-900 mt-0.5">{c.value}</p>
            </div>
            <div className={`w-3 h-8 rounded-full ${c.color} opacity-80`} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-stone-100 flex items-center gap-3 flex-wrap">
          <div className="flex-1 flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 min-w-[200px]">
            <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <input
              className="bg-transparent text-sm text-stone-700 placeholder-stone-400 outline-none flex-1"
              placeholder="Search by name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {['All', 'Healthy', 'At Risk', 'Underweight', 'Overweight'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${filter === f ? 'bg-forest-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wide border-b border-stone-100">
                <th className="text-left px-5 py-3 font-semibold">ID</th>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Grade</th>
                <th className="text-left px-5 py-3 font-semibold">Age</th>
                <th className="text-left px-5 py-3 font-semibold">Weight (kg)</th>
                <th className="text-left px-5 py-3 font-semibold">BMI</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Last Checkup</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-stone-50/60 transition group">
                  <td className="px-5 py-3.5 text-stone-400 font-mono text-xs">{s.id}</td>
                  <td className="px-5 py-3.5 font-semibold text-stone-800">{s.name}</td>
                  <td className="px-5 py-3.5 text-stone-500">{s.grade}</td>
                  <td className="px-5 py-3.5 text-stone-500">{s.age}</td>
                  <td className="px-5 py-3.5 text-stone-600">{s.weight}</td>
                  <td className="px-5 py-3.5 font-mono text-stone-700">{s.bmi}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-3.5 text-stone-400 text-xs">{s.lastCheckup}</td>
                  <td className="px-5 py-3.5">
                    <button className="opacity-0 group-hover:opacity-100 transition text-stone-400 hover:text-forest-700">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-stone-400 py-12 text-sm">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
