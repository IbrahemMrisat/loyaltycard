import { Html5Qrcode } from 'html5-qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { getCategoryById } from '../constants/categories';

type ScanState = 'scanning' | 'loading' | 'success' | 'error' | 'reward';

interface StampResult {
  stamp_count: number;
  stamp_goal: number;
  reward_ready: boolean;
  customer_phone: string;
  customer_name: string | null;
  category?: string;
}

export default function ScanPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerStarted = useRef<boolean>(false);
  const isProcessing = useRef<boolean>(false);
  const lastToken = useRef<string>('');

  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<StampResult | null>(null);
  const [error, setError] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessing.current) return;

    const token = decodedText.includes('/cards/')
      ? decodedText.split('/cards/')[1]
      : decodedText;

    if (!token || token === lastToken.current) return;

    isProcessing.current = true;
    lastToken.current = token;

    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }

    setScanState('loading');

    try {
      const res = await api.post('/stamps', { qr_token: token });
      setResult(res.data);
      setScanState(res.data.reward_ready ? 'reward' : 'success');
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail ?? '';

      // Card is full — fetch card info and show redeem screen
      if (status === 409 && detail.includes('full')) {
        try {
          const cardRes = await api.get(`/cards/${token}`);
          setResult({
            stamp_count: cardRes.data.stamp_count,
            stamp_goal: cardRes.data.stamp_goal,
            reward_ready: true,
            customer_phone: cardRes.data.customer_phone ?? '',
            customer_name: cardRes.data.customer_name ?? null,
            category: cardRes.data.category,
          });
          setScanState('reward');
        } catch {
          setError('Card is full — please redeem the reward manually');
          setScanState('error');
        }
      } else {
        setError(detail || 'Failed to add stamp');
        setScanState('error');
      }
    } finally {
      isProcessing.current = false;
    }
  }, []);

  useEffect(() => {
    if (scannerStarted.current) return;
    scannerStarted.current = true;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    const boxSize = Math.min(window.innerWidth * 0.7, 280);

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: boxSize, height: boxSize },
        aspectRatio: 1.0,
        disableFlip: false,
      },
      onScanSuccess,
      () => {}
    ).catch(() => {
      setError('Camera access denied. Please allow camera permission.');
      setScanState('error');
    });

    return () => {
      scanner.isScanning && scanner.stop().catch(() => {});
    };
  }, [onScanSuccess]);

  const handleRedeem = async () => {
    if (!lastToken.current) return;
    setRedeemLoading(true);
    try {
      await api.post('/stamps/redeem', { qr_token: lastToken.current });
      window.location.href = '/';
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Redemption failed');
      setScanState('error');
    } finally {
      setRedeemLoading(false);
    }
  };

  const reset = () => {
    lastToken.current = '';
    isProcessing.current = false;
    window.location.href = '/';
  };

  const stampEmoji = getCategoryById(result?.category ?? 'other').stampEmoji;

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {/* Header */}
      <div className="bg-[#13151c] border-b border-[#1e2130] px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => { window.location.href = '/'; }}
          className="text-slate-400 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="font-bold">Scan QR Code</h1>
      </div>

      <div className="px-6 py-6">

        {/* Scanning */}
        {scanState === 'scanning' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm text-center">
              Point camera at customer's loyalty card QR
            </p>
            <div
              className="relative mx-auto rounded-2xl overflow-hidden border-2 border-sky-500/50"
              style={{ width: '100%', maxWidth: '320px', aspectRatio: '1' }}
            >
              <div id="qr-reader" className="w-full h-full" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
                <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
              </div>
            </div>
            <p className="text-slate-600 text-xs text-center">
              Hold steady — scanner detects automatically
            </p>
          </div>
        )}

        {/* Loading */}
        {scanState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Processing...</p>
          </div>
        )}

        {/* Success */}
        {scanState === 'success' && result && (
          <div className="space-y-6">
            <div className="bg-[#13151c] border border-green-500/30 rounded-xl p-6 text-center space-y-3">
              <div className="text-5xl">✅</div>
              <h2 className="text-xl font-bold text-green-400">Stamp Added!</h2>
              <p className="text-slate-300 font-medium">
                {result.customer_name ?? result.customer_phone}
              </p>
              {result.customer_name && (
                <p className="text-slate-500 text-sm">{result.customer_phone}</p>
              )}
              <div className="flex justify-center gap-2 flex-wrap py-2">
                {Array.from({ length: result.stamp_goal }).map((_, i) => (
                  <span key={i} className="text-2xl">
                    {i < result.stamp_count ? stampEmoji : '⬜'}
                  </span>
                ))}
              </div>
              <p className="text-slate-400 text-sm">
                {result.stamp_count}/{result.stamp_goal} stamps
              </p>
            </div>
            <button
              onClick={reset}
              className="w-full bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-4 rounded-xl transition"
            >
              Done — back to home
            </button>
          </div>
        )}

        {/* Reward Ready */}
        {scanState === 'reward' && result && (
          <div className="space-y-6">
            <div className="bg-[#13151c] border border-amber-500/30 rounded-xl p-6 text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-bold text-amber-400">Reward Ready!</h2>
              <p className="text-slate-300 font-medium">
                {result.customer_name ?? result.customer_phone}
              </p>
              {result.customer_name && (
                <p className="text-slate-500 text-sm">{result.customer_phone}</p>
              )}
              <div className="flex justify-center gap-2 flex-wrap py-2">
                {Array.from({ length: result.stamp_goal }).map((_, i) => (
                  <span key={i} className="text-2xl">{stampEmoji}</span>
                ))}
              </div>
              <p className="text-slate-400 text-sm">Card complete!</p>
            </div>
            <button
              onClick={handleRedeem}
              disabled={redeemLoading}
              className="w-full bg-amber-400 hover:bg-amber-300 text-[#0b0c10] font-bold py-4 rounded-xl transition disabled:opacity-50"
            >
              {redeemLoading ? 'Redeeming...' : '🎁 Redeem Reward'}
            </button>
            <button
              onClick={reset}
              className="w-full bg-[#13151c] border border-[#1e2130] text-slate-400 py-3 rounded-xl transition"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Error */}
        {scanState === 'error' && (
          <div className="space-y-6">
            <div className="bg-[#13151c] border border-red-500/30 rounded-xl p-6 text-center space-y-3">
              <div className="text-5xl">❌</div>
              <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
            <button
              onClick={() => { window.location.href = '/scan'; }}
              className="w-full bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-4 rounded-xl transition"
            >
              Try Again
            </button>
            <button
              onClick={reset}
              className="w-full bg-[#13151c] border border-[#1e2130] text-slate-400 py-3 rounded-xl transition"
            >
              Back to home
            </button>
          </div>
        )}

      </div>
    </div>
  );
}