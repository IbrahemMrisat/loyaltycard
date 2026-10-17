import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function BusinessesPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status_filter=${filter}` : '';
      const res = await api.get(`/admin/businesses${params}`);
      setBusinesses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // Check for filter in URL
    const params = new URLSearchParams(window.location.search);
    const f = params.get('filter');
    if (f) setFilter(f);
    loadBusinesses();
  }, [loadBusinesses]);

  const updateStatus = async (id: string, status: string, name: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/admin/businesses/${id}/status`, { status });
      showToast(`${name} ${status === 'active' ? 'activated' : 'suspended'} ✅`);
      await loadBusinesses();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Action failed ❌');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = businesses.filter(b =>
  b.name.toLowerCase().includes(search.toLowerCase()) ||
  b.email.toLowerCase().includes(search.toLowerCase()) ||
  b.phone.includes(search) ||
  b.category.toLowerCase().includes(search.toLowerCase())
);

  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-green-400/10 text-green-400';
    if (status === 'pending') return 'bg-amber-400/10 text-amber-400';
    return 'bg-red-400/10 text-red-400';
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#13151c] border border-sky-500/30 rounded-xl px-4 py-3 text-sky-400 text-sm font-medium text-center shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#13151c] border-b border-[#1e2130] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white transition"
          >
            ← Back
          </button>
          <h1 className="font-bold">Businesses ({filtered.length})</h1>
        </div>
        <button
          onClick={loadBusinesses}
          disabled={loading}
          className="text-slate-400 hover:text-white text-sm px-3 py-1 border border-[#1e2130] rounded-lg transition disabled:opacity-50"
        >
          ↻ Refresh
        </button>
        <button
          onClick={() => navigate('/businesses/add')}
          className="bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold text-sm px-3 py-2 rounded-lg transition"
        >
          + Add
        </button>
      </div>

      <div className="px-6 py-4 space-y-4">

        {/* Search + Filter */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-[#13151c] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 text-sm"
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-[#13151c] border border-[#1e2130] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            No businesses found.
          </div>
        )}

        {/* Business list */}
        {!loading && filtered.map(business => (
          <div
            key={business.id}
            className="bg-[#13151c] border border-[#1e2130] rounded-xl p-4 space-y-3"
          >
            {/* Info */}
            <div className="flex items-start justify-between">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/businesses/${business.id}`)}
              >
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{business.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(business.status)}`}>
                    {business.status}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5">{business.email}</p>
                <p className="text-slate-600 text-xs">
                  {business.category} · {business.stamp_goal} stamps · joined {new Date(business.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {business.status === 'pending' && (
                <button
                  onClick={() => updateStatus(business.id, 'active', business.name)}
                  disabled={actionLoading === business.id}
                  className="flex-1 bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/30 hover:border-green-400 text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
                >
                  {actionLoading === business.id ? '...' : '✅ Activate'}
                </button>
              )}
              {business.status === 'active' && (
                <button
                  onClick={() => updateStatus(business.id, 'suspended', business.name)}
                  disabled={actionLoading === business.id}
                  className="flex-1 bg-red-400/10 hover:bg-red-400/20 text-red-400 border border-red-400/30 hover:border-red-400 text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
                >
                  {actionLoading === business.id ? '...' : '🚫 Suspend'}
                </button>
              )}
              {business.status === 'suspended' && (
                <button
                  onClick={() => updateStatus(business.id, 'active', business.name)}
                  disabled={actionLoading === business.id}
                  className="flex-1 bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/30 hover:border-green-400 text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
                >
                  {actionLoading === business.id ? '...' : '✅ Reactivate'}
                </button>
              )}
              <button
                onClick={() => navigate(`/businesses/${business.id}`)}
                className="bg-sky-400/10 hover:bg-sky-400/20 text-sky-400 border border-sky-400/30 hover:border-sky-400 text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                View →
              </button>
            </div>

          </div>
        ))}

      </div>
    </div>
  );
}