import { useEffect, useState } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  currency?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
};

function formatDisplay(canonical: string, currency?: string): string {
  if (!canonical) return '';
  const n = Number(canonical);
  const fracLen = canonical.includes('.') ? (canonical.split('.')[1]?.length ?? 0) : 0;
  const opts = { minimumFractionDigits: Math.min(2, fracLen), maximumFractionDigits: 2 } as Intl.NumberFormatOptions;
  const locale = currency === 'IDR' ? 'id-ID' : undefined;
  return new Intl.NumberFormat(locale, opts).format(isNaN(n) ? 0 : n);
}

function normalizeInput(input: string, currency?: string): { canonical: string; display: string } {
  let raw = input.replace(/[^0-9,.-]/g, '');
  const negative = raw.startsWith('-');
  if (currency === 'IDR') {
    raw = raw.replace(/\./g, '');
    const [i, f = ''] = raw.replace(/^-/, '').split(',');
    const frac = f.slice(0, 2);
    const canonical = (negative ? '-' : '') + (i || '0') + (frac ? '.' + frac : '');
    return { canonical, display: formatDisplay(canonical, currency) };
  } else {
    raw = raw.replace(/,/g, '');
    const [i, f = ''] = raw.replace(/^-/, '').split('.');
    const frac = f.slice(0, 2);
    const canonical = (negative ? '-' : '') + (i || '0') + (frac ? '.' + frac : '');
    return { canonical, display: formatDisplay(canonical, currency) };
  }
}

export function MoneyInput({ value, onChange, currency, className, placeholder, required }: Props) {
  const [display, setDisplay] = useState<string>('');

  useEffect(() => {
    setDisplay(value ? formatDisplay(value, currency) : '');
  }, [value, currency]);

  return (
    <input
      className={className || 'input'}
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      required={!!required}
      onChange={(e) => {
        const { canonical, display } = normalizeInput(e.target.value, currency);
        setDisplay(display);
        onChange(canonical);
      }}
      onBlur={() => setDisplay(value ? formatDisplay(value, currency) : '')}
    />
  );
}
