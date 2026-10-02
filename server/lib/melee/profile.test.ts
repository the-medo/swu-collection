import { describe, expect, test } from 'bun:test';
import { meleeChallengeInputSchema } from '../../../shared/lib/meleeConnection.ts';
import { bioContainsCode, fetchMeleeProfile, parseMeleeProfile } from './profile.ts';

// Minimal fixture preserving the structure of public Melee profiles inspected
// on 2026-10-02, without retaining another player's personal information.
const id = '12345678-1234-4123-8123-123456789012';
const code = 'SWUBASE-' + 'a'.repeat(48);
const html = (bio = '', extra = '') => `
  <input id="User_UserName" value="Example" />
  <div class="profile-details"><div>
    <span class="mr-1">Example &amp; Player</span>
    <a class="social-link" href="https://example.com">Social</a>
    <div><span class="text-muted">Example</span><span>They/Them</span></div>
    ${bio ? `<div style="max-width: 75%">${bio}</div>` : ''}
  </div></div>
  <div class="profile-button-column"><img src="https://cdn.melee.gg/userphotos/userprofiles/${id}.jpg?v=0" /></div>
  ${extra}`;

describe('Melee public profile verification', () => {
  test('extracts identity and decoded bio, with case-insensitive username matching', () => {
    expect(parseMeleeProfile(html(`Hello &amp; welcome!\n${code}`), 'example')).toEqual({
      meleeUserId: id,
      username: 'Example',
      displayName: 'Example & Player',
      bio: `Hello & welcome!\n${code}`,
    });
    expect(parseMeleeProfile(html(), 'Example').bio).toBe('');
    expect(
      bioContainsCode(parseMeleeProfile(html(`Hello<br>${code}<br>Thanks`), 'Example').bio, code),
    ).toBe(true);
  });
  test('only accepts a complete code in bio text, never elsewhere on the page', () => {
    expect(bioContainsCode('', '')).toBe(false);
    expect(bioContainsCode(`Hello\n${code}\nThanks`, code)).toBe(true);
    for (const value of [code + 'b', 'x' + code, code.toLowerCase()])
      expect(bioContainsCode(value, code)).toBe(false);
    expect(
      bioContainsCode(
        parseMeleeProfile(html('No proof', `<script>${code}</script><p>${code}</p>`), 'example')
          .bio,
        code,
      ),
    ).toBe(false);
    expect(
      bioContainsCode(parseMeleeProfile(html(`<script>${code}</script>`), 'example').bio, code),
    ).toBe(false);
  });
  test('rejects wrong users, login/block pages, and malformed identity markup', () => {
    for (const [body, username] of [
      [html(code), 'someone-else'],
      ['<h1>Sign in</h1>', 'Example'],
      [html(code).replace(id, 'unknown'), 'Example'],
      [html(code).replace('cdn.melee.gg', 'attacker.test'), 'Example'],
    ])
      expect(() => parseMeleeProfile(body!, username!)).toThrow();
  });
  test('rejects supplied URLs and path traversal before fetching', () => {
    for (const username of [
      'https://melee.gg/Profile/Index/example',
      '../Account',
      'abc/def',
      'a?b',
      'a#b',
      '',
    ]) {
      expect(meleeChallengeInputSchema.safeParse({ username }).success).toBe(false);
    }
    expect(meleeChallengeInputSchema.parse({ username: ' Example ' }).username).toBe('Example');
  });
  test('fetches only the fixed public origin with no redirects or credentials', async () => {
    const fetcher = (async (url: string, options: RequestInit) => {
      expect(url).toBe('https://melee.gg/Profile/Index/Example');
      expect(options.redirect).toBe('error');
      expect(options.headers).not.toHaveProperty('Cookie');
      return new Response(html(code), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }) as typeof fetch;
    expect((await fetchMeleeProfile('Example', fetcher)).bio).toBe(code);
  });
  test('maps missing, blocked, timed out, and oversized responses to safe errors', async () => {
    for (const response of [
      new Response('', { status: 404 }),
      new Response('', { status: 403 }),
      new Response('{}'),
      new Response('x'.repeat(1_000_001), { headers: { 'Content-Type': 'text/html' } }),
    ]) {
      await expect(
        fetchMeleeProfile('Example', (async () => response) as typeof fetch),
      ).rejects.toThrow();
    }
    await expect(
      fetchMeleeProfile('Example', (async () => {
        throw new Error('private upstream details');
      }) as unknown as typeof fetch),
    ).rejects.toThrow('Could not read your Melee profile');
  });
});
