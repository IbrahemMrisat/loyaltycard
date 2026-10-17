import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';

interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  category: string;
  stamp_goal: number;
  reward_description: string;
  created_at: string;
}

interface Analytics {
  total_customers: number;
  total_stamps_issued: number;
  total_redemptions: number;
  stamps_this_week: number;
  stamps_this_month: number;
  new_customers_this_month: number;
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/businesses');
        const found = res.data.find((b: Business) => b.id === id);
        if (found) setBusiness(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!business) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/businesses/${id}/status`, { status });
      setBusiness(prev => prev ? { ...prev, status } : prev);
      showToast(`Status updated to ${status} ✅`);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Action failed ❌');
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'active') return 'text-green-400';
    if (status === 'pending') return 'text-amber-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <p className="text-red-400">Business not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#13151c] border border-sky-500/30 rounded-xl px-4 py-3 text-sky-400 text-sm font-medium text-center shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#13151c] border-b border-[#1e2130] px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/businesses')}
          className="text-slate-400 hover:text-white transition"
        >
          ← Back
        </button>
        <h1 className="font-bold">{business.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full bg-[#1e2130] ${statusColor(business.status)}`}>
          {business.status}
        </span>
      </div>

      <div className="px-6 py-6 space-y-5">

        {/* Business info */}
        <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-3">
          <h2 className="text-slate-400 text-xs uppercase tracking-wide">Business Info</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Email</span>
              <span className="text-white text-sm">{business.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Phone</span>
              <span className="text-white text-sm">{business.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Category</span>
              <span className="text-white text-sm capitalize">{business.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Stamp goal</span>
              <span className="text-white text-sm">{business.stamp_goal} stamps</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Reward</span>
              <span className="text-white text-sm text-right max-w-48">{business.reward_description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Joined</span>
              <span className="text-white text-sm">{new Date(business.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <h2 className="text-slate-400 text-xs uppercase tracking-wide">Actions</h2>
          {business.status === 'pending' && (
            <button
              onClick={() => updateStatus('active')}
              disabled={actionLoading}
              className="w-full bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/30 hover:border-green-400 font-bold py-4 rounded-xl transition disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : '✅ Activate Business'}
            </button>
          )}
          {business.status === 'active' && (
            <button
              onClick={() => updateStatus('suspended')}
              disabled={actionLoading}
              className="w-full bg-red-400/10 hover:bg-red-400/20 text-red-400 border border-red-400/30 hover:border-red-400 font-bold py-4 rounded-xl transition disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : '🚫 Suspend Business'}
            </button>
          )}
          {business.status === 'suspended' && (
            <button
              onClick={() => updateStatus('active')}
              disabled={actionLoading}
              className="w-full bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/30 hover:border-green-400 font-bold py-4 rounded-xl transition disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : '✅ Reactivate Business'}
            </button>
          )}
          {business.status !== 'pending' && (
            <button
              onClick={() => updateStatus('pending')}
              disabled={actionLoading}
              className="w-full bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:border-amber-400 font-bold py-4 rounded-xl transition disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : '⏳ Set to Pending'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}