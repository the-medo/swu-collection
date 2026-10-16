import { Link } from '@tanstack/react-router';
import type { Creation } from '../../../../../shared/creators/contracts.ts';
import { CreatorAvatar } from './CreatorLayout.tsx';
import { creatorLink } from './creatorStyles.ts';

export function CreationPublisher({
  creation,
  avatar = false,
}: {
  creation: Pick<Creation, 'creator' | 'author'>;
  avatar?: boolean;
}) {
  const identity = creation.creator ?? creation.author;
  if (!identity) return <span>Deleted user</span>;
  const content = (
    <>
      {avatar && (
        <CreatorAvatar
          name={identity.name}
          src={identity.avatarUrl ?? ''}
          className="size-12 rounded-xl border-0 text-[16px]"
        />
      )}
      <span className="min-w-0 break-words">{identity.name}</span>
    </>
  );
  const className = `${creatorLink} inline-flex min-w-0 items-center gap-3 ${avatar ? 'text-[16px] font-semibold' : 'truncate'}`;
  return creation.creator ? (
    <Link to="/creators/$slug" params={{ slug: creation.creator.slug }} className={className}>
      {content}
    </Link>
  ) : (
    <Link to="/users/$userId" params={{ userId: creation.author!.id }} className={className}>
      {content}
    </Link>
  );
}
