import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { ShoppingBag, Tag, MessageSquare, Truck, BookOpen, Laptop, Armchair, Shirt } from 'lucide-react';

const categories = [
  { name: 'Books', icon: BookOpen, color: 'bg-yellow-300' },
  { name: 'Electronics', icon: Laptop, color: 'bg-yellow-200' },
  { name: 'Furniture', icon: Armchair, color: 'bg-yellow-100' },
  { name: 'Clothing', icon: Shirt, color: 'bg-yellow-400' },
];

const features = [
  { icon: ShoppingBag, title: 'Buy & Sell', desc: 'Switch between modes with a single toggle' },
  { icon: Tag, title: 'Best Prices', desc: 'Pre-owned items at student-friendly prices' },
  { icon: MessageSquare, title: 'Chat Direct', desc: 'Negotiate directly with sellers in real-time' },
  { icon: Truck, title: 'Flexible Delivery', desc: 'Meet locally or get it delivered to your door' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section data-testid="hero-section" className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <div className="inline-block bg-black text-white px-4 py-1 font-bold uppercase text-sm mb-6 border-2 border-black">
              For Students, By Students
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-none mb-6">
              Buy & Sell<br />
              <span className="bg-yellow-400 px-2">Everything</span><br />
              You Need
            </h1>
            <p className="text-base md:text-lg font-medium text-gray-700 mb-8 max-w-lg">
              The student marketplace for pre-owned books, electronics, equipment and more. Save money, reduce waste, connect with your campus.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                data-testid="hero-cta-register"
                className="bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-8 py-3 font-bold uppercase text-lg"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                data-testid="hero-cta-login"
                className="bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all px-8 py-3 font-bold uppercase text-lg"
              >
                Login
              </Link>
            </div>
          </div>
          <div className="hidden md:block animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <img
                src="/landing-hero.png"
                alt="Students on campus"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section data-testid="categories-section" className="border-t-4 border-black bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight uppercase mb-10 text-center">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                to="/register"
                key={cat.name}
                data-testid={`category-${cat.name.toLowerCase()}`}
                className={`${cat.color} border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all p-6 text-center`}
              >
                <cat.icon size={40} className="mx-auto mb-3" strokeWidth={2.5} />
                <span className="font-bold uppercase text-sm">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section data-testid="features-section" className="border-t-4 border-black py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight uppercase mb-10 text-center">
            How It Works
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="bg-yellow-400 border-2 border-black w-14 h-14 flex items-center justify-center mb-4">
                  <f.icon size={28} strokeWidth={2.5} />
                </div>
                <h3 className="font-heading font-bold text-xl mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t-4 border-black bg-black text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold uppercase mb-4">
            Ready to Start <span className="text-yellow-400">Trading?</span>
          </h2>
          <p className="text-base md:text-lg mb-8 text-gray-300">Join thousands of students already saving money on campus essentials.</p>
          <Link
            to="/register"
            data-testid="cta-register"
            className="inline-block bg-yellow-400 text-black border-2 border-yellow-400 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)] transition-all px-10 py-4 font-bold uppercase text-lg"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-heading font-bold text-lg uppercase">
            Edu<span className="bg-yellow-400 px-1">Shop</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">The student marketplace for everything you need.</p>
        </div>
      </footer>
    </div>
  );
}
