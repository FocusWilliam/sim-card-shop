'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ordersApi } from '@/lib/api';

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orderNo, setOrderNo] = useState(searchParams.get('q') || '');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!orderNo.trim()) return;
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await ordersApi.get(orderNo.trim());
      setOrder(res.data);
    } catch {
      setError('Order not found. Please check your order number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('q')) handleSearch();
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      PAID: 'bg-blue-100 text-blue-700',
      FULFILLED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
      REFUNDED: 'bg-red-100 text-red-700',
    };
    return (
      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full ${map[status] || 'bg-gray-100'}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Order Lookup</h1>

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter order number, e.g. ORD-20250101-XXXXXX"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Order Details */}
      {order && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-gray-500">{order.orderNo}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            {statusBadge(order.status)}
          </div>

          {/* Items */}
          <div className="px-5 py-3">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Items</h3>
            {order.orderItems?.map((item: any) => (
              <div
                key={item.id}
                className="flex justify-between py-2 text-sm border-b border-gray-50 last:border-0"
              >
                <span className="text-gray-700">
                  {item.product?.name} × {item.quantity}
                </span>
                <span className="font-medium">
                  ¥{parseFloat(item.subtotal).toFixed(0)}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-3 font-semibold">
              <span>Total</span>
              <span className="text-accent">
                ¥{parseFloat(order.totalAmount).toFixed(0)}
              </span>
            </div>
          </div>

          {/* Card Keys (shown after fulfillment) */}
          {order.cardInventory && order.cardInventory.length > 0 && (
            <div className="px-5 py-4 bg-green-50 border-t border-green-100">
              <h3 className="text-sm font-medium text-green-700 mb-2">
                🎉 Your Card Keys
              </h3>
              {order.cardInventory.map((card: any, i: number) => (
                <div
                  key={i}
                  className="bg-white rounded-lg px-3 py-2 mt-2 text-sm font-mono border border-green-200"
                >
                  <div>
                    <span className="text-gray-500">Card: </span>
                    <span className="select-all">{card.cardNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Secret: </span>
                    <span className="select-all">{card.cardSecret}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
