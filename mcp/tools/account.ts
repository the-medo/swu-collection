import { MCP_SCOPE, MCP_USAGE_READ_SCOPE } from '../../shared/mcp/config.ts';
import { mcpAccessInput, mcpUsageInput, type AccountRepository } from '../account.ts';
import { defineTool, readOnly } from './definition.ts';

export function createAccountTools(account: AccountRepository) {
  return [
    defineTool({
      name: 'get_my_mcp_access',
      description:
        'Show this connection’s effective consent scopes, account display name, client ID and rolling per-user call budget shared across clients. Scope access remains subject to ownership/membership and resource state. Works with the default cards:read permission; it does not expose credentials or other client sessions. This call itself consumes the ordinary tool-call budget.',
      inputSchema: mcpAccessInput,
      scopes: [MCP_SCOPE],
      annotations: readOnly,
      execute: (_input, { actor }) => account.access(actor),
      count: () => 1,
    }),
    defineTool({
      name: 'get_my_mcp_usage',
      description:
        'Summarize your admitted MCP calls over the last 1–90 days (default 7), grouped by tool, client or UTC day. Default: current client; clients:all includes your activity across agent clients. Optional exact tool-name filter and bounded group pagination. Totals include all matching groups, success/error/unfinished counts, result counts and server durations. No prompts, tokens or billing data. Requires usage:read consent; this call is metered too.',
      inputSchema: mcpUsageInput,
      scopes: [MCP_USAGE_READ_SCOPE],
      annotations: readOnly,
      execute: (input, { actor }) => account.usage(actor, input),
      count: data => data.groups.length,
    }),
  ] as const;
}
