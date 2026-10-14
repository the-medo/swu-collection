import { z } from 'zod';
import { readMcpAuthIssuer, readMcpResourceUrl } from '../shared/mcp/config.ts';

export function readMcpConfig(env: Record<string, string | undefined>) {
  const parsed = z
    .object({
      DATABASE_URL: z.string().min(1),
      MCP_RESOURCE_URL: z.string().min(1),
      MCP_AUTH_ISSUER: z.string().min(1),
      MCP_HOST: z.string().default('127.0.0.1'),
      MCP_PORT: z.coerce.number().int().min(1).max(65_535).default(3210),
      MCP_CALLS_PER_MINUTE: z.coerce.number().int().min(1).max(1000).default(60),
      MCP_ALLOWED_ORIGINS: z.string().optional(),
    })
    .parse(env);
  const resource = readMcpResourceUrl(parsed.MCP_RESOURCE_URL);
  const issuer = readMcpAuthIssuer(parsed.MCP_AUTH_ISSUER);
  const allowedOrigins = new Set([new URL(resource).origin, new URL(issuer).origin]);
  for (const origin of parsed.MCP_ALLOWED_ORIGINS?.split(',')
    .map(value => value.trim())
    .filter(Boolean) ?? []) {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      !['https:', 'http:'].includes(url.protocol) ||
      (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    ) {
      throw new Error(
        'MCP_ALLOWED_ORIGINS must contain exact HTTPS origins (HTTP only on loopback).',
      );
    }
    allowedOrigins.add(origin);
  }
  return {
    databaseUrl: parsed.DATABASE_URL,
    resource,
    issuer,
    allowedOrigins,
    host: parsed.MCP_HOST,
    port: parsed.MCP_PORT,
    callsPerMinute: parsed.MCP_CALLS_PER_MINUTE,
  };
}

export type McpConfig = ReturnType<typeof readMcpConfig>;
