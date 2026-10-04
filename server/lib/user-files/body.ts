import { maxUserFileBytes } from '../../../types/UserFile.ts';
import { UserFileError } from './errors.ts';

// Bound both streamed bytes and elapsed time, even when Content-Length is absent
// or a client keeps the connection alive by trickling data. Cancel before releasing admission.
export async function readUserFileBody(request: Request, timeoutMs = 60_000): Promise<ArrayBuffer> {
  const maxBytes = maxUserFileBytes + 64 * 1024;
  if (Number(request.headers.get('Content-Length')) > maxBytes) {
    void request.body?.cancel().catch(() => {});
    throw new UserFileError('Images must be 10 MB or smaller.', 413);
  }
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  let expired = false;
  let finished = false;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      void reader.cancel().catch(() => {});
      reject(new UserFileError('The upload took too long. Please try again.', 408));
    }, timeoutMs);
  });
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (expired) throw new UserFileError('The upload took too long. Please try again.', 408);
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new UserFileError('Images must be 10 MB or smaller.', 413);
      chunks.push(value);
    }
    finished = true;
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes.buffer;
  } catch (error) {
    if (error instanceof UserFileError) throw error;
    throw new UserFileError('The upload was interrupted. Please try again.', 400);
  } finally {
    clearTimeout(timer!);
    if (!finished) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
