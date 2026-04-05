import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Eye, EyeOff } from 'lucide-react';

function formatApiError(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(' ');
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '', area: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form);
      navigate('/home');
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight mb-2" data-testid="register-heading">Sign Up</h1>
          <p className="text-sm text-gray-600 mb-6">Join StudentMarket today</p>

          {error && (
            <div data-testid="register-error" className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2 mb-4 font-medium text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-bold uppercase text-xs mb-1">Full Name *</label>
              <input
                data-testid="register-name"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-xs mb-1">Email *</label>
              <input
                data-testid="register-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors"
                placeholder="you@college.edu"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-xs mb-1">Password *</label>
              <div className="relative">
                <input
                  data-testid="register-password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors pr-12"
                  placeholder="Min 6 characters"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block font-bold uppercase text-xs mb-1">College / School</label>
              <input
                data-testid="register-college"
                name="college"
                value={form.college}
                onChange={handleChange}
                className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors"
                placeholder="e.g. MIT, Stanford"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-xs mb-1">Area / Location</label>
              <input
                data-testid="register-area"
                name="area"
                value={form.area}
                onChange={handleChange}
                className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors"
                placeholder="e.g. Downtown, Campus West"
              />
            </div>
            <button
              data-testid="register-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-8 py-3 font-bold uppercase disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-sm text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-bold underline" data-testid="register-login-link">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
