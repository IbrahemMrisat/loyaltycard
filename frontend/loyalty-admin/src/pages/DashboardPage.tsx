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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(res => setAnalytics(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  };

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/businesses')}
            className="text-slate-400 hover:text-white text-sm transition"
          >
            Businesses
          </button>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-red-400 text-sm transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* Stats grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">

            <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-1">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Total Businesses</p>
              <p className="text-3xl font-bold text-white">{analytics?.total_businesses ?? 0}</p>
              <p className="text-green-400 text-xs">{analytics?.active_businesses ?? 0} active</p>
            </div>

            <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-1">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Total Customers</p>
              <p className="text-3xl font-bold text-sky-400">{analytics?.total_customers ?? 0}</p>
            </div>

            <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-1">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Stamps Issued</p>
              <p className="text-3xl font-bold text-purple-400">{analytics?.total_stamps_issued ?? 0}</p>
            </div>

            <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-1">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Redemptions</p>
              <p className="text-3xl font-bold text-amber-400">{analytics?.total_redemptions ?? 0}</p>
            </div>

            <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-1">
              <p className="text-slate-500 text-xs uppercase tracking-wide">SMS Sent</p>
              <p className="text-3xl font-bold text-green-400">{analytics?.total_sms_sent ?? 0}</p>
            </div>

            <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-1">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Pending Approval</p>
              <p className="text-3xl font-bold text-red-400">
                {(analytics?.total_businesses ?? 0) - (analytics?.active_businesses ?? 0)}
              </p>
            </div>

          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/businesses?filter=pending')}
            className="bg-amber-400/10 border border-amber-400/30 hover:border-amber-400 text-amber-400 font-bold py-4 rounded-xl transition"
          >
            ⏳ Review Pending
          </button>
          <button
            onClick={() => navigate('/businesses')}
            className="bg-sky-400/10 border border-sky-400/30 hover:border-sky-400 text-sky-400 font-bold py-4 rounded-xl transition"
          >
            🏪 All Businesses
          </button>
        </div>

      </div>
    </div>
  );
}