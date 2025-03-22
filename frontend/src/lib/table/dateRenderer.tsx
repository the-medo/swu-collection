import { formatDate } from '@/lib/locale.ts';

export const dateRenderer = (value: string | Date) => (
  <div className="text-right text-xs font-normal">{formatDate(value)}</div>
);
