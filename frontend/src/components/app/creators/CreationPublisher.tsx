import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';
import type { Creation } from '../../../../../shared/creators/contracts.ts';
import { CreatorAvatar } from './CreatorLayout.tsx';
import { creatorLink } from './creatorStyles.ts';
import { useCreatorReturnTo } from './useCreatorReturnTo.ts';

export function CreationPublisher({
  creation,
  avatar = false,
  compact = false,
}: {
  creation: Pick<Creation, 'creator' | 'author'>;
  avatar?: boolean;
  compact?: boolean;
}) {
  const returnTo = useCreatorReturnTo();
  const identity = creation.creator ?? creation.author;
  if (!identity) return <span>Deleted user</span>;
  const content = (
    <>
      {avatar && (
        <CreatorAvatar
          name={identity.name}
          src={identity.avatarUrl ?? ''}
          className={
            compact
              ? 'size-7 rounded-full border-0 text-[10px]'
              : 'size-12 rounded-xl border-0 text-[16px]'
          }
        />
      )}
      <span className="min-w-0 break-words">{identity.name}</span>
    </>
  );
  const className = cn(
    creatorLink,
    'inline-flex min-w-0 items-center gap-3',
    avatar && !compact ? 'text-[16px] font-semibold' : 'truncate',
    compact && 'gap-2',
  );
  return creation.creator ? (
    <Link
      to="/creators/$slug"
      params={{ slug: creation.creator.slug }}
      search={{ returnTo }}
      className={className}
    >
      {content}
    </Link>
  ) : (
    <Link to="/users/$userId" params={{ userId: creation.author!.id }} className={className}>
      {content}
    </Link>
  );
}
