'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, authApi } from '@/lib/api';

// ==================== Types ====================
interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCards: number;
  soldCards: number;
  availableCards: number;
}

interface InventoryItem {
  id: string;
  name: string;
  dataAmount: string;
  validityDays: number;
  price: string;
  totalCards: number;
  soldCards: number;
  availableCards: number;
  status: string;
}

interface OrderItem {
  id: string;
  orderNo: string;
  contactEmail: string | null;
  totalAmount: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  orderItems: { product: { name: string }; quantity: number; subtotal: string }[];
  cardInventory: { cardNumber: string; cardSecret: string }[];
}

interface Customer {
  email: string | null;
  orderCount: number;
  totalSpent: number;
}

interface OrdersByStatus {
  status: string;
  count: number;
}

// ==================== Login Gate ====================
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@simcard.shop');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login({ email, password });
      const token = res.data.accessToken;
      if (res.data.user.role !== 'ADMIN') {
        setError('Access denied. Admin role required.');
        return;
      }
      localStorage.setItem('token', token);
      onLogin(token);
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Login</h1>
        <p className="text-sm text-gray-500 mb-6">SIM Card Shop Dashboard</p>
        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>}
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" className="w-full border rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" className="w-full border rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} disabled={loading}
          className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}

// ==================== Stat Card ====================
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ==================== Main Dashboard ====================
export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<'overview' | 'inventory' | 'orders' | 'customers'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [orderFilter, setOrderFilter] = useState({ status: '', email: '' });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setAuthed(true);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.dashboard();
      setStats(res.data.stats);
      setOrdersByStatus(res.data.ordersByStatus);
      setRecentOrders(res.data.recentOrders);
    } catch { localStorage.removeItem('token'); setAuthed(false); }
    finally { setLoading(false); }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      const res = await adminApi.inventory();
      setInventory(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadOrders = useCallback(async (page = 1) => {
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (orderFilter.status) params.status = orderFilter.status;
      if (orderFilter.email) params.email = orderFilter.email;
      const res = await adminApi.orders(params);
      setOrders(res.data.items);
      setOrdersPagination(res.data.pagination);
    } catch { /* ignore */ }
  }, [orderFilter]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await adminApi.customers();
      setCustomers(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadDashboard();
    loadInventory();
    loadCustomers();
  }, [authed, loadDashboard, loadInventory, loadCustomers]);

  useEffect(() => {
    if (authed && tab === 'orders') loadOrders(1);
  }, [authed, tab, loadOrders]);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'inventory' as const, label: 'Inventory' },
    { id: 'orders' as const, label: 'Orders' },
    { id: 'customers' as const, label: 'Customers' },
  ];

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-blue-100 text-blue-700',
    FULFILLED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
    REFUNDED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-gray-900">⚙️ Admin Dashboard</h1>
          <button onClick={() => { localStorage.removeItem('token'); setAuthed(false); }}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors">
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && !stats && <div className="text-center py-20 text-gray-400">Loading...</div>}

        {/* ==================== Overview Tab ==================== */}
        {tab === 'overview' && stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Revenue" value={`¥${Number(stats.totalRevenue).toLocaleString()}`} color="text-red-600" />
              <StatCard label="Total Orders" value={stats.totalOrders} color="text-blue-600" />
              <StatCard label="Cards Sold" value={stats.soldCards} sub={`of ${stats.totalCards} total`} color="text-green-600" />
              <StatCard label="Available Cards" value={stats.availableCards} sub={`${stats.totalCards > 0 ? ((stats.availableCards / stats.totalCards) * 100).toFixed(0) : 0}% remaining`} color="text-purple-600" />
            </div>

            {/* Orders by Status */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Orders by Status</h3>
                {ordersByStatus.length === 0 ? (
                  <p className="text-sm text-gray-400">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {ordersByStatus.map((o) => {
                      const total = ordersByStatus.reduce((s, x) => s + x.count, 0);
                      const pct = total > 0 ? (o.count / total) * 100 : 0;
                      return (
                        <div key={o.status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                            <span className="text-gray-600 font-medium">{o.count}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-800 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inventory Health */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Inventory Health</h3>
                <div className="space-y-3">
                  {inventory.slice(0, 6).map((item) => {
                    const pct = item.totalCards > 0 ? (item.availableCards / item.totalCards) * 100 : 0;
                    const barColor = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500';
                    return (
                      <div key={item.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{item.name}</span>
                          <span className="text-gray-500">{item.availableCards}/{item.totalCards}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-gray-900">Recent Orders</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Order</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 font-medium">Items</th>
                      <th className="px-5 py-3 font-medium">Amount</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map((o) => (
                      <tr key={o.orderNo} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-mono text-xs">{o.orderNo}</td>
                        <td className="px-5 py-3 text-gray-600">{o.contactEmail || '-'}</td>
                        <td className="px-5 py-3 text-gray-600">{o.orderItems.map(i => `${i.product.name}×${i.quantity}`).join(', ')}</td>
                        <td className="px-5 py-3 font-medium">¥{parseFloat(o.totalAmount).toFixed(0)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentOrders.length === 0 && <div className="text-center py-10 text-gray-400">No orders yet</div>}
              </div>
            </div>
          </>
        )}

        {/* ==================== Inventory Tab ==================== */}
        {tab === 'inventory' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Card Inventory by Product</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Validity</th>
                    <th className="px-5 py-3 font-medium">Price</th>
                    <th className="px-5 py-3 font-medium">Total Cards</th>
                    <th className="px-5 py-3 font-medium">Sold</th>
                    <th className="px-5 py-3 font-medium">Available</th>
                    <th className="px-5 py-3 font-medium">Stock Level</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inventory.map((item) => {
                    const pct = item.totalCards > 0 ? (item.availableCards / item.totalCards) * 100 : 0;
                    const levelColor = pct > 50 ? 'text-green-600' : pct > 20 ? 'text-yellow-600' : 'text-red-600';
                    const levelLabel = pct > 50 ? 'Healthy' : pct > 20 ? 'Low' : pct > 0 ? 'Critical' : 'Empty';
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-5 py-3"><span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded">{item.dataAmount}</span></td>
                        <td className="px-5 py-3 text-gray-600">{item.validityDays}d</td>
                        <td className="px-5 py-3 text-gray-900">¥{parseFloat(item.price).toFixed(0)}</td>
                        <td className="px-5 py-3 text-gray-600">{item.totalCards}</td>
                        <td className="px-5 py-3 text-gray-600">{item.soldCards}</td>
                        <td className="px-5 py-3 font-medium">{item.availableCards}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-xs font-medium ${levelColor}`}>{levelLabel}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== Orders Tab ==================== */}
        {tab === 'orders' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select value={orderFilter.status} onChange={(e) => setOrderFilter(f => ({ ...f, status: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="FULFILLED">Fulfilled</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
              <input type="text" value={orderFilter.email} onChange={(e) => setOrderFilter(f => ({ ...f, email: e.target.value }))}
                placeholder="Filter by email..."
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
              <button onClick={() => loadOrders(1)}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                Search
              </button>
              <button onClick={() => { setOrderFilter({ status: '', email: '' }); }}
                className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Reset
              </button>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Order</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 font-medium">Items</th>
                      <th className="px-5 py-3 font-medium">Amount</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Cards</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map((o) => (
                      <tr key={o.orderNo} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-mono text-xs">{o.orderNo}</td>
                        <td className="px-5 py-3 text-gray-600">{o.contactEmail || '-'}</td>
                        <td className="px-5 py-3 text-gray-600 text-xs">{o.orderItems.map(i => `${i.product.name}×${i.quantity}`).join(', ')}</td>
                        <td className="px-5 py-3 font-medium">¥{parseFloat(o.totalAmount).toFixed(0)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{o.cardInventory.length > 0 ? `${o.cardInventory.length} assigned` : '-'}</td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <div className="text-center py-10 text-gray-400">No orders found</div>}
              </div>
              {/* Pagination */}
              {ordersPagination.totalPages > 1 && (
                <div className="px-5 py-3 border-t flex items-center justify-between text-sm">
                  <span className="text-gray-500">Page {ordersPagination.page} of {ordersPagination.totalPages} ({ordersPagination.total} total)</span>
                  <div className="flex gap-2">
                    <button disabled={ordersPagination.page <= 1} onClick={() => loadOrders(ordersPagination.page - 1)}
                      className="px-3 py-1 border rounded-lg disabled:opacity-30 hover:bg-gray-50">Prev</button>
                    <button disabled={ordersPagination.page >= ordersPagination.totalPages} onClick={() => loadOrders(ordersPagination.page + 1)}
                      className="px-3 py-1 border rounded-lg disabled:opacity-30 hover:bg-gray-50">Next</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== Customers Tab ==================== */}
        {tab === 'customers' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Customer Segmentation</h3>
              <p className="text-xs text-gray-500 mt-1">Ranked by total spending</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Orders</th>
                    <th className="px-5 py-3 font-medium">Total Spent</th>
                    <th className="px-5 py-3 font-medium">Avg Order</th>
                    <th className="px-5 py-3 font-medium">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.map((c, i) => {
                    const avg = c.orderCount > 0 ? Number(c.totalSpent) / c.orderCount : 0;
                    const spent = Number(c.totalSpent);
                    const tier = spent >= 1000 ? { label: 'VIP', color: 'bg-purple-100 text-purple-700' }
                      : spent >= 300 ? { label: 'Regular', color: 'bg-blue-100 text-blue-700' }
                      : { label: 'New', color: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={c.email || i} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-5 py-3 text-gray-900 font-medium">{c.email || '(no email)'}</td>
                        <td className="px-5 py-3 text-gray-600">{c.orderCount}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">¥{spent.toLocaleString()}</td>
                        <td className="px-5 py-3 text-gray-600">¥{avg.toFixed(0)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tier.color}`}>{tier.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {customers.length === 0 && <div className="text-center py-10 text-gray-400">No customers yet</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
