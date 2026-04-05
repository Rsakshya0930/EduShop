import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Package, Loader2, Eye } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColors = {
  placed: 'bg-yellow-400',
  confirmed: 'bg-blue-400 text-white',
  shipped: 'bg-purple-500 text-white',
  delivered: 'bg-green-500 text-white',
  cancelled: 'bg-red-500 text-white',
};

export default function OrdersPage() {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('buyer');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API}/orders?role=${tab}`, { headers: getAuthHeaders(), withCredentials: true });
        setOrders(data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchOrders();
  }, [tab, user, getAuthHeaders, navigate]);

  const updateStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status }, { headers: getAuthHeaders(), withCredentials: true });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch { alert('Failed to update status'); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight mb-6">My Orders</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            data-testid="orders-tab-buyer"
            onClick={() => setTab('buyer')}
            className={`px-6 py-2 border-2 border-black font-bold uppercase text-sm ${tab === 'buyer' ? 'bg-black text-white' : 'bg-white hover:bg-yellow-200'} transition-colors`}
          >
            My Purchases
          </button>
          <button
            data-testid="orders-tab-seller"
            onClick={() => setTab('seller')}
            className={`px-6 py-2 border-2 border-black font-bold uppercase text-sm ${tab === 'seller' ? 'bg-black text-white' : 'bg-white hover:bg-yellow-200'} transition-colors`}
          >
            My Sales
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={40} /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-black">
            <Package size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="font-heading text-2xl font-bold uppercase mb-2">No Orders</p>
            <p className="text-gray-600">{tab === 'buyer' ? 'Start shopping to see your purchases' : 'No sales yet'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} data-testid={`order-${order.id}`} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-4 items-start">
                    {order.product_image && (
                      <div className="w-16 h-16 border-2 border-black overflow-hidden flex-shrink-0">
                        <img src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${order.product_image}`} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{order.product_name}</h3>
                      <p className="text-xl font-black bg-yellow-300 inline-block px-2 border-2 border-black">${order.product_price}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {tab === 'buyer' ? `Seller: ${order.seller_name}` : `Buyer: ${order.buyer_name}`}
                      </p>
                      <p className="text-xs text-gray-500">{order.delivery_method === 'local' ? 'Local Pickup' : 'Delivery'} &middot; COD</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 border-2 border-black text-xs font-bold uppercase ${statusColors[order.status] || 'bg-gray-200'}`}>
                      {order.status}
                    </span>
                    {tab === 'seller' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <div className="flex gap-1">
                        {order.status === 'placed' && (
                          <button onClick={() => updateStatus(order.id, 'confirmed')} className="px-2 py-1 bg-blue-400 text-white border-2 border-black text-xs font-bold uppercase">Confirm</button>
                        )}
                        {order.status === 'confirmed' && (
                          <button onClick={() => updateStatus(order.id, 'shipped')} className="px-2 py-1 bg-purple-500 text-white border-2 border-black text-xs font-bold uppercase">Ship</button>
                        )}
                        {order.status === 'shipped' && (
                          <button onClick={() => updateStatus(order.id, 'delivered')} className="px-2 py-1 bg-green-500 text-white border-2 border-black text-xs font-bold uppercase">Delivered</button>
                        )}
                        <button onClick={() => updateStatus(order.id, 'cancelled')} className="px-2 py-1 bg-red-500 text-white border-2 border-black text-xs font-bold uppercase">Cancel</button>
                      </div>
                    )}
                    <button onClick={() => navigate(`/products/${order.product_id}`)} className="flex items-center gap-1 text-xs font-bold underline">
                      <Eye size={12} /> View Product
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
