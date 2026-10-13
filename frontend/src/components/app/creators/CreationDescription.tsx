import type { ReactNode } from 'react';

const openingBrackets = new Map([
  [')', '('],
  [']', '['],
  ['}', '{'],
]);

function trimLinkEnd(candidate: string) {
  let text = candidate;
  while (true) {
    text = text.replace(/[.,!?;:'’…]+$/u, '');
    const closing = text.slice(-1);
    const opening = openingBrackets.get(closing);
    if (!opening || text.split(opening).length >= text.split(closing).length) return text;
    text = text.slice(0, -1);
  }
}

export function CreationDescription({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  // Render plain text and anchors; descriptions never become HTML or Markdown.
  for (const match of text.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"“”]+/gi)) {
    // Avoid partial addresses without requiring regex lookbehind in older browsers.
    if (/[\p{L}\p{N}\p{M}_.@/-]/u.test(text.charAt(match.index - 1))) continue;
    const label = trimLinkEnd(match[0]);
    let url: URL;
    try {
      url = new URL(/^www\./i.test(label) ? `https://${label}` : label);
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
    parts.push(
      text.slice(cursor, match.index),
      <a
        key={match.index}
        href={url.href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm text-[var(--creator-accent)] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {label}
      </a>,
    );
    cursor = match.index + label.length;
  }
  parts.push(text.slice(cursor));

  return (
    <section aria-label="Video description" className="min-w-0 pt-3">
      <p className="m-0! text-[14px]! leading-[1.7]! whitespace-pre-wrap break-words text-muted-foreground">
        {parts}
      </p>
    </section>
  );
}
