export const MCP_SCOPE = 'cards:read';
export const MCP_DECK_SCOPE = 'decks:read';
export const MCP_ARTICLE_READ_SCOPE = 'articles:read';
export const MCP_ARTICLE_WRITE_SCOPE = 'articles:write';
export const MCP_ARTICLE_PUBLISH_SCOPE = 'articles:publish';
export const MCP_IMAGE_READ_SCOPE = 'images:read';
export const MCP_IMAGE_WRITE_SCOPE = 'images:write';
export const MCP_MELEE_SCOPE = 'melee:read';
export const MCP_RESOURCE_SCOPES = [
  MCP_SCOPE,
  MCP_DECK_SCOPE,
  MCP_ARTICLE_READ_SCOPE,
  MCP_ARTICLE_WRITE_SCOPE,
  MCP_ARTICLE_PUBLISH_SCOPE,
  MCP_IMAGE_READ_SCOPE,
  MCP_IMAGE_WRITE_SCOPE,
  MCP_MELEE_SCOPE,
] as const;
export const MCP_SCOPE_DESCRIPTIONS: Record<(typeof MCP_RESOURCE_SCOPES)[number], string> = {
  'cards:read': 'Search the official Star Wars Unlimited card catalog.',
  'decks:read':
    'Read your saved decks, including private decks, and decks shared with you or available by link.',
  'articles:read':
    'Read your personal articles, managed creator articles, drafts and revisions, and private pool/album names for article references.',
  'articles:write':
    'Create and edit article drafts, restore revisions, and explicitly transfer your personal articles to a creator you own.',
  'articles:publish':
    'Publish article drafts, update published articles, and unpublish articles you manage.',
  'images:read': 'Browse your uploaded image library and storage usage.',
  'images:write':
    'Upload images to your account using your storage allowance. Uploaded images are shareable.',
  'melee:read':
    'Read and refresh tournament history from your connected Melee account and prepare reports with your results.',
};
// Supported scopes; each challenge requests only the missing operation permissions.
export const MCP_AUTH_SCOPES = [...MCP_RESOURCE_SCOPES, 'offline_access'] as const;
// Start with card access and refresh support; request additional permissions on use.
export const MCP_DEFAULT_SCOPES = [MCP_SCOPE, 'offline_access'] as const;

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
