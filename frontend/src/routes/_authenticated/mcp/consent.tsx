import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import McpConsent from '@/components/app/mcp/McpConsent.tsx';

export const Route = createFileRoute('/_authenticated/mcp/consent')({
  component: McpConsent,
  validateSearch: z.object({}).passthrough(),
});
