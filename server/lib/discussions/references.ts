import { inArray } from 'drizzle-orm';
import { user } from '../../db/schema/auth-schema.ts';
import type { PostDocument } from '../../../shared/posts/content.ts';
import { commentContentSchema } from '../../../shared/types/discussions.ts';
import type { CardReference } from '../../../shared/posts/widgets.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import type { DiscussionResult, DiscussionTransaction } from './policy.ts';

// Load public catalog metadata before taking a transaction connection. The
// provider may need its own connection to populate the preview cache.
export async function prepareCommentReferences(content: PostDocument) {
  const result = structuredClone(content);
  const mentions: { props: { data: string }; user: { id: string; displayName: string } }[] = [];
  const cardLinks: { props: { data: string }; card: CardReference }[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = value as Record<string, unknown>;
    if (node.type === 'swuInline') {
      const props = node.props as { data: string };
      const insertion = JSON.parse(props.data);
      if (insertion.kind === 'mention') mentions.push({ props, user: insertion.user });
      if (insertion.kind === 'card-link') cardLinks.push({ props, card: insertion.card });
    }
    Object.values(node).forEach(visit);
  };
  visit(result.blocks);
  const catalog = cardLinks.length ? await getMergedCardList() : undefined;
  return { result, mentions, cardLinks, catalog };
}

export async function canonicalCommentReferences(
  tx: DiscussionTransaction,
  references: Awaited<ReturnType<typeof prepareCommentReferences>>,
): Promise<DiscussionResult<PostDocument>> {
  const { result, mentions, cardLinks, catalog } = references;
  if (catalog) {
    for (const link of cardLinks) {
      const card = catalog[link.card.cardId];
      if (!card || (link.card.variantId && !Object.hasOwn(card.variants, link.card.variantId)))
        return {
          error: 'A referenced card or printing is unavailable. Choose another card before saving.',
          status: 400,
        };
      link.props.data = JSON.stringify({
        kind: 'card-link',
        card: { ...link.card, name: card.name },
      });
    }
  }
  if (mentions.length) {
    const users = await tx
      .select({ id: user.id, displayName: user.displayName })
      .from(user)
      .where(inArray(user.id, [...new Set(mentions.map(mention => mention.user.id))]));
    const names = new Map(users.map(row => [row.id, row.displayName]));
    for (const mention of mentions) {
      const displayName = names.get(mention.user.id);
      if (displayName === undefined)
        return {
          error: 'A mentioned user no longer exists. Remove that mention before saving.',
          status: 400,
        };
      mention.props.data = JSON.stringify({
        kind: 'mention',
        user: { id: mention.user.id, displayName },
      });
    }
  }
  const validated = commentContentSchema.safeParse(result);
  return validated.success
    ? { data: validated.data }
    : { error: 'This comment exceeds the supported content limits.', status: 400 };
}
