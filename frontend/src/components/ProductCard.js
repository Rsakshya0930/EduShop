import React from 'react';
import { Link } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ProductCard({ product }) {
  const imageUrl = product.images && product.images.length > 0
    ? `${API}/api/files/${product.images[0]}`
    : 'https://images.unsplash.com/photo-1607603289612-71ae134aa577?w=400&h=400&fit=crop';

  return (
    <Link
      to={`/products/${product.id}`}
      data-testid={`product-card-${product.id}`}
      className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200 flex flex-col"
    >
      {/* Image */}
      <div className="border-b-2 border-black aspect-square overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1607603289612-71ae134aa577?w=400&h=400&fit=crop'; }}
        />
      </div>
      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="text-xs font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 self-start">
          {product.category || 'Other'}
        </span>
        <h3 className="font-heading font-bold text-lg truncate" data-testid={`product-name-${product.id}`}>
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 flex-1">{product.description}</p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-2xl font-black bg-yellow-300 px-2 border-2 border-black" data-testid={`product-price-${product.id}`}>
            ${product.price}
          </span>
          {product.condition && (
            <span className="text-xs font-bold uppercase border-2 border-black px-2 py-0.5">
              {product.condition}
            </span>
          )}
        </div>
        {(product.seller_college || product.seller_area) && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            {product.seller_college}{product.seller_college && product.seller_area ? ' | ' : ''}{product.seller_area}
          </p>
        )}
      </div>
    </Link>
  );
}
