import { eq, gte, or, sql, type SQL } from 'drizzle-orm';
import { deck } from '../../db/schema/deck.ts';

// Each request checks current grants and membership. UNION also bounds malformed cyclic trees.
export function sharedDeckFolderAccess(folderId: string | SQL, viewerId?: string) {
  const teamAccess = viewerId
    ? sql`EXISTS (
        SELECT 1 FROM team_member viewer
        WHERE viewer.team_id = share.team_id AND viewer.user_id = ${viewerId}
      )`
    : sql`false`;
  return sql<boolean>`EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id, user_id FROM deck_folder WHERE id = ${folderId}
      UNION
      SELECT parent.id, parent.parent_id, parent.user_id
      FROM deck_folder parent JOIN ancestors child
        ON parent.id = child.parent_id AND parent.user_id = child.user_id
    )
    SELECT 1 FROM ancestors ancestor JOIN deck_folder_share share
      ON share.folder_id = ancestor.id AND share.user_id = ancestor.user_id
    WHERE share.audience = 'link' OR (share.audience = 'team' AND ${teamAccess})
  )`;
}

export function deckReadAccess(viewerId?: string) {
  const folderAccess = sharedDeckFolderAccess(sql`membership.folder_id`, viewerId);
  return or(
    gte(deck.public, 1),
    viewerId ? eq(deck.userId, viewerId) : undefined,
    sql<boolean>`EXISTS (
      SELECT 1 FROM deck_folder_deck membership
      WHERE membership.deck_id = ${deck.id} AND ${folderAccess}
    )`,
  )!;
}
