'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { ordersApi, paymentsApi } from '@/lib/api';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, totalAmount } =
    useCartStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address. Card keys will be sent to this email.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await ordersApi.create({
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        contactEmail: email,
      });
      setOrderNo(res.data.orderNo);
      setOrderId(res.data.id);
      clearCart();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStripePayment = async () => {
    if (!orderId) return;
    setPaying(true);
    setError(null);
    try {
      const baseUrl = window.location.origin;
      const res = await paymentsApi.checkout(
        orderId,
        `${baseUrl}/orders`,
        `${baseUrl}/cart`,
      );
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Payment service unavailable. Use test payment instead.');
    } finally {
      setPaying(false);
    }
  };

  const handleTestPayment = async () => {
    if (!orderId) return;
    setPaying(true);
    setError(null);
    try {
      await paymentsApi.simulate(orderId);
      setOrderId(null); // Clear to show success
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Test payment failed');
    } finally {
      setPaying(false);
    }
  };

  // Order created - show payment options
  if (orderNo && orderId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-gray-900">Order Created!</h1>
        <p className="text-gray-500 mt-2">Order number:</p>
        <p className="text-lg font-mono bg-gray-100 rounded-lg py-3 px-4 mt-3 select-all">
          {orderNo}
        </p>

        {error && (
          <div className="mt-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleStripePayment}
            disabled={paying}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {paying ? 'Redirecting...' : '💳 Pay with Stripe'}
          </button>
          <button
            onClick={handleTestPayment}
            disabled={paying}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {paying ? 'Processing...' : '🧪 Test Payment (instant)'}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Test payment skips Stripe and immediately fulfills the order with card keys.
          </p>
        </div>
      </div>
    );
  }

  // Payment complete - show success
  if (orderNo && !orderId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Complete!</h1>
        <p className="text-gray-500 mt-2">Your card keys are ready.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href={`/orders?q=${orderNo}`}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            View Card Keys
          </Link>
          <Link
            href="/"
            className="border border-gray-300 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Continue Shopping
          </Link>
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
          <Link
            href="/"
            className="inline-block mt-4 text-primary-600 hover:underline"
          >
            Browse plans →
          </Link>
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
              Email <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(card keys will be sent here)</span>
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
