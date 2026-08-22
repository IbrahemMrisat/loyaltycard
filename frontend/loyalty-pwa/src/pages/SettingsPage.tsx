import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { CATEGORIES, getCategoryById } from '../constants/categories';

interface BusinessForm {
  name: string;
  phone: string;
  stamp_goal: number;
  reward_description: string;
  category: string;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<BusinessForm>({
    name: '',
    phone: '',
    stamp_goal: 6,
    reward_description: '',
    category: 'other',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedCategory = getCategoryById(form.category);

  useEffect(() => {
    api.get('/businesses/me')
      .then(res => setForm({
        name: res.data.name,
        phone: res.data.phone,
        stamp_goal: res.data.stamp_goal,
        reward_description: res.data.reward_description,
        category: res.data.category ?? 'other',
      }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.patch('/businesses/me', form);
      setSuccess('Settings saved successfully');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(', '));
      else setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <p className="text-sky-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {/* Header */}
      <div className="bg-[#13151c] border-b border-[#1e2130] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
          ← Back
        </button>
        <h1 className="font-bold">Program Settings</h1>
      </div>

      <div className="px-6 py-6">
        <form onSubmit={handleSave} className="space-y-5">

          {/* Business info */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-slate-300">Business Info</h2>

            <div className="space-y-1">
              <label className="text-slate-400 text-sm">Business name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-sm">Phone number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required
                className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Category selector */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-slate-300">Business Category</h2>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    category: cat.id,
                    reward_description: form.reward_description || cat.rewardPlaceholder,
                  })}
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

            {/* Preview */}
            <div className="bg-[#0b0c10] rounded-xl p-4 text-center space-y-2">
              <p className="text-slate-500 text-xs">Stamp preview</p>
              <div className="flex justify-center gap-1 flex-wrap">
                {Array.from({ length: Math.min(form.stamp_goal, 8) }).map((_, i) => (
                  <span key={i} className="text-xl">{selectedCategory.stampEmoji}</span>
                ))}
                {form.stamp_goal > 8 && (
                  <span className="text-slate-500 text-sm self-center">+{form.stamp_goal - 8}</span>
                )}
                <span className="text-xl">🎁</span>
              </div>
            </div>
          </div>

          {/* Loyalty program */}
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-slate-300">Loyalty Program</h2>

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
                rows={3}
                placeholder={selectedCategory.rewardPlaceholder}
                className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>
          </div>

          <p className="text-slate-500 text-xs text-center">
            Stamp goal changes apply to new cards only. Existing customers keep their current progress.
          </p>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {success && <p className="text-green-400 text-sm text-center">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-4 rounded-xl transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

        </form>
      </div>
    </div>
  );
}