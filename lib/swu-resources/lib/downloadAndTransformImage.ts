import { join } from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import sharp from 'sharp';
import { delay } from './delay.ts';
import { pngImagePath, webpImagePath } from '../raw-data-parser.ts';

const MAX_WEBP_DIMENSION = 419;

const curlExitHints: Record<number, string> = {
  6: 'Could not resolve the host.',
  7: 'Could not connect to the host.',
  22: 'The server returned an HTTP error response.',
  23: 'Could not write the downloaded file.',
  28: 'The request timed out.',
  35: 'The TLS/SSL connection failed.',
  56: 'The connection was reset or closed before the download finished.',
  60: 'The TLS certificate could not be verified.',
};

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function streamToText(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  return stream ? (await new Response(stream).text()).trim() : '';
}

export async function downloadAndTransformImage(
  url: string,
  filename: string,
): Promise<{ horizontal?: boolean }> {
  const pngImageFilename = join(pngImagePath, filename + '.png');
  const webpImageFilename = join(webpImagePath, filename + '.webp');
  let horizontal = false;

  try {
    if (fs.existsSync(pngImageFilename)) {
      console.log(`Image ${pngImageFilename} already exists, skipping download.`);
    } else {
      await delay(500);

      const myUrl = new URL(url);
      console.log(`Downloading image: ${myUrl}`);

      await mkdir(pngImagePath, { recursive: true });

      const curlProcess = Bun.spawn(
        [
          'curl',
          '--location',
          '--silent',
          '--show-error',
          '--fail',
          '--retry',
          '3',
          '--retry-delay',
          '1',
          '--retry-all-errors',
          '--write-out',
          '\nHTTP status: %{http_code}\nRemote IP: %{remote_ip}\nCurl error: %{errormsg}',
          myUrl.toString(),
          '--output',
          pngImageFilename,
        ],
        {
          stdout: 'pipe',
          stderr: 'pipe',
        },
      );
      const [exitCode, stdoutOutput, stderrOutput] = await Promise.all([
        curlProcess.exited,
        streamToText(curlProcess.stdout),
        streamToText(curlProcess.stderr),
      ]);

      if (exitCode !== 0) {
        if (fs.existsSync(pngImageFilename)) {
          fs.rmSync(pngImageFilename, { force: true });
        }

        const details = [stderrOutput, stdoutOutput].filter(Boolean).join('\n');
        const hint = curlExitHints[exitCode];
        throw new Error(
          [
            `Download failed for ${myUrl.toString()}`,
            `Output: ${pngImageFilename}`,
            `curl exit code: ${exitCode}${hint ? ` (${hint})` : ''}`,
            details || 'curl did not return any diagnostic output.',
          ].join('\n'),
        );
      }

      console.log(`Image downloaded successfully to ${pngImageFilename}`);
    }
    const metadata = await sharp(pngImageFilename).metadata();
    horizontal = (metadata.width || 0) > (metadata.height || 0);

    await mkdir(webpImagePath, { recursive: true });

    await sharp(pngImageFilename)
      .resize({
        width: MAX_WEBP_DIMENSION,
        height: MAX_WEBP_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(webpImageFilename);

    console.log(`Image transformed successfully to ${webpImageFilename}`);
  } catch (error) {
    throw new Error(`Error downloading and transforming image ${url}: ${formatError(error)}`);
  }

  return { horizontal };
}
