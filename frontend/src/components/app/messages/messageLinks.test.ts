import { expect, test } from 'bun:test';
import { splitMessageLinks } from './messageLinks.ts';

test('message links preserve text, punctuation, balanced paths, query strings and fragments', () => {
  const body =
    'See https://swubase.com/decks/123?tab=cards#list,\n(https://example.com/wiki/A_(B)). Visit www.example.org!';
  const parts = splitMessageLinks(body);
  expect(parts.map(part => part.text).join('')).toBe(body);
  expect(parts.filter(part => part.href)).toEqual([
    {
      text: 'https://swubase.com/decks/123?tab=cards#list',
      href: 'https://swubase.com/decks/123?tab=cards#list',
    },
    { text: 'https://example.com/wiki/A_(B)', href: 'https://example.com/wiki/A_(B)' },
    { text: 'www.example.org', href: 'https://www.example.org/' },
  ]);
});

test('unsafe schemes, credentials and invalid URLs remain text', () => {
  const body =
    'javascript:alert(1) data:text/html,<svg/onload=alert(1)> https://user:secret@example.com http://[broken';
  const parts = splitMessageLinks(body);
  expect(parts.map(part => part.text).join('')).toBe(body);
  expect(parts.some(part => part.href)).toBe(false);
});

test('links only produce HTTP(S) destinations and leave markup as text', () => {
  const body =
    '<img src="x" onerror="alert(1)"> HTTPS://EXAMPLE.COM/a https://[::1]/x https://example.com/[a]';
  const parts = splitMessageLinks(body);
  expect(parts.map(part => part.text).join('')).toBe(body);
  expect(parts.filter(part => part.href).map(part => part.href)).toEqual([
    'https://example.com/a',
    'https://[::1]/x',
    'https://example.com/[a]',
  ]);
});
