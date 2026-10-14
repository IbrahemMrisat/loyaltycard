import { useState } from 'react';
import { api } from '../api/client';
import PhoneInput from '../components/PhoneInput';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCustomerModal({ onClose, onSuccess }: Props) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/businesses/me/customers', { phone, name });
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(', '));
      else setError('Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#13151c] border border-[#1e2130] rounded-t-2xl p-6 space-y-5">

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Add Customer</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1">
            <label className="text-slate-400 text-sm">Phone number</label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-sm">
              Name <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Customer name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#0b0c10] border border-[#1e2130] text-slate-400 py-3 rounded-xl transition hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Customer'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}