import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Header from '@/components/Header';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatApiError(detail) {
  if (detail == null) return 'Something went wrong.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(' ');
  return String(detail);
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPw) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: password });
      setSuccess(true);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <h1 className="font-heading text-2xl font-black uppercase mb-4">Invalid Link</h1>
            <p className="text-gray-600 mb-4">This password reset link is invalid or missing a token.</p>
            <Link to="/forgot-password" className="inline-block bg-yellow-400 text-black border-2 border-black px-6 py-2 font-bold uppercase">
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          {success ? (
            <div className="text-center" data-testid="reset-success">
              <div className="bg-green-400 border-2 border-black w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h1 className="font-heading text-2xl font-black uppercase tracking-tight mb-2">Password Reset!</h1>
              <p className="text-sm text-gray-600 mb-6">Your password has been updated successfully.</p>
              <Link to="/login" data-testid="go-to-login" className="inline-block bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-8 py-3 font-bold uppercase hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-3xl font-black uppercase tracking-tight mb-2" data-testid="reset-pw-heading">Reset Password</h1>
              <p className="text-sm text-gray-600 mb-6">Enter your new password below.</p>

              {error && (
                <div data-testid="reset-pw-error" className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2 mb-4 font-medium text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase text-xs mb-1">New Password</label>
                  <div className="relative">
                    <input
                      data-testid="reset-pw-password"
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors pr-12"
                      placeholder="Min 6 characters"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-bold uppercase text-xs mb-1">Confirm Password</label>
                  <input
                    data-testid="reset-pw-confirm"
                    type={showPw ? 'text' : 'password'}
                    required
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="w-full bg-white border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 transition-colors"
                    placeholder="Confirm your password"
                  />
                </div>
                <button
                  data-testid="reset-pw-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-8 py-3 font-bold uppercase disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
