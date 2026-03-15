'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ordersApi } from '@/lib/api';

interface OrderData {
  orderNo: string;
  createdAt: string;
  status: string;
  totalAmount: string;
  contactEmail: string | null;
  orderItems: { id: string; product: { name: string }; quantity: number; subtotal: string }[];
  cardInventory: { cardNumber: string; cardSecret: string }[];
}

function OrderCard({ order }: { order: OrderData }) {
  const statusMap: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-blue-100 text-blue-700',
    FULFILLED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
    REFUNDED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-gray-500">{order.orderNo}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusMap[order.status] || 'bg-gray-100'}`}>
          {order.status}
        </span>
      </div>

      <div className="px-5 py-3">
        {order.orderItems?.map((item) => (
          <div key={item.id} className="flex justify-between py-2 text-sm border-b border-gray-50 last:border-0">
            <span className="text-gray-700">{item.product?.name} × {item.quantity}</span>
            <span className="font-medium">¥{parseFloat(item.subtotal).toFixed(0)}</span>
          </div>
        ))}
        <div className="flex justify-between py-3 font-semibold">
          <span>Total</span>
          <span className="text-accent">¥{parseFloat(order.totalAmount).toFixed(0)}</span>
        </div>
      </div>

      {order.cardInventory && order.cardInventory.length > 0 && (
        <div className="px-5 py-4 bg-green-50 border-t border-green-100">
          <h3 className="text-sm font-medium text-green-700 mb-2">🎉 Your Card Keys</h3>
          {order.cardInventory.map((card, i) => (
            <div key={i} className="bg-white rounded-lg px-3 py-2 mt-2 text-sm font-mono border border-green-200">
              <div><span className="text-gray-500">Card: </span><span className="select-all">{card.cardNumber}</span></div>
              <div><span className="text-gray-500">Secret: </span><span className="select-all">{card.cardSecret}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<'orderNo' | 'email'>('orderNo');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setOrders([]);

    try {
      if (searchType === 'email' || query.includes('@')) {
        const res = await ordersApi.findByEmail(query.trim());
        const data = Array.isArray(res.data) ? res.data : [res.data];
        if (data.length === 0) setError('No orders found for this email.');
        else setOrders(data);
      } else {
        const res = await ordersApi.get(query.trim());
        setOrders([res.data]);
      }
    } catch {
      setError('No orders found. Check your order number or email.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('q')) handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Order Lookup</h1>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setSearchType('orderNo')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${searchType === 'orderNo' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Order Number
        </button>
        <button
          onClick={() => setSearchType('email')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${searchType === 'email' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Email
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={searchType === 'email' ? 'Enter your email address' : 'Enter order number, e.g. ORD-20250101-XXXXXX'}
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
        <div className="mt-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="mt-6 space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.orderNo} order={order} />
        ))}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-400">Loading...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
