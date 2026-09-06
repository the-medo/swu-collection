import { describe, expect, test } from 'bun:test';
import { TCGCSV_HEADERS, TCGCSV_SWU_ID } from '../../../shared/consts/constants.ts';
import { fetchTcgPlayerGroups, fetchTcgPlayerProducts } from './tcgcsv.ts';

describe('TCGCSV card-price client', () => {
  test('fetches groups with the required headers', async () => {
    const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      calls.push({ input, init });
      return Response.json({ results: [{ groupId: 42, name: 'Test set' }] });
    };

    await expect(fetchTcgPlayerGroups(fetcher)).resolves.toEqual([
      { groupId: 42, name: 'Test set' },
    ]);
    expect(calls).toEqual([
      {
        input: `https://tcgcsv.com/tcgplayer/${TCGCSV_SWU_ID}/groups`,
        init: { headers: TCGCSV_HEADERS },
      },
    ]);
  });

  test('fetches products for the requested group', async () => {
    const urls: string[] = [];
    const fetcher: typeof fetch = async input => {
      urls.push(String(input));
      return Response.json({ results: [{ productId: 7, name: 'Test card' }] });
    };

    await expect(fetchTcgPlayerProducts(99, fetcher)).resolves.toEqual([
      { productId: 7, name: 'Test card' },
    ]);
    expect(urls).toEqual([`https://tcgcsv.com/tcgplayer/${TCGCSV_SWU_ID}/99/products`]);
  });

  test('rejects unsuccessful upstream responses', async () => {
    const fetcher: typeof fetch = async () => new Response(null, { status: 503 });

    await expect(fetchTcgPlayerGroups(fetcher)).rejects.toThrow('TCGCSV request failed: 503');
  });
});
