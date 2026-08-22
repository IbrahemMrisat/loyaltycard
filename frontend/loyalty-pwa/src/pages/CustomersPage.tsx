import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { getCategoryById } from '../constants/categories';
import Toast from '../components/Toast';
import AddCustomerModal from '../components/AddCustomerModal';

interface Card {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  stamp_count: number;
  stamp_goal: number;
  reward_ready: boolean;
  qr_url: string;
  category: string;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/businesses/me/customers');
      setCards(res.data);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load customers', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toastParam = params.get('toast');
    if (toastParam === 'stamped') {
      setToast({ message: 'Stamp added successfully!', type: 'success' });
    } else if (toastParam === 'redeemed') {
      setToast({ message: 'Reward redeemed! Card reset.', type: 'success' });
    }
    window.history.replaceState({}, '', '/customers');
    loadCustomers();
  }, [loadCustomers]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setToast({ message: 'Customer added successfully!', type: 'success' });
            loadCustomers();
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
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
          <h1 className="font-bold">Customers ({cards.length})</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="text-slate-400 hover:text-white text-sm px-3 py-1 border border-[#1e2130] rounded-lg hover:border-slate-500 transition disabled:opacity-50"
          >
            ↻
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold text-sm px-3 py-2 rounded-lg transition"
          >
            + Add
          </button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-3">

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && cards.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <div className="text-4xl">👥</div>
            <p className="text-slate-500">No customers yet.</p>
            <p className="text-slate-600 text-sm">
              Tap + Add or share the enrollment link to get started.
            </p>
          </div>
        )}

        {!loading && cards.map(card => {
          const category = getCategoryById(card.category ?? 'other');
          return (
            <div
              key={card.id}
              className="bg-[#13151c] border border-[#1e2130] rounded-xl p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-medium">
                    {card.customer_name ?? 'Unknown'}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {card.customer_phone ?? card.customer_id}
                  </p>
                </div>
                {card.reward_ready && (
                  <span className="bg-amber-400/10 text-amber-400 text-xs px-3 py-1 rounded-full flex-shrink-0">
                    🎉 Reward ready
                  </span>
                )}
              </div>

              {/* Stamp grid — consistent with card page */}
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: card.stamp_goal }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg transition-all ${
                      i < card.stamp_count ? '' : 'opacity-30'
                    }`}
                  >
                    {category.stampEmoji}
                  </span>
                ))}
              </div>

              <p className="text-slate-500 text-xs">
                {card.stamp_count}/{card.stamp_goal} stamps
                {card.reward_ready && (
                  <span className="text-amber-400 ml-2">— ready to redeem!</span>
                )}
              </p>
            </div>
          );
        })}

      </div>
    </div>
  );
}