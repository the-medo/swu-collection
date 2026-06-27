import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { db } from '../../../../../../db';
import { deck as deckTable } from '../../../../../../db/schema/deck.ts';
import { deckBranch } from '../../../../../../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../../../../../../db/schema/deck_change_request.ts';
import { deckChangeRequestEvent } from '../../../../../../db/schema/deck_change_request_event.ts';
import { getTeamMembership } from '../../../../../../lib/getTeamMembership.ts';
import {
  applyDeckSnapshot,
  getDeckSnapshot,
} from '../../../../../../lib/decks/deckBranchSnapshot.ts';
import {
  buildMergedDeckSnapshot,
  diffDeckSnapshots,
  findDeckMergeConflicts,
  shouldMergeDeckField,
  type DeckMergeFieldPolicy,
} from '../../../../../../lib/decks/deckBranchDiff.ts';
import { isAdminUser } from '../../../../../../lib/decks/deckBranchAccess.ts';
import { updateDeckInformation } from '../../../../../../lib/decks/updateDeckInformation.ts';
import { generateDeckThumbnail } from '../../../../../../lib/decks/generateDeckThumbnail.ts';
import { runInBackground } from '../../../../../../lib/utils/backgroundProcess.ts';
import { zDeckChangeRequestMergeRequest } from '../../../../../../../types/ZDeckBranch.ts';

export const teamsIdChangeRequestsRequestIdMergePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckChangeRequestMergeRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.guid().parse(c.req.param('id'));
    const requestId = z.guid().parse(c.req.param('requestId'));
    const data = c.req.valid('json');

    const membership = await getTeamMembership(teamId, user.id);
    if (!membership) {
      return c.json({ message: 'You must be a team member to merge change requests' }, 403);
    }

    const [row] = await db
      .select({
        changeRequest: deckChangeRequest,
        branch: deckBranch,
        baseDeck: deckTable,
      })
      .from(deckChangeRequest)
      .innerJoin(deckBranch, eq(deckChangeRequest.branchId, deckBranch.id))
      .innerJoin(deckTable, eq(deckChangeRequest.baseDeckId, deckTable.id))
      .where(and(eq(deckChangeRequest.id, requestId), eq(deckChangeRequest.teamId, teamId)))
      .limit(1);

    if (!row) return c.json({ message: 'Change request not found' }, 404);
    if (row.changeRequest.status !== 'open') {
      return c.json({ message: 'Change request is not open' }, 400);
    }

    const isAdmin = await isAdminUser(user.id);
    if (!isAdmin && row.baseDeck.userId !== user.id) {
      return c.json({ message: 'Only the original deck creator can merge this request' }, 403);
    }

    const branchSnapshot = await getDeckSnapshot(row.branch.branchDeckId);
    const currentBaseSnapshot = await getDeckSnapshot(row.branch.baseDeckId);
    if (!branchSnapshot || !currentBaseSnapshot) return c.json({ message: 'Deck not found' }, 404);

    const conflicts = findDeckMergeConflicts(
      row.branch.baseSnapshot,
      currentBaseSnapshot,
      branchSnapshot,
    );
    const mergeDeckFields: DeckMergeFieldPolicy = {
      name: data.mergeDeckFields.name === true,
      description: data.mergeDeckFields.description === true,
    };
    const resolvedKeys = new Set(
      data.resolutions.map(resolution =>
        resolution.type === 'field' ? `field:${resolution.field}` : `card:${resolution.key}`,
      ),
    );
    const unresolvedConflicts = conflicts.filter(conflict =>
      conflict.type === 'field'
        ? shouldMergeDeckField(conflict.field, mergeDeckFields) &&
          !resolvedKeys.has(`field:${conflict.field}`)
        : !resolvedKeys.has(`card:${conflict.key}`),
    );

    if (unresolvedConflicts.length > 0) {
      return c.json(
        {
          message: 'Merge conflicts must be resolved before merging',
          data: {
            conflicts: unresolvedConflicts,
            proposedDiff: diffDeckSnapshots(row.branch.baseSnapshot, branchSnapshot),
            ownerDiff: diffDeckSnapshots(row.branch.baseSnapshot, currentBaseSnapshot),
          },
        },
        409,
      );
    }

    const mergedSnapshot = buildMergedDeckSnapshot(
      row.branch.baseSnapshot,
      currentBaseSnapshot,
      branchSnapshot,
      data.resolutions,
      { mergeDeckFields },
    );
    const leaderOrBaseChanged =
      currentBaseSnapshot.deck.leaderCardId1 !== mergedSnapshot.deck.leaderCardId1 ||
      currentBaseSnapshot.deck.baseCardId !== mergedSnapshot.deck.baseCardId;

    await db.transaction(async tx => {
      await applyDeckSnapshot(row.branch.baseDeckId, mergedSnapshot, tx);
      await tx
        .update(deckBranch)
        .set({ status: 'merged', updatedAt: sql`NOW()` })
        .where(eq(deckBranch.id, row.branch.id));
      await tx
        .update(deckChangeRequest)
        .set({
          status: 'merged',
          mergedByUserId: user.id,
          mergedAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(deckChangeRequest.id, requestId));
      await tx.insert(deckChangeRequestEvent).values({
        changeRequestId: requestId,
        actorUserId: user.id,
        type: 'merged',
        payload: { resolutions: data.resolutions, mergeDeckFields: data.mergeDeckFields },
      });
    });

    await updateDeckInformation(row.branch.baseDeckId);
    if (leaderOrBaseChanged && mergedSnapshot.deck.leaderCardId1 && mergedSnapshot.deck.baseCardId) {
      runInBackground(
        generateDeckThumbnail,
        mergedSnapshot.deck.leaderCardId1,
        mergedSnapshot.deck.baseCardId,
      );
    }

    return c.json({ data: { merged: true, deckId: row.branch.baseDeckId } });
  },
);
