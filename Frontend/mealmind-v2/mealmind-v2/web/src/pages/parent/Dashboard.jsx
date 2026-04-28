import { PARENT_CHILD } from '../../data/mockData.js'
import { StatusBadge, SectionHeader, ChartTooltip } from '../../components/ui.jsx'
import { Heart, Scale, Calendar, Utensils, CheckCircle, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ParentDashboard() {
  const child = PARENT_CHILD

  const bmiCategory = child.bmi < 14 ? 'Underweight' : child.bmi < 25 ? 'Healthy' : 'Overweight'

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 space-y-6 anim-fade-up">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 flex items-start gap-5">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0">
          👦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-0.5">Your Child</p>
          <h1 className="text-2xl font-display font-bold text-stone-900">{child.name}</h1>
          <p className="text-stone-400 text-sm">Grade {child.grade} · Age {child.age}</p>
        </div>
        <StatusBadge status={child.status} />
      </div>

      {/* Vitals row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'BMI', value: child.bmi, icon: Scale,    bg: 'bg-violet-600', sub: bmiCategory },
          { label: 'Weight', value: `${child.weight} kg`, icon: Scale, bg: 'bg-blue-600' },
          { label: 'Height', value: `${child.height} cm`, icon: Heart, bg: 'bg-forest-600' },
          { label: 'Next Checkup', value: child.nextCheckup, icon: Calendar, bg: 'bg-amber-500' },
        ].map(({ label, value, icon: Icon, bg, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-xl font-display font-bold text-stone-900 mt-1">{value}</p>
                {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
              </div>
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Meal attendance */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <SectionHeader title="Meal Attendance" subtitle="This week" />
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl font-display font-bold text-stone-900">
              {child.mealsTaken}/{child.mealsTotal}
            </div>
            <div>
              <p className="text-xs font-semibold text-forest-700">
                {Math.round((child.mealsTaken/child.mealsTotal)*100)}% attendance
              </p>
              <p className="text-xs text-stone-400">meals taken this month</p>
            </div>
          </div>
          <div className="w-full h-2.5 bg-stone-100 rounded-full mb-5">
            <div className="h-full bg-forest-600 rounded-full transition-all"
              style={{ width: `${(child.mealsTaken/child.mealsTotal)*100}%` }} />
          </div>
          <div className="flex items-center gap-2">
            {child.weeklyMeals.map((m, i) => (
              <div key={i} className="flex-1 text-center">
                <div className={`w-full aspect-square rounded-xl flex items-center justify-center mb-1 ${m.eaten ? 'bg-forest-100' : 'bg-red-50'}`}>
                  {m.eaten
                    ? <CheckCircle className="w-4 h-4 text-forest-600" />
                    : <span className="text-xs text-red-500 font-bold">✗</span>
                  }
                </div>
                <p className="text-[10px] text-stone-400">{m.day}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vaccinations */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <SectionHeader title="Vaccinations" subtitle="Immunization schedule" />
          <div className="space-y-3">
            {child.vaccinations.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                <div className="flex items-center gap-3">
                  {v.status === 'done'
                    ? <CheckCircle className="w-4 h-4 text-forest-600" />
                    : <Clock className="w-4 h-4 text-amber-500" />
                  }
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{v.name}</p>
                    <p className="text-xs text-stone-400">{v.date}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  v.status === 'done' ? 'bg-forest-100 text-forest-700' : 'bg-amber-100 text-amber-700'}`}>
                  {v.status === 'done' ? 'Done' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BMI history chart */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <SectionHeader title="BMI Growth History" subtitle="Last 6 months" />
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={child.bmiHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <YAxis domain={[14, 18]} tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="bmi" name="BMI" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-stone-400 mt-3 text-center">Healthy BMI range for age {child.age}: 14.5 – 22.0</p>
      </div>
    </div>
  )
}
