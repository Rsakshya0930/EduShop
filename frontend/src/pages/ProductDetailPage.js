import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { ArrowLeft, MessageSquare, Truck, MapPin, Loader2, Star, Heart } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [showOrder, setShowOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({ delivery_method: 'local', delivery_address: '', phone: '', notes: '' });
  const [ordering, setOrdering] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${API}/products/${id}`, { headers: getAuthHeaders() });
        setProduct(data);
        // Fetch reviews
        const revRes = await axios.get(`${API}/products/${id}/reviews`, { headers: getAuthHeaders() });
        setReviews(revRes.data);
        // Check wishlist
        const wlRes = await axios.get(`${API}/wishlist/ids`, { headers: getAuthHeaders(), withCredentials: true });
        setIsWishlisted(wlRes.data.includes(id));
      } catch { navigate('/home'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, getAuthHeaders, navigate]);

  const toggleWishlist = async () => {
    try {
      if (isWishlisted) {
        await axios.delete(`${API}/wishlist/${id}`, { headers: getAuthHeaders(), withCredentials: true });
      } else {
        await axios.post(`${API}/wishlist/${id}`, {}, { headers: getAuthHeaders(), withCredentials: true });
      }
      setIsWishlisted(!isWishlisted);
    } catch {}
  };

  const handleChat = async () => {
    if (!user || !product) return;
    try {
      const { data } = await axios.post(`${API}/conversations`, {
        other_user_id: product.seller_id,
        product_id: product.id
      }, { headers: getAuthHeaders(), withCredentials: true });
      navigate(`/chat/${data.id}`);
    } catch (err) { alert('Failed to start conversation'); }
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    setOrdering(true);
    try {
      await axios.post(`${API}/orders`, {
        product_id: product.id,
        ...orderForm
      }, { headers: getAuthHeaders(), withCredentials: true });
      alert('Order placed successfully! Payment: Cash on Delivery');
      setShowOrder(false);
      navigate('/orders');
    } catch (err) { alert('Order failed'); }
    finally { setOrdering(false); }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await axios.post(`${API}/products/${id}/reviews`, reviewForm, { headers: getAuthHeaders(), withCredentials: true });
      const revRes = await axios.get(`${API}/products/${id}/reviews`, { headers: getAuthHeaders() });
      setReviews(revRes.data);
      setReviewForm({ rating: 5, comment: '' });
      // Refresh product to get updated rating
      const prodRes = await axios.get(`${API}/products/${id}`, { headers: getAuthHeaders() });
      setProduct(prodRes.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit review');
    }
    finally { setSubmittingReview(false); }
  };

  if (loading) return (
    <div className="min-h-screen">
      <Header />
      <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={40} /></div>
    </div>
  );

  if (!product) return null;

  const images = product.images && product.images.length > 0
    ? product.images.map(img => `${process.env.REACT_APP_BACKEND_URL}/api/files/${img}`)
    : ['https://images.unsplash.com/photo-1607603289612-71ae134aa577?w=600&h=600&fit=crop'];

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} data-testid="back-button" className="flex items-center gap-2 mb-6 font-bold uppercase text-sm border-2 border-black px-4 py-2 hover:bg-yellow-200 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden aspect-square bg-gray-100">
              <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1607603289612-71ae134aa577?w=600&h=600&fit=crop'; }} />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 border-2 ${i === activeImg ? 'border-yellow-400' : 'border-black'} overflow-hidden`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <span className="inline-block bg-black text-white px-3 py-1 text-xs font-bold uppercase">{product.category}</span>
            <h1 className="font-heading text-3xl sm:text-4xl font-black uppercase tracking-tight" data-testid="product-detail-name">{product.name}</h1>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black bg-yellow-300 px-3 py-1 border-2 border-black" data-testid="product-detail-price">${product.price}</span>
              <span className="border-2 border-black px-3 py-1 font-bold text-sm uppercase">{product.condition}</span>
            </div>
            <p className="text-base text-gray-700 leading-relaxed" data-testid="product-detail-desc">{product.description}</p>

            <div className="border-2 border-black p-4 bg-white space-y-2">
              <p className="font-bold text-sm uppercase">Seller Info</p>
              <p className="text-sm"><strong>Name:</strong> {product.seller_name}</p>
              {product.seller_college && <p className="text-sm flex items-center gap-1"><MapPin size={14} /> {product.seller_college}</p>}
              {product.seller_area && <p className="text-sm flex items-center gap-1"><MapPin size={14} /> {product.seller_area}</p>}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={16} className={s <= Math.round(product.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
              <span className="font-bold">{product.rating || 0}</span>
              <span>({product.reviews_count || 0} reviews)</span>
              <span>&middot;</span>
              <span>{product.views || 0} views</span>
              <span>&middot;</span>
              <span>{product.orders_count || 0} orders</span>
            </div>

            {user && user.id !== product.seller_id && (
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  data-testid="chat-seller-btn"
                  onClick={handleChat}
                  className="flex items-center gap-2 bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-6 py-3 font-bold uppercase"
                >
                  <MessageSquare size={18} /> Chat with Seller
                </button>
                <button
                  data-testid="order-product-btn"
                  onClick={() => setShowOrder(true)}
                  className="flex items-center gap-2 bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-6 py-3 font-bold uppercase"
                >
                  <Truck size={18} /> Order Now
                </button>
                <button
                  data-testid="wishlist-detail-btn"
                  onClick={toggleWishlist}
                  className={`flex items-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-6 py-3 font-bold uppercase ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
                >
                  <Heart size={18} className={isWishlisted ? 'fill-white' : ''} />
                  {isWishlisted ? 'Saved' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Order Modal */}
        {showOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowOrder(false)}>
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-heading text-2xl font-bold uppercase mb-4">Place Order</h3>
              <p className="text-sm mb-4 bg-yellow-100 border-2 border-yellow-400 p-2 font-medium">Payment: Cash on Delivery (COD)</p>
              <form onSubmit={handleOrder} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase text-xs mb-1">Delivery Method *</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setOrderForm({...orderForm, delivery_method: 'local'})}
                      className={`flex-1 px-4 py-2 border-2 border-black font-bold uppercase text-sm ${orderForm.delivery_method === 'local' ? 'bg-black text-white' : 'bg-white'}`}
                      data-testid="delivery-local">
                      <MapPin size={14} className="inline mr-1" /> Local Pickup
                    </button>
                    <button type="button" onClick={() => setOrderForm({...orderForm, delivery_method: 'delivery'})}
                      className={`flex-1 px-4 py-2 border-2 border-black font-bold uppercase text-sm ${orderForm.delivery_method === 'delivery' ? 'bg-black text-white' : 'bg-white'}`}
                      data-testid="delivery-ship">
                      <Truck size={14} className="inline mr-1" /> Delivery
                    </button>
                  </div>
                </div>
                {orderForm.delivery_method === 'delivery' && (
                  <div>
                    <label className="block font-bold uppercase text-xs mb-1">Delivery Address *</label>
                    <textarea data-testid="delivery-address" required rows={2} value={orderForm.delivery_address}
                      onChange={e => setOrderForm({...orderForm, delivery_address: e.target.value})}
                      className="w-full border-2 border-black p-3 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 resize-none" />
                  </div>
                )}
                <div>
                  <label className="block font-bold uppercase text-xs mb-1">Phone *</label>
                  <input data-testid="order-phone" type="tel" required value={orderForm.phone}
                    onChange={e => setOrderForm({...orderForm, phone: e.target.value})}
                    className="w-full border-2 border-black p-3 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50" />
                </div>
                <div>
                  <label className="block font-bold uppercase text-xs mb-1">Notes</label>
                  <textarea data-testid="order-notes" rows={2} value={orderForm.notes}
                    onChange={e => setOrderForm({...orderForm, notes: e.target.value})}
                    className="w-full border-2 border-black p-3 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 resize-none" />
                </div>
                <button data-testid="submit-order-btn" type="submit" disabled={ordering}
                  className="w-full bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-8 py-3 font-bold uppercase disabled:opacity-50">
                  {ordering ? 'Placing Order...' : 'Place Order (COD)'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-12 border-t-4 border-black pt-8" data-testid="reviews-section">
          <h2 className="font-heading text-2xl font-bold uppercase mb-6">
            Reviews ({reviews.length})
          </h2>

          {/* Write Review Form */}
          {user && user.id !== product.seller_id && !reviews.find(r => r.user_id === user.id) && (
            <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 mb-6">
              <h3 className="font-bold text-sm uppercase mb-3">Write a Review</h3>
              <form onSubmit={handleReview} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Rating</label>
                  <div className="flex gap-1" data-testid="review-stars">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => setReviewForm({...reviewForm, rating: s})}
                        className="p-0.5 hover:scale-110 transition-transform">
                        <Star size={24} className={s <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Comment</label>
                  <textarea
                    data-testid="review-comment"
                    rows={3}
                    value={reviewForm.comment}
                    onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                    className="w-full border-2 border-black p-3 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:bg-yellow-50 resize-none text-sm"
                    placeholder="Share your experience..."
                  />
                </div>
                <button data-testid="submit-review-btn" type="submit" disabled={submittingReview}
                  className="bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all px-6 py-2 font-bold uppercase text-sm disabled:opacity-50">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-black">
              <p className="text-gray-500">No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(rev => (
                <div key={rev.id} data-testid={`review-${rev.id}`} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{rev.user_name}</span>
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={14} className={s <= rev.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                  </div>
                  {rev.comment && <p className="text-sm text-gray-700">{rev.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
