import { useState } from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = '05XXXXXXXX',
  className = '',
  required = false,
}: PhoneInputProps) {
  const [display, setDisplay] = useState(() => {
    // Convert E.164 back to local display format
    if (value.startsWith('+972')) {
      return '0' + value.slice(4);
    }
    return value;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, ''); // digits only
    setDisplay(e.target.value);

    // Convert to E.164
    if (raw.startsWith('972')) {
      onChange('+' + raw);
    } else if (raw.startsWith('0')) {
      onChange('+972' + raw.slice(1));
    } else if (raw.length > 0) {
      onChange('+972' + raw);
    } else {
      onChange('');
    }
  };

  return (
    <div className="flex">
      <div className="flex items-center bg-[#0b0c10] border border-r-0 border-[#1e2130] rounded-l-xl px-3 text-slate-400 text-sm whitespace-nowrap">
        🇮🇱 +972
      </div>
      <input
        type="tel"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={`flex-1 bg-[#0b0c10] border border-[#1e2130] rounded-r-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 ${className}`}
      />
    </div>
  );
}