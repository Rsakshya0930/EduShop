import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import { Heart, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WishlistPage() {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const fetchWishlist = async () => {
      try {
        const { data } = await axios.get(`${API}/wishlist`, { headers: getAuthHeaders(), withCredentials: true });
        setProducts(data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchWishlist();
  }, [user, getAuthHeaders, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight mb-6" data-testid="wishlist-heading">
          My Wishlist
        </h1>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={40} /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-black">
            <Heart size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="font-heading text-2xl font-bold uppercase mb-2">No Saved Items</p>
            <p className="text-gray-600 mb-4">Items you save will appear here</p>
            <button
              onClick={() => navigate('/home')}
              data-testid="wishlist-browse-btn"
              className="bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-8 py-3 font-bold uppercase"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div data-testid="wishlist-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
