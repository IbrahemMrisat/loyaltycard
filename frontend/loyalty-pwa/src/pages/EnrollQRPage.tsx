import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { getCategoryById } from '../constants/categories';

export default function EnrollQRPage() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

const BASE_URL = import.meta.env.VITE_APP_URL ?? 'http://localhost:5173';

  useEffect(() => {
    api.get('/businesses/me')
      .then(res => setBusiness(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <p className="text-sky-400">Loading...</p>
      </div>
    );
  }

  const enrollUrl = `${BASE_URL}/enroll/${business.id}`;
  const category = getCategoryById(business.category);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(enrollUrl)}`;

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {/* Header */}
      <div className="bg-[#13151c] border-b border-[#1e2130] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
          ← Back
        </button>
        <h1 className="font-bold">Enrollment QR Code</h1>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-sm mx-auto">

        {/* Instructions */}
        <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-2">
          <h2 className="font-semibold">How to use</h2>
          <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
            <li>Print this QR code</li>
            <li>Place it at your counter</li>
            <li>Customers scan it with their phone camera</li>
            <li>They enter their phone number</li>
            <li>Card is created automatically</li>
          </ol>
        </div>

        {/* Printable QR card */}
        <div className="bg-white rounded-2xl p-6 text-center space-y-4">
          <div className="text-4xl">{category.emoji}</div>
          <h2 className="text-[#0b0c10] font-bold text-xl">{business.name}</h2>
          <p className="text-gray-500 text-sm">
            Scan to join our loyalty program
          </p>
          <img
            src={qrImageUrl}
            alt="Enrollment QR"
            className="mx-auto rounded-xl"
          />
          <p className="text-gray-400 text-xs">
            Collect {business.stamp_goal} stamps — get {business.reward_description}
          </p>
        </div>

        {/* Enrollment URL */}
        <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-4 space-y-2">
          <p className="text-slate-400 text-xs">Enrollment link</p>
          <p className="text-sky-400 text-xs break-all">{enrollUrl}</p>
        </div>

        {/* Print button */}
        <button
          onClick={() => window.print()}
          className="w-full bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-4 rounded-xl transition"
        >
          🖨️ Print QR Code
        </button>

      </div>
    </div>
  );
}