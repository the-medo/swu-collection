import { expect, test } from 'bun:test';
import { configuredAiInference } from '../../ai/releases/inference.ts';
import { releaseFixture } from './release-fixtures.ts';
import { versions } from '../../engine/model.ts';

test('private inference preserves URL prefixes, retries busy responses once, and binds returned models', async () => {
  const token = 'private-fixture-token-'.repeat(3),
    fixture = releaseFixture();
  let requests = 0,
    status = 503,
    artifact = fixture.release.artifact.sha256;
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      expect(request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      expect(new URL(request.url).pathname).toBe('/ai/choose');
      const body = await request.json();
      expect(body).toMatchObject({ releaseId: fixture.release.id, deckKey: 'krennic' });
      requests++;
      if (requests === 1) return new Response(null, { status: 503 });
      if (status !== 200) return new Response(null, { status });
      return Response.json({ action: 2, value: 0.4, releaseId: fixture.release.id, artifact });
    },
  });
  const client = configuredAiInference({
    CROSSFIRE_AI_INFERENCE_URL: `${server.url}ai`,
    CROSSFIRE_AI_INFERENCE_TOKEN: token,
  })!;
  try {
    await expect(client.choose(fixture.release, versions, 'krennic', {})).rejects.toThrow('busy');
    expect(requests).toBe(2);
    requests = 0;
    status = 200;
    // Make only the first attempt busy for recovery coverage.
    const pending = client.choose(fixture.release, versions, 'krennic', {});
    expect((await pending).action).toBe(2);
    expect(requests).toBe(2);
    artifact = 'f'.repeat(64);
    await expect(client.choose(fixture.release, versions, 'krennic', {})).rejects.toThrow();
  } finally {
    server.stop(true);
  }
});
