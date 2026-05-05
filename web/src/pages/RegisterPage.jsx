import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchool } from '../api/auth';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Mail, Lock, User, Hash, Leaf } from 'lucide-react';

export default function RegisterPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', school_id: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'School name is required';
    if (!form.school_id) e.school_id = 'School ID is required';
    if (!form.email) e.email = 'Email is required';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await registerSchool(form);
      toast('School registered! Please log in.', 'success');
      navigate('/login');
    } catch (err) {
      toast(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--accent-glow)] blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-3 shadow-lg shadow-[var(--accent-glow)]">
            <Leaf size={22} className="text-[#0d0f14]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">MealMind</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Register your school</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-7">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">Create school account</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="School Name" placeholder="St. Xavier's High School" value={form.name} onChange={set('name')} error={errors.name} icon={User} />
            <Input label="School ID" placeholder="SCH-001" value={form.school_id} onChange={set('school_id')} error={errors.school_id} icon={Hash} />
            <Input label="Email" type="email" placeholder="admin@school.edu" value={form.email} onChange={set('email')} error={errors.email} icon={Mail} />
            <Input label="Password" type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} error={errors.password} icon={Lock} />
            <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
              Register School
            </Button>
          </form>
          <div className="mt-5 pt-4 border-t border-[var(--border-soft)] text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Already registered?{' '}
              <Link to="/login" className="text-[var(--accent)] hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
