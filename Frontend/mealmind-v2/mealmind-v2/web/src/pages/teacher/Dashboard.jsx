import { TEACHER_CLASS } from '../../data/mockData.js'
import { StatusBadge, StatCard, SectionHeader, ChartTooltip } from '../../components/ui.jsx'
import { Users, Heart, AlertTriangle, UtensilsCrossed, CheckCircle, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const gradeData = [
  { label: 'Healthy',     value: TEACHER_CLASS.healthy,    fill: '#1e7d47' },
  { label: 'At Risk',     value: TEACHER_CLASS.atRisk,     fill: '#f59e0b' },
  { label: 'Underweight', value: TEACHER_CLASS.underweight, fill: '#ef4444' },
  { label: 'Overweight',  value: TEACHER_CLASS.overweight,  fill: '#f97316' },
]

export default function TeacherDashboard() {
  const cls = TEACHER_CLASS
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6 anim-fade-up">
      <div>
        <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-1">Class {cls.class}</p>
        <h1 className="text-3xl font-display font-bold text-stone-900">Class Health Overview</h1>
        <p className="text-stone-400 mt-1">Real-time health and nutrition data for your students</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard delay={1} label="Total Students" value={cls.totalStudents} icon={Users}         iconBg="bg-blue-600" />
        <StatCard delay={2} label="Healthy"         value={cls.healthy}      icon={Heart}         iconBg="bg-forest-700" sub="Normal BMI" subType="up" />
        <StatCard delay={3} label="At Risk"         value={cls.atRisk}       icon={AlertTriangle} iconBg="bg-amber-500" sub="Needs attention" subType="down" />
        <StatCard delay={4} label="Overweight"      value={cls.overweight}   icon={Users}         iconBg="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's Meal */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <SectionHeader title="Today's Meal" subtitle={`Serving at ${cls.todayMeal.servingTime}`} />
          <div className="space-y-3">
            <div className="p-4 bg-forest-50 border border-forest-100 rounded-xl">
              <p className="font-display font-semibold text-forest-900">{cls.todayMeal.name}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-forest-700">
                <span>{cls.todayMeal.calories} kcal</span>
                <span>{cls.todayMeal.protein}g protein</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500">Students served</span>
              <span className="font-semibold text-stone-800">{cls.todayMeal.servedCount}/{cls.totalStudents}</span>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-full">
              <div className="h-full bg-forest-600 rounded-full" style={{ width: `${(cls.todayMeal.servedCount / cls.totalStudents) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* BMI chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <SectionHeader title="Class BMI Breakdown" subtitle="" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gradeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Students" radius={[6,6,0,0]}>
                {gradeData.map((e, i) => (
                  <Bar key={i} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100">
          <h2 className="font-display font-semibold text-stone-800">Student Health Log — Class {cls.class}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wide border-b border-stone-100">
              {['ID', 'Name', 'BMI', 'Status', 'Last Meal', 'Attendance', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {cls.students.map(s => (
              <tr key={s.id} className="hover:bg-stone-50/60 transition">
                <td className="px-5 py-3.5 text-stone-400 font-mono text-xs">{s.id}</td>
                <td className="px-5 py-3.5 font-semibold text-stone-800">{s.name}</td>
                <td className="px-5 py-3.5 font-mono text-stone-700">{s.bmi}</td>
                <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                <td className="px-5 py-3.5 text-stone-500 text-xs">{s.lastMeal}</td>
                <td className="px-5 py-3.5 text-stone-600">{s.attendance}</td>
                <td className="px-5 py-3.5">
                  {(s.status === 'At Risk' || s.status === 'Underweight') && (
                    <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full">⚠ Flag</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
