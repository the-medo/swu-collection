import { expect, test } from 'bun:test';
import { isSensitiveMcpUrl } from './mcpPrivacy.ts';

test('OAuth pages and API breadcrumbs are private while public card and discovery URLs remain observable', () => {
  for (const url of [
    'https://swubase.com/mcp/consent?state=private-state&sig=private-signature',
    'http://localhost:5176/mcp/login?client_id=fixture',
    '/api/mcp/authorization?oauth_query=private-query',
    '/api/auth/oauth2/token',
  ])
    expect(isSensitiveMcpUrl(url)).toBe(true);
  for (const url of [
    undefined,
    '/cards/search',
    'https://swubase.com/decks/public',
    '/.well-known/oauth-authorization-server/api/auth',
  ]) {
    expect(isSensitiveMcpUrl(url)).toBe(false);
  }
});
