import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import postgres from 'postgres';
import { db } from '../../db';
import type { AuthExtension } from '../../auth/auth.ts';
import { deckIdFavoritePostRoute } from '../../routes/decks/_id/favorite/post.ts';
import { teamsIdJoinRequestRequestIdPatchRoute } from '../../routes/teams/_id/join-request/_requestId/patch.ts';
import { teamsIdMembersUserIdPatchRoute } from '../../routes/teams/_id/members/_userId/patch.ts';
import { teamsIdDeleteRoute } from '../../routes/teams/_id/delete.ts';
import { teamsIdMembersUserIdDeleteRoute } from '../../routes/teams/_id/members/_userId/delete.ts';
import { userSettingsGetRoute } from '../../routes/user-settings/get.ts';
import { userSettingsPostRoute } from '../../routes/user-settings/post.ts';
import { notifications } from './service.ts';
import { createNotifications, retractUnseenNotifications } from './write.ts';
import { createInvitationNotification } from './publish.ts';
import { userNotificationChannel } from '../../../shared/types/notifications.ts';

test.skipIf(process.env.NOTIFICATIONS_DB_TEST !== '1')(
  'notification reversal, team membership, sticky read history and system recipient policy',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const sql = postgres(url.toString(), { max: 4 });
    const prefix = `lifecycle-${crypto.randomUUID()}`;
    const owner = prefix + '-owner',
      member = prefix + '-member',
      muted = prefix + '-muted',
      joiner = prefix + '-joiner',
      outsider = prefix + '-outsider';
    const waiting = prefix + '-waiting';
    const users = [owner, member, muted, joiner, outsider, waiting];
    const raceTeamId = crypto.randomUUID();
    const teamId = crypto.randomUUID(),
      deckId = crypto.randomUUID(),
      systemDeck = crypto.randomUUID();
    const signals: { userId: string; type: string }[] = [];
    const listener = await sql.listen(userNotificationChannel, raw =>
      signals.push(JSON.parse(raw)),
    );
    let createdSystem = false;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('test-user');
        if (id) c.set('user', { id } as NonNullable<AuthExtension['Variables']['user']>);
        await next();
      })
      .route('/teams/:id/join-request/:requestId', teamsIdJoinRequestRequestIdPatchRoute)
      .route('/teams/:id/members/:userId', teamsIdMembersUserIdDeleteRoute)
      .route('/teams/:id/members/:userId', teamsIdMembersUserIdPatchRoute)
      .route('/teams/:id', teamsIdDeleteRoute)
      .route('/decks/:id/favorite', deckIdFavoritePostRoute)
      .route('/settings', userSettingsGetRoute)
      .route('/settings', userSettingsPostRoute);
    const request = async (path: string, id?: string, body?: unknown, method = 'POST') =>
      app.request(path, {
        method,
        headers: { ...(id ? { 'test-user': id } : {}), 'content-type': 'application/json' },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    const favorite = (isFavorite: boolean, target = deckId) =>
      request(`/decks/${target}/favorite`, joiner, { isFavorite });
    const source = {
      type: 'deck.favorite' as const,
      entityType: 'deck',
      entityId: deckId,
      actorUserId: joiner,
    };
    const newRequest = async (userId = joiner) => {
      const id = crypto.randomUUID();
      await sql`INSERT INTO team_join_request (id,team_id,user_id) VALUES (${id},${teamId},${userId})`;
      return id;
    };
    const approve = (id: string, userId: string | undefined = owner, status = 'approved') =>
      request(`/teams/${teamId}/join-request/${id}`, userId, { status }, 'PATCH');
    const remove = (userId: string, caller = owner) =>
      request(`/teams/${teamId}/members/${userId}`, caller, undefined, 'DELETE');
    try {
      for (const id of [...users, 'swubase']) {
        const inserted =
          await sql`INSERT INTO public."user" (id,name,display_name,email,email_verified,currency,created_at,updated_at)
          VALUES (${id},'Lifecycle fixture',${id},${id + '@invalid.local'},false,'USD',now(),now()) ON CONFLICT (id) DO NOTHING RETURNING id`;
        if (id === 'swubase') createdSystem = inserted.length > 0;
      }
      await sql`INSERT INTO deck (id,user_id,format,public,name) VALUES
        (${deckId},${owner},1,1,'Lifecycle deck'), (${systemDeck},'swubase',1,1,'System fixture deck')`;
      // Concurrent forward/reverse requests must leave the source and unread notification aligned.
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, index) => favorite(index % 2 === 0)),
      );
      expect(results.every(result => [200, 201].includes(result.status))).toBe(true);
      const favorites =
        await sql`SELECT user_id FROM user_deck_favorite WHERE deck_id=${deckId} AND user_id=${joiner}`;
      expect((await notifications.list(owner, false)).items).toHaveLength(favorites.length);
      await favorite(false);
      await favorite(true);
      let item = (await notifications.list(owner, false)).items[0]!;
      expect(item).toBeDefined();
      // Retraction and its realtime invalidation must roll back with the source transaction.
      await Bun.sleep(40);
      const beforeRollback = signals.length;
      await expect(
        db.transaction(async tx => {
          await retractUnseenNotifications(tx, source);
          throw new Error('source rollback');
        }),
      ).rejects.toThrow('source rollback');
      await Bun.sleep(40);
      expect(signals).toHaveLength(beforeRollback);
      expect((await notifications.list(owner, false)).items[0]?.id).toBe(item.id);
      await favorite(false);
      await Bun.sleep(40);
      expect(signals.slice(beforeRollback)).toContainEqual({
        userId: owner,
        type: 'notifications.changed',
      });
      expect((await notifications.list(owner, false)).items).toHaveLength(0);
      await favorite(true);
      item = (await notifications.list(owner, false)).items[0]!;
      await notifications.update(owner, item.id, 'archive');
      await favorite(false);
      expect(await sql`SELECT id FROM user_notification WHERE id=${item.id}`).toHaveLength(1);
      // read-all also records permanent first-read history.
      await sql`DELETE FROM user_notification WHERE id=${item.id}`;
      await favorite(true);
      item = (await notifications.list(owner, false)).items[0]!;
      await notifications.readAll(owner, false);
      const [firstRead] =
        await sql`SELECT first_read_at FROM user_notification WHERE id=${item.id}`;
      expect(firstRead.first_read_at).not.toBeNull();
      await notifications.update(owner, item.id, 'unread');
      await favorite(false);
      await favorite(true);
      expect((await notifications.list(owner, false)).items[0]?.id).toBe(item.id);
      const [afterUnread] =
        await sql`SELECT first_read_at,read_at FROM user_notification WHERE id=${item.id}`;
      expect(afterUnread.first_read_at).toEqual(firstRead.first_read_at);
      expect(afterUnread.read_at).toBeNull();
      await sql`DELETE FROM user_notification WHERE id=${item.id}`;

      await sql`INSERT INTO team (id,name) VALUES (${teamId},'Private fixture team')`;
      await sql`INSERT INTO team_member (team_id,user_id,role) VALUES
        (${teamId},${owner},'owner'), (${teamId},${member},'member'),
        (${teamId},${muted},'member'), (${teamId},'swubase','member')`;
      expect(
        (await request('/settings', member, undefined, 'GET').then(r => r.json()))
          .notifications_team_members,
      ).toBe(true);
      await request('/settings', muted, { notifications_team_members: false });
      await request('/settings', muted, { notifications_deck_favorites: false });
      expect(await request('/settings', muted, undefined, 'GET').then(r => r.json())).toMatchObject(
        {
          notifications_deck_favorites: false,
          notifications_team_members: false,
        },
      );
      expect(
        (await request('/settings', muted, { notifications_team_members: 'garbage' })).status,
      ).toBe(400);
      let requestId = await newRequest();
      expect(
        (
          await request(
            `/teams/${teamId}/join-request/${requestId}`,
            undefined,
            { status: 'approved' },
            'PATCH',
          )
        ).status,
      ).toBe(401);
      expect((await approve(requestId, outsider)).status).toBe(403);
      expect((await approve(requestId, member)).status).toBe(403);
      expect((await approve('bad-id')).status).toBe(400);
      expect(
        (await Promise.all([approve(requestId), approve(requestId)])).map(r => r.status).sort(),
      ).toEqual([200, 404]);
      expect(
        await sql`SELECT user_id FROM team_member WHERE team_id=${teamId} AND user_id=${joiner}`,
      ).toHaveLength(1);
      const teamRows =
        await sql`SELECT recipient_user_id FROM user_notification WHERE entity_id=${teamId}`;
      expect(teamRows.map(row => row.recipient_user_id).sort()).toEqual([owner, member].sort());
      expect((await notifications.list(joiner, false)).items).toHaveLength(0);
      const joined = (await notifications.list(owner, false)).items[0]!;
      expect(joined).toMatchObject({
        type: 'team.member.joined',
        actorUserId: joiner,
        entityName: 'Private fixture team',
        entityId: teamId,
      });
      expect((await notifications.list(outsider, false)).items).toHaveLength(0);
      await notifications.update(owner, joined.id, 'read');
      await notifications.update(owner, joined.id, 'unread');
      expect((await remove(joiner, member)).status).toBe(403);
      expect((await remove(joiner)).status).toBe(200);
      expect((await notifications.list(member, false)).items).toHaveLength(0);
      expect((await notifications.list(owner, false)).items[0]?.id).toBe(joined.id);
      // A real rejoin is a new event, while duplicate pending requests for an existing member are not.
      requestId = await newRequest();
      expect((await approve(requestId)).status).toBe(200);
      expect((await notifications.list(owner, false)).items).toHaveLength(2);
      expect((await notifications.list(member, false)).items).toHaveLength(1);
      expect((await approve(await newRequest())).status).toBe(200);
      expect((await notifications.list(owner, false)).items).toHaveLength(2);
      expect((await approve(await newRequest(outsider), owner, 'rejected')).status).toBe(200);
      expect(
        await sql`SELECT user_id FROM team_member WHERE team_id=${teamId} AND user_id=${outsider}`,
      ).toHaveLength(0);
      expect((await notifications.list(owner, false)).items).toHaveLength(2);
      // Losing membership hides history even if the recipient had already read it.
      const memberItem = (await notifications.list(member, false)).items[0]!;
      await notifications.update(member, memberItem.id, 'read');
      const beforeRemoval = signals.length;
      expect((await remove(member)).status).toBe(200);
      expect((await notifications.list(member, false)).items).toHaveLength(0);
      expect(await notifications.unreadCount(member, false)).toBe(0);
      expect(await sql`SELECT id FROM user_notification WHERE id=${memberItem.id}`).toHaveLength(1);
      await Bun.sleep(40);
      expect(signals.slice(beforeRemoval)).toContainEqual({
        userId: member,
        type: 'notifications.changed',
      });

      // Distinct concurrent joins must have a serial order: exactly one joiner hears about the other.
      const joinRequests = await Promise.all([newRequest(member), newRequest(outsider)]);
      expect((await Promise.all(joinRequests.map(id => approve(id)))).map(r => r.status)).toEqual([
        200, 200,
      ]);
      const betweenJoiners = await sql`SELECT id FROM user_notification WHERE entity_id=${teamId}
        AND ((recipient_user_id=${member} AND actor_user_id=${outsider})
          OR (recipient_user_id=${outsider} AND actor_user_id=${member}))`;
      expect(betweenJoiners).toHaveLength(1);
      const patchMember = (target: string, caller: string, body: unknown) =>
        request(`/teams/${teamId}/members/${target}`, caller, body, 'PATCH');
      expect((await patchMember(member, muted, { role: 'owner' })).status).toBe(403);
      expect((await patchMember(member, muted, { autoAddDeck: false })).status).toBe(403);
      expect((await patchMember(muted, muted, { autoAddDeck: false })).status).toBe(200);
      expect((await patchMember(member, owner, {})).status).toBe(400);
      expect((await patchMember(member, owner, { role: 'owner' })).status).toBe(200);
      expect((await patchMember(member, owner, { role: 'owner' })).status).toBe(400);
      // An approval queued behind a demotion must re-check the owner's committed role.
      const waitingRequest = await newRequest(waiting);
      const locked = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      const demotion = sql.begin(async tx => {
        await tx`SELECT id FROM team WHERE id=${teamId} FOR NO KEY UPDATE`;
        await tx`UPDATE team_member SET role='member' WHERE team_id=${teamId} AND user_id=${owner}`;
        locked.resolve();
        await release.promise;
      });
      await locked.promise;
      const queuedApproval = approve(waitingRequest);
      try {
        expect(
          await Promise.race([
            queuedApproval.then(() => 'finished'),
            Bun.sleep(40).then(() => 'waiting'),
          ]),
        ).toBe('waiting');
      } finally {
        release.resolve();
        await demotion;
      }
      expect((await queuedApproval).status).toBe(403);
      expect((await patchMember(owner, member, { role: 'owner' })).status).toBe(200);
      expect(
        await sql`SELECT user_id FROM team_member WHERE team_id=${teamId} AND user_id=${waiting}`,
      ).toHaveLength(0);

      // Team deletion must not pass its last-member check while a join commits.
      await sql`INSERT INTO team (id,name) VALUES (${raceTeamId},'Delete race fixture')`;
      await sql`INSERT INTO team_member (team_id,user_id,role) VALUES (${raceTeamId},${owner},'owner')`;
      const racingRequest = crypto.randomUUID();
      await sql`INSERT INTO team_join_request (id,team_id,user_id) VALUES (${racingRequest},${raceTeamId},${joiner})`;
      const [approved, deleted] = await Promise.all([
        request(
          `/teams/${raceTeamId}/join-request/${racingRequest}`,
          owner,
          { status: 'approved' },
          'PATCH',
        ),
        request(`/teams/${raceTeamId}`, owner, undefined, 'DELETE'),
      ]);
      expect([approved.status, deleted.status]).toEqual(
        approved.status === 200 ? [200, 400] : [403, 200],
      );
      if (approved.status === 200) {
        expect((await request(`/teams/${raceTeamId}`, joiner, undefined, 'DELETE')).status).toBe(
          403,
        );
        expect(
          (await request(`/teams/${raceTeamId}/members/${joiner}`, owner, undefined, 'DELETE'))
            .status,
        ).toBe(200);
        expect(
          (await request(`/teams/${raceTeamId}/members/${owner}`, owner, undefined, 'DELETE'))
            .status,
        ).toBe(400);
        expect((await request(`/teams/${raceTeamId}`, owner, undefined, 'DELETE')).status).toBe(
          200,
        );
      }
      expect(await sql`SELECT id FROM team WHERE id=${raceTeamId}`).toHaveLength(0);
      expect(
        (await notifications.list(owner, false)).items.some(row => row.entityId === raceTeamId),
      ).toBe(false);

      // All current write paths must exclude the system account, including mandatory invitations.
      expect((await favorite(true, systemDeck)).status).toBe(201);
      await sql.begin(tx =>
        createInvitationNotification(tx, 'swubase', joiner, crypto.randomUUID()),
      );
      await db.transaction(tx =>
        createNotifications(tx, [
          {
            ...source,
            recipientUserId: 'swubase',
            dedupeKey: prefix,
          },
        ]),
      );
      expect(
        await sql`SELECT id FROM user_notification WHERE recipient_user_id='swubase'`,
      ).toHaveLength(0);
      expect((await notifications.list('swubase', true)).items).toHaveLength(0);
      expect(await notifications.unreadCount('swubase', true)).toBe(0);
      expect(
        signals.some(
          signal => signal.userId === 'swubase' && signal.type === 'notifications.changed',
        ),
      ).toBe(false);
    } finally {
      await sql`DELETE FROM user_notification WHERE entity_id IN (${teamId},${raceTeamId})`;
      await sql`DELETE FROM team WHERE id IN (${teamId},${raceTeamId})`;
      await sql`DELETE FROM deck WHERE id IN (${deckId},${systemDeck})`;
      await sql`DELETE FROM public."user" WHERE id IN ${sql(users)}`;
      if (createdSystem) await sql`DELETE FROM public."user" WHERE id='swubase'`;
      await listener.unlisten();
      await sql.end();
    }
  },
  20_000,
);
