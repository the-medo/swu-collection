export const number = (value: number | null | undefined) =>
  value == null ? '—' : value.toLocaleString();
export const percent = (value: number | null | undefined) =>
  value == null ? '—' : `${(value * 100).toFixed(1)}%`;
export const fraction = (value: number, total: number) => percent(total ? value / total : null);
export const gigabytes = (value: number | null | undefined) =>
  value == null ? '—' : `${(value / 1e9).toFixed(2)} GB`;
export function age(at: string | null | undefined, now: number) {
  if (!at) return 'No timestamp';
  const seconds = Math.max(0, Math.floor((now - Date.parse(at)) / 1000));
  return seconds < 60
    ? `${seconds}s ago`
    : seconds < 3600
      ? `${Math.floor(seconds / 60)}m ago`
      : `${Math.floor(seconds / 3600)}h ago`;
}
