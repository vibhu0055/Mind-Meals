// import { useState } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { useAuth } from '../hooks/useAuth.jsx'
// import { Eye, EyeOff, ArrowRight, Shield, Users, BookOpen, Settings2 } from 'lucide-react'

// const ROLES = [
//   { id: 'principal', label: 'Principal', sub: 'School-wide oversight', icon: Shield },
//   { id: 'parent', label: 'Parent', sub: "Your child's health", icon: Users },
//   { id: 'teacher', label: 'Teacher', sub: 'Class health log', icon: BookOpen },
//   { id: 'admin', label: 'Admin', sub: 'Users & audit', icon: Settings2 },
// ]

// const ROUTE_MAP = {
//   principal: '/principal/dashboard',
//   teacher: '/teacher/dashboard',
//   parent: '/parent/dashboard',
//   admin: '/principal/dashboard',
// }

// export default function LoginPage() {
//   const navigate = useNavigate()
//   const { login, loading, error } = useAuth()
//   const [role, setRole] = useState('principal')
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [showPwd, setShowPwd] = useState(false)

//   async function handleSubmit(e) {
//     e.preventDefault()
//     try {
//       const user = await login(email, password, role)
//       navigate(ROUTE_MAP[user.role] || '/principal/dashboard')
//     } catch { }
//   }

//   return (
//     <div className="min-h-screen bg-sand-50 flex">
//       {/* Left panel */}
//       <div className="hidden lg:flex flex-col justify-between w-[48%] bg-forest-800 text-white p-14">
//         {/* Logo */}
//         <div className="flex items-center gap-3">
//           <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
//             <span className="text-xl">🥦</span>
//           </div>
//           <div>
//             <p className="font-display font-bold text-lg leading-none">School Health Monitor</p>
//             <p className="text-forest-300 text-xs mt-0.5 uppercase tracking-widest">Secure Staff & Parent Portal</p>
//           </div>
//         </div>

//         {/* Hero text */}
//         <div>
//           <h1 className="text-5xl font-display font-extrabold leading-[1.1] mb-5">
//             Healthier schools,<br />
//             <span className="text-forest-300">one student</span><br />
//             at a time.
//           </h1>
//           <p className="text-forest-200 text-base leading-relaxed max-w-sm">
//             Sign in to view growth trends, nutrition plans, vaccination schedules and real-time alerts for your school community.
//           </p>

//           {/* Stats */}
//           <div className="mt-10 grid grid-cols-3 gap-3">
//             {[['152', 'Students'], ['8.5', 'Meal Score'], ['86.8%', 'Healthy BMI']].map(([v, l]) => (
//               <div key={l} className="bg-white/8 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
//                 <div className="text-2xl font-display font-bold">{v}</div>
//                 <div className="text-forest-300 text-xs mt-1">{l}</div>
//               </div>
//             ))}
//           </div>
//         </div>

//         <p className="text-forest-400 text-xs">© 2025 MealMind. School Nutrition Health System.</p>
//       </div>

//       {/* Right panel */}
//       <div className="flex-1 flex items-center justify-center p-8">
//         <div className="w-full max-w-md">
//           {/* Mobile logo */}
//           <div className="lg:hidden flex items-center gap-2 mb-10">
//             <span className="text-2xl">🥦</span>
//             <span className="font-display font-bold text-forest-800 text-lg">School Health Monitor</span>
//           </div>

//           <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-3">Select your role</p>

//           {/* Role grid */}
//           <div className="grid grid-cols-2 gap-2.5 mb-8">
//             {ROLES.map(({ id, label, sub, icon: Icon }) => (
//               <button
//                 key={id}
//                 type="button"
//                 onClick={() => setRole(id)}
//                 className={`group flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150
//                   ${role === id
//                     ? 'border-forest-700 bg-forest-800 text-white'
//                     : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
//                   }`}
//               >
//                 <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${role === id ? 'text-forest-300' : 'text-stone-400'}`} />
//                 <div>
//                   <p className={`font-display font-semibold text-sm ${role === id ? 'text-white' : 'text-stone-800'}`}>{label}</p>
//                   <p className={`text-xs mt-0.5 ${role === id ? 'text-forest-300' : 'text-stone-400'}`}>{sub}</p>
//                 </div>
//               </button>
//             ))}
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             {/* Email */}
//             <div>
//               <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Email</label>
//               <input
//                 type="email"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 placeholder="you@school.edu"
//                 className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400
//                   focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent text-sm transition"
//               />
//             </div>

