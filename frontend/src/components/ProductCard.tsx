'use client';

import { Minus, Plus } from 'lucide-react';
import { Product } from '@/lib/api';
import { useCartStore } from '@/lib/cart-store';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const cartItem = items.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleDecrease = () => {
    if (quantity <= 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity === 0) {
      addItem(product);
    } else {
      updateQuantity(product.id, quantity + 1);
    }
  };

  return (
    <div className="border-b border-gray-100 py-5 px-4 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Plan name */}
          <h3 className="font-semibold text-gray-900">
            {product.name}
            {product.nameEn && (
              <span className="text-gray-400 font-normal ml-1 text-sm">
                【{product.nameEn}】
              </span>
            )}
          </h3>

          {/* Price */}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-accent font-semibold text-lg">
              ¥{parseFloat(product.price).toFixed(0)}
            </span>
            {product.originalPrice && (
              <span className="text-gray-400 line-through text-sm">
                {parseFloat(product.originalPrice).toFixed(0)}
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="mt-2 flex gap-2">
            <span className="inline-block text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
              {product.dataAmount}
            </span>
            <span className="inline-block text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">
              {product.validityDays} days
            </span>
          </div>
        </div>

        {/* Quantity control */}
        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
          <button
            onClick={handleDecrease}
            disabled={quantity === 0}
            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus size={16} />
          </button>
          <span className="w-10 h-9 flex items-center justify-center text-sm font-medium border-x border-gray-200">
            {quantity}
          </span>
          <button
            onClick={handleIncrease}
            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
