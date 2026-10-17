import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface Analytics {
  total_businesses: number;
  active_businesses: number;
  total_customers: number;
  total_stamps_issued: number;
  total_redemptions: number;
  total_sms_sent: number;
}

interface Business {
  id: string;
  name: string;
  status: string;
  category: string;
  created_at: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, bRes] = await Promise.all([
          api.get('/admin/analytics'),
          api.get('/admin/businesses'),
        ]);
        setAnalytics(aRes.data);
        setBusinesses(bRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const logout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  };

  const pending = businesses.filter(b => b.status === 'pending');
  const recent = [...businesses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Category breakdown
  const categoryCount: Record<string, number> = {};
  businesses.forEach(b => {
    categoryCount[b.category] = (categoryCount[b.category] || 0) + 1;
  });
  const categoryData = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(...categoryData.map(([, v]) => v), 1);

  // Status percentages
  const activePercent = analytics
    ? Math.round((analytics.active_businesses / Math.max(analytics.total_businesses, 1)) * 100)
    : 0;
  const pendingPercent = 100 - activePercent;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {/* Header */}
      <div className="bg-[#13151c] border-b border-[#1e2130] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="font-bold text-lg">Loyally Admin</h1>
            <p className="text-slate-500 text-xs">Platform Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/businesses')} className="text-slate-400 hover:text-white text-sm transition">
            Businesses
          </button>
          <button
            onClick={() => navigate('/businesses/add')}
            className="bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold text-sm px-3 py-1.5 rounded-lg transition"
          >
            + Add Business
          </button>
          <button onClick={logout} className="text-slate-500 hover:text-red-400 text-sm transition">
            Logout
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-5xl mx-auto">

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
          {[
            { label: 'Businesses', value: analytics?.total_businesses ?? 0, color: 'text-white' },
            { label: 'Active', value: analytics?.active_businesses ?? 0, color: 'text-green-400' },
            { label: 'Pending', value: pending.length, color: 'text-amber-400' },
            { label: 'Customers', value: analytics?.total_customers ?? 0, color: 'text-sky-400' },
            { label: 'Stamps', value: analytics?.total_stamps_issued ?? 0, color: 'text-purple-400' },
            { label: 'SMS Sent', value: analytics?.total_sms_sent ?? 0, color: 'text-green-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#13151c] border border-[#1e2130] rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Business status — donut style */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5">
            <h2 className="font-semibold text-slate-300 mb-4">Business Status</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-400">Active</span>
                  <span className="text-white">{analytics?.active_businesses} ({activePercent}%)</span>
                </div>
                <div className="h-3 bg-[#0b0c10] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full transition-all duration-700"
                    style={{ width: `${activePercent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-amber-400">Pending</span>
                  <span className="text-white">{pending.length} ({pendingPercent}%)</span>
                </div>
                <div className="h-3 bg-[#0b0c10] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-700"
                    style={{ width: `${pendingPercent}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.total_businesses}</p>
                  <p className="text-slate-500 text-xs">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{analytics?.active_businesses}</p>
                  <p className="text-slate-500 text-xs">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{pending.length}</p>
                  <p className="text-slate-500 text-xs">Pending</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5">
            <h2 className="font-semibold text-slate-300 mb-4">By Category</h2>
            {categoryData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {categoryData.map(([cat, count]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 capitalize">{cat}</span>
                      <span className="text-white">{count}</span>
                    </div>
                    <div className="h-2 bg-[#0b0c10] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxCategory) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pending approval */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-300">
                Pending Approval
                {pending.length > 0 && (
                  <span className="ml-2 bg-amber-400/10 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => navigate('/businesses?filter=pending')}
                className="text-sky-400 text-xs hover:text-sky-300 transition"
              >
                View all →
              </button>
            </div>
            {pending.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">All caught up! ✅</p>
            ) : (
              <div className="space-y-2">
                {pending.slice(0, 4).map(b => (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/businesses/${b.id}`)}
                    className="flex items-center justify-between p-3 bg-[#0b0c10] rounded-lg cursor-pointer hover:bg-[#161922] transition"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{b.name}</p>
                      <p className="text-slate-500 text-xs capitalize">{b.category}</p>
                    </div>
                    <span className="text-amber-400 text-xs">Activate →</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently joined */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-300">Recently Joined</h2>
              <button
                onClick={() => navigate('/businesses')}
                className="text-sky-400 text-xs hover:text-sky-300 transition"
              >
                View all →
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No businesses yet</p>
            ) : (
              <div className="space-y-2">
                {recent.map(b => (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/businesses/${b.id}`)}
                    className="flex items-center justify-between p-3 bg-[#0b0c10] rounded-lg cursor-pointer hover:bg-[#161922] transition"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{b.name}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(b.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.status === 'active'
                        ? 'bg-green-400/10 text-green-400'
                        : b.status === 'pending'
                        ? 'bg-amber-400/10 text-amber-400'
                        : 'bg-red-400/10 text-red-400'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}