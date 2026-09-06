import { TCGCSV_HEADERS, TCGCSV_SWU_ID } from '../../../shared/consts/constants.ts';

export type TcgPlayerGroup = {
  groupId: number;
  name: string;
  abbreviation?: string | null;
};

export type TcgPlayerProduct = {
  productId: number;
  name: string;
  url?: string;
  extendedData?: { name: string; value?: string | number | null }[];
};

type TcgCsvResponse<T> = {
  results?: T[];
};

type TcgCsvFetch = typeof fetch;

async function fetchTcgCsv<T>(path: string, fetcher: TcgCsvFetch): Promise<T[]> {
  const response = await fetcher(`https://tcgcsv.com/tcgplayer/${TCGCSV_SWU_ID}/${path}`, {
    headers: TCGCSV_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`TCGCSV request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as TcgCsvResponse<T>;
  return Array.isArray(payload.results) ? payload.results : [];
}

export function fetchTcgPlayerGroups(fetcher: TcgCsvFetch = fetch) {
  return fetchTcgCsv<TcgPlayerGroup>('groups', fetcher);
}

export function fetchTcgPlayerProducts(groupId: number, fetcher: TcgCsvFetch = fetch) {
  return fetchTcgCsv<TcgPlayerProduct>(`${groupId}/products`, fetcher);
}
