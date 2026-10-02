import { parseHTML } from 'linkedom';
import { meleeProfileUrl } from '../../../shared/lib/meleeConnection.ts';

export class MeleeConnectionError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409 | 429 | 502 = 400,
  ) {
    super(message);
  }
}

export type MeleeProfile = {
  meleeUserId: string;
  username: string;
  displayName: string;
  bio: string;
};

// Based on the public profile markup, inspected 2026-10-02.
// Fail closed if Melee changes its layout; never search the whole page for proof.
export function parseMeleeProfile(html: string, expectedUsername: string): MeleeProfile {
  const { document } = parseHTML(html);
  const username = document.querySelector('#User_UserName')?.getAttribute('value')?.trim();
  const details = document.querySelector('.profile-details > div');
  const displayName = details?.querySelector(':scope > span')?.textContent?.trim();
  const photo = document.querySelector('.profile-button-column > img')?.getAttribute('src');
  // Melee's profile-photo path contains the account UUID, including for accounts
  // whose photo falls back to the default image in the browser.
  const meleeUserId = photo
    ?.match(
      /^https:\/\/cdn\.melee\.gg\/userphotos\/userprofiles\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg(?:\?[^#]*)?$/i,
    )?.[1]
    ?.toLowerCase();
  if (
    !username ||
    username.toLowerCase() !== expectedUsername.toLowerCase() ||
    !displayName ||
    displayName.length > 250 ||
    !meleeUserId
  ) {
    throw new MeleeConnectionError(
      'Melee returned an unrecognized profile. Check your username or try again later.',
      502,
    );
  }
  const bioElements = Array.from(details!.children).filter(
    element =>
      element.tagName === 'DIV' && /max-width\s*:\s*75%/i.test(element.getAttribute('style') ?? ''),
  );
  if (bioElements.length > 1) {
    throw new MeleeConnectionError(
      'Melee returned an unrecognized profile. Please try again later.',
      502,
    );
  }
  const bioElement = bioElements[0];
  bioElement?.querySelectorAll('script, style, template').forEach(element => element.remove());
  bioElement?.querySelectorAll('br').forEach(element => element.replaceWith('\n'));
  return { meleeUserId, username, displayName, bio: bioElement?.textContent?.trim() ?? '' };
}

export function bioContainsCode(bio: string, code: string): boolean {
  return code.length > 0 && bio.split(/\s+/u).includes(code);
}

export async function fetchMeleeProfile(
  username: string,
  fetcher: typeof fetch = fetch,
): Promise<MeleeProfile> {
  try {
    const response = await fetcher(meleeProfileUrl(username), {
      // No supplied URLs, cookies or redirects: this can only read Melee profiles.
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        // As with the tournament importer, Melee requires a browser user agent.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      },
    });
    if (response.status === 404)
      throw new MeleeConnectionError('Melee profile not found. Check your username.', 404);
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
      throw new MeleeConnectionError(
        'Melee is unavailable or blocked the request. Please try again later.',
        502,
      );
    }
    const reader = response.body?.getReader();
    if (!reader) throw new MeleeConnectionError('Melee returned an empty response.', 502);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1_000_000)
          throw new MeleeConnectionError('Melee returned an oversized response.', 502);
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return parseMeleeProfile(Buffer.concat(chunks).toString('utf8'), username);
  } catch (error) {
    if (error instanceof MeleeConnectionError) throw error;
    throw new MeleeConnectionError(
      'Could not read your Melee profile. Please try again later.',
      502,
    );
  }
}
