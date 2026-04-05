import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import { Plus, Users, LogIn, LogOut, Loader2, ArrowLeft } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GroupsPage() {
  const { groupId } = useParams();
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupProducts, setGroupProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const headers = getAuthHeaders();

  const fetchGroups = useCallback(async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        axios.get(`${API}/groups`, { headers, withCredentials: true }),
        axios.get(`${API}/groups?my_groups=true`, { headers, withCredentials: true })
      ]);
      setGroups(allRes.data);
      setMyGroups(myRes.data);
    } catch {}
    finally { setLoading(false); }
  }, [headers]);

  const fetchGroupDetail = useCallback(async (gId) => {
    try {
      const [groupRes, prodsRes] = await Promise.all([
        axios.get(`${API}/groups/${gId}`, { headers, withCredentials: true }),
        axios.get(`${API}/groups/${gId}/products`, { headers, withCredentials: true })
      ]);
      setActiveGroup(groupRes.data);
      setGroupProducts(prodsRes.data);
    } catch {}
  }, [headers]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchGroups();
    // Auto-join college group if user has college
    if (user.college) {
      axios.get(`${API}/groups/college/${encodeURIComponent(user.college)}`, { headers, withCredentials: true }).catch(() => {});
    }
  }, [user, navigate, fetchGroups, headers]);

  useEffect(() => {
    if (groupId) fetchGroupDetail(groupId);
  }, [groupId, fetchGroupDetail]);

  const handleJoin = async (gId) => {
    try {
      await axios.post(`${API}/groups/${gId}/join`, {}, { headers, withCredentials: true });
      fetchGroups();
      if (groupId === gId) fetchGroupDetail(gId);
    } catch {}
  };

  const handleLeave = async (gId) => {
    try {
      await axios.post(`${API}/groups/${gId}/leave`, {}, { headers, withCredentials: true });
      fetchGroups();
      if (groupId === gId) fetchGroupDetail(gId);
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newGroup.name) return;
    setCreating(true);
    try {
      await axios.post(`${API}/groups`, { ...newGroup, group_type: 'custom' }, { headers, withCredentials: true });
      setShowCreate(false);
      setNewGroup({ name: '', description: '' });
      fetchGroups();
    } catch {}
    finally { setCreating(false); }
  };

  if (!user) return null;

  // Group detail view
  if (groupId && activeGroup) {
    const isMember = activeGroup.is_member || activeGroup.members?.includes(user.id);
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button onClick={() => navigate('/groups')} className="flex items-center gap-2 mb-6 font-bold uppercase text-sm border-2 border-black px-4 py-2 hover:bg-yellow-200 transition-colors" data-testid="back-to-groups">
            <ArrowLeft size={16} /> All Groups
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-0.5 text-xs font-bold uppercase border-2 border-black ${activeGroup.group_type === 'auto' ? 'bg-yellow-400' : 'bg-white'}`}>
                  {activeGroup.group_type === 'auto' ? 'Campus' : 'Custom'}
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1"><Users size={14} /> {activeGroup.member_count} members</span>
              </div>
              <h1 className="font-heading text-3xl font-black uppercase tracking-tight" data-testid="group-name">{activeGroup.name}</h1>
              {activeGroup.description && <p className="text-gray-600 mt-1">{activeGroup.description}</p>}
            </div>
            {isMember ? (
              <button onClick={() => handleLeave(activeGroup.id)} data-testid="leave-group-btn"
                className="flex items-center gap-2 bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-6 py-3 font-bold uppercase">
                <LogOut size={16} /> Leave Group
              </button>
            ) : (
              <button onClick={() => handleJoin(activeGroup.id)} data-testid="join-group-btn"
                className="flex items-center gap-2 bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-6 py-3 font-bold uppercase">
                <LogIn size={16} /> Join Group
              </button>
            )}
          </div>

          <h2 className="font-heading text-xl font-bold uppercase mb-4">Group Products</h2>
          {groupProducts.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-black">
              <p className="font-heading text-xl font-bold uppercase mb-2">No Products Yet</p>
              <p className="text-gray-500 text-sm">Members haven't listed any approved products yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" data-testid="group-products-grid">
              {groupProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Groups list view
  const displayGroups = tab === 'my' ? myGroups : groups;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight" data-testid="groups-heading">Campus Groups</h1>
          <button
            data-testid="create-group-btn"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-6 py-3 font-bold uppercase"
          >
            <Plus size={18} /> Create Group
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('all')} data-testid="groups-tab-all"
            className={`px-6 py-2 border-2 border-black font-bold uppercase text-sm ${tab === 'all' ? 'bg-black text-white' : 'bg-white hover:bg-yellow-200'} transition-colors`}>
            All Groups
          </button>
          <button onClick={() => setTab('my')} data-testid="groups-tab-my"
            className={`px-6 py-2 border-2 border-black font-bold uppercase text-sm ${tab === 'my' ? 'bg-black text-white' : 'bg-white hover:bg-yellow-200'} transition-colors`}>
            My Groups
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={40} /></div>
        ) : displayGroups.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-black">
            <Users size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="font-heading text-2xl font-bold uppercase mb-2">{tab === 'my' ? 'No Groups Joined' : 'No Groups Yet'}</p>
            <p className="text-gray-600">{tab === 'my' ? 'Join a group or create your own!' : 'Be the first to create a campus group!'}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayGroups.map(g => {
              const isMember = g.members?.includes(user.id) || myGroups.some(mg => mg.id === g.id);
              return (
                <div key={g.id} data-testid={`group-card-${g.id}`}
                  className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-0.5 text-xs font-bold uppercase border-2 border-black ${g.group_type === 'auto' ? 'bg-yellow-400' : 'bg-white'}`}>
                      {g.group_type === 'auto' ? 'Campus' : 'Custom'}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Users size={12} /> {g.member_count}</span>
                  </div>
                  <h3 className="font-heading font-bold text-xl mb-1">{g.name}</h3>
                  {g.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{g.description}</p>}
                  <div className="flex gap-2 mt-auto">
                    <Link to={`/groups/${g.id}`}
                      className="flex-1 text-center bg-black text-white border-2 border-black px-4 py-2 font-bold uppercase text-xs hover:bg-yellow-400 hover:text-black transition-colors">
                      View
                    </Link>
                    {isMember ? (
                      <button onClick={(e) => { e.preventDefault(); handleLeave(g.id); }}
                        className="px-4 py-2 border-2 border-black font-bold uppercase text-xs hover:bg-red-500 hover:text-white transition-colors">
                        Leave
                      </button>
                    ) : (
                      <button onClick={(e) => { e.preventDefault(); handleJoin(g.id); }}
                        className="px-4 py-2 bg-yellow-400 border-2 border-black font-bold uppercase text-xs hover:bg-yellow-500 transition-colors">
                        Join
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-heading text-2xl font-bold uppercase mb-4">Create Group</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase text-xs mb-1">Group Name *</label>
                  <input
                    data-testid="group-name-input"
                    required
                    value={newGroup.name}
                    onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                    className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50"
                    placeholder="e.g. MIT Electronics Trading"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-xs mb-1">Description</label>
                  <textarea
                    data-testid="group-desc-input"
                    rows={3}
                    value={newGroup.description}
                    onChange={e => setNewGroup({...newGroup, description: e.target.value})}
                    className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 resize-none"
                    placeholder="What is this group about?"
                  />
                </div>
                <button data-testid="submit-group-btn" type="submit" disabled={creating}
                  className="w-full bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-8 py-3 font-bold uppercase disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
