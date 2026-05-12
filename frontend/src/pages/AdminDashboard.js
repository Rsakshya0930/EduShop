import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Users, Package, ShoppingCart, DollarSign, Check, X, Trash2, Loader2, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prodFilter, setProdFilter] = useState('');

  // ✅ 1. Memoize headers so they don't change on every render
  const headers = useMemo(() => getAuthHeaders(), [getAuthHeaders]);

  // ✅ 2. useCallback hooks now have a stable 'headers' dependency
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/stats`, { headers, withCredentials: true });
      setStats(data);
    } catch (err) {
      console.error("Stats fetch failed", err);
    }
  }, [headers]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/users`, { headers, withCredentials: true });
      setUsers(data);
    } catch (err) {
      console.error("Users fetch failed", err);
    }
  }, [headers]);

  const fetchProducts = useCallback(async (status = '') => {
    try {
      const params = status ? `?status=${status}` : '';
      const { data } = await axios.get(`${API}/admin/products${params}`, { headers, withCredentials: true });
      setProducts(data);
    } catch (err) {
      console.error("Products fetch failed", err);
    }
  }, [headers]);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/orders`, { headers, withCredentials: true });
      setOrders(data);
    } catch (err) {
      console.error("Orders fetch failed", err);
    }
  }, [headers]);

  // ✅ 3. This useEffect will now only run ONCE on mount (or if user/functions actually change)
  useEffect(() => {
    if (!user || user.role !== 'admin') { 
      navigate('/home'); 
      return; 
    }

    const loadAll = async () => {
      setLoading(true);
      // Wait for all data to load
      await Promise.all([
        fetchStats(), 
        fetchUsers(), 
        fetchProducts(prodFilter), 
        fetchOrders()
      ]);
      setLoading(false);
    };

    loadAll();
  }, [user, navigate, fetchStats, fetchUsers, fetchProducts, fetchOrders, prodFilter]);

  // --- Action Handlers ---
  const approveProduct = async (id) => {
    try {
      await axios.post(`${API}/products/${id}/approve`, {}, { headers, withCredentials: true });
      fetchProducts(prodFilter);
      fetchStats();
    } catch {}
  };

  const rejectProduct = async (id) => {
    try {
      await axios.post(`${API}/products/${id}/reject`, {}, { headers, withCredentials: true });
      fetchProducts(prodFilter);
      fetchStats();
    } catch {}
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`${API}/admin/users/${id}`, { headers, withCredentials: true });
      fetchUsers();
      fetchStats();
    } catch {}
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`${API}/products/${id}`, { headers, withCredentials: true });
      fetchProducts(prodFilter);
      fetchStats();
    } catch {}
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await axios.put(`${API}/orders/${id}/status`, { status }, { headers, withCredentials: true });
      fetchOrders();
    } catch {}
  };

  if (!user || user.role !== 'admin') return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'products', label: 'Products' },
    { id: 'orders', label: 'Orders' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight mb-6">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-6 py-2 border-2 border-black font-bold uppercase text-sm transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${tab === t.id ? 'bg-black text-white' : 'bg-white hover:bg-yellow-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={40} /></div>
        ) : (
          <>
            {/* OVERVIEW SECTION */}
            {tab === 'overview' && stats && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Users, label: 'Total Users', value: stats.total_users, color: 'bg-yellow-300' },
                    { icon: Package, label: 'Total Products', value: stats.total_products, color: 'bg-yellow-200' },
                    { icon: ShoppingCart, label: 'Total Orders', value: stats.total_orders, color: 'bg-yellow-100' },
                    { icon: IndianRupee, label: 'Revenue', value: `Rs.${stats.total_revenue?.toFixed(2) || '0.00'}`, color: 'bg-yellow-400' },
                  ].map(s => (
                    <div key={s.label} className={`${s.color} border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4`}>
                      <s.icon size={24} className="mb-2" />
                      <p className="text-xs font-bold uppercase">{s.label}</p>
                      <p className="font-heading text-2xl font-black">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                    <h3 className="font-heading font-bold text-lg uppercase mb-2">Pending Approvals</h3>
                    <p className="text-4xl font-black text-yellow-600">{stats.pending_products}</p>
                  </div>
                  <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                    <h3 className="font-heading font-bold text-lg uppercase mb-2">Approved Products</h3>
                    <p className="text-4xl font-black text-green-600">{stats.approved_products}</p>
                  </div>
                </div>

                {stats.revenue_chart && stats.revenue_chart.length > 0 && (
                  <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                    <h3 className="font-heading font-bold text-lg uppercase mb-4">Revenue Chart</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.revenue_chart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000" />
                        <XAxis dataKey="month" stroke="#000" fontWeight={700} fontSize={12} />
                        <YAxis stroke="#000" fontWeight={700} fontSize={12} />
                        <Tooltip contentStyle={{ border: '2px solid #000', borderRadius: 0, fontWeight: 700 }} />
                        <Bar dataKey="revenue" fill="#FFC800" stroke="#000" strokeWidth={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* USERS SECTION */}
            {tab === 'users' && (
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-bold uppercase border-2 border-black ${u.role === 'admin' ? 'bg-yellow-400' : 'bg-white'}`}>{u.role}</span>
                        {u.college && <span className="text-xs text-gray-500">{u.college}</span>}
                      </div>
                    </div>
                    {u.role !== 'admin' && (
                      <button onClick={() => deleteUser(u.id)} className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* PRODUCTS SECTION */}
            {tab === 'products' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {['', 'pending', 'approved', 'rejected'].map(f => (
                    <button key={f} onClick={() => setProdFilter(f)}
                      className={`px-4 py-1 border-2 border-black font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${prodFilter === f ? 'bg-black text-white' : 'bg-white hover:bg-yellow-200'} transition-colors`}>
                      {f || 'All'}
                    </button>
                  ))}
                </div>
                {products.map(p => (
                  <div key={p.id} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center justify-between gap-4">
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="w-12 h-12 border-2 border-black bg-gray-100 flex-shrink-0">
                        {p.images?.[0] && (
                           <img src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${p.images[0]}`} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate">{p.name}</p>
                        <p className="text-sm text-gray-500">Rs.{p.price} &middot; {p.category}</p>
                        <span className={`inline-block px-2 py-0.5 text-xs font-bold uppercase border border-black mt-1 ${
                          p.status === 'approved' ? 'bg-green-400' : p.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400 text-white'
                        }`}>{p.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {p.status === 'pending' && (
                        <>
                          <button onClick={() => approveProduct(p.id)} className="p-2 bg-green-400 border-2 border-black hover:bg-green-500 transition-colors"><Check size={16} /></button>
                          <button onClick={() => rejectProduct(p.id)} className="p-2 bg-red-400 text-white border-2 border-black hover:bg-red-500 transition-colors"><X size={16} /></button>
                        </>
                      )}
                      <button onClick={() => navigate(`/products/${p.id}`)} className="p-2 border-2 border-black hover:bg-yellow-200 transition-colors"><Eye size={16} /></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ORDERS SECTION */}
            {tab === 'orders' && (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o.id} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-bold">{o.product_name}</p>
                        <p className="text-lg font-black">Rs.{o.product_price}</p>
                        <p className="text-xs text-gray-500">Buyer: {o.buyer_name}</p>
                        <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 border-2 border-black text-xs font-bold uppercase ${
                          o.status === 'delivered' ? 'bg-green-500 text-white' : o.status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-yellow-400'
                        }`}>{o.status}</span>
                        {!['delivered', 'cancelled'].includes(o.status) && (
                          <select
                            onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                            value={o.status}
                            className="border-2 border-black px-2 py-1 text-xs font-bold bg-white"
                          >
                            <option value="placed">Placed</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}