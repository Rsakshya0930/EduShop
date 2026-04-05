import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Search, ShoppingBag, MessageSquare, User, LogOut, Shield, Package, Menu, X, Users, Heart } from 'lucide-react';

export default function Header({ searchQuery, setSearchQuery, onSearch }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header data-testid="main-header" className="bg-white border-b-4 border-black py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
        {/* Logo */}
        <Link to={user ? '/home' : '/'} className="flex-shrink-0" data-testid="logo-link">
          <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tighter uppercase">
            Student<span className="bg-yellow-400 px-1">Market</span>
          </h1>
        </Link>

        {/* Search Bar */}
        {user && (
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="flex w-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <input
                data-testid="search-input"
                type="text"
                placeholder="Search products, colleges, areas..."
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-white focus:outline-none focus:bg-yellow-50 font-medium"
              />
              <button
                data-testid="search-button"
                type="submit"
                className="bg-black text-white px-4 hover:bg-yellow-400 hover:text-black transition-colors"
              >
                <Search size={18} />
              </button>
            </div>
          </form>
        )}

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/home" data-testid="nav-home" className="flex items-center gap-1 px-3 py-2 border-2 border-transparent hover:border-black font-bold uppercase text-sm transition-all">
                <ShoppingBag size={16} /> Home
              </Link>
              <Link to="/orders" data-testid="nav-orders" className="flex items-center gap-1 px-3 py-2 border-2 border-transparent hover:border-black font-bold uppercase text-sm transition-all">
                <Package size={16} /> Orders
              </Link>
              <Link to="/chat" data-testid="nav-chat" className="flex items-center gap-1 px-3 py-2 border-2 border-transparent hover:border-black font-bold uppercase text-sm transition-all">
                <MessageSquare size={16} /> Chat
              </Link>
              <Link to="/groups" data-testid="nav-groups" className="flex items-center gap-1 px-3 py-2 border-2 border-transparent hover:border-black font-bold uppercase text-sm transition-all">
                <Users size={16} /> Groups
              </Link>
              <Link to="/wishlist" data-testid="nav-wishlist" className="flex items-center gap-1 px-3 py-2 border-2 border-transparent hover:border-black font-bold uppercase text-sm transition-all">
                <Heart size={16} /> Wishlist
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" data-testid="nav-admin" className="flex items-center gap-1 px-3 py-2 bg-black text-white font-bold uppercase text-sm hover:bg-yellow-400 hover:text-black transition-colors">
                  <Shield size={16} /> Admin
                </Link>
              )}
              <Link to="/profile" data-testid="nav-profile" className="flex items-center gap-1 px-3 py-2 border-2 border-transparent hover:border-black font-bold uppercase text-sm transition-all">
                <User size={16} /> {user.name?.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} data-testid="nav-logout" className="flex items-center gap-1 px-3 py-2 border-2 border-black bg-white font-bold uppercase text-sm hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login" className="px-6 py-2 border-2 border-black font-bold uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                Login
              </Link>
              <Link to="/register" data-testid="nav-register" className="px-6 py-2 bg-yellow-400 border-2 border-black font-bold uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                Sign Up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden ml-auto border-2 border-black p-2" data-testid="mobile-menu-toggle">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t-2 border-black bg-white px-4 py-4 space-y-2 animate-fade-in">
          {user && (
            <form onSubmit={handleSearch} className="flex mb-3 border-2 border-black">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 focus:outline-none"
              />
              <button type="submit" className="bg-black text-white px-3"><Search size={16} /></button>
            </form>
          )}
          {user ? (
            <>
              <Link to="/home" onClick={() => setMobileOpen(false)} className="block px-4 py-2 border-2 border-black font-bold uppercase text-sm">Home</Link>
              <Link to="/orders" onClick={() => setMobileOpen(false)} className="block px-4 py-2 border-2 border-black font-bold uppercase text-sm">Orders</Link>
              <Link to="/chat" onClick={() => setMobileOpen(false)} className="block px-4 py-2 border-2 border-black font-bold uppercase text-sm">Chat</Link>
              <Link to="/groups" onClick={() => setMobileOpen(false)} className="block px-4 py-2 border-2 border-black font-bold uppercase text-sm">Groups</Link>
              <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="block px-4 py-2 border-2 border-black font-bold uppercase text-sm">Wishlist</Link>
              {user.role === 'admin' && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-4 py-2 bg-black text-white font-bold uppercase text-sm">Admin</Link>}
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="block px-4 py-2 border-2 border-black font-bold uppercase text-sm">Profile</Link>
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="w-full text-left px-4 py-2 border-2 border-black bg-red-500 text-white font-bold uppercase text-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-2 border-2 border-black font-bold uppercase text-sm text-center">Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-4 py-2 bg-yellow-400 border-2 border-black font-bold uppercase text-sm text-center">Sign Up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
