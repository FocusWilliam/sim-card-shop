'use client';

import { useEffect, useState } from 'react';
import { Product, productsApi } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import CartBar from '@/components/CartBar';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    productsApi
      .list()
      .then((res) => {
        setProducts(res.data.items);
      })
      .catch((err) => {
        setError('Failed to load products. Please try again.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Prepaid SIM Data Plans
        </h1>
        <p className="text-gray-500 mt-2">
          Choose a plan that fits your needs. Instant delivery after payment.
        </p>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="py-20 text-center text-gray-400">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
            <p className="mt-3">Loading plans...</p>
          </div>
        )}

        {error && (
          <div className="py-20 text-center text-red-500">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-primary-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            No plans available at the moment.
          </div>
        )}

        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Info Section */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-gray-500">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl mb-1">⚡</div>
          <div className="font-medium text-gray-700">Instant Delivery</div>
          <div className="text-xs mt-1">Card keys sent immediately</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl mb-1">🔒</div>
          <div className="font-medium text-gray-700">Secure Payment</div>
          <div className="text-xs mt-1">Encrypted transactions</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl mb-1">💬</div>
          <div className="font-medium text-gray-700">24/7 Support</div>
          <div className="text-xs mt-1">We're here to help</div>
        </div>
      </div>

      {/* Floating Cart */}
      <CartBar />
    </div>
  );
}
