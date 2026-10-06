import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import McpLogin from '@/components/app/mcp/McpLogin.tsx';

export const Route = createFileRoute('/mcp/login')({
  component: McpLogin,
  // Keep the provider's signed OAuth query through router navigation.
  validateSearch: z.object({}).passthrough(),
});
