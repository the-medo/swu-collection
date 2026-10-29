import { defaultParseSearch, Link } from '@tanstack/react-router';
import { creatorReturnToSchema } from './creatorNavigationSearch.ts';
import { creatorLink } from './creatorStyles.ts';

export function CreatorBackLink({
  returnTo,
  fallback = 'content',
}: {
  returnTo?: string;
  fallback?: 'content' | 'creators';
}) {
  const destination = creatorReturnToSchema.parse(returnTo);
  const url = new URL(destination ?? `/${fallback}`, 'https://swubase.invalid');
  return (
    <Link
      to={url.pathname}
      search={defaultParseSearch(url.search)}
      state={{ creatorRestoreScroll: !!destination }}
      className={`${creatorLink} inline-flex items-center gap-2`}
    >
      {destination
        ? '← Back to results'
        : fallback === 'creators'
          ? '← Meet the creators'
          : '← Discover content'}
    </Link>
  );
}
