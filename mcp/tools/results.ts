import { z } from 'zod';
import { CreatorError } from '../../server/lib/creators/errors.ts';
import { MeleeConnectionError } from '../../server/lib/melee/profile.ts';
import { UserFileError } from '../../server/lib/user-files/errors.ts';
import { ProfanityError } from '../../server/lib/moderation/content.ts';

export type ToolErrorCode =
  | 'invalid_request'
  | 'validation_error'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'too_large'
  | 'timeout'
  | 'unavailable';
export type ToolErrorData = {
  code: ToolErrorCode;
  status: number;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  issues?: { path: string; message: string }[];
};
type ToolContent<T extends object> = {
  content: { type: 'text'; text: string }[];
  structuredContent: T;
};
export type ToolSuccess<T extends object> = ToolContent<T> & { isError?: false };
export type ToolErrorResult = ToolContent<ToolErrorData> & { isError: true };
export type ToolResult<T extends object> = ToolSuccess<T> | ToolErrorResult;

const errorCodes: Readonly<Partial<Record<number, ToolErrorCode>>> = {
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  408: 'timeout',
  409: 'conflict',
  413: 'too_large',
  429: 'rate_limited',
  504: 'timeout',
};

export class ToolFailure extends Error {
  constructor(
    message: string,
    public status = 400,
    public retryAfterSeconds?: number,
  ) {
    super(message);
  }
}
export function toolFailure(
  message: string,
  status: number,
  retryAfterSeconds?: number,
): ToolErrorResult {
  const code = errorCodes[status] ?? (status >= 500 ? 'unavailable' : 'invalid_request');
  const data: ToolErrorData = {
    code,
    status,
    message,
    retryable: status === 408 || status === 429 || status >= 500,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
  return { isError: true, content: [{ type: 'text', text: message }], structuredContent: data };
}
export function toolException(error: unknown): ToolErrorResult {
  if (error instanceof ToolFailure)
    return toolFailure(error.message, error.status, error.retryAfterSeconds);
  if (
    error instanceof CreatorError ||
    error instanceof MeleeConnectionError ||
    error instanceof UserFileError ||
    error instanceof ProfanityError
  )
    return toolFailure(error.message, error.status);
  if (error instanceof z.ZodError) {
    const issues = error.issues
      .slice(0, 10)
      .map(issue => ({ path: issue.path.join('.'), message: issue.message }));
    const message =
      'Invalid tool input: ' + issues.map(issue => `${issue.path}: ${issue.message}`).join('; ');
    const result = toolFailure(message, 400);
    return {
      ...result,
      structuredContent: { ...result.structuredContent, code: 'validation_error', issues },
    };
  }
  // Never expose/log SQL, upstream responses, credentials or submitted content.
  console.error('[mcp] Tool execution failed.');
  return toolFailure('The tool is temporarily unavailable. Please retry later.', 503);
}
export function toolSuccess<T extends object>(data: T): ToolSuccess<T> {
  const text = JSON.stringify(data);
  if (Buffer.byteLength(text) > 700_000)
    throw new ToolFailure(
      'Result is too large. Use smaller pages, selected template sections, or outline format.',
      413,
    );
  return { content: [{ type: 'text', text }], structuredContent: data };
}
