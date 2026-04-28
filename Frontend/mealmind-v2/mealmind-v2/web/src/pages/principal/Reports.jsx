import { SectionHeader, ChartTooltip } from 'recharts'
import { MALNUTRITION_BY_GRADE, NUTRITION_STATUS, RDA_COMPARISON, GROWTH_TREND } from '../../data/mockData.js'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts'
import { Download } from 'lucide-react'

export default function PrincipalReports() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6 anim-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-1">Principal Overview</p>
          <h1 className="text-3xl font-display font-bold text-stone-900">Reports</h1>
          <p className="text-stone-400 mt-1">Comprehensive health and nutrition analytics</p>
        </div>
        <button className="flex items-center gap-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium px-4 py-2.5 rounded-xl transition">
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Malnutrition by grade */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <SectionHeader title="Malnutrition by Grade" subtitle="Distribution across different grades" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MALNUTRITION_BY_GRADE} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="normal"     name="Normal"     fill="#1e7d47" radius={[4,4,0,0]} />
              <Bar dataKey="overweight" name="Overweight" fill="#f59e0b" radius={[4,4,0,0]} />
              <Bar dataKey="underweight" name="Underweight" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Nutrition status pie */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <SectionHeader title="Nutrition Status Distribution" subtitle="Percentage meeting dietary requirements" />
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={NUTRITION_STATUS} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={4} dataKey="value">
                  {NUTRITION_STATUS.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-shrink-0">
              {NUTRITION_STATUS.map(d => (
                <div key={d.name} className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <div>
                    <p className="text-xs font-semibold text-stone-700">{d.value}%</p>
                    <p className="text-xs text-stone-400">{d.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* RDA comparison */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <SectionHeader title="RDA Comparison" subtitle="Current nutrition vs Recommended Daily Allowance" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={RDA_COMPARISON} layout="vertical" margin={{ top: 4, right: 16, left: 16, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" horizontal={false} />
              <XAxis type="number" domain={[0,100]} tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nutrient" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} width={68} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="current" name="Current" fill="#1e7d47" radius={[0,4,4,0]} />
              <Bar dataKey="rda"     name="RDA"     fill="#e7e5e4" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Growth trend */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <SectionHeader title="Growth Trend (6 months)" subtitle="Weight status distribution over time" />
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={GROWTH_TREND} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="normal"     name="Normal"     stroke="#1e7d47" strokeWidth={2.5} dot={{ r:3 }} />
              <Line type="monotone" dataKey="overweight" name="Overweight" stroke="#f59e0b" strokeWidth={2.5} dot={{ r:3 }} />
              <Line type="monotone" dataKey="underweight" name="Underweight" stroke="#ef4444" strokeWidth={2.5} dot={{ r:3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
