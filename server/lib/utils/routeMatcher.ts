import { 
  getTournamentMetaTags, 
  getDeckMetaTags, 
  getMetaMetaTags, 
  getCardDetailMetaTags,
  getCollectionMetaTags,
  getComparerMetaTags,
  getSearchMetaTags,
  getUserProfileMetaTags,
  getToolsMetaTags,
  getDeckFormatConverterMetaTags,
  getAboutMetaTags,
  getPrivacyMetaTags,
  getTermsMetaTags,
  getDefaultMetaTags
} from './metaTagsFetchers';

type MetaTagsFetcher = (id: string) => Promise<Record<string, string> | null>;

interface RoutePattern {
  pattern: RegExp;
  fetcher: MetaTagsFetcher;
  getParams: (matches: RegExpMatchArray) => string;
}

const routes: RoutePattern[] = [
  {
    pattern: /^\/tournaments\/([^\/]+)(?:\/.*)?$/,
    fetcher: getTournamentMetaTags,
    getParams: (matches) => matches[1],
  },
  {
    pattern: /^\/decks\/([^\/]+)(?:\/.*)?$/,
    fetcher: getDeckMetaTags,
    getParams: (matches) => matches[1],
  },
  {
    pattern: /^\/cards\/detail\/([^\/]+)$/,
    fetcher: getCardDetailMetaTags,
    getParams: (matches) => matches[1],
  },
  {
    pattern: /^\/collections\/([^\/]+)(?:\/.*)?$/,
    fetcher: getCollectionMetaTags,
    getParams: (matches) => matches[1],
  },
  {
    pattern: /^\/users\/([^\/]+)(?:\/.*)?$/,
    fetcher: getUserProfileMetaTags,
    getParams: (matches) => matches[1],
  },
  // Static routes (no parameters)
  {
    pattern: /^\/comparer\/?$/,
    fetcher: async () => getComparerMetaTags(),
    getParams: () => '',
  },
  {
    pattern: /^\/cards\/search\/?$/,
    fetcher: async () => getSearchMetaTags(),
    getParams: () => '',
  },
  {
    pattern: /^\/tools\/?$/,
    fetcher: async () => getToolsMetaTags(),
    getParams: () => '',
  },
  {
    pattern: /^\/tools\/deck-format-converter\/?$/,
    fetcher: async () => getDeckFormatConverterMetaTags(),
    getParams: () => '',
  },
  {
    pattern: /^\/about\/?$/,
    fetcher: async () => getAboutMetaTags(),
    getParams: () => '',
  },
  {
    pattern: /^\/privacy\/?$/,
    fetcher: async () => getPrivacyMetaTags(),
    getParams: () => '',
  },
  {
    pattern: /^\/terms\/?$/,
    fetcher: async () => getTermsMetaTags(),
    getParams: () => '',
  },
];

export async function matchRouteAndFetchMetaTags(
  path: string, 
  searchParams?: URLSearchParams
): Promise<Record<string, string> | null> {
  // Special case for tournament deck pages with maDeckId
  const tournamentDeckMatches = path.match(/^\/tournaments\/([^\/]+)\/decks\/?$/);
  if (tournamentDeckMatches && searchParams && searchParams.has('maDeckId')) {
    const deckId = searchParams.get('maDeckId');
    if (deckId) {
      return await getDeckMetaTags(deckId);
    }
  }

  // Special case for meta pages
  if (path === '/meta' && searchParams) {
    // If it's the decks page with maDeckId, show deck meta tags
    if (searchParams.get('page') === 'decks' && searchParams.has('maDeckId')) {
      const deckId = searchParams.get('maDeckId');
      if (deckId) {
        return await getDeckMetaTags(deckId);
      }
    }

    // Otherwise, show meta meta tags
    const metaId = searchParams.get('metaId') || undefined;
    const page = searchParams.get('page') || 'meta';
    return await getMetaMetaTags(metaId, page);
  }

  // Regular route matching
  for (const route of routes) {
    const matches = path.match(route.pattern);
    if (matches) {
      const param = route.getParams(matches);
      return await route.fetcher(param);
    }
  }

  // If no specific meta tags were found, return default meta tags
  return getDefaultMetaTags();
}
