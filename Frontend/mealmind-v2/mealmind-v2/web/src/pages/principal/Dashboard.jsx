import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { StatCard, Card, Badge, LiveDot, ChartTooltip, SectionHeader } from '../../components/ui.jsx'
import {
  MOCK_STATS, GROWTH_TREND, BMI_DISTRIBUTION, NUTRITION_STATUS,
  ALERTS, MEAL_MENU, STAFF
} from '../../data/mockData.js'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  Users, TrendingDown, TrendingUp, Minus, UtensilsCrossed,
  AlertTriangle, Calendar, ArrowUpRight, CalendarCheck, FileBarChart2, Plus
} from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function PrincipalDashboard() {
  const { user } = useAuth()
  const [stats] = useState(MOCK_STATS)
  const unread = ALERTS.filter(a => !a.read).length

  const firstName = (user?.name || 'Dr. Rao').split(' ').pop()

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Hero header */}
      <div className="anim-fade-up flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-1">Principal Overview</p>
          <h1 className="text-4xl font-display font-extrabold text-stone-900">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="text-stone-400 mt-1.5">Real-time pulse on students, nutrition, vaccinations and staff.</p>
        </div>
        <Link to="/principal/reports"
          className="flex items-center gap-2 bg-forest-800 hover:bg-forest-900 text-white px-5 py-3 rounded-xl text-sm font-semibold transition flex-shrink-0">
          <FileBarChart2 className="w-4 h-4" /> View reports
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard delay={1} label="Total Students"      value={stats.totalStudents} sub="+12 this month"   subType="up"      icon={Users}          iconBg="bg-blue-500" />
        <StatCard delay={2} label="Healthy"             value={stats.healthy}       sub="86.8%"            subType="up"      icon={Minus}          iconBg="bg-forest-600" />
        <StatCard delay={3} label="At Risk"             value={stats.atRisk}        sub="7.3% overweight"  subType="down"    icon={TrendingUp}     iconBg="bg-orange-500" />
        <StatCard delay={4} label="Checkups Scheduled"  value={stats.checkupsScheduled} sub="this week"   subType="neutral" icon={CalendarCheck}  iconBg="bg-amber-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* BMI Distribution — bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-6 anim-fade-up anim-d2">
          <SectionHeader
            title="BMI Distribution"
            subtitle="Live BMI buckets across the school"
            action={<LiveDot />}
          />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={BMI_DISTRIBUTION} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={64}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Students" radius={[6,6,0,0]}>
                {BMI_DISTRIBUTION.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts panel */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 anim-fade-up anim-d3">
          <SectionHeader
            title="Alerts"
            subtitle=""
            action={
              <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full flex items-center gap-1.5">
                <LiveDot />{unread} live
              </span>
            }
          />
          <div className="space-y-3">
            {ALERTS.slice(0, 4).map(alert => {
              const colors = {
                critical: { bg: 'bg-red-50', dot: 'bg-red-500', text: 'text-red-700' },
                warning:  { bg: 'bg-amber-50', dot: 'bg-amber-500', text: 'text-amber-700' },
                info:     { bg: 'bg-stone-50', dot: 'bg-stone-400', text: 'text-stone-600' },
              }[alert.type]
              return (
                <div key={alert.id} className={`${colors.bg} rounded-xl p-3 flex gap-3`}>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${colors.text}`}>{alert.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{alert.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <Link to="/principal/alerts"
            className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900 transition">
            View all alerts <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Growth trend */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 anim-fade-up anim-d3">
        <SectionHeader title="Growth Trend Analysis" subtitle="Student weight distribution over time" />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={GROWTH_TREND} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              {[['gradN','#1e7d47'], ['gradO','#f59e0b'], ['gradU','#ef4444']].map(([id, c]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="normal"      name="Normal"      stroke="#1e7d47" fill="url(#gradN)" strokeWidth={2} dot={{ r:3, fill:'#1e7d47' }} />
            <Area type="monotone" dataKey="overweight"  name="Overweight"  stroke="#f59e0b" fill="url(#gradO)" strokeWidth={2} dot={{ r:3, fill:'#f59e0b' }} />
            <Area type="monotone" dataKey="underweight" name="Underweight" stroke="#ef4444" fill="url(#gradU)" strokeWidth={2} dot={{ r:3, fill:'#ef4444' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom: Staff directory + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Staff directory */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-6 anim-fade-up anim-d2">
          <SectionHeader title="Staff Directory" subtitle="School staff contacts" />
          <div className="divide-y divide-stone-50">
            {STAFF.map(s => (
              <div key={s.id} className="flex items-center gap-4 py-3.5 hover:bg-stone-50 -mx-2 px-2 rounded-xl transition">
                <div className="w-9 h-9 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center font-display font-bold text-sm flex-shrink-0">
                  {s.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 text-sm">{s.name}</p>
                  <p className="text-xs text-stone-400">{s.role}</p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-stone-600">{s.email}</p>
                  <p className="text-xs text-stone-400">{s.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-forest-800 rounded-2xl p-6 text-white anim-fade-up anim-d3">
          <h2 className="font-display font-semibold mb-4">Quick actions</h2>
          <div className="space-y-2.5">
            {[
              { label: 'Schedule Checkup',   to: '/principal/health-checkups', icon: Calendar },
              { label: 'View Reports',       to: '/principal/reports',          icon: FileBarChart2 },
              { label: 'Meal Menu',          to: '/principal/meal-nutrition',   icon: UtensilsCrossed },
              { label: 'Manage Students',    to: '/principal/students',         icon: Plus },
            ].map(({ label, to, icon: Icon }) => (
              <Link key={label} to={to}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition group">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-forest-300" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-forest-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
