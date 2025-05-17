import { getTournamentMetaTags, getDeckMetaTags } from './metaTagsFetchers';

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
  // Add more route patterns as needed
];

export async function matchRouteAndFetchMetaTags(path: string): Promise<Record<string, string> | null> {
  for (const route of routes) {
    const matches = path.match(route.pattern);
    if (matches) {
      const param = route.getParams(matches);
      return await route.fetcher(param);
    }
  }
  return null;
}