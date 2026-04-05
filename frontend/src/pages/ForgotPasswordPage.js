import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '@/components/Header';
import { ArrowLeft, Mail } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatApiError(detail) {
  if (detail == null) return 'Something went wrong.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(' ');
  return String(detail);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
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
          {sent ? (
            <div className="text-center" data-testid="reset-sent-message">
              <div className="bg-yellow-400 border-2 border-black w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Mail size={32} />
              </div>
              <h1 className="font-heading text-2xl font-black uppercase tracking-tight mb-2">Check Your Email</h1>
              <p className="text-sm text-gray-600 mb-6">If an account exists with that email, we've sent a password reset link.</p>
              <Link to="/login" className="inline-block bg-black text-white border-2 border-black px-6 py-2 font-bold uppercase text-sm hover:bg-yellow-400 hover:text-black transition-colors">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="flex items-center gap-1 text-sm font-bold mb-4 hover:underline" data-testid="back-to-login">
                <ArrowLeft size={14} /> Back to Login
              </Link>
              <h1 className="font-heading text-3xl font-black uppercase tracking-tight mb-2" data-testid="forgot-pw-heading">Forgot Password</h1>
              <p className="text-sm text-gray-600 mb-6">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div data-testid="forgot-pw-error" className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2 mb-4 font-medium text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase text-xs mb-1">Email</label>
                  <input
                    data-testid="forgot-pw-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors"
                    placeholder="you@college.edu"
                  />
                </div>
                <button
                  data-testid="forgot-pw-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-8 py-3 font-bold uppercase disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
