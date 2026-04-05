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

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.role === 'admin') navigate('/admin');
      else navigate('/home');
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight mb-2" data-testid="login-heading">Login</h1>
          <p className="text-sm text-gray-600 mb-6">Welcome back to StudentMarket</p>

          {error && (
            <div data-testid="login-error" className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2 mb-4 font-medium text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-bold uppercase text-xs mb-1">Email</label>
              <input
                data-testid="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors"
                placeholder="you@college.edu"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-xs mb-1">Password</label>
              <div className="relative">
                <input
                  data-testid="login-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors pr-12"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-8 py-3 font-bold uppercase disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-sm text-center mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold underline" data-testid="login-register-link">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
