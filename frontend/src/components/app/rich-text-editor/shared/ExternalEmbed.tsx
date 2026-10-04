import { insertionHref, insertionLabel, parseInsertion } from './model.ts';
export function ExternalEmbed({ data }: { data: string }) {
  const value = parseInsertion(data);
  if (!value) return <span>Content unavailable</span>;
  const href = insertionHref(value);
  return href ? <a href={href}>{insertionLabel(value)}</a> : <div>{insertionLabel(value)}</div>;
}
