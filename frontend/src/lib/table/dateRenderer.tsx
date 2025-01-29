import { formatDate } from '@/lib/locale.ts';

export const dateRenderer = (value: string | Date) => (
  <div className="text-right font-medium">{formatDate(value)}</div>
);
