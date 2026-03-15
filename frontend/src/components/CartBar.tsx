'use client';

import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';

export default function CartBar() {
  const { totalItems, totalAmount } = useCartStore();
  const count = totalItems();
  const amount = totalAmount();

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart size={24} className="text-primary-600" />
            <span className="absolute -top-2 -right-2 bg-accent text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
              {count}
            </span>
          </div>
          <div>
            <span className="text-accent font-bold text-lg">
              ¥{amount.toFixed(0)}
            </span>
          </div>
        </div>
        <a
          href="/cart"
          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-lg font-medium transition-colors"
        >
          Checkout
        </a>
      </div>
    </div>
  );
}
