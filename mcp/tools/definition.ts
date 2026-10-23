import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { ArticleActor } from '../articles/receipts.ts';
import type { MCP_RESOURCE_SCOPES } from '../../shared/mcp/config.ts';
import { toolFailure, type ToolResult } from './results.ts';

export type ToolScope = (typeof MCP_RESOURCE_SCOPES)[number];
export type ToolContext = { actor: ArticleActor; websiteOrigin: string };
export type ToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
};
export const readOnly: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
export const write: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};
export type ToolRunner = <T extends object>(
  name: string,
  work: () => Promise<{ data: T; count: number }>,
) => Promise<ToolResult<T>>;

/** The generic closure retains each tool's input/result types at registration. */
export function defineTool<
  const Name extends string,
  Shape extends z.ZodRawShape,
  Data extends object,
>(definition: {
  name: Name;
  description: string;
  inputSchema: z.ZodObject<Shape>;
  scopes: readonly ToolScope[];
  additionalScopes?: (input: z.output<z.ZodObject<Shape>>) => readonly ToolScope[];
  annotations: ToolAnnotations;
  maxInputBytes?: number;
  execute: (input: z.output<z.ZodObject<Shape>>, context: ToolContext) => Data | Promise<Data>;
  count: (data: NoInfer<Data>) => number;
}) {
  const inputSchema = definition.inputSchema.strict();
  const requiredScopes = (raw: unknown): ToolScope[] => {
    const parsed = definition.additionalScopes ? inputSchema.safeParse(raw) : undefined;
    return [
      ...new Set([
        ...definition.scopes,
        ...(parsed?.success ? definition.additionalScopes!(parsed.data) : []),
      ]),
    ];
  };
  const invoke = async (raw: unknown, context: ToolContext, run: ToolRunner) => {
    if (requiredScopes(raw).some(scope => !context.actor.scopes.includes(scope)))
      return toolFailure(
        'Reconnect to SWUBASE and approve the permissions required by this tool.',
        403,
      );
    return run(definition.name, async () => {
      const data = await definition.execute(inputSchema.parse(raw), context);
      return { data, count: definition.count(data) };
    });
  };
  return {
    ...definition,
    inputSchema,
    maxInputBytes: definition.maxInputBytes ?? 350_000,
    requiredScopes,
    invoke,
    register(server: McpServer, context: ToolContext, run: ToolRunner) {
      server.registerTool(
        definition.name,
        { description: definition.description, inputSchema, annotations: definition.annotations },
        async input => {
          const result = await invoke(input, context, run);
          // The SDK requires an index signature; type erasure is confined here.
          return {
            ...result,
            structuredContent: result.structuredContent as Record<string, unknown>,
          };
        },
      );
    },
  };
}
export type ToolOutput<T extends { execute: (...args: never[]) => unknown }> = Awaited<
  ReturnType<T['execute']>
>;
