export type MessageTextPart = { text: string; href?: string };
const openingBracket: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

export function splitMessageLinks(body: string): MessageTextPart[] {
  const parts: MessageTextPart[] = [];
  let offset = 0;
  for (const match of body.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi)) {
    let text = match[0];
    // Keep sentence punctuation outside links, while retaining balanced URL brackets.
    const balance: Record<string, number> = { '(': 0, '[': 0, '{': 0 };
    for (const character of text) {
      if (character in balance) balance[character]++;
      else if (openingBracket[character]) balance[openingBracket[character]]--;
    }
    let end = text.length;
    while (end) {
      const last = text[end - 1];
      const opening = openingBracket[last];
      if (/[.,!?;:]/.test(last)) end--;
      else if (opening && balance[opening] < 0) {
        balance[opening]++;
        end--;
      } else break;
    }
    text = text.slice(0, end);
    try {
      const url = new URL(/^www\./i.test(text) ? `https://${text}` : text);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password
      )
        continue;
      parts.push({ text: body.slice(offset, match.index) }, { text, href: url.href });
      offset = match.index + text.length;
    } catch {
      // Invalid URLs stay ordinary, escaped React text.
    }
  }
  parts.push({ text: body.slice(offset) });
  return parts;
}
