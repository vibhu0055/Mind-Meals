import { useState } from 'react'
import { CheckCircle, Clock, UtensilsCrossed } from 'lucide-react'
import { StatusBadge, Card, SectionHeader } from '../../components/ui.jsx'
import { MEAL_MENU } from '../../data/mockData.js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartTooltip } from 'recharts';

const nutritionData = MEAL_MENU.map(m => ({
  day: m.day.slice(0, 3),
  Calories: m.calories,
  Protein: m.protein * 10,
  Carbs: m.carbs * 4,
}))

export default function PrincipalMeals() {
  const [approving, setApproving] = useState(null)

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6 anim-fade-up">
      <div>
        <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-1">Principal Overview</p>
        <h1 className="text-3xl font-display font-bold text-stone-900">Meal Menu</h1>
        <p className="text-stone-400 mt-1">Weekly nutrition plan and dietician approvals</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Avg Calories',  value: '470 kcal',  icon: UtensilsCrossed, bg: 'bg-forest-800' },
          { label: 'Avg Protein',   value: '17g',        icon: CheckCircle,    bg: 'bg-blue-600'   },
          { label: 'Pending Meals', value: MEAL_MENU.filter(m => m.status === 'pending').length, icon: Clock, bg: 'bg-amber-500' },
        ].map(({ label, value, icon: Icon, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-3xl font-display font-bold text-stone-900 mt-0.5">{value}</p>
            </div>
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Weekly menu table */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100">
          <h2 className="font-display font-semibold text-stone-800">Weekly Menu</h2>
          <p className="text-xs text-stone-400 mt-0.5">Nutritional breakdown and approval status</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 text-stone-400 text-xs uppercase tracking-wide border-b border-stone-100">
              {['Day', 'Meal', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Score', 'Status', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {MEAL_MENU.map(m => (
              <tr key={m.id} className="hover:bg-stone-50/60 transition">
                <td className="px-5 py-4 font-semibold text-stone-800">{m.day}</td>
                <td className="px-5 py-4 text-stone-700">{m.meal}</td>
                <td className="px-5 py-4 text-stone-600">{m.calories}</td>
                <td className="px-5 py-4 text-stone-600">{m.protein}</td>
                <td className="px-5 py-4 text-stone-600">{m.carbs}</td>
                <td className="px-5 py-4 text-stone-600">{m.fat}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-forest-600" style={{ width: `${(m.score/10)*100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-stone-700">{m.score}</span>
                  </div>
                </td>
                <td className="px-5 py-4"><StatusBadge status={m.status} /></td>
                <td className="px-5 py-4">
                  {m.status === 'pending' && (
                    <button
                      onClick={() => setApproving(m.id)}
                      className="text-xs font-semibold text-forest-700 hover:text-forest-900 border border-forest-200 hover:border-forest-400 px-2.5 py-1 rounded-lg transition">
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nutrition chart */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <SectionHeader title="Weekly Nutrition Overview" subtitle="Calorie and macronutrient breakdown" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={nutritionData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Calories" fill="#1e7d47" radius={[4,4,0,0]} />
            <Bar dataKey="Protein"  fill="#3b82f6" radius={[4,4,0,0]} />
            <Bar dataKey="Carbs"    fill="#f59e0b" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
