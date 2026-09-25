import { createInterface } from 'node:readline';
import { z } from 'zod';
import { rotationEnvironment, rotationManifest, rotationRows } from './rotation-curriculum.ts';
const request = z.discriminatedUnion('op', [
  z.strictObject({ id: z.number().int(), op: z.literal('hello') }),
  z.strictObject({ id: z.number().int(), op: z.literal('catalogue') }),
  z.strictObject({ id: z.number().int(), op: z.literal('case'), caseId: z.string().max(100) }),
]);
if (import.meta.main)
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    let id: number | null = null;
    let response: string;
    try {
      if (Buffer.byteLength(line) > 65536) throw new Error('Request too large');
      const r = request.parse(JSON.parse(line));
      id = r.id;
      const data =
        r.op === 'hello'
          ? rotationEnvironment.contract
          : r.op === 'catalogue'
            ? rotationManifest
            : rotationRows(r.caseId);
      response = JSON.stringify({ id, ok: true, data });
      if (Buffer.byteLength(response) > 32_000_000)
        throw new Error('Practice response exceeds budget');
    } catch (error) {
      response = JSON.stringify({
        id,
        ok: false,
        error: error instanceof Error ? error.message : 'Practice request failed',
      });
    }
    await new Promise<void>((resolve, reject) =>
      process.stdout.write(`${response}\n`, e => (e ? reject(e) : resolve())),
    );
  }
