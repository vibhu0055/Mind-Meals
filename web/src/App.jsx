// App.jsx
// 
import { useState } from "react";

export default function MealMindLogin(){
  const [role,setRole] = useState("Principal");

  const handleLogin = () => {
    alert(`${role} login successful`);
  };
  return (
    <div className="min-h-screen w-full bg-gradient-to-r from-emerald-700 to-teal-900 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-gray-100 rounded-3xl shadow-xl px-10 py-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-teal-700">MealMind</h1>
          <p className="text-slate-600 mt-3 text-xl">School Nutrition Monitoring System</p>
        </div>

        <div className="space-y-7">
          <div>
            <label className="block text-slate-700 font-medium mb-2">Role</label>
            <select className="w-full h-16 rounded-2xl border-2 border-gray-800 px-5 text-3xl md:text-2xl bg-white outline-none" value={role} onChange={(e)=>setRole(e.target.value)}>
              <option>Principal</option>
              <option>Teacher</option>
              <option>Admin</option>
              <option>Parent</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-2">Email</label>
            <input type="email" placeholder="your.email@example.com" className="w-full h-16 rounded-2xl border border-gray-300 px-5 text-xl bg-white outline-none focus:ring-2 focus:ring-emerald-600" />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-2">Password</label>
            <input type="password" placeholder="Enter your password" className="w-full h-16 rounded-2xl border border-gray-300 px-5 text-xl bg-white outline-none focus:ring-2 focus:ring-emerald-600" />
          </div>

          <button onClick={handleLogin} className="w-full h-16 bg-emerald-700 hover:bg-emerald-800 text-white text-2xl font-semibold rounded-2xl shadow-md transition">
            Sign In as {role}
          </button>

          <p className="text-center text-slate-500 text-lg pt-2">Demo credentials: any email and password will work</p>
        </div>
      </div>
    </div>
  )
}
