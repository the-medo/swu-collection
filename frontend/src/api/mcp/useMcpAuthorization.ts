import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { mcpAuthorizationResponse } from '../../../../shared/mcp/authorization.ts';

export function useMcpAuthorization(userId: string | undefined, oauthQuery: string) {
  const request = useMemo(() => ({ query: oauthQuery, id: crypto.randomUUID() }), [oauthQuery]);
  return useQuery({
    // Do not put the signed OAuth request (which contains state) in cache keys.
    queryKey: ['mcp-authorization', userId, request.id],
    queryFn: async () => {
      const response = await api.mcp.authorization.$get({ query: { oauth_query: request.query } });
      if (!response.ok)
        throw await createApiError(response, 'Unable to read the MCP access request.');
      return mcpAuthorizationResponse.parse(await response.json()).data;
    },
    enabled: Boolean(userId && oauthQuery),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
