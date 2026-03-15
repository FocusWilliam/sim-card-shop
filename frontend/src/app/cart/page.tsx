'use client';

import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { ordersApi } from '@/lib/api';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, totalAmount } =
    useCartStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await ordersApi.create({
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        contactEmail: email || undefined,
      });
      setOrderNo(res.data.orderNo);
      clearCart();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  // Order success state
  if (orderNo) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900">Order Created!</h1>
        <p className="text-gray-500 mt-2">Your order number is:</p>
        <p className="text-lg font-mono bg-gray-100 rounded-lg py-3 px-4 mt-3 select-all">
          {orderNo}
        </p>
        <p className="text-sm text-gray-400 mt-4">
          Save this number to check your order status and retrieve your card
          keys after payment.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <a
            href={`/orders?q=${orderNo}`}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            View Order
          </a>
          <a
            href="/"
            className="border border-gray-300 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Continue Shopping
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🛒</div>
          <p>Your cart is empty</p>
          <a
            href="/"
            className="inline-block mt-4 text-primary-600 hover:underline"
          >
            Browse plans →
          </a>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between px-4 py-4 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {item.product.name}
                  </h3>
                  <p className="text-accent text-sm mt-0.5">
                    ¥{parseFloat(item.product.price).toFixed(0)} × {item.quantity} ={' '}
                    <span className="font-semibold">
                      ¥{(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 h-8 flex items-center justify-center text-sm font-medium border-x border-gray-200">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Info */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email (for card key delivery)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Total & Checkout */}
          <div className="mt-6 bg-gray-50 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Total</span>
              <span className="text-2xl font-bold text-accent">
                ¥{totalAmount().toFixed(0)}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {submitting ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
