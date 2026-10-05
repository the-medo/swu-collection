export const MCP_SCOPE = 'cards:read';
// offline_access is an authorization-server scope, advertised in the challenge
// so discovery-driven clients also request a refresh token.
export const MCP_AUTH_SCOPES = [MCP_SCOPE, 'offline_access'] as const;

function secureUrl(value: string, name: string): URL {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} must use HTTPS (HTTP is allowed on loopback), without credentials, a query or a fragment.`,
    );
  }
  return url;
}

export function readMcpResourceUrl(value: string): string {
  const url = secureUrl(value, 'MCP_RESOURCE_URL');
  if (url.pathname !== '/mcp') throw new Error('MCP_RESOURCE_URL must end in /mcp.');
  return url.href;
}

export function readMcpAuthIssuer(value: string): string {
  const url = secureUrl(value, 'MCP_AUTH_ISSUER');
  if (url.pathname !== '/api/auth') throw new Error('MCP_AUTH_ISSUER must end in /api/auth.');
  return url.href;
}