//             {/* Password */}
//             <div>
//               <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Password</label>
//               <div className="relative">
//                 <input
//                   type={showPwd ? 'text' : 'password'}
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   placeholder="••••••••"
//                   className="w-full px-4 py-3 pr-11 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400
//                     focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent text-sm transition"
//                 />
//                 <button type="button" onClick={() => setShowPwd(s => !s)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
//                   {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                 </button>
//               </div>
//             </div>

//             {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}

//             <button type="submit" disabled={loading}
//               className="w-full flex items-center justify-center gap-2 py-3.5 bg-forest-800 hover:bg-forest-900 text-white
//                 font-semibold rounded-xl transition-all active:scale-[.98] disabled:opacity-60 mt-1">
//               {loading
//                 ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                 : <><span>Sign in as {ROLES.find(r => r.id === role)?.label}</span><ArrowRight className="w-4 h-4" /></>
//               }
//             </button>

//             <p className="text-center text-xs text-stone-400">Demo: leave fields empty and click Sign in</p>
//           </form>
//         </div>
//       </div>
//     </div>
//   )
// }

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { Eye, EyeOff, ArrowRight, Shield, Users, BookOpen, Settings2 } from 'lucide-react'
import API from "../services/api";

const res = await API.post("/auth/login", {
  email,
  password,
  role: "school",
});

const handleLogin = async () => {
  try {
    const res = await API.post("/auth/login", {
      email,
      password,
      role: "school",
    });

    console.log(res.data);

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

    navigate("/principal/dashboard");

  } catch (err) {
    console.error(err.response?.data || err.message);
    alert(err.response?.data?.message || "Login failed");
  }
};

const ROLES = [
  { id: 'principal', label: 'Principal', sub: 'School-wide oversight', icon: Shield },
  { id: 'teacher',   label: 'Teacher',   sub: 'Class health log',      icon: BookOpen },
  { id: 'admin',     label: 'Admin',     sub: 'Users & audit',         icon: Settings2 },
  // ❌ removed parent for now (backend doesn't support it yet)
]

const ROUTE_MAP = {
  principal: '/principal/dashboard',
  teacher:   '/teacher/dashboard',
  admin:     '/principal/dashboard',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error } = useAuth()

  const [role, setRole] = useState('principal')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    // ✅ validation
    if (!email || !password) {
      alert("Please enter email and password")
      return
    }

    try {
      const user = await login(email, password, role)
      navigate(ROUTE_MAP[user.role] || '/principal/dashboard')
    } catch (err) {
      console.error("Login failed:", err)
    }
  }

  return (
    <div className="min-h-screen bg-sand-50 flex">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] bg-forest-800 text-white p-14">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <span className="text-xl">🥦</span>
          </div>
          <div>
            <p className="font-bold text-lg">School Health Monitor</p>
            <p className="text-xs text-forest-300 uppercase">Secure Portal</p>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-bold mb-5">
            Healthier schools,<br />
            <span className="text-forest-300">one student</span><br />
            at a time.
          </h1>
        </div>

        <p className="text-xs text-forest-400">© 2025 MealMind</p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          <p className="text-xs uppercase mb-3">Select your role</p>

          {/* ROLE SELECT */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {ROLES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setRole(id)}
                className={`p-3 rounded-lg border ${
                  role === id ? 'bg-green-800 text-white' : 'bg-white'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* EMAIL */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />

            {/* PASSWORD */}
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-3"
              >
                {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>

            {/* ERROR */}
            {error && <p className="text-red-500">{error}</p>}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-800 text-white p-3 rounded-lg"
            >
              {loading ? "Logging in..." : `Login as ${role}`}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}