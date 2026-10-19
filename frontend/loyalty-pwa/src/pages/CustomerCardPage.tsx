import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getCategoryById } from '../constants/categories';

interface Card {
  id: string;
  stamp_count: number;
  stamp_goal: number;
  reward_ready: boolean;
  total_redeemed: number;
  qr_url: string;
  business_name: string;
  business_logo_url: string | null;
  reward_description: string;
  category: string;
  customer_name: string | null;
  customer_phone: string | null;
}

export default function CustomerCardPage() {
  const { token } = useParams<{ token: string }>();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [walletUrl, setWalletUrl] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAdded, setWalletAdded] = useState(false);

  const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

  const fetchCard = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API}/cards/${token}`);
      if (!res.ok) throw new Error('Card not found');
      const data: Card = await res.json();

      setCard(prev => {
        if (prev !== null) {
          if (data.stamp_count > prev.stamp_count) {
            if (data.reward_ready) {
              setToast('🎉 Card complete! Show this to claim your reward.');
            } else {
              setToast(`✅ Stamp added! ${data.stamp_count}/${data.stamp_goal} stamps.`);
            }
            setTimeout(() => setToast(''), 4000);
          }
          if (data.stamp_count < prev.stamp_count && data.total_redeemed > prev.total_redeemed) {
            setToast('🎁 Reward redeemed! New card started.');
            setTimeout(() => setToast(''), 4000);
          }
        }
        return data;
      });
    } catch {
      if (!silent) setError('Card not found or invalid link');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, API]);

  const fetchWalletUrl = useCallback(async () => {
    if (!token || walletUrl) return;
    setWalletLoading(true);
    try {
      const res = await fetch(`${API}/cards/${token}/wallet`);
      if (!res.ok) throw new Error('Wallet unavailable');
      const data = await res.json();
      setWalletUrl(data.wallet_url);
      // Check if already added on this device
      const added = localStorage.getItem(`wallet_added_${token}`);
      if (added) setWalletAdded(true);
    } catch {
      // Wallet unavailable — hide button silently
    } finally {
      setWalletLoading(false);
    }
  }, [token, API, walletUrl]);

  useEffect(() => {
    fetchCard();
    fetchWalletUrl();
  }, [fetchCard, fetchWalletUrl]);

  useEffect(() => {
    const interval = setInterval(() => fetchCard(true), 5000);
    return () => clearInterval(interval);
  }, [fetchCard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="text-5xl">❌</div>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const category = getCategoryById(card.category ?? 'other');

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white px-6 py-10">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm font-medium text-center shadow-lg">
          {toast}
        </div>
      )}

      <div className="max-w-sm mx-auto space-y-6">

        {/* Business header */}
        <div className="text-center space-y-2">
          {card.business_logo_url ? (
            <img
              src={card.business_logo_url}
              alt={card.business_name}
              className="w-16 h-16 rounded-full mx-auto object-cover"
            />
          ) : (
            <div className="text-5xl">{category.emoji}</div>
          )}
          <h1 className="text-2xl font-bold">{card.business_name}</h1>
          <p className="text-slate-500 text-sm">Loyalty Card</p>
          {card.customer_name && (
            <p className="text-slate-400 text-sm">👋 {card.customer_name}</p>
          )}
        </div>

        {/* Reward status */}
        {card.reward_ready ? (
          <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-5 text-center space-y-2">
            <div className="text-4xl">🎉</div>
            <p className="text-amber-400 font-bold text-lg">Reward Ready!</p>
            <p className="text-slate-300 text-sm">{card.reward_description}</p>
            <p className="text-slate-500 text-xs">Show this card at the counter</p>
          </div>
        ) : (
          <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 text-center space-y-2">
            <p className="text-slate-400 text-sm">
              {card.stamp_goal - card.stamp_count} more {card.stamp_goal - card.stamp_count === 1 ? 'stamp' : 'stamps'} until your free reward
            </p>
            <p className="text-slate-500 text-xs">{card.reward_description}</p>
          </div>
        )}

        {/* Stamp grid */}
        <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-6">
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: card.stamp_goal }).map((_, i) => (
              <span
                key={i}
                className={`text-3xl transition-all duration-300 ${
                  i < card.stamp_count ? 'scale-110' : 'opacity-30'
                }`}
              >
                {category.stampEmoji}
              </span>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-4">
            {card.stamp_count}/{card.stamp_goal} stamps collected
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-6 text-center space-y-3">
          <p className="text-slate-400 text-sm">Show this QR at the counter</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(card.qr_url)}`}
            alt="Your loyalty card QR"
            className="mx-auto rounded-lg"
          />
          <p className="text-slate-600 text-xs">Updates automatically</p>
        </div>

        {/* Add to / View in Google Wallet */}
        {walletLoading && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {walletUrl && !walletLoading && (
          <a
            href={walletUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              localStorage.setItem(`wallet_added_${token}`, '1');
              setWalletAdded(true);
            }}
            className="flex items-center justify-center gap-3 w-full bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-xl py-3 px-4 transition"
          >
            {/* Official Google Wallet logo */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#1a73e8"/>
              <path d="M17.5 7h-11A1.5 1.5 0 0 0 5 8.5v7A1.5 1.5 0 0 0 6.5 17h11a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 17.5 7z" fill="white"/>
              <path d="M9 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="#1a73e8"/>
              <path d="M15 11h-3v1h3v-1zM15 13h-3v1h3v-1z" fill="#1a73e8"/>
            </svg>
            <span className="text-white font-medium text-sm">
              {walletAdded ? 'View in Google Wallet' : 'Add to Google Wallet'}
            </span>
          </a>
        )}

        {/* Stats */}
        <div className="text-center text-slate-600 text-xs pb-4">
          Total rewards redeemed: {card.total_redeemed}
        </div>

      </div>
    </div>
  );
}