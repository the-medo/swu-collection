import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { getAuthEmailConfig } from './config.ts';
import { openEmail, recipientHash, sealEmail } from './crypto.ts';
import { renderAuthEmail } from './template.ts';
import { safeAuthReturnTo } from '../../../shared/auth.ts';
import { requestLogger } from '../ws/requestLogger.ts';
import { runInNewContext } from 'node:vm';

test('email delivery is opt-in, capture is local only, and production requires explicit credentials and HTTPS', () => {
  expect(getAuthEmailConfig({}).enabled).toBe(false);
  const local = {
    ENVIRONMENT: 'local',
    AUTH_EMAIL_MODE: 'capture',
    BETTER_AUTH_URL: 'http://localhost:5173',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
  };
  expect(getAuthEmailConfig(local).enabled).toBe(true);
  expect(() => getAuthEmailConfig({ ...local, ENVIRONMENT: 'production' })).toThrow();
  expect(() => getAuthEmailConfig({ ...local, AUTH_EMAIL_MODE: 'resend' })).toThrow();
  expect(() =>
    getAuthEmailConfig({
      ...local,
      AUTH_EMAIL_MODE: 'resend',
      RESEND_API_KEY: 'test',
      AUTH_EMAIL_FROM: 'test@invalid.local',
    }),
  ).toThrow();
  expect(() => getAuthEmailConfig({ ...local, BETTER_AUTH_SECRET: '' })).toThrow();
});

test('queued recipients and action URLs are authenticated and encrypted', () => {
  const original = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = 'local-test-only-'.repeat(4);
  try {
    const value = {
      to: 'private@invalid.local',
      url: 'https://swubase.invalid/auth/reset-password?token=secret',
    };
    const sealed = sealEmail(value);
    expect(sealed).not.toContain(value.to);
    expect(openEmail(sealed)).toEqual(value);
    expect(sealEmail(value)).not.toBe(sealed);
    const tampered = Buffer.from(sealed, 'base64');
    tampered[tampered.length - 1] ^= 1;
    expect(() => openEmail(tampered.toString('base64'))).toThrow();
    expect(recipientHash(' Private@invalid.local ')).toBe(recipientHash(value.to));
    process.env.BETTER_AUTH_SECRET = 'different-test-key-'.repeat(4);
    expect(() => openEmail(sealed)).toThrow();
  } finally {
    if (original === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = original;
  }
});

test('mail has a text alternative, embedded artwork and escaped action URLs', () => {
  const mail = renderAuthEmail({
    to: 'test@invalid.local',
    kind: 'verification',
    url: 'https://swubase.invalid/api/auth/verify-email?token=x&callbackURL="unsafe"',
  });
  expect(mail.html).toContain('cid:swubase-header');
  expect(mail.html).toContain('&amp;callbackURL=&quot;unsafe&quot;');
  expect(mail.html).not.toContain('<img src="https://');
  expect(mail.text).toContain('Verify email & set password: https://');
});

test('return destinations reject external URLs and token-bearing auth routes', () => {
  for (const value of [
    undefined,
    '//evil.invalid',
    '/\\evil.invalid',
    'https://evil.invalid',
    '/auth/reset-password?token=x',
    '/api/auth/verify-email',
    '/decks/../auth/reset-password',
    '/\n/evil.invalid',
  ]) {
    expect(safeAuthReturnTo(value)).toBe('/');
  }
  expect(safeAuthReturnTo('/decks?view=grid#saved')).toBe('/decks?view=grid#saved');
});

test('request logs omit auth tokens in paths and queries, including failed requests', async () => {
  const messages: string[] = [];
  const app = new Hono()
    .use('*', requestLogger({ print: message => messages.push(message) }))
    .all('*', c => c.text('invalid', 400));
  await app.request('/api/auth/reset-password/private-path-token?callbackURL=private-query');
  await app.request('/auth/reset-password?token=private-token');
  expect(messages).toEqual(['[auth] GET 400', '[auth] GET 400']);
});

test('analytics stays off on auth landing pages and drops private form and token URL events', async () => {
  const html = await Bun.file(new URL('../../../frontend/index.html', import.meta.url)).text();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
  const scripts: { onload: () => void }[] = [];
  let privateForm = false;
  let plugin: { execute: (event: unknown) => Promise<unknown> };
  let options: unknown;
  const sandbox = {
    location: { hostname: 'swubase.invalid', pathname: '/auth/reset-password' },
    document: {
      createElement: () => ({}),
      head: { appendChild: (script: { onload: () => void }) => scripts.push(script) },
      querySelector: () => privateForm,
    },
    window: {
      amplitude: {
        add: (value: typeof plugin) => {
          plugin = value;
        },
        init: (_key: string, value: unknown) => {
          options = value;
        },
      },
    },
  };
  runInNewContext(script, sandbox);
  expect(scripts).toHaveLength(0);
  sandbox.location.pathname = '/';
  runInNewContext(script, sandbox);
  expect(scripts).toHaveLength(1);
  scripts[0].onload();
  expect(options).toEqual({ fetchRemoteConfig: true, autocapture: true });
  const publicEvent = {
    event_type: 'pageview',
    event_properties: { url: 'https://swubase.invalid/decks' },
  };
  expect(await plugin!.execute(publicEvent)).toEqual(publicEvent);
  expect(
    await plugin!.execute({
      event_properties: { url: 'https://swubase.invalid/auth/reset-password?token=private' },
    }),
  ).toBeUndefined();
  privateForm = true;
  expect(await plugin!.execute(publicEvent)).toBeUndefined();
  privateForm = false;
  sandbox.location.pathname = '/auth/verify';
  expect(await plugin!.execute(publicEvent)).toBeUndefined();
});
