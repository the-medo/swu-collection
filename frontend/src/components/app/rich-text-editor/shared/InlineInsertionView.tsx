import { CardLink } from './Embeds.tsx';
import { ExternalEmbed } from './ExternalEmbed.tsx';
import { UserProfilePopover } from '@/components/app/users/UserProfilePopover.tsx';
import type { Insertion } from './model.ts';

export function InlineInsertionView({ value }: { value: Insertion }) {
  if (value.kind === 'card-link') return <CardLink card={value.card} />;
  if (value.kind === 'mention')
    return (
      <UserProfilePopover user={value.user}>
        <button
          type="button"
          className="rte-mention max-w-full box-decoration-clone rounded-md border border-primary/50 bg-primary/15 px-1.5 py-0.5 text-left align-baseline font-semibold whitespace-normal outline-offset-2 hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-ring"
        >
          @{value.user.displayName}
        </button>
      </UserProfilePopover>
    );
  return <ExternalEmbed data={JSON.stringify(value)} />;
}
