import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { Save, School, Bell, Shield, Palette } from 'lucide-react'

export default function PrincipalSettings() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    schoolName: 'Delhi Public School',
    principalName: user?.name || 'Dr. Anjali Rao',
    email: user?.email || 'anjali.rao@school.edu',
    phone: '+91 98212 00000',
    mealAlerts: true,
    healthAlerts: true,
    weeklyReport: true,
    twoFactor: false,
  })

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-stone-100">
        <Icon className="w-4 h-4 text-forest-700" />
        <h2 className="font-display font-semibold text-stone-800">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )

  const Field = ({ label, ...props }) => (
    <div>
      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input {...props}
        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800
          focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent text-sm transition" />
    </div>
  )

  const Toggle = ({ label, sub, checked, onChange }) => (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium text-stone-700">{label}</p>
        {sub && <p className="text-xs text-stone-400">{sub}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-forest-700' : 'bg-stone-200'}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 anim-fade-up">
      <div>
        <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-1">Principal Overview</p>
        <h1 className="text-3xl font-display font-bold text-stone-900">Settings</h1>
        <p className="text-stone-400 mt-1">Manage your school profile and preferences</p>
      </div>

      <Section icon={School} title="School Profile">
        <Field label="School Name" value={form.schoolName} onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))} />
        <Field label="Principal Name" value={form.principalName} onChange={e => setForm(f => ({ ...f, principalName: e.target.value }))} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Field label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
      </Section>

      <Section icon={Bell} title="Notification Preferences">
        <Toggle label="Meal Alerts"     sub="Get notified when meals are pending approval" checked={form.mealAlerts}    onChange={v => setForm(f => ({ ...f, mealAlerts: v }))} />
        <Toggle label="Health Alerts"   sub="Critical student health notifications"       checked={form.healthAlerts}  onChange={v => setForm(f => ({ ...f, healthAlerts: v }))} />
        <Toggle label="Weekly Report"   sub="Automated weekly analytics email"            checked={form.weeklyReport}  onChange={v => setForm(f => ({ ...f, weeklyReport: v }))} />
      </Section>

      <Section icon={Shield} title="Security">
        <Toggle label="Two-Factor Authentication" sub="Require OTP on login" checked={form.twoFactor} onChange={v => setForm(f => ({ ...f, twoFactor: v }))} />
      </Section>

      <button onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition
          ${saved ? 'bg-forest-600 text-white' : 'bg-forest-800 hover:bg-forest-900 text-white'}`}>
        <Save className="w-4 h-4" />
        {saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
