export function money(value: number | string): string {
  const amount = Math.round(Number(value) || 0);
  const sign = amount < 0 ? '-' : '';
  const digits = Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}$ ${digits}`;
}

export function shortId(value: string): string {
  return String(value || '').slice(0, 8).toUpperCase();
}

export function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}
