import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const CATEGORIES = [
  { id: 'coffee', label: 'Coffee Shop', emoji: '☕' },
  { id: 'barbershop', label: 'Barbershop', emoji: '💈' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'sushi', label: 'Sushi', emoji: '🍣' },
  { id: 'bakery', label: 'Bakery', emoji: '🥐' },
  { id: 'burger', label: 'Burger', emoji: '🍔' },
  { id: 'smoothie', label: 'Smoothie Bar', emoji: '🥤' },
  { id: 'nails', label: 'Nail Salon', emoji: '💅' },
  { id: 'gym', label: 'Gym', emoji: '💪' },
  { id: 'bookstore', label: 'Bookstore', emoji: '📚' },
  { id: 'other', label: 'Other', emoji: '⭐' },
];

export default function AddBusinessPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'coffee',
    stamp_goal: 6,
    reward_description: '',
    owner_password: '',
    auto_activate: true,
  });
  const [phoneDisplay, setPhoneDisplay] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // Register business
      const res = await api.post('/businesses', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        category: form.category,
        stamp_goal: form.stamp_goal,
        reward_description: form.reward_description,
        owner_password: form.owner_password,
      });

      // Auto-activate if checked
      if (form.auto_activate) {
        await api.patch(`/admin/businesses/${res.data.id}/status`, {
          status: 'active',
        });
        setSuccess(`✅ "${form.name}" registered and activated! Owner can login with ${form.email}`);
      } else {
        setSuccess(`✅ "${form.name}" registered — pending activation.`);
      }

      // Reset form
      setForm({
        name: '',
        email: '',
        phone: '',
        category: 'coffee',
        stamp_goal: 6,
        reward_description: '',
        owner_password: '',
        auto_activate: true,
      });

    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(', '));
      else setError('Failed to register business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {/* Header */}
      <div className="bg-[#13151c] border-b border-[#1e2130] px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/businesses')}
          className="text-slate-400 hover:text-white transition"
        >
          ← Back
        </button>
        <h1 className="font-bold">Add New Business</h1>
      </div>

      <div className="px-6 py-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Business info */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-4">
            <h2 className="text-slate-400 text-xs uppercase tracking-wide">Business Info</h2>

            <div className="space-y-1">
              <label className="text-slate-400 text-sm">Business name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                placeholder="Joe's Coffee"
                className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-sm">Owner email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                placeholder="owner@business.com"
                className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-sm">Phone number</label>
              <div className="flex">
                <div className="flex items-center bg-[#0b0c10] border border-r-0 border-[#1e2130] rounded-l-xl px-3 text-slate-400 text-sm whitespace-nowrap">
                  🇮🇱 +972
                </div>
            <input
            type="tel"
            value={phoneDisplay}
            onChange={e => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                setPhoneDisplay(e.target.value);
                const e164 = raw.startsWith('0')
                ? '+972' + raw.slice(1)
                : raw.length > 0
                ? '+972' + raw
                : '';
                setForm({ ...form, phone: e164 });
            }}
            required
            placeholder="05XXXXXXXX"
            className="flex-1 bg-[#0b0c10] border border-[#1e2130] rounded-r-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-sm">Temporary password for owner</label>
              <input
                type="text"
                value={form.owner_password}
                onChange={e => setForm({ ...form, owner_password: e.target.value })}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
              <p className="text-slate-600 text-xs">Share this with the business owner to login</p>
            </div>
          </div>

          {/* Category */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-4">
            <h2 className="text-slate-400 text-xs uppercase tracking-wide">Category</h2>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.id })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition ${
                    form.category === cat.id
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-[#1e2130] hover:border-slate-500'
                  }`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-xs text-slate-300 text-center leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Loyalty program */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-4">
            <h2 className="text-slate-400 text-xs uppercase tracking-wide">Loyalty Program</h2>

            <div className="space-y-1">
              <label className="text-slate-400 text-sm">
                Stamp goal — <span className="text-white">{form.stamp_goal} stamps</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={2}
                  max={20}
                  value={form.stamp_goal}
                  onChange={e => setForm({ ...form, stamp_goal: parseInt(e.target.value) })}
                  className="flex-1 accent-sky-400"
                />
                <span className="text-white font-bold w-8 text-center">{form.stamp_goal}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-sm">Reward description</label>
              <textarea
                value={form.reward_description}
                onChange={e => setForm({ ...form, reward_description: e.target.value })}
                required
                minLength={5}
                rows={2}
                placeholder="Free coffee on your next visit!"
                className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>
          </div>

          {/* Auto activate toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none bg-[#13151c] border border-[#1e2130] rounded-xl p-4">
            <div
              onClick={() => setForm({ ...form, auto_activate: !form.auto_activate })}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.auto_activate ? 'bg-sky-500' : 'bg-[#1e2130]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.auto_activate ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Auto-activate on registration</p>
              <p className="text-slate-500 text-xs">Business goes live immediately — no manual approval needed</p>
            </div>
          </label>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {success && (
            <div className="bg-green-400/10 border border-green-400/30 rounded-xl p-4 text-green-400 text-sm text-center">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-4 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Registering...' : '+ Register Business'}
          </button>

        </form>
      </div>
    </div>
  );
}