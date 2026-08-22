import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getCategoryById } from '../constants/categories';

interface Business {
  id: string;
  name: string;
  stamp_goal: number;
  reward_description: string;
  category: string;
  logo_url: string | null;
}

interface Card {
  qr_url: string;
  stamp_count: number;
  stamp_goal: number;
  total_redeemed: number;
}

type EnrollState = 'loading' | 'form' | 'success' | 'error';

export default function EnrollPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [state, setState] = useState<EnrollState>('loading');
  const [card, setCard] = useState<Card | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetch(`${API}/businesses/${businessId}/enroll`)
      .then(res => {
        if (!res.ok) throw new Error('Business not found');
        return res.json();
      })
      .then(data => {
        setBusiness(data);
        setState('form');
      })
      .catch(() => setState('error'));
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/businesses/${businessId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Enrollment failed');
      setCard(data);
      setState('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <p className="text-sky-400">Loading...</p>
      </div>
    );
  }

  if (state === 'error' || !business) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="text-5xl">❌</div>
          <p className="text-red-400">Business not found or inactive</p>
        </div>
      </div>
    );
  }

  const category = getCategoryById(business.category);

  if (state === 'success' && card) {
  const token = card.qr_url.split('/cards/')[1];
  const isReturning = card.total_redeemed > 0;

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white px-6 py-10">
      <div className="max-w-sm mx-auto space-y-6 text-center">

        <div className="text-6xl">{isReturning ? '👋' : '🎉'}</div>
        <h1 className="text-2xl font-bold">
          {isReturning ? 'Welcome back!' : "You're enrolled!"}
        </h1>
        <p className="text-slate-400">
          {isReturning
            ? `Great to see you again at ${business.name}! Your new card is ready.`
            : `Welcome to ${business.name}'s loyalty program. Collect ${business.stamp_goal} stamps to earn your reward.`
          }
        </p>


        <button
          onClick={() => window.location.href = `/card/${token}`}
          className="w-full bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-4 rounded-xl transition"
        >
          View My Card & QR Code
        </button>

        <p className="text-slate-500 text-xs">
          {isReturning
            ? 'We sent you a welcome back SMS with your card link.'
            : 'We sent you an SMS with your card link. Save it to access your card anytime.'
          }
        </p>

      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white px-6 py-10">
      <div className="max-w-sm mx-auto space-y-6">

        <div className="text-center space-y-2">
          <div className="text-5xl">{category.emoji}</div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-slate-400 text-sm">
            Join our loyalty program — collect {business.stamp_goal} stamps
            and get: {business.reward_description}
          </p>
        </div>

        <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-4">
          <div className="flex justify-center gap-1 flex-wrap">
            {Array.from({ length: business.stamp_goal }).map((_, i) => (
              <span key={i} className="text-xl">{category.stampEmoji}</span>
            ))}
            <span className="text-xl">🎁</span>
          </div>
          <p className="text-center text-slate-500 text-xs mt-2">
            {business.stamp_goal} stamps = free reward
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1">
            <label className="text-slate-400 text-sm">Phone number</label>
            <input
              type="tel"
              placeholder="+1234567890"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              className="w-full bg-[#13151c] border border-[#1e2130] rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-sm">
              Name <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#13151c] border border-[#1e2130] rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-4 rounded-xl transition disabled:opacity-50"
          >
            {submitting ? 'Joining...' : `Join ${business.name}`}
          </button>

          <p className="text-slate-600 text-xs text-center">
            By joining you agree to receive SMS notifications.
            Reply STOP at any time to opt out.
          </p>

        </form>
      </div>
    </div>
  );
}