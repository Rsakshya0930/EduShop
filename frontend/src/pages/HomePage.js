import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import { Plus, X, Upload, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = ['Books', 'Electronics', 'Furniture', 'Clothing', 'Stationery', 'Sports', 'Musical Instruments', 'Lab Equipment', 'Art Supplies', 'Other'];

export default function HomePage() {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(user?.mode || 'buy');
  const [products, setProducts] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: 'Books', condition: 'used', images: [] });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [wishlistIds, setWishlistIds] = useState([]);

  const fetchProducts = useCallback(async (search = '', category = '', sort = 'newest', minP = 0, maxP = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'approved', sort });
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (minP > 0) params.append('min_price', minP);
      if (maxP > 0) params.append('max_price', maxP);
      const { data } = await axios.get(`${API}/products?${params}`, { headers: getAuthHeaders() });
      setProducts(data.products || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [getAuthHeaders]);

  const fetchMyProducts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await axios.get(`${API}/products?seller_id=${user.id}&status=`, { headers: getAuthHeaders() });
      setMyProducts(data.products || []);
    } catch (err) { console.error(err); }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    if (mode === 'buy') {
      fetchProducts(searchQuery, activeCategory, sortBy, minPrice, maxPrice);
      // Fetch wishlist IDs
      axios.get(`${API}/wishlist/ids`, { headers: getAuthHeaders(), withCredentials: true })
        .then(res => setWishlistIds(res.data))
        .catch(() => {});
    }
    else fetchMyProducts();
  }, [mode, searchQuery, activeCategory, sortBy, minPrice, maxPrice, fetchProducts, fetchMyProducts, getAuthHeaders]);

  const handleSearch = (q) => { setSearchQuery(q); fetchProducts(q, activeCategory, sortBy, minPrice, maxPrice); };

  const handleModeToggle = async (newMode) => {
    setMode(newMode);
    try {
      await axios.put(`${API}/users/mode`, { mode: newMode }, { headers: getAuthHeaders(), withCredentials: true });
    } catch {}
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingImage(true);
    try {
      const paths = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await axios.post(`${API}/upload`, formData, {
          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
          withCredentials: true
        });
        paths.push(data.url);
      }
      setNewProduct(prev => ({ ...prev, images: [...prev.images, ...paths] }));
    } catch (err) { alert('Image upload failed'); }
    finally { setUploadingImage(false); }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    setCreating(true);
    try {
      await axios.post(`${API}/products`, {
        ...newProduct,
        price: parseFloat(newProduct.price),
        college: user?.college || '',
        area: user?.area || ''
      }, { headers: getAuthHeaders(), withCredentials: true });
      setShowCreateForm(false);
      setNewProduct({ name: '', description: '', price: '', category: 'Books', condition: 'used', images: [] });
      fetchMyProducts();
    } catch (err) { alert('Failed to create product'); }
    finally { setCreating(false); }
  };

  const removeImage = (idx) => {
    setNewProduct(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={handleSearch} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Mode Toggle */}
        <div className="flex items-center justify-center mb-8">
          <div data-testid="mode-toggle" className="inline-flex bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-1">
            <button
              data-testid="mode-buy"
              onClick={() => handleModeToggle('buy')}
              className={`px-8 py-3 font-bold uppercase text-lg transition-colors ${mode === 'buy' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-yellow-200'}`}
            >
              Buy
            </button>
            <button
              data-testid="mode-sell"
              onClick={() => handleModeToggle('sell')}
              className={`px-8 py-3 font-bold uppercase text-lg transition-colors ${mode === 'sell' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-yellow-200'}`}
            >
              Sell
            </button>
          </div>
        </div>

        {/* BUY MODE */}
        {mode === 'buy' && (
          <>
            {/* Category filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                data-testid="category-all"
                onClick={() => { setActiveCategory(''); fetchProducts(searchQuery, '', sortBy, minPrice, maxPrice); }}
                className={`px-4 py-2 border-2 border-black font-bold uppercase text-xs transition-all ${!activeCategory ? 'bg-black text-white' : 'bg-white hover:bg-yellow-200'}`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  data-testid={`filter-${cat.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => { setActiveCategory(cat); fetchProducts(searchQuery, cat, sortBy, minPrice, maxPrice); }}
                  className={`px-4 py-2 border-2 border-black font-bold uppercase text-xs transition-all ${activeCategory === cat ? 'bg-black text-white' : 'bg-white hover:bg-yellow-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort + Price Range */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="font-bold text-sm uppercase">Sort:</span>
              {[['newest', 'Newest'], ['price_low', 'Price Low'], ['price_high', 'Price High'], ['popular', 'Popular']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setSortBy(val); fetchProducts(searchQuery, activeCategory, val, minPrice, maxPrice); }}
                  className={`px-3 py-1 border-2 border-black text-xs font-bold uppercase ${sortBy === val ? 'bg-yellow-400' : 'bg-white hover:bg-yellow-100'} transition-colors`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Price Range Filter */}
            <div className="flex flex-wrap items-end gap-3 mb-6 bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="font-bold text-sm uppercase">Price Range:</span>
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Min ($)</label>
                  <input
                    data-testid="price-min"
                    type="number"
                    min="0"
                    step="1"
                    value={minPrice || ''}
                    onChange={e => setMinPrice(Number(e.target.value) || 0)}
                    className="w-24 border-2 border-black p-2 text-sm font-medium focus:outline-none focus:bg-yellow-50"
                    placeholder="0"
                  />
                </div>
                <span className="font-bold mt-5">—</span>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Max ($)</label>
                  <input
                    data-testid="price-max"
                    type="number"
                    min="0"
                    step="1"
                    value={maxPrice || ''}
                    onChange={e => setMaxPrice(Number(e.target.value) || 0)}
                    className="w-24 border-2 border-black p-2 text-sm font-medium focus:outline-none focus:bg-yellow-50"
                    placeholder="Any"
                  />
                </div>
                <button
                  data-testid="price-filter-apply"
                  onClick={() => fetchProducts(searchQuery, activeCategory, sortBy, minPrice, maxPrice)}
                  className="bg-yellow-400 border-2 border-black px-4 py-2 font-bold uppercase text-xs mt-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  Apply
                </button>
                {(minPrice > 0 || maxPrice > 0) && (
                  <button
                    data-testid="price-filter-clear"
                    onClick={() => { setMinPrice(0); setMaxPrice(0); fetchProducts(searchQuery, activeCategory, sortBy, 0, 0); }}
                    className="border-2 border-black px-4 py-2 font-bold uppercase text-xs mt-5 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={40} /></div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-black">
                <p className="font-heading text-2xl font-bold uppercase mb-2">No Products Found</p>
                <p className="text-gray-600">Try a different search or category</p>
              </div>
            ) : (
              <div data-testid="products-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    wishlisted={wishlistIds.includes(p.id)}
                    onWishlistChange={(pid, added) => {
                      setWishlistIds(prev => added ? [...prev, pid] : prev.filter(id => id !== pid));
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* SELL MODE */}
        {mode === 'sell' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold uppercase">My Listings</h2>
              <button
                data-testid="create-product-btn"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-6 py-3 font-bold uppercase"
              >
                <Plus size={18} /> List Product
              </button>
            </div>

            {/* Create Product Form Modal */}
            {showCreateForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateForm(false)}>
                <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading text-2xl font-bold uppercase">List a Product</h3>
                    <button onClick={() => setShowCreateForm(false)} className="border-2 border-black p-1 hover:bg-red-500 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleCreateProduct} className="space-y-4">
                    <div>
                      <label className="block font-bold uppercase text-xs mb-1">Product Name *</label>
                      <input
                        data-testid="product-name-input"
                        required
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50"
                        placeholder="e.g. Calculus Textbook"
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase text-xs mb-1">Description</label>
                      <textarea
                        data-testid="product-desc-input"
                        rows={3}
                        value={newProduct.description}
                        onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                        className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 resize-none"
                        placeholder="Describe your product..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold uppercase text-xs mb-1">Price (Rs. ) *</label>
                        <input
                          data-testid="product-price-input"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={newProduct.price}
                          onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                          className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block font-bold uppercase text-xs mb-1">Condition</label>
                        <select
                          data-testid="product-condition-input"
                          value={newProduct.condition}
                          onChange={e => setNewProduct({...newProduct, condition: e.target.value})}
                          className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 bg-white"
                        >
                          <option value="new">New</option>
                          <option value="like_new">Like New</option>
                          <option value="used">Used</option>
                          <option value="fair">Fair</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold uppercase text-xs mb-1">Category</label>
                      <select
                        data-testid="product-category-input"
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                        className="w-full border-2 border-black p-3 font-medium focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 bg-white"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold uppercase text-xs mb-1">Images</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {newProduct.images.map((img, i) => (
                          <div key={i} className="relative w-20 h-20 border-2 border-black">
                            <img src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${img}`} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs border border-black">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 bg-white border-2 border-dashed border-black p-4 cursor-pointer hover:bg-yellow-50 transition-colors">
                        {uploadingImage ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        <span className="font-bold text-sm">{uploadingImage ? 'Uploading...' : 'Choose Images'}</span>
                        <input
                          data-testid="product-image-input"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                    <button
                      data-testid="submit-product-btn"
                      type="submit"
                      disabled={creating}
                      className="w-full bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-8 py-3 font-bold uppercase disabled:opacity-50"
                    >
                      {creating ? 'Listing...' : 'List Product'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* My Products Grid */}
            {myProducts.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-black">
                <p className="font-heading text-2xl font-bold uppercase mb-2">No Listings Yet</p>
                <p className="text-gray-600">Click "List Product" to start selling</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {myProducts.map(p => (
                  <div key={p.id} className="relative">
                    <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 border-2 border-black text-xs font-bold uppercase ${
                      p.status === 'approved' ? 'bg-green-400' : p.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400 text-white'
                    }`}>
                      {p.status}
                    </div>
                    <ProductCard product={p} />
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
