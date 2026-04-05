import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Save, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProfilePage() {
  const { user, getAuthHeaders, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', college: '', area: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setForm({ name: user.name || '', college: user.college || '', area: user.area || '', phone: user.phone || '' });
  }, [user, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await axios.put(`${API}/users/profile`, form, { headers: getAuthHeaders(), withCredentials: true });
      await checkAuth();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert('Failed to update profile'); }
    finally { setSaving(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight mb-6" data-testid="profile-heading">My Profile</h1>

        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <div className="mb-4 p-3 border-2 border-black bg-yellow-100">
            <p className="text-xs font-bold uppercase">Account</p>
            <p className="font-bold">{user.email}</p>
            <span className="inline-block mt-1 bg-black text-white px-2 py-0.5 text-xs font-bold uppercase">{user.role}</span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block font-bold uppercase text-xs mb-1">Name</label>
              <input
                data-testid="profile-name"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-xs mb-1">College / School</label>
              <input
                data-testid="profile-college"
                value={form.college}
                onChange={e => setForm({...form, college: e.target.value})}
                className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50"
                placeholder="e.g. MIT"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-xs mb-1">Area / Location</label>
              <input
                data-testid="profile-area"
                value={form.area}
                onChange={e => setForm({...form, area: e.target.value})}
                className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50"
                placeholder="e.g. Downtown"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-xs mb-1">Phone</label>
              <input
                data-testid="profile-phone"
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50"
                placeholder="Your phone number"
              />
            </div>

            {saved && <div className="bg-green-100 border-2 border-green-500 text-green-700 p-2 text-sm font-bold">Profile saved!</div>}

            <button
              data-testid="profile-save-btn"
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-8 py-3 font-bold uppercase disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
