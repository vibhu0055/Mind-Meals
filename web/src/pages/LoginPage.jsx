import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Mail, Lock, Leaf, School, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState('school');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password, role);
      toast('Welcome back!', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--accent-glow)] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[rgba(96,165,250,0.05)] blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-3 shadow-lg shadow-[var(--accent-glow)]">
            <Leaf size={22} className="text-[#0d0f14]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">MealMind</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">School nutrition management</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-7">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">Sign in to your account</h2>

          {/* Role selector */}
          <div className="flex gap-2 mb-5 p-1 bg-[var(--bg-surface)] rounded-[var(--radius)]">
            {[
              { value: 'school', icon: School, label: 'School' },
              { value: 'teacher', icon: GraduationCap, label: 'Teacher' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-150
                  ${role === value
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@school.edu"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              icon={Mail}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              icon={Lock}
            />
            <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
              Sign In
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-[var(--border-soft)] text-center">
            <p className="text-sm text-[var(--text-muted)]">
              New school?{' '}
              <Link to="/register" className="text-[var(--accent)] hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
