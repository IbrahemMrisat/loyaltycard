import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Business {
  id: string;
  name: string;
  stamp_goal: number;
  reward_description: string;
  status: string;
}

interface Analytics {
  total_customers: number;
  total_stamps_issued: number;
  total_redemptions: number;
}

export default function HomePage() {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [bRes, aRes] = await Promise.all([
          api.get('/businesses/me'),
          api.get('/businesses/me/analytics'),
        ]);
        setBusiness(bRes.data);
        setAnalytics(aRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="text-sky-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">
      {/* Header */}
      <div className="bg-[#13151c] border-b border-[#1e2130] px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">{business?.name ?? 'Dashboard'}</h1>
          <p className="text-slate-500 text-xs">{role}</p>
        </div>
        <button
          onClick={logout}
          className="text-slate-500 text-sm hover:text-white transition"
        >
          Logout
        </button>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-sky-400">
              {analytics?.total_customers ?? 0}
            </div>
            <div className="text-slate-500 text-xs mt-1">Customers</div>
          </div>
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {analytics?.total_stamps_issued ?? 0}
            </div>
            <div className="text-slate-500 text-xs mt-1">Stamps</div>
          </div>
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {analytics?.total_redemptions ?? 0}
            </div>
            <div className="text-slate-500 text-xs mt-1">Redeemed</div>
          </div>
        </div>

        {/* Program info */}
        <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5">
          <h2 className="text-sm text-slate-500 mb-3">Loyalty Program</h2>
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Stamp goal</span>
            <span className="text-white font-bold">{business?.stamp_goal} stamps</span>
          </div>
          <div className="border-t border-[#1e2130] mt-3 pt-3">
            <span className="text-slate-300 text-sm">Reward</span>
            <p className="text-white mt-1">{business?.reward_description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/scan')}
            className="w-full bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-5 rounded-xl text-lg transition"
          >
            📸 Scan Customer QR
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="w-full bg-[#13151c] border border-[#1e2130] hover:border-sky-500 text-white font-bold py-4 rounded-xl transition"
          >
            👥 View Customers
          </button>
            {(role === 'business_owner' || role === 'admin_staff') && (
              <button
                onClick={() => navigate('/staff')}
                className="w-full bg-[#13151c] border border-[#1e2130] hover:border-sky-500 text-white font-bold py-4 rounded-xl transition"
              >
                👥 Manage Staff
              </button>
            )}
            {role === 'business_owner' && (
            <button
              onClick={() => navigate('/settings')}
              className="w-full bg-[#13151c] border border-[#1e2130] hover:border-sky-500 text-white font-bold py-4 rounded-xl transition"
            >
              ⚙️ Program Settings
            </button>
          )}
          {role === 'business_owner' && (
          <button
            onClick={() => navigate('/enroll-qr')}
            className="w-full bg-[#13151c] border border-[#1e2130] hover:border-sky-500 text-white font-bold py-4 rounded-xl transition"
          >
            📲 Enrollment QR Code
          </button>
        )}
        </div>
      </div>
    </div>
  );
}