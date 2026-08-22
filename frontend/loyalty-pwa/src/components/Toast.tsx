import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'border-green-500/30 bg-green-500/10 text-green-400',
    error: 'border-red-500/30 bg-red-500/10 text-red-400',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  };

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 border rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg ${colors[type]}`}>
      <span>{icons[type]}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
    </div>
  );
}