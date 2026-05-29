export function money(value: string | number, currency = 'USD'): string {
  const n = typeof value === 'string' ? Number(value) : value;
  const locale = currency === 'IDR' ? 'id-ID' : undefined;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
}

export function shortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
