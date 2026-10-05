import { z } from 'zod';

export const mcpAuthorizationQuery = z.object({ oauth_query: z.string().min(1).max(16_384) });
export const mcpAuthorizationResponse = z.object({
  data: z.object({
    clientId: z.string(),
    clientName: z.string(),
    redirectTarget: z.string(),
    scopes: z.array(z.string()),
  }),
});
